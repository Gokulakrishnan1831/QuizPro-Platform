import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { ensureTables } from '@/lib/db-init';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'quizpro-admin-secret-key-change-in-production';
import prisma from '@/lib/prisma';

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
        await ensureTables();
        const db = prisma as any;

        if (key) {
            const rows = await db.$queryRawUnsafe(
                `SELECT value FROM "AppSetting" WHERE key = $1 LIMIT 1`, key
            );
            return NextResponse.json({ value: rows[0]?.value ?? null });
        }

        // Return all settings (excluding large blobs for list view)
        const rows = await db.$queryRawUnsafe(
            `SELECT key,
        CASE WHEN key = 'upi_qr_image' THEN '[image]' ELSE value END AS value,
        updated_at
       FROM "AppSetting"
       ORDER BY key`
        );

        return NextResponse.json({ settings: rows });
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

        // Validate image size (max 500KB base64)
        if (key === 'upi_qr_image' && String(value).length > 700_000) {
            return NextResponse.json(
                { error: 'QR image too large. Please use a smaller image (max ~500KB).' },
                { status: 413 }
            );
        }

        await ensureTables();
        const db = prisma as any;

        await db.$executeRawUnsafe(
            `INSERT INTO "AppSetting" (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
            String(key),
            String(value),
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
