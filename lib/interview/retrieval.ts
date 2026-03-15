const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'that', 'the', 'to', 'with', 'you', 'your', 'we',
  'our', 'will', 'can', 'have', 'has', 'had', 'this', 'these', 'those', 'using',
  'use', 'role', 'data', 'analyst',
]);

type Skill = 'SQL' | 'EXCEL' | 'POWERBI';

export interface InterviewPattern {
  id: string;
  company: string;
  normalizedCompany: string;
  role: string;
  skill: string | null;
  patternType: string;
  questionText: string;
  difficulty: number | null;
  tags: string[];
  source: string;
  sourceUrl: string | null;
  evidenceNote: string | null;
  isVerified: boolean;
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string | null;
}

export interface RankedInterviewPattern extends InterviewPattern {
  score: number;
}

export function normalizeCompanyName(value: string): string {
  const base = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return COMPANY_ALIASES[base] ?? base;
}

const COMPANY_ALIASES: Record<string, string> = {
  'tcs': 'tata consultancy services',
  'tata consultancy': 'tata consultancy services',
  'infosys ltd': 'infosys',
  'infy': 'infosys',
  'wipro ltd': 'wipro',
  'wipro limited': 'wipro',
  'hcl tech': 'hcl technologies',
  'hcl': 'hcl technologies',
  'cts': 'cognizant',
  'cognizant technology': 'cognizant',
  'cognizant technology solutions': 'cognizant',
  'accenture india': 'accenture',
  'deloitte india': 'deloitte',
  'ey': 'ernst young',
  'ernst and young': 'ernst young',
  'pwc': 'pricewaterhousecoopers',
  'kpmg india': 'kpmg',
  'amazon india': 'amazon',
  'google india': 'google',
  'microsoft india': 'microsoft',
  'meta india': 'meta',
  'facebook': 'meta',
  'flipkart internet': 'flipkart',
  'walmart labs': 'walmart',
  'walmart global tech': 'walmart',
  'capgemini india': 'capgemini',
  'tech mahindra': 'tech mahindra',
  'ltimindtree': 'ltimindtree',
  'lti': 'ltimindtree',
  'mindtree': 'ltimindtree',
  'mphasis': 'mphasis',
  'hexaware': 'hexaware',
  'tiger analytics': 'tiger analytics',
  'fractal analytics': 'fractal analytics',
  'fractal': 'fractal analytics',
  'mu sigma': 'mu sigma',
  'latentview': 'latentview analytics',
  'latentview analytics': 'latentview analytics',
};

function tokenize(value: string): string[] {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));
}

