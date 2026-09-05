import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    fullyParallel: true,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5174',
        trace: 'on-first-retry',
        viewport: { width: 480, height: 900 }
    },
    webServer: {
        command: 'pnpm run dev --port 5174',
        url: 'http://localhost:5174',
        reuseExistingServer: true,
        timeout: 15000
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
