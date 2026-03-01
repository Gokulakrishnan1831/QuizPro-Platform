import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

/**
 * POST /api/auth/signup
 *
 * Server-side email signup via Supabase Auth, then syncs to Prisma.
 * The browser signup page calls the client-side SDK directly, but this
 * route exists for programmatic / API consumers.
 */
export async function POST(request: Request) {
  try {
    const { email, password, name, persona, experienceYears } =
      await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, persona } },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { id: data.user.id },
        update: { email, name },
        create: {
          id: data.user.id,
          email,
          name: name || null,
          persona: persona || null,
          experienceYears: experienceYears ?? null,
          subscriptionTier: 'FREE',
          quizzesRemaining: 1,
        },
      });
    }

    return NextResponse.json(
      { user: data.user, session: data.session },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
