import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getAppSetting, setAppSetting } from '@/lib/firebase/db';
import { db } from '@/lib/firebase/admin';
import { COLLECTIONS } from '@/lib/firebase/collections';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';

/**
 * GET /api/admin/settings — fetch all or specific settings
 * POST /api/admin/settings — upsert a setting
 */

export async function GET(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    try {
        if (key) {
            const value = await getAppSetting(key);
            return NextResponse.json({ value });
        }

        // Return all settings
        const snap = await db.collection(COLLECTIONS.APP_SETTINGS).get();
        const settings = snap.docs.map((d) => ({
            key: d.id,
            value: d.id === 'upi_qr_image' ? '[image]' : d.data().value,
            updated_at: d.data().updatedAt,
        }));

        return NextResponse.json({ settings });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = cookieHeader.match(/admin_token=([^;]+)/)?.[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try { jwt.verify(token, JWT_SECRET); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    try {
        const { key, value } = await request.json();
        if (!key || value === undefined) {
            return NextResponse.json({ error: 'key and value required' }, { status: 400 });
        }

        if (key === 'upi_qr_image' && String(value).length > 700_000) {
            return NextResponse.json(
                { error: 'QR image too large. Please use a smaller image (max ~500KB).' },
                { status: 413 }
            );
        }

        await setAppSetting(String(key), String(value));

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
