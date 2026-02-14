import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { name, email, password, status } = await request.json();
    console.log('Signup API received:', { name, email, password, status });

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    console.log(`Checked for existing user. email: ${email} existingUser: ${existingUser ? existingUser.id : 'none'}`);

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    console.log(`Password hashed for email: ${email}`);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        status: status || 'student',
      },
    });
    console.log(`User created. userId: ${user.id} email: ${user.email}`);

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ 
      user: userWithoutPassword,
      token: 'mock-jwt-token'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
