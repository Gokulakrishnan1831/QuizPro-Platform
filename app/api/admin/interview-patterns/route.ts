import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Timestamp } from 'firebase-admin/firestore';
import { getInterviewPatterns, getAllInterviewPatterns, createInterviewPattern } from '@/lib/firebase/db';
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

function normalizePatternInput(raw: any) {
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
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company')?.trim();
    const source = searchParams.get('source')?.trim();
    const skill = searchParams.get('skill')?.trim().toUpperCase();
    const limitParam = Number(searchParams.get('limit') ?? 50);
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(200, limitParam)) : 50;

    let patterns;

    if (company) {
      patterns = await getInterviewPatterns({
        normalizedCompany: normalizeCompanyName(company),
        skill: skill || undefined,
        limit,
      });
    } else {
      patterns = await getAllInterviewPatterns();
    }

    // Apply additional filters in memory
    if (source) {
      patterns = patterns.filter((p) => p.source === source);
    }
    if (!company && skill) {
      patterns = patterns.filter((p) => p.skill === skill);
    }
    patterns = patterns.slice(0, limit);

    return NextResponse.json({ patterns });
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
    const payload = await request.json();
    const items: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.patterns) ? payload.patterns : [payload];
    if (items.length === 0) {
      return NextResponse.json({ error: 'No patterns provided' }, { status: 400 });
    }

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

        await createInterviewPattern({
          company: item.company,
          normalizedCompany,
          role: item.role ?? 'Data Analyst',
          skill: item.skill ?? null,
          patternType: item.patternType ?? 'QUESTION',
          questionText: item.questionText,
          difficulty: item.difficulty ?? null,
          tags: item.tags ?? [],
          source: item.source,
          sourceUrl: item.sourceUrl ?? null,
          evidenceNote: item.evidenceNote ?? null,
          isVerified: item.isVerified ?? false,
          isActive: item.isActive ?? true,
          lastSeenAt: item.lastSeenAt ? Timestamp.fromDate(new Date(item.lastSeenAt)) : Timestamp.now(),
        });
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
