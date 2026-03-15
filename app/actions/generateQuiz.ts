'use server';

import { getAuthenticatedUser } from '@/lib/auth';
import {
  generateQuizForUser,
  type GenerateQuizParams,
  type GenerateQuizResult,
} from '@/lib/quiz/generation-service';

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMITS: Record<string, number> = {
  FREE: 2,
  BASIC: 5,
  PRO: 15,
  ELITE: 999,
};

function checkRateLimit(userId: string, tier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  const maxRequests = RATE_LIMITS[tier] ?? RATE_LIMITS.FREE;

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= maxRequests) return false;
  entry.count += 1;
  return true;
}

export async function generateQuiz(params: GenerateQuizParams): Promise<GenerateQuizResult> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return { success: false, error: 'Unauthorized - please sign in.' };
    }

    const tier = authUser.subscriptionTier ?? 'FREE';
    if (!checkRateLimit(authUser.id, tier)) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait a minute before generating another quiz.',
      };
    }

    return await generateQuizForUser(authUser as any, params);
  } catch (error) {
    console.error('generateQuiz server action error:', error);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
