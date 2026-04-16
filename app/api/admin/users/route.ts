import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAllUsers, getQuizAttemptsByUser, updateUser } from '@/lib/firebase/db';

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
    const q = searchParams.get('q')?.toLowerCase() ?? undefined;

    try {
        let users = await getAllUsers();

        // Apply filters
        if (tier) users = users.filter((u) => u.subscriptionTier === tier);
        if (persona) users = users.filter((u) => u.persona === persona);
        if (q) {
            users = users.filter((u) =>
                (u.email?.toLowerCase().includes(q)) ||
                (u.name?.toLowerCase().includes(q))
            );
        }

        // Sort by createdAt desc
        users.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? 0;
            const bTime = b.createdAt?.toMillis?.() ?? 0;
            return bTime - aTime;
        });

        const total = users.length;
        const pageUsers = users.slice((page - 1) * limit, page * limit);

        // Get quiz attempt counts
        const usersWithCounts = await Promise.all(
            pageUsers.map(async (u) => {
                const attempts = await getQuizAttemptsByUser(u.id);
                return {
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    persona: u.persona,
                    subscriptionTier: u.subscriptionTier,
                    quizzesRemaining: u.quizzesRemaining,
                    experienceYears: u.experienceYears,
                    createdAt: u.createdAt?._seconds 
                      ? new Date(u.createdAt._seconds * 1000).toISOString() 
                      : u.createdAt?.toMillis?.() 
                        ? new Date(u.createdAt.toMillis()).toISOString() 
                        : new Date(u.createdAt).toISOString(),
                    quizzesTaken: attempts.length,
                };
            })
        );

        return NextResponse.json({
            users: usersWithCounts,
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

        const data: any = {};
        if (subscriptionTier) data.subscriptionTier = subscriptionTier;
        if (quizzesRemaining !== undefined) data.quizzesRemaining = quizzesRemaining;

        await updateUser(userId, data);

        return NextResponse.json({ success: true, user: { id: userId, ...data } });
    } catch (err: any) {
        console.error('[admin/users] PATCH error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
