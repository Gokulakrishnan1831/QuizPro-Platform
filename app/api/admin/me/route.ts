import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAdminById } from '@/lib/firebase/db';

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

        const admin = await getAdminById(decoded.adminId);

        if (!admin) {
            return NextResponse.json({ admin: null }, { status: 401 });
        }

        return NextResponse.json({
            admin: { id: admin.id, email: admin.email, name: admin.name },
        });
    } catch {
        return NextResponse.json({ admin: null }, { status: 401 });
    }
}
