import { NextResponse } from 'next/server';

/**
 * GET /api/subscriptions/checkout
 *
 * Returns available subscription tiers. These are defined in the plan
 * and don't need their own DB table – they're static configuration.
 * Razorpay integration will be added in Phase 7.
 */
export async function GET() {
  const tiers = [
    {
      id: 'FREE',
      name: 'Free',
      price: 0,
      quizzes: 1,
      features: ['1 teaser quiz', 'MCQs only'],
      isPopular: false,
    },
    {
      id: 'BASIC',
      name: 'Basic',
      price: 99,
      quizzes: 3,
      features: ['3 quizzes', 'MCQs only', 'Basic reports'],
      isPopular: false,
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 299,
      quizzes: 10,
      features: [
        '10 quizzes',
        'Full hands-on (SQL, Excel, Python)',
        'AI-powered reports',
        'Leaderboard access',
      ],
      isPopular: true,
    },
    {
      id: 'ELITE',
      name: 'Elite',
      price: 499,
      quizzes: 20,
      features: [
        '20 quizzes',
        'Everything in Pro',
        '1:1 Mentorship session',
        'Unlimited retries',
        'Priority support',
      ],
      isPopular: false,
    },
  ];

  return NextResponse.json(tiers);
}
