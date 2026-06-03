import type { ExtractedExpense } from '@/lib/types';

export interface ExtractionResult {
  success: boolean;
  expenses?: ExtractedExpense[];
  total?: number;
  error?: string;
}

// Bill extraction runs through the cmap API (https://cmap.blaster.ai), which
// proxies a prompt + image to Claude on a subscription and returns the answer
// as text. The key is bound to a default model (`opus`) server-side, so we
// don't normally need to send one; `CMAP_MODEL` can override (opus|sonnet|haiku).
const CMAP_BASE_URL = process.env.CMAP_BASE_URL || 'https://cmap.blaster.ai';
const CMAP_MODEL = process.env.CMAP_MODEL; // optional override of the key default

/** Decode a base64 image (with or without a data: prefix) into bytes + mime. */
function decodeImage(imageBase64: string): { bytes: Buffer; mime: string; ext: string } {
  let b64 = imageBase64;
  let mime: string | undefined;

  const dataUrlMatch = /^data:([^;]+);base64,([\s\S]*)$/.exec(imageBase64);
  if (dataUrlMatch) {
    mime = dataUrlMatch[1];
    b64 = dataUrlMatch[2];
  }

  if (!mime) {
    mime =
      b64.startsWith('/9j/') ? 'image/jpeg' :
      b64.startsWith('iVBOR') ? 'image/png' :
      b64.startsWith('R0lGOD') ? 'image/gif' :
      b64.startsWith('UklGR') ? 'image/webp' :
      'image/jpeg';
  }

  const ext =
    mime === 'image/png' ? 'png' :
    mime === 'image/gif' ? 'gif' :
    mime === 'image/webp' ? 'webp' :
    'jpg';

  return { bytes: Buffer.from(b64, 'base64'), mime, ext };
}

/** Pull the first JSON object out of a model text response (handles ```json fences). */
function extractJson(text: string): string | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  return candidate.slice(start, end + 1);
}

export async function extractExpensesFromImage(
  imageBase64: string,
  expectedExpenses: { name: string; itemCount: number }[]
): Promise<ExtractionResult> {
  const apiKey = process.env.CMAP_KEY;
  if (!apiKey) {
    return { success: false, error: 'CMAP_KEY is not configured' };
  }

  const expenseList = expectedExpenses
    .map((e) => `- "${e.name}" (expected count: ${e.itemCount})`)
    .join('\n');

  const prompt = `Analyze the attached image. It may be a photo of a bill or a screenshot of a chat conversation containing bill details from a sauna. The text is usually in Russian.
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
3. "total" must equal the sum of the costs of ALL items you listed. Do not invent items or prices that are not in the image. If the image is genuinely unreadable, return an empty list.

OUTPUT FORMAT — respond with ONLY a single JSON object, no prose, no markdown fences:
{"expenses":[{"name":string,"count":number,"cost":number}],"total":number}`;

  let bytes: Buffer, mime: string, ext: string;
  try {
    ({ bytes, mime, ext } = decodeImage(imageBase64));
  } catch {
    return { success: false, error: 'Failed to decode image data' };
  }

  const form = new FormData();
  form.set('prompt', prompt);
  if (CMAP_MODEL) form.set('model', CMAP_MODEL);
  form.set('images', new Blob([new Uint8Array(bytes)], { type: mime }), `bill.${ext}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let content: string;
  try {
    const res = await fetch(`${CMAP_BASE_URL}/v1/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        (body && body.error && (body.error.message || body.error.code)) ||
        `cmap request failed with status ${res.status}`;
      console.error('[bill-extract] cmap error:', res.status, JSON.stringify(body));
      return { success: false, error: message };
    }

    content = typeof body?.response === 'string' ? body.response.trim() : '';
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      success: false,
      error: aborted ? 'Request timed out' : error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    clearTimeout(timeout);
  }

  if (!content) {
    console.error('[bill-extract] empty response from cmap');
    return { success: false, error: 'cmap returned an empty response' };
  }

  // Log the raw model output so production extractions are auditable.
  console.log(`[bill-extract] model=${CMAP_MODEL || 'opus(default)'} raw response:`, content);

  const json = extractJson(content);
  if (!json) {
    console.error('[bill-extract] no JSON object in response:', content.slice(0, 300));
    return { success: false, error: 'Failed to find JSON in the response' };
  }

  let parsed: { expenses: ExtractedExpense[]; total: number };
  try {
    parsed = JSON.parse(json);
  } catch {
    console.error('[bill-extract] failed to parse JSON:', json.slice(0, 300));
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
}
