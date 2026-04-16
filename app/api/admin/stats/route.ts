import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getUserCount, getQuestionCount, getQuizAttemptCount, getAllUsers, getQuizAttemptsByUser } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

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
    const [userCount, questionCount, attemptCount] = await Promise.all([
      getUserCount(),
      getQuestionCount(),
      getQuizAttemptCount(),
    ]);

    // Revenue proxy — count paid users × avg plan price
    const allUsers = await getAllUsers();
    const tierCounts: Record<string, number> = {};
    for (const u of allUsers) {
      const tier = u.subscriptionTier || 'FREE';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    }

    const TIER_PRICE: Record<string, number> = {
      BASIC: 99,
      PRO: 299,
      ELITE: 499,
    };
    const estimatedRevenue = Object.entries(tierCounts).reduce(
      (sum, [tier, count]) => sum + (TIER_PRICE[tier] ?? 0) * count,
      0
    );

    // Recent users (newest 10)
    const recentUsers = allUsers
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      })
      .slice(0, 10)
      .map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        persona: u.persona,
        subscriptionTier: u.subscriptionTier,
        quizzesRemaining: u.quizzesRemaining,
        profilePhotoUrl: (u as any).profilePhotoUrl ?? null,
        headline: (u as any).headline ?? null,
        profileCompletionPct: (u as any).profileCompletionPct ?? 0,
        createdAt: u.createdAt?._seconds 
          ? new Date(u.createdAt._seconds * 1000).toISOString() 
          : u.createdAt?.toMillis?.() 
            ? new Date(u.createdAt.toMillis()).toISOString() 
            : new Date(u.createdAt).toISOString(),
      }));

    // Recent attempts (newest 10)
    const attemptsSnap = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
      .orderBy('completedAt', 'desc')
      .limit(10)
      .get();
    const recentAttempts = attemptsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        score: data.score,
        timeTaken: data.timeTaken,
        completedAt: data.completedAt,
        userId: data.userId,
      };
    });

    // Average profile completion
    const completionValues = allUsers.map(u => (u as any).profileCompletionPct ?? 0);
    const avgProfileCompletion = completionValues.length > 0
      ? Math.round(completionValues.reduce((s, v) => s + v, 0) / completionValues.length)
      : 0;

    return NextResponse.json({
      stats: {
        totalUsers: userCount,
        totalQuestions: questionCount,
        totalAttempts: attemptCount,
        estimatedRevenue,
        avgProfileCompletion,
      },
      recentUsers,
      recentAttempts,
      tierBreakdown: Object.entries(tierCounts).map(([tier, count]) => ({
        subscriptionTier: tier,
        _count: { id: count },
      })),
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
