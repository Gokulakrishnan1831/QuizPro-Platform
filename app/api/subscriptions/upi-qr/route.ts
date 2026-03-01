import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureTables } from '@/lib/db-init';
import prisma from '@/lib/prisma';

/**
 * GET /api/subscriptions/upi-qr
 * Returns the UPI QR image (base64) and UPI ID stored by admin.
 * Public — no auth required (user needs this before paying).
 */
export async function GET() {
    try {
        await ensureTables();
        const db = prisma as any;

        const rows = await db.$queryRawUnsafe(
            `SELECT key, value FROM "AppSetting" WHERE key IN ('upi_qr_image', 'upi_id', 'upi_name')`
        );

        const settings: Record<string, string> = {};
        for (const r of rows) settings[r.key] = r.value;

        return NextResponse.json({
            qrImage: settings.upi_qr_image ?? null,
            upiId: settings.upi_id ?? null,
            upiName: settings.upi_name ?? null,
        });
    } catch (err: any) {
        return NextResponse.json({ qrImage: null, upiId: null, upiName: null });
    }
}
