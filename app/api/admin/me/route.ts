import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/admin_token=([^;]+)/);
        const token = tokenMatch?.[1];

        if (!token) {
            return NextResponse.json({ admin: null }, { status: 401 });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; email: string };

        const db = prisma as any;
        let admin: any;

        try {
            admin = await db.admin.findUnique({
                where: { id: decoded.adminId },
                select: { id: true, email: true, name: true },
            });
        } catch {
            const result = await db.$queryRawUnsafe(
                'SELECT id, email, name FROM "Admin" WHERE id = $1::uuid LIMIT 1',
                decoded.adminId
            );
            admin = result[0] || null;
        }

        if (!admin) {
            return NextResponse.json({ admin: null }, { status: 401 });
        }

        return NextResponse.json({ admin });
    } catch {
        return NextResponse.json({ admin: null }, { status: 401 });
    }
}
