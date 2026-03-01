import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * GET /api/admin/analytics
 *
 * Returns:
 *  - daily attempt counts (last 30 days)
 *  - score distribution (buckets: 0-20, 20-40, … 80-100)
 *  - tier breakdown counts
 *  - persona breakdown counts
 *  - skill accuracy averages
 *  - top recent attempts (for activity feed)
 */
export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    try {
        const db = prisma as any;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        /* ── parallel queries ─────────────────────────────────────── */
        const [
            recentAttempts,
            tierCounts,
            personaCounts,
            progressRows,
            totalUsers,
            totalAttempts,
            totalQuestions,
        ] = await Promise.all([
            // last 200 attempts for bucketing + daily counts
            db.quizAttempt
                .findMany({
                    where: { completedAt: { gte: thirtyDaysAgo } },
                    orderBy: { completedAt: 'desc' },
                    take: 200,
                    select: {
                        score: true,
                        completedAt: true,
                        timeTaken: true,
                    },
                })
                .catch(() => []),

            // tier distribution
            db.user
                .groupBy({ by: ['subscriptionTier'], _count: { id: true } })
                .catch(() => []),

            // persona distribution
            db.user
                .groupBy({ by: ['persona'], _count: { id: true } })
                .catch(() => []),

            // average accuracy per skill from UserProgress
            db.userProgress
                .groupBy({
                    by: ['skill'],
                    _avg: { accuracy: true },
                    _sum: { totalAttempted: true, totalCorrect: true },
                })
                .catch(() => []),

            db.user.count().catch(() => 0),
            db.quizAttempt.count().catch(() => 0),
            db.question.count().catch(() => 0),
        ]);

        /* ── Score distribution (8 buckets) ─────────────────────── */
        const buckets = Array(10).fill(0); // 0-10, 10-20, … 90-100
        for (const a of recentAttempts) {
            const idx = Math.min(9, Math.floor(parseFloat(String(a.score)) / 10));
            buckets[idx]++;
        }
        const scoreDistribution = buckets.map((count, i) => ({
            range: `${i * 10}–${i * 10 + 10}%`,
            count,
        }));

        /* ── Daily attempt counts ───────────────────────────────── */
        const dailyMap: Record<string, number> = {};
        for (const a of recentAttempts) {
            const day = new Date(a.completedAt).toISOString().slice(0, 10);
            dailyMap[day] = (dailyMap[day] ?? 0) + 1;
        }
        const dailyAttempts = Object.entries(dailyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({ date, count }));

        /* ── Average time spent ─────────────────────────────────── */
        const avgTime =
            recentAttempts.length > 0
                ? Math.round(
                    recentAttempts.reduce(
                        (s: number, a: any) => s + (a.timeTaken ?? 0),
                        0
                    ) / recentAttempts.length
                )
                : 0;

        /* ── Avg score ─────────────────────────────────────────── */
        const avgScore =
            recentAttempts.length > 0
                ? Math.round(
                    recentAttempts.reduce(
                        (s: number, a: any) => s + parseFloat(String(a.score ?? 0)),
                        0
                    ) / recentAttempts.length
                )
                : 0;

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
            tierBreakdown: tierCounts.map((t: any) => ({
                tier: t.subscriptionTier ?? 'UNKNOWN',
                count: t._count?.id ?? 0,
            })),
            personaBreakdown: personaCounts.map((p: any) => ({
                persona: p.persona ?? 'UNKNOWN',
                count: p._count?.id ?? 0,
            })),
            skillAccuracy: progressRows.map((r: any) => ({
                skill: r.skill,
                avgAccuracy: Math.round(parseFloat(String(r._avg?.accuracy ?? 0))),
                totalAttempted: r._sum?.totalAttempted ?? 0,
                totalCorrect: r._sum?.totalCorrect ?? 0,
            })),
        });
    } catch (err: any) {
        console.error('[admin/analytics] error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
