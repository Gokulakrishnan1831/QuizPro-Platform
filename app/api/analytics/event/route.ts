import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createAppEvent } from '@/lib/firebase/db';

export async function POST(request: Request) {
    try {
        const { event, props, path } = await request.json();
        if (!event) return NextResponse.json({ ok: false }, { status: 400 });

        let userId: string | null = null;
        try {
            const user = await getAuthenticatedUser();
            userId = user?.id ?? null;
        } catch { }

        await createAppEvent({
            userId,
            event: String(event),
            props: props ?? null,
            path: path ?? null,
        });

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false });
    }
}
