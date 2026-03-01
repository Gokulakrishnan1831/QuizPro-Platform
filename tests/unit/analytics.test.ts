/**
 * tests/unit/analytics.test.ts
 *
 * Unit tests for the self-hosted analytics module (lib/analytics.ts)
 * Tests verify the fire-and-forget contract: never throws, uses fetch.
 */

import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';
import { track, pageView, logError } from '../../lib/analytics';

// Mock fetch globally so no real HTTP calls happen in tests
const fetchMock = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response)
);

beforeAll(() => {
    // Make window available (jsdom provides it, but location may not)
    if (typeof window !== 'undefined' && !window.location) {
        Object.defineProperty(window, 'location', {
            value: { pathname: '/test' },
            writable: true,
        });
    }
    global.fetch = fetchMock;
});

afterEach(() => {
    fetchMock.mockClear();
});

describe('analytics module — Neon DB backed', () => {
    it('track() does not throw for a valid event', () => {
        expect(() => track('quiz_started', { skill: 'SQL' })).not.toThrow();
    });

    it('pageView() does not throw', () => {
        expect(() => pageView('/quiz/test')).not.toThrow();
    });

    it('logError() does not throw', () => {
        expect(() =>
            logError({ message: 'Test error', stack: 'at fn (file:1:1)', component: 'TestComp' })
        ).not.toThrow();
    });

    it('track() handles all defined event types without throwing', () => {
        const events: Parameters<typeof track>[0][] = [
            'quiz_completed',
            'quiz_abandoned',
            'payment_requested',
            'quota_hit',
            'error_shown',
            'signup',
            'login',
            'logout',
        ];
        for (const evt of events) {
            expect(() => track(evt)).not.toThrow();
        }
    });

    it('track() with undefined props does not throw', () => {
        expect(() => track('page_view')).not.toThrow();
    });

    it('track() calls fetch with the correct endpoint', () => {
        track('quiz_completed', { score: 85 });
        // fetch should be called with the analytics endpoint
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/analytics/event',
            expect.objectContaining({ method: 'POST' })
        );
    });

    it('logError() calls fetch with the error endpoint', () => {
        logError({ message: 'boom', component: 'TestComp' });
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/analytics/error',
            expect.objectContaining({ method: 'POST' })
        );
    });
});
