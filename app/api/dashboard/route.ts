import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/dashboard
 *
 * Returns the authenticated user's profile and aggregated stats.
 * Requires a valid Supabase session.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch user profile + progress + recent attempts
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: {
        progress: true,
        quizAttempts: {
          orderBy: { completedAt: 'desc' },
          take: 5,
          include: { quiz: { select: { persona: true, timerMins: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 });
    }

    // Aggregate stats
    const totalAttempted = user.progress.reduce((sum, p) => sum + p.totalAttempted, 0);
    const totalCorrect = user.progress.reduce((sum, p) => sum + p.totalCorrect, 0);
    const overallAccuracy =
      totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    return NextResponse.json({
      profile: {
        id: user.id,
        email: user.email,
        name: user.name,
        persona: user.persona,
        subscriptionTier: user.subscriptionTier,
        quizzesRemaining: user.quizzesRemaining,
      },
      stats: {
        totalAttempted,
        totalCorrect,
        accuracy: overallAccuracy,
        quizzesTaken: user.quizAttempts.length,
      },
      skillProgress: user.progress.map((p) => ({
        skill: p.skill,
        totalAttempted: p.totalAttempted,
        totalCorrect: p.totalCorrect,
        accuracy: Number(p.accuracy),
        lastPracticed: p.lastPracticed,
      })),
      recentAttempts: user.quizAttempts.map((a) => ({
        id: a.id,
        score: Number(a.score),
        timeTaken: a.timeTaken,
        persona: a.quiz.persona,
        completedAt: a.completedAt,
      })),
    });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
