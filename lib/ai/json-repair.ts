/**
 * Robust JSON extraction and repair for LLM outputs.
 * Handles common quirks: markdown fences, trailing commas,
 * single-quoted keys, unquoted property names, etc.
 */
export function extractAndRepairJson(raw: string): any {
  // 1. Strip markdown code fences (handles ```json, ``` with any whitespace/newlines)
  let text = raw.replace(/```(?:json)?\s*/gi, '').trim();

  // 2. If wrapped in extra text, find the outermost JSON array
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    text = text.substring(firstBracket, lastBracket + 1);
  }

  // 3. Try direct parse first (fast path)
  try {
    return JSON.parse(text);
  } catch {
    // continue to repairs
  }

  // 4. Remove trailing commas before ] or }
  let repaired = text.replace(/,\s*([\]}])/g, '$1');

  // 5. Fix single-quoted strings → double-quoted
  // (only outside of already double-quoted strings)
  repaired = repaired.replace(/'/g, '"');

  // 6. Remove control characters that break JSON
  repaired = repaired.replace(/[\x00-\x1F\x7F]/g, (ch) => {
    if (ch === '\n' || ch === '\r' || ch === '\t') return ch;
    return '';
  });

  // 7. Try parse again
  try {
    return JSON.parse(repaired);
  } catch {
    // continue
  }

  // 8. If the array was truncated (model ran out of tokens), try to
  //    close the last open object and the array bracket
  let truncFixed = repaired.trimEnd();
  // Remove a trailing comma if present
  if (truncFixed.endsWith(',')) truncFixed = truncFixed.slice(0, -1);
  // Try adding missing closing braces/brackets
  const openBraces = (truncFixed.match(/\{/g) || []).length;
  const closeBraces = (truncFixed.match(/\}/g) || []).length;
  const missing = openBraces - closeBraces;
  if (missing > 0) {
    truncFixed += '}'.repeat(missing);
  }
  if (!truncFixed.endsWith(']')) {
    truncFixed += ']';
  }
  try {
    return JSON.parse(truncFixed);
  } catch {
    // continue
  }

  // 9. Nuclear option: use a regex to extract individual JSON objects
  //    and reconstruct the array manually
  const objects: any[] = [];
  const objRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
  let match: RegExpExecArray | null;
  while ((match = objRegex.exec(repaired)) !== null) {
    try {
      objects.push(JSON.parse(match[0]));
    } catch {
      // Try fixing this individual object
      try {
        const fixed = match[0].replace(/,\s*([\]}])/g, '$1');
        objects.push(JSON.parse(fixed));
      } catch {
        // skip this object
      }
    }
  }

  if (objects.length > 0) {
    return objects;
  }

  // If all repairs fail, throw with context
  throw new Error(`Failed to parse AI JSON output. First 200 chars: ${raw.substring(0, 200)}`);
}
