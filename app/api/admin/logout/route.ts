import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const response = NextResponse.json({ success: true });

        // Clear the HTTP-only cookie
        response.cookies.set('admin_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('[admin/logout] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
