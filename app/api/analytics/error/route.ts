import { NextResponse } from 'next/server';
import { ensureTables } from '@/lib/db-init';
import prisma from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { message, stack, component, path } = await request.json();
        if (!message) return NextResponse.json({ ok: false }, { status: 400 });

        let userId: string | null = null;
        try {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            userId = user?.id ?? null;
        } catch { }

        await ensureTables();
        const db = prisma as any;

        await db.$executeRawUnsafe(
            `INSERT INTO "AppError" (user_id, error_message, error_stack, component, path)
       VALUES ($1, $2, $3, $4, $5)`,
            userId,
            String(message).slice(0, 2000),
            stack ? String(stack).slice(0, 5000) : null,
            component ?? null,
            path ?? null,
        );

        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false });
    }
}
