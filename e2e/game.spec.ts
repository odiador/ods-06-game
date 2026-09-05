import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('ODS 7 Phaser 3 Game E2E Suite', () => {
    test('loads game, renders canvas, and has no console errors', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => {
            errors.push(err.message);
        });
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');

        // Verify HTML Title
        await expect(page).toHaveTitle(/ODS 7/);

        // Verify Phaser container and Canvas exist
        const container = page.locator('#phaser-container');
        await expect(container).toBeVisible();

        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Wait for PreloaderScene to load assets and transition to MenuScene
        await page.waitForTimeout(1500);

        // Screenshot Menu Scene
        const screenshotDir = path.resolve('public/screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-scene.png') });

        expect(errors, `Found console errors: ${errors.join(', ')}`).toHaveLength(0);
    });

    test('starts game, handles keyboard and touch inputs, and plays loop', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Wait for MenuScene to be active
        await page.waitForTimeout(1200);

        // Click on the center bottom where [ INICIAR RED ] button is located (height 840, button at y ~560)
        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Click the Start button (around 66% down the canvas)
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height * 0.67;
            await page.mouse.click(clickX, clickY);
        }

        // Wait for MainScene and HudScene to initialize
        await page.waitForTimeout(1000);

        // Simulate Keyboard Controls (ArrowLeft and ArrowRight)
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(300);
        await page.keyboard.up('ArrowLeft');

        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(400);
        await page.keyboard.up('ArrowRight');

        // Simulate Touch Area Controls
        const touchLeft = page.locator('#touch-area-left');
        await touchLeft.dispatchEvent('mousedown');
        await page.waitForTimeout(250);
        await touchLeft.dispatchEvent('mouseup');

        const touchRight = page.locator('#touch-area-right');
        await touchRight.dispatchEvent('mousedown');
        await page.waitForTimeout(250);
        await touchRight.dispatchEvent('mouseup');

        // Allow game to run for 3 seconds so items fall and collisions occur
        await page.waitForTimeout(3000);

        // Capture gameplay screenshot
        const screenshotDir = path.resolve('public/screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-gameplay.png') });

        // Ensure no fatal runtime errors occurred
        expect(errors).toHaveLength(0);
    });
});
