/**
 * lib/plans.ts
 *
 * Single source of truth for all plan/tier configuration across Preplytics.
 * Replace any inline TIERS / plan config in pages or API routes with this.
 */

export type PlanId = 'FREE' | 'BASIC' | 'PRO' | 'ELITE';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;           // INR, one-time
  quizzes: number;
  description: string;
  icon: string;
  color: string;
  isPopular: boolean;
  features: PlanFeature[];
}

export interface PlanFeature {
  label: string;
  available: boolean;
}

/** Ordered lowest → highest */
export const PLAN_ORDER: PlanId[] = ['FREE', 'BASIC', 'PRO', 'ELITE'];

export const PLANS: Plan[] = [
  {
    id: 'FREE',
    name: 'Free',
    price: 0,
    quizzes: 1,
    isPopular: false,
    color: '#6b7280',
    icon: '🎯',
    description: 'Try before you commit',
    features: [
      { label: '1 AI-generated assessment', available: true },
      { label: 'MCQ questions only', available: true },
      { label: 'Basic score report', available: true },
      { label: 'Skill accuracy breakdown', available: true },
      { label: 'Detailed Skill Gap Reports', available: false },
      { label: 'AI performance summary', available: false },
      { label: 'Leaderboard access', available: false },
      { label: 'Hands-on SQL & Excel questions', available: false },
      { label: 'Interview Prep mode (JD-tailored)', available: false },
      { label: 'Company interview pattern analysis', available: false },
      { label: 'Unlimited quiz retries', available: false },
      { label: '1-on-1 mentorship session', available: false },
    ],
  },
  {
    id: 'BASIC',
    name: 'Basic',
    price: 129,
    quizzes: 3,
    isPopular: false,
    color: '#06b6d4',
    icon: '📚',
    description: 'Start your prep journey',
    features: [
      { label: '3 AI-generated assessments', available: true },
      { label: 'MCQ questions', available: true },
      { label: 'Practice & Interview Prep modes', available: true },
      { label: 'Detailed Skill Gap Reports', available: true },
      { label: 'AI performance summary', available: true },
      { label: 'Segmented leaderboard access', available: true },
      { label: 'Hands-on SQL & Excel questions', available: false },
      { label: 'Interview Prep mode (JD-tailored)', available: false },
      { label: 'Company interview pattern analysis', available: false },
      { label: 'Unlimited quiz retries', available: false },
      { label: '1-on-1 mentorship session', available: false },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: 299,
    quizzes: 10,
    isPopular: true,
    color: '#6366f1',
    icon: '🚀',
    description: 'Most popular — full experience',
    features: [
      { label: '10 AI-generated quizzes', available: true },
      { label: 'Hands-on SQL & Excel questions', available: true },
      { label: 'Interview Prep mode (JD-tailored)', available: true },
      { label: 'Company-specific interview prep', available: true },
      { label: 'Improvement roadmap & focus topics', available: true },
      { label: 'Per-skill leaderboard ranking', available: true },
      { label: 'Priority support', available: true },
      { label: 'Company interview pattern analysis', available: false },
      { label: 'Unlimited quiz retries', available: false },
      { label: '1-on-1 mentorship session', available: false },
    ],
  },
  {
    id: 'ELITE',
    name: 'Elite',
    price: 499,
    quizzes: 20,
    isPopular: false,
    color: '#f59e0b',
    icon: '👑',
    description: 'For serious job seekers',
    features: [
      { label: '20 AI-generated quizzes', available: true },
      { label: 'Everything in Pro', available: true },
      { label: 'Company interview pattern analysis', available: true },
      { label: 'Unlimited quiz retries', available: true },
      { label: '1-on-1 mentorship session', available: true },
    ],
  },
];

/** Map of plan ID → numeric tier level (higher = better) */
const TIER_LEVEL: Record<PlanId, number> = {
  FREE: 0,
  BASIC: 1,
  PRO: 2,
  ELITE: 3,
};

/**
 * Returns true if the feature is locked for this user's current tier.
 * @param userTier    The user's current plan ID
 * @param requiredTier The minimum tier required to access the feature
 */
export function isFeatureLocked(userTier: string, requiredTier: PlanId): boolean {
  const userLevel = TIER_LEVEL[userTier as PlanId] ?? 0;
  const reqLevel = TIER_LEVEL[requiredTier];
  return userLevel < reqLevel;
}

/**
 * Returns all plans that are higher than (upgradeable from) the given tier.
 */
export function getUpgradePlans(currentTier: string): Plan[] {
  const currentLevel = TIER_LEVEL[currentTier as PlanId] ?? 0;
  return PLANS.filter((p) => TIER_LEVEL[p.id] > currentLevel && p.price > 0);
}

/**
 * Returns the immediate next plan above the current tier.
 */
export function getNextPlan(currentTier: string): Plan | null {
  const upgrades = getUpgradePlans(currentTier);
  return upgrades[0] ?? null;
}

/** Get a plan by ID */
export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id.toUpperCase());
}

/** Server-side plan config for API routes */
export const PLAN_CONFIG_SERVER: Record<string, { price: number; name: string; quizzes: number }> = {
  BASIC: { price: 129, name: 'Basic', quizzes: 3 },
  PRO:   { price: 299, name: 'Pro',   quizzes: 10 },
  ELITE: { price: 499, name: 'Elite', quizzes: 20 },
};
