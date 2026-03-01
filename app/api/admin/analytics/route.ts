import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';
import { getUserCount, getQuestionCount, getQuizAttemptCount, getAllUsers } from '@/lib/firebase/db';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * GET /api/admin/analytics
 */
export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [totalUsers, totalQuestions, totalAttempts, allUsers] = await Promise.all([
            getUserCount(),
            getQuestionCount(),
            getQuizAttemptCount(),
            getAllUsers(),
        ]);

        // Recent attempts (last 30 days)
        const attemptsSnap = await db.collection(COLLECTIONS.QUIZ_ATTEMPTS)
            .orderBy('completedAt', 'desc')
            .limit(200)
            .get();
        const recentAttempts = attemptsSnap.docs
            .map((d) => d.data())
            .filter((a) => {
                const completed = a.completedAt?.toDate?.() ?? new Date(0);
                return completed >= thirtyDaysAgo;
            });

        // User progress
        const progressSnap = await db.collection(COLLECTIONS.USER_PROGRESS).get();
        const progressRows = progressSnap.docs.map((d) => d.data());

        // Score distribution
        const buckets = Array(10).fill(0);
        for (const a of recentAttempts) {
            const idx = Math.min(9, Math.floor(parseFloat(String(a.score)) / 10));
            buckets[idx]++;
        }
        const scoreDistribution = buckets.map((count, i) => ({
            range: `${i * 10}–${i * 10 + 10}%`,
            count,
        }));

        // Daily attempt counts
        const dailyMap: Record<string, number> = {};
        for (const a of recentAttempts) {
            const day = (a.completedAt?.toDate?.() ?? new Date()).toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] ?? 0) + 1;
        }
        const dailyAttempts = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        // Avg time + avg score
        const avgTime = recentAttempts.length > 0
            ? Math.round(recentAttempts.reduce((s, a) => s + (a.timeTaken ?? 0), 0) / recentAttempts.length)
            : 0;
        const avgScore = recentAttempts.length > 0
            ? Math.round(recentAttempts.reduce((s, a) => s + parseFloat(String(a.score ?? 0)), 0) / recentAttempts.length)
            : 0;

        // Tier + persona breakdown
        const tierCounts: Record<string, number> = {};
        const personaCounts: Record<string, number> = {};
        for (const u of allUsers) {
            const tier = u.subscriptionTier || 'FREE';
            const persona = u.persona || 'UNKNOWN';
            tierCounts[tier] = (tierCounts[tier] || 0) + 1;
            personaCounts[persona] = (personaCounts[persona] || 0) + 1;
        }

        // Skill accuracy
        const skillMap: Record<string, { totalAttempted: number; totalCorrect: number; accuracySum: number; count: number }> = {};
        for (const p of progressRows) {
            const skill = p.skill;
            if (!skillMap[skill]) skillMap[skill] = { totalAttempted: 0, totalCorrect: 0, accuracySum: 0, count: 0 };
            skillMap[skill].totalAttempted += p.totalAttempted ?? 0;
            skillMap[skill].totalCorrect += p.totalCorrect ?? 0;
            skillMap[skill].accuracySum += p.accuracy ?? 0;
            skillMap[skill].count++;
        }

        return NextResponse.json({
            kpis: {
                totalUsers,
                totalAttempts,
                totalQuestions,
                avgScore,
                avgTimeSecs: avgTime,
                recentAttemptsCount: recentAttempts.length,
            },
            dailyAttempts,
            scoreDistribution,
            tierBreakdown: Object.entries(tierCounts).map(([tier, count]) => ({ tier, count })),
            personaBreakdown: Object.entries(personaCounts).map(([persona, count]) => ({ persona, count })),
            skillAccuracy: Object.entries(skillMap).map(([skill, data]) => ({
                skill,
                avgAccuracy: data.count > 0 ? Math.round(data.accuracySum / data.count) : 0,
                totalAttempted: data.totalAttempted,
                totalCorrect: data.totalCorrect,
            })),
        });
    } catch (err: any) {
        console.error('[admin/analytics] error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
