import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('Desktop PC Compatibility & Performance Suite', () => {
    const desktopResolutions = [
        { name: '1080p-desktop', width: 1920, height: 1080 },
        { name: 'laptop-standard', width: 1366, height: 768 }
    ];

    for (const res of desktopResolutions) {
        test(`renders properly and stays centered on ${res.name} (${res.width}x${res.height})`, async ({ page }) => {
            await page.setViewportSize({ width: res.width, height: res.height });
            await page.goto('/');

            const canvas = page.locator('#phaser-container canvas');
            await expect(canvas).toBeVisible({ timeout: 10000 });

            // Check canvas bounding box and centering
            const box = await canvas.boundingBox();
            expect(box).not.toBeNull();
            if (box) {
                // Ensure canvas doesn't overflow viewport
                expect(box.width).toBeLessThanOrEqual(res.width);
                expect(box.height).toBeLessThanOrEqual(res.height);

                // Ensure it is roughly centered horizontally
                const centerDiff = Math.abs((box.x + box.width / 2) - (res.width / 2));
                expect(centerDiff).toBeLessThan(5); // Within 5px of exact center
            }

            await page.waitForTimeout(1000);
            const screenshotDir = path.resolve('screenshots');
            await page.screenshot({ path: path.join(screenshotDir, `desktop-${res.name}.png`) });
        });
    }

    test('measures 60 FPS performance and gameplay stability on PC', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1200);

        // Click to start game
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
            await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.67);
        }

        // Wait for MainScene and camera fade-in to fully complete
        await page.waitForTimeout(1500);

        // Measure FPS over 90 steady-state frames in the browser
        const fpsData = await page.evaluate(async () => {
            return new Promise<{ avgFps: number; minDelta: number; maxDelta: number }>((resolve) => {
                const deltas: number[] = [];
                let lastTime = performance.now();
                let frames = 0;
                let started = false;

                function countFrame(now: number) {
                    if (!started) {
                        started = true;
                        lastTime = now;
                        requestAnimationFrame(countFrame);
                        return;
                    }

                    const delta = now - lastTime;
                    lastTime = now;
                    deltas.push(delta);
                    frames++;

                    if (frames < 90) {
                        requestAnimationFrame(countFrame);
                    } else {
                        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                        const avgFps = 1000 / avgDelta;
                        resolve({
                            avgFps: Math.round(avgFps),
                            minDelta: Math.min(...deltas),
                            maxDelta: Math.max(...deltas)
                        });
                    }
                }

                requestAnimationFrame(countFrame);
            });
        });

        console.log(`[PERF TEST] Steady-state FPS on PC: ${fpsData.avgFps} (Frame time: ${(1000 / fpsData.avgFps).toFixed(1)}ms)`);
        expect(fpsData.avgFps).toBeGreaterThanOrEqual(50);

        // Simulate active PC keyboard play (pressing Left / Right continuously)
        for (let i = 0; i < 4; i++) {
            await page.keyboard.down('ArrowLeft');
            await page.waitForTimeout(250);
            await page.keyboard.up('ArrowLeft');

            await page.keyboard.down('ArrowRight');
            await page.waitForTimeout(250);
            await page.keyboard.up('ArrowRight');
        }

        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'desktop-1080p-gameplay.png') });
    });
});
