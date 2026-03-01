import { NextResponse } from 'next/server';
import { getAppSetting } from '@/lib/firebase/db';

/**
 * GET /api/subscriptions/upi-qr
 * Returns the UPI QR image (base64) and UPI ID stored by admin.
 */
export async function GET() {
    try {
        const [qrImage, upiId, upiName] = await Promise.all([
            getAppSetting('upi_qr_image'),
            getAppSetting('upi_id'),
            getAppSetting('upi_name'),
        ]);

        return NextResponse.json({
            qrImage: qrImage ?? null,
            upiId: upiId ?? null,
            upiName: upiName ?? null,
        });
    } catch (err: any) {
        return NextResponse.json({ qrImage: null, upiId: null, upiName: null });
    }
}
