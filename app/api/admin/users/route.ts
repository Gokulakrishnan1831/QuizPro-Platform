import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * GET /api/admin/users?page=1&limit=20&tier=PRO&persona=FRESHER&q=search
 * PATCH /api/admin/users  — update a user's subscription tier
 */

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20', 10));
    const tier = searchParams.get('tier') ?? undefined;
    const persona = searchParams.get('persona') ?? undefined;
    const q = searchParams.get('q') ?? undefined;

    try {
        const db = prisma as any;

        const where: any = {};
        if (tier) where.subscriptionTier = tier;
        if (persona) where.persona = persona;
        if (q) {
            where.OR = [
                { email: { contains: q, mode: 'insensitive' } },
                { name: { contains: q, mode: 'insensitive' } },
            ];
        }

        const [total, users] = await Promise.all([
            db.user.count({ where }),
            db.user.findMany({
                where,
                take: limit,
                skip: (page - 1) * limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    persona: true,
                    subscriptionTier: true,
                    quizzesRemaining: true,
                    experienceYears: true,
                    createdAt: true,
                    _count: { select: { quizAttempts: true } },
                },
            }),
        ]);

        return NextResponse.json({
            users: users.map((u: any) => ({
                ...u,
                quizzesTaken: u._count?.quizAttempts ?? 0,
            })),
            total,
            page,
            pages: Math.ceil(total / limit),
        });
    } catch (err: any) {
        console.error('[admin/users] GET error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    try {
        const { userId, subscriptionTier, quizzesRemaining } = await request.json();

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const db = prisma as any;

        const updated = await db.user.update({
            where: { id: userId },
            data: {
                ...(subscriptionTier && { subscriptionTier }),
                ...(quizzesRemaining !== undefined && { quizzesRemaining }),
            },
            select: {
                id: true,
                email: true,
                subscriptionTier: true,
                quizzesRemaining: true,
            },
        });

        return NextResponse.json({ success: true, user: updated });
    } catch (err: any) {
        console.error('[admin/users] PATCH error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
