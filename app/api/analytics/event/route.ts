import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db-init';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { event, props, path } = await request.json();
        if (!event) return NextResponse.json({ ok: false }, { status: 400 });

        // Get user id if logged in (optional — anonymous events are fine)
        let userId: string | null = null;
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id ?? null;
        } catch { }

        await ensureTables();
        const db = prisma as any;

        await db.$executeRawUnsafe(
            `INSERT INTO "AppEvent" (user_id, event, props, path) VALUES ($1, $2, $3::jsonb, $4)`,
            userId,
            String(event),
            JSON.stringify(props ?? {}),
            path ?? null,
        );

        return NextResponse.json({ ok: true });
    } catch {
        // Never let analytics failures propagate
        return NextResponse.json({ ok: false });
    }
}
