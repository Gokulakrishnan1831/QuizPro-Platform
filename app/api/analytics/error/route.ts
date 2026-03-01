import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createAppError } from '@/lib/firebase/db';

export async function POST(request: Request) {
    try {
        const { message, stack, component, path } = await request.json();
        if (!message) return NextResponse.json({ ok: false }, { status: 400 });

        let userId: string | null = null;
        try {
            const user = await getAuthenticatedUser();
            userId = user?.id ?? null;
        } catch { }

        await createAppError({
            userId,
            errorMessage: String(message).slice(0, 2000),
            errorStack: stack ? String(stack).slice(0, 5000) : null,
            component: component ?? null,
            path: path ?? null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false });
    }
}
