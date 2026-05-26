import OpenAI from 'openai';
import type { ExtractedExpense } from '@/lib/types';

export interface ExtractionResult {
  success: boolean;
  expenses?: ExtractedExpense[];
  total?: number;
  error?: string;
}

// Use the strongest vision model by default — extraction accuracy matters far
// more than token cost here (a wrong bill silently mis-charges people). The
// flagship `gpt-5` is the closest OpenAI equivalent to the Claude model this
// used to run on. Both are overridable via env.
//
// Reasoning models (gpt-5*, o*) accept `reasoning_effort`; we use `medium` so
// the model actually parses tricky layouts (price-first lines, parenthetical
// counts) instead of guessing. Older chat models (gpt-4o*) don't take the
// param, so we only send it when relevant.
const MODEL = process.env.OPENAI_MODEL || 'gpt-5';
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'medium';
const isReasoningModel = /^(gpt-5|o\d)/.test(MODEL);

const BILL_SCHEMA = {
  name: 'bill_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      expenses: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            count: { type: 'number' },
            cost: { type: 'number' },
          },
          required: ['name', 'count', 'cost'],
        },
      },
      total: { type: 'number' },
    },
    required: ['expenses', 'total'],
  },
} as const;

/** Build a data URL, sniffing the image type from the base64 magic bytes. */
function toDataUrl(imageBase64: string): string {
  if (imageBase64.startsWith('data:')) return imageBase64;
  const mime =
    imageBase64.startsWith('/9j/') ? 'image/jpeg' :
    imageBase64.startsWith('iVBOR') ? 'image/png' :
    imageBase64.startsWith('R0lGOD') ? 'image/gif' :
    imageBase64.startsWith('UklGR') ? 'image/webp' :
    'image/jpeg';
  return `data:${mime};base64,${imageBase64}`;
}

export async function extractExpensesFromImage(
  imageBase64: string,
  expectedExpenses: { name: string; itemCount: number }[]
): Promise<ExtractionResult> {
  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: 'OPENAI_API_KEY is not configured' };
  }

  const expenseList = expectedExpenses
    .map((e) => `- "${e.name}" (expected count: ${e.itemCount})`)
    .join('\n');

  const prompt = `Analyze this image. It may be a photo of a bill or a screenshot of a chat conversation containing bill details from a sauna. The text is usually in Russian.
Extract the cost of each expense item.

Expected items (use these exact names in your output when an item corresponds to one of them):
${expenseList}

READING THE LAYOUT — read carefully, lines can be formatted either way:
- The amount (price, in euros) may appear BEFORE or AFTER the item name. Lines like "195 - время" or "время - 195" both mean: время costs 195.
- A number in parentheses right after an item name is almost always a QUANTITY/COUNT, NOT a price. e.g. "пельмени (3)" = 3 portions of pelmeni, "кресло (3)" = 3 chairs — the price is the OTHER number on that line, not the one in parentheses.
- Descriptive words in parentheses (e.g. "(9 человек, 3 часа)") are just context, not prices.
- The price is the standalone monetary amount on the line, typically the larger number that isn't a quantity.

RULES:
1. Combine the time/tea/water group — separate lines such as "Время" (time), "Чай" (tea), "Вода" (water), "Облепиха" (sea buckthorn), "Питьевая" — into a SINGLE item named exactly "Время, чай, вода", with its cost being the SUM of those lines' prices.
2. Return EVERY other line that has a price as its own item — never drop a priced line. If a line corresponds to one of the expected items above, use that expected name exactly; otherwise use the item's name exactly as written in the image (do not force it onto an expected name).
3. "total" must equal the sum of the costs of ALL items you listed. Do not invent items or prices that are not in the image. If the image is genuinely unreadable, return an empty list.`;

  const client = new OpenAI({ timeout: 120_000, maxRetries: 2 });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      ...(isReasoningModel ? { reasoning_effort: REASONING_EFFORT as 'low' } : {}),
      // Reasoning tokens count against this budget, so leave generous room.
      max_completion_tokens: 8000,
      response_format: { type: 'json_schema', json_schema: BILL_SCHEMA },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: toDataUrl(imageBase64) } },
          ],
        },
      ],
    });

    const choice = completion.choices[0];
    if (choice?.message?.refusal) {
      console.error('[bill-extract] model refused:', choice.message.refusal);
      return { success: false, error: `Model refused: ${choice.message.refusal}` };
    }

    const content = choice?.message?.content?.trim();
    // `length` means the model hit max_completion_tokens (often reasoning ate
    // the budget) and the JSON is truncated — surface it instead of failing
    // opaquely on a parse error.
    if (choice?.finish_reason === 'length') {
      console.error('[bill-extract] response truncated (finish_reason=length)');
      return { success: false, error: 'Response was truncated before completion' };
    }
    if (!content) {
      console.error('[bill-extract] empty response, finish_reason:', choice?.finish_reason);
      return { success: false, error: 'OpenAI returned an empty response' };
    }

    // Log the raw model output so production extractions are auditable.
    console.log(`[bill-extract] model=${MODEL} raw response:`, content);

    let parsed: { expenses: ExtractedExpense[]; total: number };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[bill-extract] failed to parse JSON:', content.slice(0, 300));
      return { success: false, error: 'Failed to parse JSON from response' };
    }

    // The model returned valid JSON but read nothing useful off the image.
    // Internal sum/total consistency does NOT catch this (an empty list sums to
    // 0, matching a 0 total), so check it explicitly before declaring success.
    const expenses = parsed.expenses ?? [];
    if (expenses.length === 0) {
      console.warn('[bill-extract] no items extracted from image');
      return { success: false, error: 'No expense items could be read from the image' };
    }

    const calculatedTotal = expenses.reduce((sum, e) => sum + e.cost, 0);
    if (calculatedTotal <= 0) {
      console.warn('[bill-extract] all extracted costs are zero/negative:', JSON.stringify(expenses));
      return { success: false, error: 'Extracted items have no valid prices' };
    }

    // Validate that line items sum to the stated total (within rounding).
    if (Math.abs(calculatedTotal - parsed.total) > 1) {
      console.warn(`[bill-extract] sum ${calculatedTotal} != total ${parsed.total}`);
      return {
        success: false,
        error: `Sum of items (${calculatedTotal}) doesn't match total (${parsed.total})`,
      };
    }

    return { success: true, expenses, total: parsed.total };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
