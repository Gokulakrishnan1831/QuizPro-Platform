import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_ROUTES = ['/', '/login', '/get-started', '/pricing', '/auth/callback'];

export async function middleware(request: NextRequest) {
    // 1. Always refresh the Supabase session cookie
    const response = await updateSession(request);

    // 2. For protected routes, check auth
    const path = request.nextUrl.pathname;
    const isPublic =
        PUBLIC_ROUTES.some((r) => path === r) ||
        path.startsWith('/api/auth') ||
        path.startsWith('/api/admin') ||
        path.startsWith('/admin') ||
        path.startsWith('/_next') ||
        path.startsWith('/favicon');

    if (!isPublic) {
        // Read the Supabase session that updateSession just refreshed
        const { createServerClient } = await import('@supabase/ssr');
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll() {
                        // no-op – already handled by updateSession
                    },
                },
            },
        );

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            url.searchParams.set('redirect', path);
            return NextResponse.redirect(url);
        }
    }

    return response;
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
