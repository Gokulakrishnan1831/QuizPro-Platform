import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getAllUserProgress, getQuizAttemptsByUser, getQuizById } from '@/lib/firebase/db';

/**
 * GET /api/dashboard
 *
 * Returns the authenticated user's profile and aggregated stats.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch progress + recent attempts from Firestore
    const progress = await getAllUserProgress(user.id);
    const recentAttempts = await getQuizAttemptsByUser(user.id, 5);

    // Aggregate stats
    const totalAttempted = progress.reduce((sum, p) => sum + p.totalAttempted, 0);
    const totalCorrect = progress.reduce((sum, p) => sum + p.totalCorrect, 0);
    const overallAccuracy =
      totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Fetch quiz details for recent attempts
    const enrichedAttempts = await Promise.all(
      recentAttempts.map(async (a) => {
        const quiz = await getQuizById(a.quizId);
        let dateStr = a.completedAt as any;
        if (dateStr?.toDate) {
          dateStr = dateStr.toDate().toISOString();
        } else if (dateStr instanceof Date) {
          dateStr = dateStr.toISOString();
        } else if (typeof dateStr === 'object' && '_seconds' in dateStr) {
           dateStr = new Date(dateStr._seconds * 1000).toISOString();
        }

        return {
          id: a.id,
          score: Number(a.score),
          timeTaken: a.timeTaken,
          persona: quiz?.persona ?? 'FRESHER',
          completedAt: dateStr,
        };
      }),
    );

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        persona: user.persona,
        subscriptionTier: user.subscriptionTier,
        quizzesRemaining: user.quizzesRemaining,
        profilePhotoUrl: (user as any).profilePhotoUrl ?? null,
        headline: (user as any).headline ?? null,
        profileCompletionPct: (user as any).profileCompletionPct ?? 0,
      },
      stats: {
        totalAttempted,
        totalCorrect,
        accuracy: overallAccuracy,
        quizzesTaken: recentAttempts.length,
      },
      skillProgress: progress.map((p) => {
        let lp = p.lastPracticed as any;
        if (lp?.toDate) lp = lp.toDate().toISOString();
        else if (lp instanceof Date) lp = lp.toISOString();
        else if (typeof lp === 'object' && lp && '_seconds' in lp) lp = new Date(lp._seconds * 1000).toISOString();

        return {
          skill: p.skill,
          totalAttempted: p.totalAttempted,
          totalCorrect: p.totalCorrect,
          accuracy: Math.round(Number(p.accuracy)),
          lastPracticed: lp,
        };
      }),
      recentAttempts: enrichedAttempts,
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
