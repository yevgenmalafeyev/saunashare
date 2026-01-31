import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ExtractedExpense } from '@/lib/types';

export interface ExtractionResult {
  success: boolean;
  expenses?: ExtractedExpense[];
  total?: number;
  error?: string;
}

export async function extractExpensesFromImage(
  imageBase64: string,
  expectedExpenses: { name: string; itemCount: number }[]
): Promise<ExtractionResult> {
  const tempDir = os.tmpdir();
  const imagePath = path.join(tempDir, `bill-${Date.now()}.jpg`);

  try {
    // Write image to temp file
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    fs.writeFileSync(imagePath, imageBuffer);

    const expenseList = expectedExpenses.map(e => `- "${e.name}" (expected count: ${e.itemCount})`).join('\n');

    const prompt = `Analyze this image. It may be a photo of a bill or a screenshot of a chat conversation containing bill details from a sauna.
Extract information about each expense item.

Expected items:
${expenseList}

IMPORTANT RULES:
1. If you see separate items like "Время" (time), "Чай" (tea), "Вода" (water), "Облепиха" (sea buckthorn) - combine them into one item "Время, чай, вода" and sum their costs
2. RESPOND WITH ONLY JSON, NO EXPLANATIONS OR TEXT
3. Make sure the sum of all costs equals total

{
  "expenses": [
    {"name": "Время, чай, вода", "count": 3, "cost": 1500},
    {"name": "Пиво", "count": 2, "cost": 400}
  ],
  "total": 1900
}`;

    const result = await runClaudeCLI(prompt, imagePath);

    // Clean up temp file
    fs.unlinkSync(imagePath);

    // Check for empty response
    if (!result || result.trim().length === 0) {
      return { success: false, error: 'Claude returned an empty response' };
    }

    // Parse JSON from result
    const extractedJson = extractJSON(result);
    if (!extractedJson) {
      console.error('Failed to extract JSON from Claude response:', result);
      // Include truncated response in error for debugging
      const preview = result.slice(0, 200).replace(/\n/g, ' ');
      return { success: false, error: `Failed to extract JSON from response: "${preview}..."` };
    }

    let parsed;
    try {
      parsed = JSON.parse(extractedJson);
    } catch {
      console.error('Failed to parse extracted JSON:', extractedJson);
      return { success: false, error: 'Failed to parse JSON from response' };
    }

    // Validate totals
    const calculatedTotal = parsed.expenses.reduce((sum: number, e: ExtractedExpense) => sum + e.cost, 0);
    if (Math.abs(calculatedTotal - parsed.total) > 1) {
      return {
        success: false,
        error: `Sum of items (${calculatedTotal}) doesn't match total (${parsed.total})`,
      };
    }

    return {
      success: true,
      expenses: parsed.expenses,
      total: parsed.total,
    };
  } catch (error) {
    // Clean up temp file on error
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function extractJSON(text: string): string | null {
  // Normalize the text - remove common issues
  const normalized = text.trim();

  // Try markdown code block first (```json ... ``` or ``` ... ```)
  const codeBlockMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    if (inner.startsWith('{')) return inner;
  }

  // Try to find JSON object with balanced braces
  const startIdx = normalized.indexOf('{');
  if (startIdx === -1) return null;

  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < normalized.length; i++) {
    if (normalized[i] === '{') depth++;
    if (normalized[i] === '}') depth--;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }

  if (endIdx === -1) return null;
  return normalized.slice(startIdx, endIdx + 1);
}

function runClaudeCLI(prompt: string, imagePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const tempDir = path.dirname(imagePath);
    // Include instruction to read the image file in the prompt
    const fullPrompt = `First, read the image from file ${imagePath} using the Read tool, then complete the task:\n\n${prompt}`;
    const args = ['-p', fullPrompt, '--add-dir', tempDir, '--output-format', 'text'];

    const child = spawn('claude', args, {
      timeout: 120000, // Increase timeout for image processing
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Claude CLI exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
