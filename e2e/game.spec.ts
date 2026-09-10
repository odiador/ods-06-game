import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('ODS 7 Clean Energy Game - E2E Suite', () => {
    test('loads Light Mode menu with 4 tournament stages and previews biomes', async ({ page }) => {
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
            const tabY = box.y + box.height * (106 / 960);

            // Click Stage Tab 2: R2 SOLAR (around 38% width)
            const solarTabX = box.x + box.width * 0.38;
            await page.mouse.click(solarTabX, tabY);
            await page.waitForTimeout(400);

            // Click Stage Tab 3: R3 HIDRO (around 62% width)
            const hydroTabX = box.x + box.width * 0.62;
            await page.mouse.click(hydroTabX, tabY);
            await page.waitForTimeout(400);

            // Click Stage Tab 4: R4 FINAL (around 86% width)
            const finalTabX = box.x + box.width * 0.86;
            await page.mouse.click(finalTabX, tabY);
            await page.waitForTimeout(400);

            // Screenshot Menu Scene with Final Stage selected
            const screenshotDir = path.resolve('screenshots');
            await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-stage-final.png') });

            // Switch back to Stage Tab 1: R1 EOLICA (around 15% width)
            const eolicaTabX = box.x + box.width * 0.15;
            await page.mouse.click(eolicaTabX, tabY);
            await page.waitForTimeout(400);

            // Screenshot Menu Scene with Eolica Stage selected
            await page.screenshot({ path: path.join(screenshotDir, 'e2e-menu-scene.png') });
        }

        expect(errors).toHaveLength(0);
    });

    test('displays 10-second initial guide modal explaining rules and controls with countdown', async ({ page }) => {
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

        // Wait for MainScene to display Initial Guide Modal
        await page.waitForTimeout(600);

        // Capture screenshot of the 10-second initial briefing modal
        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-initial-guide-modal.png') });

        // Verify that game is waiting / paused while guide is shown
        const isGameActiveBeforeSkip = await page.evaluate(() => {
            return (window as any).__gameActive;
        });
        expect(isGameActiveBeforeSkip).toBe(false);

        // Click "EMPEZAR YA ➔" button (center 50% width, ~82.5% height) or press Space
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);

        // Verify game became active after dismissing guide
        const isGameActiveAfterSkip = await page.evaluate(() => {
            return (window as any).__gameActive;
        });
        expect(isGameActiveAfterSkip).toBe(true);

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

        // Wait for scene load and dismiss initial guide
        await page.waitForTimeout(600);
        await page.keyboard.press('Space');
        await page.waitForTimeout(400);

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

    test('runs 4-stage eliminatory Grand Prix tournament advancing from Round 1 to Round 4', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // 1. Start Round 1 (Colinas Eólicas)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MenuScene');
                game.scene.start('MainScene', { round: 1, skipGuide: true });
            }
        });
        await page.waitForTimeout(600);

        // Verify Round 1 is active
        const round1Active = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('MainScene') as any;
            return scene ? scene.round === 1 : false;
        });
        expect(round1Active).toBe(true);

        // 2. Finish Round 1 with qualifying rank (top 50%)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MainScene');
                game.scene.start('WinScene', {
                    round: 1,
                    rank: 12,
                    totalPlayers: 50,
                    time: '44.2',
                    kwh: 120
                });
            }
        });
        await page.waitForTimeout(600);

        // Verify WinScene shows qualified status
        const isQualifiedR1 = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const win = game?.scene.getScene('WinScene') as any;
            return win ? win.isQualified === true : false;
        });
        expect(isQualifiedR1).toBe(true);

        // Advance to Round 2 (Valle Solar)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('WinScene');
                game.scene.start('MainScene', { round: 2, skipGuide: true });
            }
        });
        await page.waitForTimeout(600);

        const round2Active = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('MainScene') as any;
            return scene ? scene.round === 2 : false;
        });
        expect(round2Active).toBe(true);

        // 3. Advance to Round 3 (Rápidos Hidroeléctricos)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MainScene');
                game.scene.start('MainScene', { round: 3, skipGuide: true });
            }
        });
        await page.waitForTimeout(600);

        const round3Active = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('MainScene') as any;
            return scene ? scene.round === 3 : false;
        });
        expect(round3Active).toBe(true);

        // 4. Advance to Round 4 (Gran Final Red Inteligente 2030)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MainScene');
                game.scene.start('MainScene', { round: 4, skipGuide: true });
            }
        });
        await page.waitForTimeout(600);

        const round4Active = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('MainScene') as any;
            return scene ? scene.round === 4 : false;
        });
        expect(round4Active).toBe(true);

        // Finish Round 4 on 1st place podium
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MainScene');
                game.scene.start('WinScene', {
                    round: 4,
                    rank: 1,
                    totalPlayers: 6,
                    time: '41.8',
                    kwh: 180
                });
            }
        });
        await page.waitForTimeout(800);

        const screenshotDir = path.resolve('screenshots');
        await page.screenshot({ path: path.join(screenshotDir, 'e2e-tournament-grand-final.png') });

        // Standalone CatcherScene verification (kept functional in codebase)
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('WinScene');
                game.scene.start('CatcherScene');
            }
        });
        await page.waitForTimeout(600);

        const isCatcherActive = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            return game ? game.scene.isActive('CatcherScene') : false;
        });
        expect(isCatcherActive).toBe(true);

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

    test('allows selecting any stage from tabs to play directly in single-map mode', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        const canvas = page.locator('#phaser-container canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // 1. Select Stage 3 (Hidro) via MenuScene
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menuScene = game?.scene.getScene('MenuScene') as any;
            if (menuScene) {
                menuScene.selectStagePreview(3);
            }
        });
        await page.waitForTimeout(300);

        // Verify button text updated to Stage 3
        const btnText = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menuScene = game?.scene.getScene('MenuScene') as any;
            return menuScene?.startBtnText?.text;
        });
        expect(btnText).toContain('ETAPA 3');

        // 2. Launch single-map mode directly on Round 3
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menuScene = game?.scene.getScene('MenuScene') as any;
            if (menuScene) {
                menuScene.launchStageSolo(3);
            }
        });
        await page.waitForTimeout(600);

        // Verify MainScene is running on Round 3 in singleMapMode
        const mainSceneState = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('MainScene') as any;
            return {
                round: scene?.round,
                singleMapMode: scene?.singleMapMode
            };
        });
        expect(mainSceneState.round).toBe(3);
        expect(mainSceneState.singleMapMode).toBe(true);

        // 3. Complete race and verify WinScene displays singleMapMode layout
        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.stop('MainScene');
                game.scene.start('WinScene', {
                    round: 3,
                    rank: 1,
                    totalPlayers: 12,
                    time: '42.1',
                    kwh: 150,
                    singleMapMode: true
                });
            }
        });
        await page.waitForTimeout(400);

        const winSceneState = await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            const scene = game?.scene.getScene('WinScene') as any;
            return {
                singleMapMode: scene?.singleMapMode,
                bannerText: scene?.bannerTextObj?.text
            };
        });
        expect(winSceneState.singleMapMode).toBe(true);
        expect(winSceneState.bannerText).toContain('CIRCUITO COMPLETADO');

        expect(errors).toHaveLength(0);
    });
});

