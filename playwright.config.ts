import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    timeout: 30000,
    fullyParallel: false,
    workers: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5199',
        trace: 'on-first-retry',
        viewport: { width: 480, height: 900 }
    },
    webServer: {
        command: 'pnpm run dev --port 5199',
        url: 'http://localhost:5199',
        reuseExistingServer: false,
        timeout: 15000
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        }
    ]
});
