/**
 * lib/cashfree.ts
 *
 * Server-side Cashfree PG helpers.
 * Uses cashfree-pg@5.x (instance-based API).
 *
 * IMPORTANT: This file is server-only. Never import from client components.
 */

import 'server-only';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Cashfree, CFEnvironment } = require('cashfree-pg');

const appId = process.env.CASHFREE_APP_ID!;
const secretKey = process.env.CASHFREE_SECRET_KEY!;
const envStr = process.env.CASHFREE_ENV ?? 'PRODUCTION';

// Instantiate once (module-level singleton)
const cf = new Cashfree();
cf.XClientId = appId;
cf.XClientSecret = secretKey;
cf.XEnvironment = envStr === 'SANDBOX' ? CFEnvironment.SANDBOX : CFEnvironment.PRODUCTION;
cf.XApiVersion = '2023-08-01';

export interface CreateOrderParams {
  orderId: string;
  orderAmount: number;       // INR
  orderCurrency?: string;    // default 'INR'
  customerId: string;        // Firebase UID
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  notifyUrl?: string;
  orderNote?: string;
}

/**
 * Creates a Cashfree order and returns the payment_session_id for the frontend SDK.
 */
export async function createCashfreeOrder(params: CreateOrderParams) {
  const orderRequest = {
    order_id: params.orderId,
    order_amount: params.orderAmount,
    order_currency: params.orderCurrency ?? 'INR',
    order_note: params.orderNote ?? 'Preplytics Plan Upgrade',
    customer_details: {
      customer_id: params.customerId,
      customer_email: params.customerEmail,
      customer_phone: params.customerPhone ?? '9999999999',
    },
    order_meta: {
      return_url: params.returnUrl,
      notify_url: params.notifyUrl,
    },
  };

  const response = await cf.PGCreateOrder(orderRequest);
  return response.data;
}

/**
 * Fetches an order from Cashfree to check its payment status.
 */
export async function getCashfreeOrder(orderId: string) {
  const response = await cf.PGFetchOrder(orderId);
  return response.data;
}

/**
 * Verifies a Cashfree webhook signature.
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string,
): boolean {
  try {
    cf.PGVerifyWebhookSignature(signature, rawBody, timestamp);
    return true;
  } catch {
    return false;
  }
}
