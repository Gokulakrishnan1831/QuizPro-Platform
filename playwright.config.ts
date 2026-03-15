import { defineConfig, devices } from '@playwright/test';

const PW_PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const PW_BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PW_PORT}`;

export default defineConfig({
    testDir: './tests/e2e',
    timeout: 45_000,
    expect: { timeout: 8_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: process.env.CI ? 'dot' : 'list',

    use: {
        baseURL: PW_BASE_URL,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'on-first-retry',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile',
            use: { ...devices['iPhone 14'] },
        },
    ],

    // Auto-start dev server when running tests locally
    webServer: {
        command: `npx next dev --turbopack -p ${PW_PORT}`,
        url: PW_BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        env: {
            ...process.env,
            NEXT_PUBLIC_E2E_PROCTORING: '1',
        },
    },
});
