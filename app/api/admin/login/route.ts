import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
        }

        // Look up admin by email using raw query (Prisma client may not have Admin model generated yet)
        const db = prisma as any;
        let admin: any;

        try {
            admin = await db.admin.findUnique({ where: { email } });
        } catch {
            // Fallback to raw query if Prisma client doesn't have Admin model yet
            const result = await db.$queryRawUnsafe(
                'SELECT id, email, "passwordHash", name FROM "Admin" WHERE email = $1 LIMIT 1',
                email
            );
            admin = result[0] || null;
        }

        if (!admin) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const passwordMatch = await bcrypt.compare(password, admin.passwordHash);
        if (!passwordMatch) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        // Create JWT
        const token = jwt.sign(
            { adminId: admin.id, email: admin.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set HTTP-only cookie
        const response = NextResponse.json({
            success: true,
            admin: { id: admin.id, email: admin.email, name: admin.name },
        });

        response.cookies.set('admin_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24, // 24 hours
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('[admin/login] error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
