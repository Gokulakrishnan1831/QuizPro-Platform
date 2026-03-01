/**
 * tests/unit/subscription-tiers.test.ts
 *
 * Tests the plan config logic used in Razorpay order creation.
 */

import { describe, it, expect } from 'vitest';

/* ─── Mirror the PLAN_CONFIG from create-order route ────────── */

const PLAN_CONFIG: Record<
    string,
    { price: number; name: string; quizzes: number; tier: string }
> = {
    BASIC: { price: 99, name: 'Basic', quizzes: 3, tier: 'BASIC' },
    PRO: { price: 299, name: 'Pro', quizzes: 10, tier: 'PRO' },
    ELITE: { price: 499, name: 'Elite', quizzes: 20, tier: 'ELITE' },
};

function getPlanDetails(tierId: string) {
    const plan = PLAN_CONFIG[tierId.toUpperCase()];
    if (!plan) throw new Error(`Unknown tier: ${tierId}`);
    return plan;
}

function amountInPaise(priceINR: number): number {
    return Math.round(priceINR * 100);
}

/* ─── Tests ──────────────────────────────────────────────────── */

describe('PLAN_CONFIG', () => {
    it('has all required fields for each tier', () => {
        for (const [key, plan] of Object.entries(PLAN_CONFIG)) {
            expect(plan.price).toBeGreaterThan(0);
            expect(plan.quizzes).toBeGreaterThan(0);
            expect(plan.name).toBeTruthy();
            expect(plan.tier).toBe(key);
        }
    });

    it('BASIC is cheaper than PRO', () => {
        expect(PLAN_CONFIG.BASIC.price).toBeLessThan(PLAN_CONFIG.PRO.price);
    });

    it('PRO is cheaper than ELITE', () => {
        expect(PLAN_CONFIG.PRO.price).toBeLessThan(PLAN_CONFIG.ELITE.price);
    });

    it('ELITE has the most quizzes', () => {
        const maxQuizzes = Math.max(...Object.values(PLAN_CONFIG).map((p) => p.quizzes));
        expect(PLAN_CONFIG.ELITE.quizzes).toBe(maxQuizzes);
    });
});

describe('getPlanDetails()', () => {
    it('returns correct plan for valid tier', () => {
        const plan = getPlanDetails('BASIC');
        expect(plan.name).toBe('Basic');
        expect(plan.price).toBe(99);
    });

    it('is case-insensitive', () => {
        expect(getPlanDetails('pro').name).toBe('Pro');
        expect(getPlanDetails('ELITE').name).toBe('Elite');
    });

    it('throws for unknown tier', () => {
        expect(() => getPlanDetails('PLATINUM')).toThrow('Unknown tier: PLATINUM');
    });

    it('throws for empty string', () => {
        expect(() => getPlanDetails('')).toThrow();
    });
});

describe('amountInPaise()', () => {
    it('converts INR to paise correctly', () => {
        expect(amountInPaise(99)).toBe(9900);
        expect(amountInPaise(299)).toBe(29900);
        expect(amountInPaise(499)).toBe(49900);
    });

    it('rounds fractional amounts', () => {
        expect(amountInPaise(9.99)).toBe(999);
    });

    it('returns 0 for 0 price', () => {
        expect(amountInPaise(0)).toBe(0);
    });
});
