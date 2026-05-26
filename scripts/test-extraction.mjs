import OpenAI from 'openai';
import { readFileSync } from 'node:fs';

// Real prod data for session 33 (pulled from Turso), in route insertion order.
const expectedExpenses = [
  { name: 'Время, чай, вода', itemCount: 1 },
  { name: 'Пельмени', itemCount: 3 },
  { name: 'Квас', itemCount: 1 },
  { name: 'Массаж', itemCount: 3 },
];

const IMAGE_PATH = '/Users/yevgenmalafeyev/Downloads/IMG_9673.jpg';
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
};

const expenseList = expectedExpenses
  .map((e) => `- "${e.name}" (expected count: ${e.itemCount})`)
  .join('\n');

// EXACT prompt from lib/openai/image-processor.ts (current hardened version).
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

const imageBase64 = readFileSync(IMAGE_PATH).toString('base64');
const dataUrl = `data:image/jpeg;base64,${imageBase64}`;

const client = new OpenAI({ timeout: 120_000, maxRetries: 1 });

console.log(`\n=== Calling model: ${MODEL} (reasoning_effort=${REASONING_EFFORT}) ===\n`);
const t0 = Date.now();

try {
  const completion = await client.chat.completions.create({
    model: MODEL,
    ...(isReasoningModel ? { reasoning_effort: REASONING_EFFORT } : {}),
    max_completion_tokens: 8000,
    response_format: { type: 'json_schema', json_schema: BILL_SCHEMA },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const ms = Date.now() - t0;
  const choice = completion.choices[0];
  console.log('finish_reason:', choice?.finish_reason);
  console.log('usage:', JSON.stringify(completion.usage));
  console.log('refusal:', choice?.message?.refusal ?? null);
  console.log(`latency: ${ms} ms\n`);
  console.log('--- raw content ---');
  console.log(choice?.message?.content);

  const parsed = JSON.parse(choice.message.content);
  const sum = parsed.expenses.reduce((s, e) => s + e.cost, 0);
  console.log('\n--- parsed summary ---');
  for (const e of parsed.expenses) console.log(`  ${e.name}  ×${e.count}  = ${e.cost} €`);
  console.log(`  sum of items = ${sum} €   |   stated total = ${parsed.total} €`);
} catch (err) {
  console.error('\n!!! API ERROR !!!');
  console.error('status:', err?.status);
  console.error('code:', err?.code);
  console.error('message:', err?.message);
  if (err?.error) console.error('error body:', JSON.stringify(err.error));
  process.exit(1);
}
