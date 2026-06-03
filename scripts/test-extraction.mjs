import { readFileSync } from 'node:fs';

// A/B a bill image against the live cmap model.
// Usage: CMAP_KEY=... node scripts/test-extraction.mjs [image-path]

// Real prod data for session 33 (pulled from Turso), in route insertion order.
const expectedExpenses = [
  { name: 'Время, чай, вода', itemCount: 1 },
  { name: 'Пельмени', itemCount: 3 },
  { name: 'Квас', itemCount: 1 },
  { name: 'Массаж', itemCount: 3 },
];

const IMAGE_PATH = process.argv[2] || '/Users/yevgenmalafeyev/Downloads/IMG_9673.jpg';
const CMAP_BASE_URL = process.env.CMAP_BASE_URL || 'https://cmap.blaster.ai';
const CMAP_MODEL = process.env.CMAP_MODEL; // optional override of the key default
const apiKey = process.env.CMAP_KEY;

if (!apiKey) {
  console.error('CMAP_KEY is not set');
  process.exit(1);
}

const expenseList = expectedExpenses
  .map((e) => `- "${e.name}" (expected count: ${e.itemCount})`)
  .join('\n');

// EXACT prompt from lib/cmap/image-processor.ts (current hardened version).
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

const bytes = readFileSync(IMAGE_PATH);
const form = new FormData();
form.set('prompt', prompt);
if (CMAP_MODEL) form.set('model', CMAP_MODEL);
form.set('images', new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' }), 'bill.jpg');

console.log(`\n=== Calling cmap (${CMAP_BASE_URL}, model=${CMAP_MODEL || 'opus(default)'}) ===\n`);
const t0 = Date.now();

try {
  const res = await fetch(`${CMAP_BASE_URL}/v1/run`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const ms = Date.now() - t0;
  const body = await res.json();
  console.log('status:', res.status);
  console.log(`latency: ${ms} ms\n`);

  if (!res.ok) {
    console.error('!!! API ERROR !!!', JSON.stringify(body));
    process.exit(1);
  }

  console.log('--- raw response ---');
  console.log(body.response);

  const text = body.response;
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  const candidate = fenced ? fenced[1] : text;
  const json = candidate.slice(candidate.indexOf('{'), candidate.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json);
  const sum = parsed.expenses.reduce((s, e) => s + e.cost, 0);
  console.log('\n--- parsed summary ---');
  for (const e of parsed.expenses) console.log(`  ${e.name}  ×${e.count}  = ${e.cost} €`);
  console.log(`  sum of items = ${sum} €   |   stated total = ${parsed.total} €`);
} catch (err) {
  console.error('\n!!! ERROR !!!');
  console.error('message:', err?.message);
  process.exit(1);
}