function extractKeywords(jdText?: string): Set<string> {
  return new Set(tokenize(jdText ?? ''));
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((v) => String(v)).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function safeEpoch(value: string | Date | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function rankInterviewPatterns(
  patterns: InterviewPattern[],
  params: { skills: Skill[]; jdText?: string; maxItems?: number }
): RankedInterviewPattern[] {
  const { skills, jdText, maxItems = 10 } = params;
  const jdKeywords = extractKeywords(jdText);
  const skillSet = new Set(skills.map((s) => s.toUpperCase()));

  const ranked = patterns.map((pattern) => {
    let score = 0;
    const patternSkill = String(pattern.skill ?? '').toUpperCase();

    if (pattern.isVerified) score += 4;
    if (skillSet.size === 0) score += 1;
    else if (!patternSkill) score += 1;
    else if (skillSet.has(patternSkill as Skill)) score += 3;

    const contentTokens = new Set([
      ...tokenize(pattern.questionText),
      ...pattern.tags.map((t) => t.toLowerCase()),
    ]);
    let overlap = 0;
    for (const kw of jdKeywords) {
      if (contentTokens.has(kw)) overlap += 1;
    }
    score += Math.min(4, overlap * 0.75);

    const daysSinceSeen = Math.max(0, (Date.now() - safeEpoch(pattern.lastSeenAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceSeen <= 30) score += 1.5;
    else if (daysSinceSeen <= 90) score += 0.75;

    return { ...pattern, score: Number(score.toFixed(2)) };
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (safeEpoch(b.lastSeenAt) !== safeEpoch(a.lastSeenAt)) return safeEpoch(b.lastSeenAt) - safeEpoch(a.lastSeenAt);
    return a.id.localeCompare(b.id);
  });

  return ranked.slice(0, maxItems);
}

function mapFirestoreToPattern(doc: any): InterviewPattern {
  return {
    id: doc.id ?? String(doc.id),
    company: String(doc.company),
    normalizedCompany: String(doc.normalizedCompany),
    role: String(doc.role ?? 'Data Analyst'),
    skill: doc.skill ? String(doc.skill) : null,
    patternType: String(doc.patternType ?? 'QUESTION'),
    questionText: String(doc.questionText ?? ''),
    difficulty: doc.difficulty === null || doc.difficulty === undefined ? null : Number(doc.difficulty),
    tags: parseStringArray(doc.tags),
    source: String(doc.source ?? ''),
    sourceUrl: doc.sourceUrl ? String(doc.sourceUrl) : null,
    evidenceNote: doc.evidenceNote ? String(doc.evidenceNote) : null,
    isVerified: Boolean(doc.isVerified),
    isActive: doc.isActive !== false,
    lastSeenAt: doc.lastSeenAt?.toDate?.()?.toISOString?.() ?? null,
    createdAt: doc.createdAt?.toDate?.()?.toISOString?.() ?? null,
  };
}

export async function fetchCompanyInterviewPatterns(params: {
  company: string;
  skills: Skill[];
  jdText?: string;
  maxItems?: number;
}): Promise<RankedInterviewPattern[]> {
  const { company, skills, jdText, maxItems = 8 } = params;
  const normalizedCompany = normalizeCompanyName(company);
  if (!normalizedCompany) return [];

  const { getInterviewPatterns } = await import('@/lib/firebase/db');
  const docs = await getInterviewPatterns({
    normalizedCompany,
    isActive: true,
    limit: 200,
  });

  const patterns = docs.map(mapFirestoreToPattern);
  return rankInterviewPatterns(patterns, { skills, jdText, maxItems });
}

export function buildInterviewGroundingContext(patterns: RankedInterviewPattern[]): string {
  if (patterns.length === 0) return '';

  const lines = patterns.map((pattern, index) => {
    const skill = pattern.skill ? pattern.skill.toUpperCase() : 'GENERAL';
    const sourceTag = pattern.sourceUrl ? `${pattern.source} (${pattern.sourceUrl})` : pattern.source;
    return `${index + 1}. [Pattern ${pattern.id}] [${skill}] ${pattern.questionText}
   Source: ${sourceTag}
   Confidence: ${pattern.score}`;
  });

  return `---- INTERNAL COMPANY INTERVIEW SIGNALS (CURATED) ----
Use these high-priority signals to imitate company-specific interview style.
${lines.join('\n')}

If a question is derived from a pattern above, include metadata.citations with pattern id and source.`;
}

export async function recordQuizGenerationTrace(params: {
  userId: string;
  quizId?: string;
  quizGoal: string;
  company?: string;
  skills: Skill[];
  model?: string;
  usedFallback: boolean;
  patterns: RankedInterviewPattern[];
  trace?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { createQuizGenerationTrace } = await import('@/lib/firebase/db');
    await createQuizGenerationTrace({
      userId: params.userId,
      quizId: params.quizId ?? null,
      quizGoal: params.quizGoal,
      company: params.company ?? null,
      skills: params.skills,
      model: params.model ?? null,
      usedPatternCount: params.patterns.length,
      usedPatternIds: params.patterns.map((p) => p.id),
      usedFallback: params.usedFallback,
      trace: params.trace ?? {},
    });
  } catch {
    // Non-blocking by design.
  }
}
