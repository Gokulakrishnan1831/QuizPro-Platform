import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * POST /api/auth/logout
 *
 * Clears the Firebase session cookie and revokes refresh tokens.
 */
export async function POST() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('__session')?.value;

        if (sessionCookie) {
            try {
                const decoded = await adminAuth.verifySessionCookie(sessionCookie);
                await adminAuth.revokeRefreshTokens(decoded.uid);
            } catch {
                // Session might already be invalid — that's fine
            }
        }

        cookieStore.delete('__session');

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
    }
}
