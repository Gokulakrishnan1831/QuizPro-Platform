import { NextResponse } from 'next/server';

/**
 * GET /auth/callback
 *
 * With Firebase Auth, OAuth callbacks are handled entirely client-side
 * by the Firebase SDK (redirect flow). This route is kept as a redirect
 * to the dashboard for backward compatibility.
 */
export async function GET(request: Request) {
    const { origin } = new URL(request.url);
    return NextResponse.redirect(`${origin}/dashboard`);
}
