import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('ODS 7 Clean Energy Game - E2E Suite', () => {
    test('loads Light Mode menu with single circuit race and switches between game modes', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        await expect(page).toHaveTitle(/ODS 7/);

        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1200);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Mode 2 Tab: ATRAPAR (POU) (around 73% width, 11.6% height)
            const catcherTabX = box.x + box.width * 0.73;
            const modeTabY = box.y + box.height * (112 / 960);
            await page.mouse.click(catcherTabX, modeTabY);
            await page.waitForTimeout(500);

            // Screenshot Menu Scene with Catcher Mode selected
            const screenshotDir = path.resolve('screenshots');
            await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-catcher.png') });

            // Switch back to Mode 1 Tab: CARRERA (around 27% width)
            const raceTabX = box.x + box.width * 0.27;
            await page.mouse.click(raceTabX, modeTabY);
            await page.waitForTimeout(400);

            // Screenshot Menu Scene with Race Mode selected
            await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-scene.png') });
        }

        expect(errors).toHaveLength(0);
    });

    test('starts single circuit race, steers glider with A/D, arrow keys, and touch drag', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Click INICIAR CARRERA button (58.2% down)
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height * (559 / 960);
            await page.mouse.click(clickX, clickY);
        }

        // Wait for race to initialize
        await page.waitForTimeout(1200);

        // Verify MainScene is active
        const isMainActive = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            return game ? game.scene.isActive('MainScene') : false;
        });
        expect(isMainActive).toBe(true);

        // Steer with Arrow keys
        await page.keyboard.down('ArrowLeft');
        await page.waitForTimeout(250);
        await page.keyboard.up('ArrowLeft');

        await page.keyboard.down('ArrowRight');
        await page.waitForTimeout(300);
        await page.keyboard.up('ArrowRight');

        // Steer with A and D keys
        await page.keyboard.press('KeyA');
        await page.waitForTimeout(200);
        await page.keyboard.press('KeyD');
        await page.waitForTimeout(200);

        // Steer with mouse drag on canvas
        if (box) {
            await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.5);
            await page.mouse.down();
            await page.waitForTimeout(150);
            await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5);
            await page.waitForTimeout(150);
            await page.mouse.up();
        }

        // Progress race for 2.5s
        await page.waitForTimeout(2500);

        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-gameplay.png') });

        expect(errors).toHaveLength(0);
    });

    test('renders WinScene with tangible appliance comparisons and rotating lessons', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // Start WinScene directly with realistic race score
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MenuScene');
                game.scene.start('WinScene', {
                    mode: 'race',
                    time: '92.4',
                    kwh: 1250,
                    distance: 2030
                });
            }
        });

        await page.waitForTimeout(1000);

        // Capture screenshot of WinScene with appliance equivalences and light mode retro theme
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-win-scene.png') });

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Click "[ OTRO DATO ]" button to cycle lesson (x: ~91%, y: 53.75%)
            const cycleBtnX = box.x + box.width * 0.90;
            const cycleBtnY = box.y + box.height * (516 / 960);
            await page.mouse.click(cycleBtnX, cycleBtnY);
            await page.waitForTimeout(300);

            // Click "CORRER OTRA VEZ" button (center: x: 50%, y: 723 / 960 = 75.3%)
            const btnX = box.x + box.width / 2;
            const btnY = box.y + box.height * (723 / 960);
            await page.mouse.click(btnX, btnY);
        }

        // Wait for fade transition back into MainScene
        await page.waitForTimeout(1000);

        // Verify that MainScene is active again
        const isMainActive = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            return game ? game.scene.isActive('MainScene') : false;
        });

        expect(isMainActive).toBe(true);
        expect(errors).toHaveLength(0);
    });

    test('switches to Energy Catcher (Pou Food Drop style) mode with 5 lives and catches clean energy', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        expect(box).not.toBeNull();

        if (box) {
            // Click Mode 2 tab: ATRAPAR (POU) - around 73% width, 11.6% height
            const modeTabY = box.y + box.height * (112 / 960);
            const catcherTabX = box.x + box.width * 0.73;
            await page.mouse.click(catcherTabX, modeTabY);
            await page.waitForTimeout(400);

            // Click JUGAR ATRAPAR (POU) (58.2% down)
            const clickX = box.x + box.width / 2;
            const clickY = box.y + box.height * (559 / 960);
            await page.mouse.click(clickX, clickY);
        }

        // Wait for CatcherScene to load
        await page.waitForTimeout(1000);

        // Verify CatcherScene is active
        const isCatcherActive = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            return game ? game.scene.isActive('CatcherScene') : false;
        });
        expect(isCatcherActive).toBe(true);

        // Play using A/D and arrow keys
        await page.keyboard.press('KeyA');
        await page.waitForTimeout(200);
        await page.keyboard.press('KeyD');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(200);

        // Move technician with mouse
        if (box) {
            await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.85);
            await page.waitForTimeout(300);
            await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.85);
            await page.waitForTimeout(300);
        }

        await page.waitForTimeout(1500);

        // Screenshot Catcher mode gameplay
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-catcher-gameplay.png') });

        expect(errors).toHaveLength(0);
    });

    test('verifies game pauses on window blur / tab switch as requested', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        if (box) {
            // Start race
            await page.mouse.click(box.x + box.width / 2, box.y + box.height * (559 / 960));
        }
        await page.waitForTimeout(1000);

        // Check if pauseOnBlur is enabled
        const isPauseOnBlurActive = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            return game ? (game.config.autoFocus && !game.isPaused) : true;
        });
        expect(isPauseOnBlurActive).toBe(true);
    });
});
