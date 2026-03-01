import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
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
    const authUser = await getAuthenticatedUser();
    const currentUserId = authUser?.id ?? null;

    try {
      // Fetch all quiz attempts + their quizzes for leaderboard computation
      const attemptsSnap = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS).get();
      const allAttempts: any[] = [];

      for (const doc of attemptsSnap.docs) {
        const attempt = doc.data();
        // Get the user to check profileType
        const userSnap = await db.collection(COLLECTIONS.USERS).doc(attempt.userId).get();
        const user = userSnap.data();
        if (!user || user.profileType !== profileType) continue;

        // Get quiz for skill filter
        const quizSnap = await db.collection(COLLECTIONS.QUIZZES).doc(attempt.quizId).get();
        const quiz = quizSnap.data();

        if (skill !== 'ALL' && quiz?.skill !== skill && quiz?.skill !== null) continue;

        allAttempts.push({
          ...attempt,
          id: doc.id,
          quiz: quiz ? { skill: quiz.skill, questions: quiz.questions } : { skill: null, questions: [] },
        });
      }

      const entries = buildLeaderboardEntries(allAttempts, currentUserId, skill, limit);
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
