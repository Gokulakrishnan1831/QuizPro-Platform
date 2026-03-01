import { NextResponse } from 'next/server';

/**
 * POST /api/auth/login
 *
 * With Firebase, login is handled entirely client-side via Firebase Auth SDK.
 * The client then POSTs the ID token to /api/auth/session to create a cookie.
 * This route is kept as a no-op for backward compatibility if anything calls it.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Login is now handled client-side. Use Firebase Auth SDK and POST to /api/auth/session.',
    },
    { status: 410 },
  );
}
