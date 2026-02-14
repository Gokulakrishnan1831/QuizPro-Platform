import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' }
    });

    // If no packages exist, return default ones
    if (packages.length === 0) {
      return NextResponse.json([
        {
          id: 'starter',
          name: 'Starter',
          slug: 'starter',
          price: 49,
          originalPrice: 99,
          durationDays: 7,
          features: JSON.stringify(['Unlimited practice', 'Basic analytics', '7-day access']),
          isPopular: false
        },
        {
          id: 'popular',
          name: 'Popular',
          slug: 'popular',
          price: 149,
          originalPrice: 299,
          durationDays: 30,
          features: JSON.stringify(['+ AI questions', 'Detailed analytics', '30-day access']),
          isPopular: true
        },
        {
          id: 'pro',
          name: 'Pro',
          slug: 'pro',
          price: 349,
          originalPrice: 699,
          durationDays: 90,
          features: JSON.stringify(['+ Priority support', 'Exclusive content', '90-day access']),
          isPopular: false
        }
      ]);
    }

    return NextResponse.json(packages);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
