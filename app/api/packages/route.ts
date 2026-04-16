import { NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';

/**
 * GET /api/packages
 *
 * Returns subscription tiers (sourced from lib/plans.ts — single source of truth).
 */
export async function GET() {
  const tiers = PLANS.map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    quizzes: p.quizzes,
    isPopular: p.isPopular,
    features: p.features.filter((f) => f.available).map((f) => f.label),
  }));

  return NextResponse.json(tiers);
}
