import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { buildLeaderboardEntries, type SkillFilter } from '@/lib/leaderboard/ranking';

/**
 * GET /api/leaderboard?skill=SQL&profileType=FRESHER&limit=25
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawSkill = (searchParams.get('skill') ?? 'ALL').toUpperCase();
  const rawProfileType = (searchParams.get('profileType') ?? '').toUpperCase();
  const skill: SkillFilter = ['SQL', 'EXCEL', 'POWERBI', 'ALL'].includes(rawSkill)
    ? (rawSkill as SkillFilter)
    : 'ALL';
  const profileType = ['FRESHER', 'EXPERIENCED'].includes(rawProfileType)
    ? rawProfileType
    : null;
  const limit = Math.max(1, Math.min(parseInt(searchParams.get('limit') ?? '25', 10), 100));

  if (!profileType) {
    return NextResponse.json(
      { error: 'profileType is required (FRESHER | EXPERIENCED)' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const currentUserId = user?.id ?? null;
    const db = prisma as any;

    try {
      const attempts =
        (await db.quizAttempt?.findMany?.({
          where: {
            user: {
              profileType,
            },
            ...(skill === 'ALL'
              ? {}
              : {
                  OR: [{ quiz: { skill } }, { quiz: { skill: null } }],
                }),
          },
          include: {
            quiz: {
              select: {
                skill: true,
                questions: true,
              },
            },
          },
          orderBy: {
            completedAt: 'desc',
          },
        })) ?? [];

      const entries = buildLeaderboardEntries(attempts, currentUserId, skill, limit);
      return NextResponse.json({
        entries,
        totalUsers: entries.length,
        status: 'ok',
        message: entries.length === 0 ? 'No leaderboard entries found for this segment yet.' : undefined,
      });
    } catch (err: any) {
      console.error('[leaderboard] query error:', err);
      return NextResponse.json({
        entries: [],
        totalUsers: 0,
        status: 'unavailable',
        message: 'Leaderboard data is temporarily unavailable.',
      });
    }
  } catch (err: any) {
    console.error('[leaderboard] error:', err);
    return NextResponse.json({
      entries: [],
      totalUsers: 0,
      status: 'unavailable',
      message: 'Leaderboard service is temporarily unavailable.',
    });
  }
}
