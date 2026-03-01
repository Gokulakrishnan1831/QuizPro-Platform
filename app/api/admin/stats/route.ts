import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * GET /api/admin/stats
 * Returns aggregate platform stats for the admin dashboard overview.
 */
export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const db = prisma as any;

    const [userCount, questionCount, attemptCount] = await Promise.all([
      db.user.count().catch(() => 0),
      db.question.count().catch(() => 0),
      db.quizAttempt.count().catch(() => 0),
    ]);

    // Revenue proxy — count paid users × avg plan price
    const tierCounts = await db.user
      .groupBy({ by: ['subscriptionTier'], _count: { id: true } })
      .catch(() => []);

    const TIER_PRICE: Record<string, number> = {
      BASIC: 99,
      PRO: 299,
      ELITE: 499,
    };
    const estimatedRevenue = tierCounts.reduce(
      (sum: number, t: any) =>
        sum + (TIER_PRICE[t.subscriptionTier] ?? 0) * (t._count?.id ?? 0),
      0
    );

    const recentUsers = await db.user
      .findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          persona: true,
          subscriptionTier: true,
          quizzesRemaining: true,
          createdAt: true,
        },
      })
      .catch(() => []);

    const recentAttempts = await db.quizAttempt
      .findMany({
        take: 10,
        orderBy: { completedAt: 'desc' },
        select: {
          id: true,
          score: true,
          timeTaken: true,
          completedAt: true,
          userId: true,
        },
      })
      .catch(() => []);

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        totalQuestions: questionCount,
        totalAttempts: attemptCount,
        estimatedRevenue,
      },
      recentUsers,
      recentAttempts,
      tierBreakdown: tierCounts,
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
