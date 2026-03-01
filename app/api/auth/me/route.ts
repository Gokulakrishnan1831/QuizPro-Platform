import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile from Firestore.
 */
export async function GET() {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return NextResponse.json({ user }, { status: 200 });
    } catch (error: any) {
        console.error('Auth /me error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
