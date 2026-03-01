import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: './tests/setup.ts',
        exclude: [
            'node_modules/**',
            'tests/e2e/**',
            'tests/load/**',
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            include: [
                'lib/**/*.ts',
                'lib/**/*.tsx',
                'hooks/**/*.ts',
                'hooks/**/*.tsx',
                'app/api/**/*.ts',
            ],
            exclude: [
                'node_modules/**',
                '.next/**',
                '**/*.d.ts',
                '**/index.ts',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 60,
                statements: 70,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        },
    },
});
