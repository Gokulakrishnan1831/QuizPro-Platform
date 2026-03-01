import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ user: null }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { id: true, email: true, name: true }
        });

        return NextResponse.json({ user: dbUser });
    } catch (error) {
        console.error('[auth/me] error:', error);
        return NextResponse.json({ user: null }, { status: 500 });
    }
}
