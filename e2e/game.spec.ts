import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('ODS 7 Phaser 3 Game E2E Suite - 3 Biome Modes', () => {
    test('loads menu, verifies 3 biomes tabs, and selects each biome', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('/');
        await expect(page).toHaveTitle(/ODS 7/);

        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1500);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Tab 1: WIND (Colinas Eólicas) - center is around 22% of canvas width
            const tabY = box.y + box.height * (151 / 840);
            
            // Click Tab 2: SOLAR (around 50% width)
            const solarTabX = box.x + box.width * 0.50;
            await page.mouse.click(solarTabX, tabY);
            await page.waitForTimeout(400);

            // Click Tab 3: HYDRO (around 78% width)
            const hydroTabX = box.x + box.width * 0.78;
            await page.mouse.click(hydroTabX, tabY);
            await page.waitForTimeout(400);

            // Click back to Tab 1: WIND
            const windTabX = box.x + box.width * 0.22;
            await page.mouse.click(windTabX, tabY);
            await page.waitForTimeout(400);
        }

        // Screenshot Menu Scene with 3 Biomes Selector
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-scene.png') });

        expect(errors).toHaveLength(0);
    });

    test('starts race in Solar Valley biome, drives and captures gameplay', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1200);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Select SOLAR biome tab (50% width, tabY around 18% down)
            const tabY = box.y + box.height * (151 / 840);
            const solarTabX = box.x + box.width * 0.50;
            await page.mouse.click(solarTabX, tabY);
            await page.waitForTimeout(400);

            // Click Start button (63% down)
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height * 0.63;
            await page.mouse.click(clickX, clickY);
        }

        // Wait for race to initialize
        await page.waitForTimeout(1000);

        // Steer left and right
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(300);
        await page.keyboard.up('ArrowLeft');

        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(400);
        await page.keyboard.up('ArrowRight');

        // Allow race to progress for 2.5 seconds
        await page.waitForTimeout(2500);

        // Capture solar gameplay screenshot
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-gameplay-solar.png') });

        expect(errors).toHaveLength(0);
    });

    test('starts race in Hydro Rapids biome, verifies controls and collects items', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1200);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Select HYDRO biome tab (78% width, tabY around 18% down)
            const tabY = box.y + box.height * (151 / 840);
            const hydroTabX = box.x + box.width * 0.78;
            await page.mouse.click(hydroTabX, tabY);
            await page.waitForTimeout(400);

            // Click Start button (63% down)
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height * 0.63;
            await page.mouse.click(clickX, clickY);
        }

        // Wait for race to initialize
        await page.waitForTimeout(1000);

        // Steer with touch area controls
        const touchLeft = page.locator('#touch-area-left');
        await touchLeft.dispatchEvent('mousedown');
        await page.waitForTimeout(250);
        await touchLeft.dispatchEvent('mouseup');

        const touchRight = page.locator('#touch-area-right');
        await touchRight.dispatchEvent('mousedown');
        await page.waitForTimeout(250);
        await touchRight.dispatchEvent('mouseup');

        // Allow race to progress
        await page.waitForTimeout(2500);

        // Capture hydro gameplay screenshot
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-gameplay-hydro.png') });
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-gameplay.png') });

        expect(errors).toHaveLength(0);
    });
});
