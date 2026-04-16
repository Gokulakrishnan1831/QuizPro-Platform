import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { createCashfreeOrder } from '@/lib/cashfree';
import { PLAN_CONFIG_SERVER } from '@/lib/plans';

/**
 * POST /api/subscriptions/cashfree-order
 * Body: { tier: 'BASIC' | 'PRO' | 'ELITE' }
 *
 * Creates a Cashfree order and returns the payment_session_id for the frontend SDK.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tier = String(body.tier ?? '').toUpperCase();

    const plan = PLAN_CONFIG_SERVER[tier];
    if (!plan) {
      return NextResponse.json({ error: `Unknown tier: ${tier}` }, { status: 400 });
    }

    // Build a unique, deterministic order ID
    const timestamp = Date.now();
    const orderId = `PLY-${user.id.slice(0, 8)}-${tier}-${timestamp}`;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const returnUrl = `${appUrl}/payment/return?order_id={order_id}&tier=${tier}`;
    const notifyUrl = `${appUrl}/api/subscriptions/cashfree-webhook`;

    const orderData = await createCashfreeOrder({
      orderId,
      orderAmount: plan.price,
      customerId: user.id,
      customerEmail: user.email,
      customerPhone: (user as any).phone ?? '9999999999',
      returnUrl,
      notifyUrl,
      orderNote: `Preplytics ${plan.name} Plan`,
    });

    return NextResponse.json({
      success: true,
      orderId: orderData?.order_id,
      paymentSessionId: orderData?.payment_session_id,
      amount: plan.price,
      planName: plan.name,
    });
  } catch (err: any) {
    console.error('[cashfree-order] error:', err?.response?.data ?? err);
    return NextResponse.json(
      { error: err?.response?.data?.message ?? 'Failed to create payment order' },
      { status: 500 },
    );
  }
}
