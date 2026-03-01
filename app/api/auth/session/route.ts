import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * POST /api/auth/session
 *
 * Creates a Firebase session cookie from an ID token.
 * Called by the client after Firebase Auth sign-in.
 */
export async function POST(request: Request) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
        }

        // Verify the ID token first
        await adminAuth.verifyIdToken(idToken);

        // Create a session cookie (5 days expiry)
        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in ms
        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const cookieStore = await cookies();
        cookieStore.set('__session', sessionCookie, {
            maxAge: expiresIn / 1000,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
        });

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Session creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create session' },
            { status: 401 },
        );
    }
}

/**
 * DELETE /api/auth/session
 *
 * Clears the Firebase session cookie (logout).
 */
export async function DELETE() {
    const cookieStore = await cookies();
    cookieStore.delete('__session');
    return NextResponse.json({ success: true }, { status: 200 });
}
