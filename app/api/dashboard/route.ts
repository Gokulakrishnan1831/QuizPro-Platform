import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Fetch user stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        progress: {
          include: { skill: true }
        },
        streaks: true,
        quizSessions: {
          orderBy: { startedAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate aggregate stats
    const totalQuestions = user.progress.reduce((acc, p) => acc + p.totalAttempted, 0);
    const totalCorrect = user.progress.reduce((acc, p) => acc + p.totalCorrect, 0);
    const overallAccuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

    const stats = {
      totalQuestions,
      accuracy: Math.round(overallAccuracy),
      streak: user.streaks?.currentStreak || 0,
      xp: totalCorrect * 10, // Simple XP calculation
      recentSessions: user.quizSessions,
      skillProgress: user.progress.map(p => ({
        skillName: p.skill.name,
        accuracy: p.accuracy,
        mastery: p.masteryLevel,
        totalAttempted: p.totalAttempted
      }))
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
