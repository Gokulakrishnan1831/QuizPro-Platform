import { NextResponse } from 'next/server';
import { verifyCashfreeWebhookSignature, getCashfreeOrder } from '@/lib/cashfree';
import { updateUser, getUserById } from '@/lib/firebase/db';
import { PLAN_CONFIG_SERVER } from '@/lib/plans';

/**
 * POST /api/subscriptions/cashfree-webhook
 *
 * Cashfree calls this endpoint after a payment attempt.
 * On successful payment, upgrades the user's Firestore tier.
 *
 * Cashfree sends:
 *   Header: x-webhook-signature, x-webhook-timestamp
 *   Body: JSON event payload
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-webhook-signature') ?? '';
    const timestamp = request.headers.get('x-webhook-timestamp') ?? '';

    // Verify signature
    const isValid = verifyCashfreeWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.error('[cashfree-webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventType: string = event?.type ?? '';

    // Only handle successful payment events
    if (eventType !== 'PAYMENT_SUCCESS_WEBHOOK') {
      return NextResponse.json({ received: true });
    }

    const orderId: string = event?.data?.order?.order_id ?? '';
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // Parse our order ID format: PLY-{userId8chars}-{TIER}-{timestamp}
    const parts = orderId.split('-');
    // parts: ['PLY', userId8, TIER, timestamp]
    if (parts.length < 4 || parts[0] !== 'PLY') {
      console.error('[cashfree-webhook] Unexpected order_id format:', orderId);
      return NextResponse.json({ error: 'Unexpected order_id format' }, { status: 400 });
    }

    const tier = parts[2]?.toUpperCase() ?? '';
    const userIdPrefix = parts[1] ?? '';

    const plan = PLAN_CONFIG_SERVER[tier];
    if (!plan) {
      console.error('[cashfree-webhook] Unknown tier in order_id:', tier);
      return NextResponse.json({ error: 'Unknown tier' }, { status: 400 });
    }

    // Double-check order status from Cashfree
    const orderData = await getCashfreeOrder(orderId);
    if (orderData?.order_status !== 'PAID') {
      console.warn('[cashfree-webhook] Order not PAID, status:', orderData?.order_status);
      return NextResponse.json({ received: true });
    }

    // Extract customer_id (Firebase UID) from the Cashfree order
    const customerId: string = orderData?.customer_details?.customer_id ?? '';
    if (!customerId) {
      console.error('[cashfree-webhook] Missing customer_id in order');
      return NextResponse.json({ error: 'Missing customer_id' }, { status: 400 });
    }

    // Safety check: order UID prefix should match
    if (!customerId.startsWith(userIdPrefix)) {
      console.error('[cashfree-webhook] UID mismatch', { customerId, userIdPrefix });
      return NextResponse.json({ error: 'UID mismatch' }, { status: 400 });
    }

    // Check if user exists
    const user = await getUserById(customerId);
    if (!user) {
      console.error('[cashfree-webhook] User not found:', customerId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Upgrade tier (only upgrade, never downgrade)
    const tierOrder: Record<string, number> = { FREE: 0, BASIC: 1, PRO: 2, ELITE: 3 };
    const currentLevel = tierOrder[user.subscriptionTier] ?? 0;
    const newLevel = tierOrder[tier] ?? 0;

    if (newLevel > currentLevel) {
      await updateUser(customerId, {
        subscriptionTier: tier as any,
        quizzesRemaining: plan.quizzes,
      });
      console.log(`[cashfree-webhook] Upgraded user ${customerId} to ${tier}`);
    } else {
      console.log(`[cashfree-webhook] User ${customerId} already on ${user.subscriptionTier}, no downgrade`);
    }

    return NextResponse.json({ received: true, upgraded: newLevel > currentLevel });
  } catch (err: any) {
    console.error('[cashfree-webhook] error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
