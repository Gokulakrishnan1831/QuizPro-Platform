import { NextResponse } from 'next/server';
import { getCashfreeOrder } from '@/lib/cashfree';

/**
 * GET /api/subscriptions/cashfree-status?order_id=PLY-xxx
 * Returns the current Cashfree order status for the payment return page.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('order_id');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const orderData = await getCashfreeOrder(orderId);
    return NextResponse.json({ status: orderData?.order_status ?? 'UNKNOWN' });
  } catch (err: any) {
    console.error('[cashfree-status] error:', err?.response?.data ?? err);
    return NextResponse.json({ error: 'Failed to fetch order status', status: 'UNKNOWN' }, { status: 500 });
  }
}
