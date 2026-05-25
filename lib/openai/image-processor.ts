import OpenAI from 'openai';
import type { ExtractedExpense } from '@/lib/types';

export interface ExtractionResult {
  success: boolean;
  expenses?: ExtractedExpense[];
  total?: number;
  error?: string;
}

// Reasoning models (gpt-5*, o*) accept `reasoning_effort`; keep it low — bill
// extraction is simple and we want minimal token usage. Older chat models
// (gpt-4o*) don't take the param, so we only send it when relevant.
const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';
const REASONING_EFFORT = process.env.OPENAI_REASONING_EFFORT || 'low';
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

  const prompt = `Analyze this image. It may be a photo of a bill or a screenshot of a chat conversation containing bill details from a sauna.
Extract information about each expense item.

Expected items:
${expenseList}

IMPORTANT RULES:
1. If you see separate items like "Время" (time), "Чай" (tea), "Вода" (water), "Облепиха" (sea buckthorn) - combine them into one item "Время, чай, вода" and sum their costs
2. Make sure the sum of all item costs equals total`;

  const client = new OpenAI({ timeout: 120_000, maxRetries: 2 });

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      ...(isReasoningModel ? { reasoning_effort: REASONING_EFFORT as 'low' } : {}),
      max_completion_tokens: 4000,
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
      return { success: false, error: `Model refused: ${choice.message.refusal}` };
    }

    const content = choice?.message?.content?.trim();
    if (!content) {
      return { success: false, error: 'OpenAI returned an empty response' };
    }

    let parsed: { expenses: ExtractedExpense[]; total: number };
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('Failed to parse OpenAI response:', content.slice(0, 300));
      return { success: false, error: 'Failed to parse JSON from response' };
    }

    // Validate that line items sum to the stated total (within rounding).
    const calculatedTotal = parsed.expenses.reduce((sum, e) => sum + e.cost, 0);
    if (Math.abs(calculatedTotal - parsed.total) > 1) {
      return {
        success: false,
        error: `Sum of items (${calculatedTotal}) doesn't match total (${parsed.total})`,
      };
    }

    return { success: true, expenses: parsed.expenses, total: parsed.total };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
