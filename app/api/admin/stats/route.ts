import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const [userCount, questionCount, sessionCount, skillCount] = await Promise.all([
      prisma.user.count(),
      prisma.question.count(),
      prisma.quizSession.count(),
      prisma.skill.count(),
    ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        totalQuestions: questionCount,
        totalSessions: sessionCount,
        totalSkills: skillCount
      },
      recentUsers
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
