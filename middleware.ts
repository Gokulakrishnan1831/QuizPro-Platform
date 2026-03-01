import { type NextRequest, NextResponse } from 'next/server';

/**
 * Middleware — runs on the Edge Runtime.
 *
 * We CANNOT import firebase-admin here because it uses Node.js APIs
 * (node:fs, node:https, etc.) that are unavailable on the Edge.
 *
 * Strategy:
 * - Check for the existence of the __session cookie (lightweight).
 * - If absent on a protected route, redirect to /login.
 * - Full session verification happens server-side inside API routes
 *   and server components via `getAuthenticatedUser()`.
 */

const PUBLIC_ROUTES = ['/', '/login', '/get-started', '/pricing', '/auth/callback'];

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;
    const isPublic =
        PUBLIC_ROUTES.some((r) => path === r) ||
        path.startsWith('/api/auth') ||
        path.startsWith('/api/admin') ||
        path.startsWith('/admin') ||
        path.startsWith('/_next') ||
        path.startsWith('/favicon');

    if (!isPublic) {
        const sessionCookie = request.cookies.get('__session')?.value;

        if (!sessionCookie) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirect', path);
            return NextResponse.redirect(url);
        }

        // Cookie exists — allow through. Actual verification happens in
        // getAuthenticatedUser() on the server side. If the cookie is
        // invalid/expired, the API will return 401 and the client will
        // redirect to login.
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
};
