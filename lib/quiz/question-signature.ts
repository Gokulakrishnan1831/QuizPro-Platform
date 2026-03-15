import crypto from 'crypto';

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = stable(obj[key]);
        return acc;
      }, {});
  }
  if (typeof value === 'string') return value.trim().toLowerCase();
  return value;
}

function normalizeContent(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function sortNormalizedStrings(values: unknown[]): string[] {
  return values.map((value) => normalizeContent(value)).sort();
}

export function buildQuestionSignature(question: any): string {
  const type = String(question?.type ?? 'MCQ').toUpperCase();
  const skill = String(question?.skill ?? '').toUpperCase();
  const base: Record<string, unknown> = {
    type,
    skill,
    content: normalizeContent(question?.content),
  };

  if (type === 'MCQ') {
    base.options = Array.isArray(question?.options)
      ? sortNormalizedStrings(question.options)
      : [];
  } else if (type === 'POWERBI_FILL_BLANK') {
    base.acceptedAnswers = Array.isArray(question?.acceptedAnswers)
      ? sortNormalizedStrings(question.acceptedAnswers)
      : [];
    base.blankLabel = normalizeContent(question?.blankLabel);
  } else if (type === 'SQL_HANDS_ON') {
    base.setupSQL = normalizeContent(question?.setupSQL);
    base.expectedColumns = Array.isArray(question?.expectedColumns)
      ? sortNormalizedStrings(question.expectedColumns)
      : [];
    base.expectedOutput = stable(question?.expectedOutput ?? []);
  } else if (type === 'EXCEL_HANDS_ON') {
    base.columns = Array.isArray(question?.columns)
      ? sortNormalizedStrings(question.columns)
      : [];
    base.expectedFormulas = stable(question?.expectedFormulas ?? []);
    base.expectedValues = stable(question?.expectedValues ?? []);
  }

  const json = JSON.stringify(stable(base));
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 24);
}

export function uniqueBySignature(questions: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const q of questions) {
    const sig = buildQuestionSignature(q);
    if (seen.has(sig)) continue;
    seen.add(sig);
    out.push(q);
  }
  return out;
}
