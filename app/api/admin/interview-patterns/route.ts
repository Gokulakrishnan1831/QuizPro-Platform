import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { ensureTables } from '@/lib/db-init';
import { normalizeCompanyName } from '@/lib/interview/retrieval';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

function verifyAdminToken(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
  if (!token) return false;
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).trim()).filter((v) => v.length > 0);
}

type PatternInput = {
  company: string;
  role?: string;
  skill?: string;
  patternType?: string;
  questionText: string;
  difficulty?: number;
  tags?: string[];
  source: string;
  sourceUrl?: string;
  evidenceNote?: string;
  isVerified?: boolean;
  isActive?: boolean;
  lastSeenAt?: string;
};

function normalizePatternInput(raw: any): PatternInput {
  return {
    company: String(raw?.company ?? '').trim(),
    role: raw?.role ? String(raw.role).trim() : 'Data Analyst',
    skill: raw?.skill ? String(raw.skill).trim().toUpperCase() : undefined,
    patternType: raw?.patternType ? String(raw.patternType).trim().toUpperCase() : 'QUESTION',
    questionText: String(raw?.questionText ?? '').trim(),
    difficulty: raw?.difficulty === undefined || raw?.difficulty === null
      ? undefined
      : Number(raw.difficulty),
    tags: asStringArray(raw?.tags),
    source: String(raw?.source ?? '').trim(),
    sourceUrl: raw?.sourceUrl ? String(raw.sourceUrl).trim() : undefined,
    evidenceNote: raw?.evidenceNote ? String(raw.evidenceNote).trim() : undefined,
    isVerified: Boolean(raw?.isVerified),
    isActive: raw?.isActive === undefined ? true : Boolean(raw.isActive),
    lastSeenAt: raw?.lastSeenAt ? String(raw.lastSeenAt) : undefined,
  };
}

export async function GET(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company')?.trim();
    const source = searchParams.get('source')?.trim();
    const skill = searchParams.get('skill')?.trim().toUpperCase();
    const limitParam = Number(searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50;

    const clauses: string[] = ['1=1'];
    const args: any[] = [];

    if (company) {
      args.push(normalizeCompanyName(company));
      clauses.push(`normalized_company = $${args.length}`);
    }
    if (source) {
      args.push(source);
      clauses.push(`source = $${args.length}`);
    }
    if (skill) {
      args.push(skill);
      clauses.push(`skill = $${args.length}`);
    }

    args.push(limit);

    const db = prisma as any;
    const rows = await db.$queryRawUnsafe(
      `SELECT id, company, role, skill, pattern_type, question_text, difficulty, tags,
              source, source_url, evidence_note, is_verified, is_active, last_seen_at, created_at, updated_at
         FROM "CompanyInterviewPattern"
        WHERE ${clauses.join(' AND ')}
        ORDER BY is_verified DESC, last_seen_at DESC, created_at DESC
        LIMIT $${args.length}`,
      ...args
    );

    return NextResponse.json({ patterns: rows ?? [] });
  } catch (error: any) {
    console.error('[admin/interview-patterns] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch interview patterns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTables();
    const payload = await request.json();
    const items: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.patterns) ? payload.patterns : [payload];
    if (items.length === 0) {
      return NextResponse.json({ error: 'No patterns provided' }, { status: 400 });
    }

    const db = prisma as any;
    const failures: Array<{ index: number; error: string }> = [];
    let successCount = 0;

    for (let i = 0; i < items.length; i++) {
      try {
        const item = normalizePatternInput(items[i]);
        if (!item.company || !item.questionText || !item.source) {
          throw new Error('company, questionText, and source are required');
        }

        const normalizedCompany = normalizeCompanyName(item.company);
        if (!normalizedCompany) {
          throw new Error('Invalid company');
        }

        await db.$executeRawUnsafe(
          `INSERT INTO "CompanyInterviewPattern"
            (company, normalized_company, role, skill, pattern_type, question_text, difficulty, tags, source, source_url, evidence_note, is_verified, is_active, last_seen_at, updated_at)
           VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13, COALESCE($14::timestamptz, NOW()), NOW())
           ON CONFLICT (normalized_company, question_text, source)
           DO UPDATE SET
             role = EXCLUDED.role,
             skill = EXCLUDED.skill,
             pattern_type = EXCLUDED.pattern_type,
             difficulty = EXCLUDED.difficulty,
             tags = EXCLUDED.tags,
             source_url = EXCLUDED.source_url,
             evidence_note = EXCLUDED.evidence_note,
             is_verified = EXCLUDED.is_verified,
             is_active = EXCLUDED.is_active,
             last_seen_at = EXCLUDED.last_seen_at,
             updated_at = NOW()`,
          item.company,
          normalizedCompany,
          item.role ?? 'Data Analyst',
          item.skill ?? null,
          item.patternType ?? 'QUESTION',
          item.questionText,
          item.difficulty ?? null,
          JSON.stringify(item.tags ?? []),
          item.source,
          item.sourceUrl ?? null,
          item.evidenceNote ?? null,
          item.isVerified ?? false,
          item.isActive ?? true,
          item.lastSeenAt ?? null
        );
        successCount++;
      } catch (error: any) {
        failures.push({ index: i, error: error?.message ?? 'Unknown error' });
      }
    }

    return NextResponse.json({
      success: failures.length === 0,
      imported: successCount,
      failed: failures.length,
      failures,
    });
  } catch (error: any) {
    console.error('[admin/interview-patterns] POST error:', error);
    return NextResponse.json({ error: 'Failed to upsert interview patterns' }, { status: 500 });
  }
}
