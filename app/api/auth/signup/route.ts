import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createUser } from '@/lib/firebase/db';

/**
 * POST /api/auth/signup
 *
 * Server-side signup: creates Firebase Auth user + Firestore profile.
 * The client can also sign up directly via Firebase client SDK,
 * but this route exists for programmatic / API consumers.
 */
export async function POST(request: Request) {
  try {
    const { email, password, name, persona, experienceYears } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    // Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name || undefined,
    });

    // Create Firestore user profile
    await createUser(userRecord.uid, {
      email,
      name: name || null,
      persona: persona || null,
      experienceYears: experienceYears ?? null,
      subscriptionTier: 'FREE',
      quizzesRemaining: 1,
    });

    return NextResponse.json(
      { user: { uid: userRecord.uid, email: userRecord.email } },
      { status: 201 },
    );
  } catch (error: any) {
    console.error('Signup API error:', error);
    const message =
      error.code === 'auth/email-already-exists'
        ? 'An account with this email already exists.'
        : error.message || 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: error.code === 'auth/email-already-exists' ? 409 : 500 },
    );
  }
}
