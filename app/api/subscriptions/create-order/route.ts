/**
 * REMOVED — Razorpay has been replaced with a manual UPI payment flow.
 *
 * Payment flow is now:
 *   User → /pricing → UPI QR modal → POSTs transaction ID to /api/subscriptions/request
 *   Admin → /admin/payments → reviews → PATCH approves → user tier upgraded
 *
 * See:
 *   app/api/subscriptions/request/route.ts   (user submits payment proof)
 *   app/api/subscriptions/upi-qr/route.ts    (serves QR image to pricing page)
 *   app/api/admin/payments/route.ts           (admin approve/reject)
 *   app/api/admin/settings/route.ts           (admin uploads QR image)
 */

export { };
