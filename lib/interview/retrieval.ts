import prisma from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';

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

function mapRowToPattern(row: any): InterviewPattern {
  return {
    id: String(row.id),
    company: String(row.company),
    normalizedCompany: String(row.normalized_company),
    role: String(row.role ?? 'Data Analyst'),
    skill: row.skill ? String(row.skill) : null,
    patternType: String(row.pattern_type ?? 'QUESTION'),
    questionText: String(row.question_text ?? ''),
    difficulty: row.difficulty === null || row.difficulty === undefined ? null : Number(row.difficulty),
    tags: parseStringArray(row.tags),
    source: String(row.source ?? ''),
    sourceUrl: row.source_url ? String(row.source_url) : null,
    evidenceNote: row.evidence_note ? String(row.evidence_note) : null,
    isVerified: Boolean(row.is_verified),
    isActive: row.is_active !== false,
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
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

  await ensureTables();
  const db = prisma as any;
  const rows = await db.$queryRawUnsafe(
    `SELECT id, company, normalized_company, role, skill, pattern_type, question_text,
            difficulty, tags, source, source_url, evidence_note, is_verified, is_active,
            last_seen_at, created_at
       FROM "CompanyInterviewPattern"
      WHERE is_active = TRUE
        AND normalized_company = $1
      ORDER BY is_verified DESC, last_seen_at DESC, created_at DESC
      LIMIT 200`,
    normalizedCompany
  );

  const patterns = Array.isArray(rows) ? rows.map(mapRowToPattern) : [];
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
  await ensureTables();
  const db = prisma as any;
  try {
    await db.$executeRawUnsafe(
      `INSERT INTO "QuizGenerationTrace"
        (user_id, quiz_id, quiz_goal, company, skills, model, used_pattern_count, used_pattern_ids, used_fallback, trace)
       VALUES
        ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb, $9, $10::jsonb)`,
      params.userId,
      params.quizId ?? null,
      params.quizGoal,
      params.company ?? null,
      JSON.stringify(params.skills),
      params.model ?? null,
      params.patterns.length,
      JSON.stringify(params.patterns.map((p) => p.id)),
      params.usedFallback,
      JSON.stringify(params.trace ?? {})
    );
  } catch {
    // Non-blocking by design.
  }
}
