import { NextResponse } from 'next/server';

/**
 * GET /api/packages
 *
 * Alias for /api/subscriptions/checkout. Returns subscription tiers.
 */
export async function GET() {
  const tiers = [
    {
      id: 'FREE',
      name: 'Free',
      price: 0,
      quizzes: 1,
      features: ['1 teaser quiz', 'MCQs only'],
    },
    {
      id: 'BASIC',
      name: 'Basic',
      price: 99,
      quizzes: 3,
      features: ['3 quizzes', 'MCQs only', 'Basic reports'],
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 299,
      quizzes: 10,
      features: ['10 quizzes', 'Full hands-on', 'AI reports', 'Leaderboard'],
      isPopular: true,
    },
    {
      id: 'ELITE',
      name: 'Elite',
      price: 499,
      quizzes: 20,
      features: ['20 quizzes', 'Everything in Pro', 'Mentorship', 'Unlimited retries'],
    },
  ];

  return NextResponse.json(tiers);
}
