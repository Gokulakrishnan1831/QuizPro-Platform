/**
 * lib/analytics.ts
 *
 * Zero-cost analytics backed by your own Neon DB.
 * Events are sent via fetch to /api/analytics/event (fire-and-forget).
 * Errors are sent via fetch to /api/analytics/error (fire-and-forget).
 *
 * No external service, no tracking pixels, no data leaving your infra.
 */

export type TrackEvent =
    | 'page_view'
    | 'persona_selected'
    | 'quiz_started'
    | 'question_answered'
    | 'quiz_completed'
    | 'quiz_abandoned'
    | 'signup'
    | 'login'
    | 'logout'
    | 'upgrade_clicked'
    | 'payment_requested'
    | 'quota_hit'
    | 'error_shown';

export type TrackProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Fire-and-forget event tracking stored in your Neon DB.
 * Never throws — safe to call anywhere without try/catch.
 */
export function track(event: TrackEvent, props?: TrackProps, path?: string): void {
    if (typeof window === 'undefined') return; // server-side — skip
    try {
        fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, props: props ?? {}, path: path ?? window.location.pathname }),
            // keepalive so the request survives page navigations
            keepalive: true,
        }).catch(() => { }); // truly fire-and-forget
    } catch {
        // never crash the app
    }
}

export function pageView(path?: string, props?: TrackProps): void {
    track('page_view', props, path ?? (typeof window !== 'undefined' ? window.location.pathname : ''));
}

/**
 * Log a client-side error to your Neon DB.
 * Call from error boundaries or catch blocks.
 */
export function logError(opts: {
    message: string;
    stack?: string;
    component?: string;
}): void {
    if (typeof window === 'undefined') return;
    try {
        fetch('/api/analytics/error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: opts.message,
                stack: opts.stack,
                component: opts.component,
                path: window.location.pathname,
            }),
            keepalive: true,
        }).catch(() => { });
    } catch { }
}
