import { test, expect } from '@playwright/test';

test.describe('Real-time Podium & On-Track Countdown Suite', () => {
    test('Player 1 finishes 1st and sees Player 2 arrive live on WinScene podium', async ({ browser }) => {
        const context1 = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const page1 = await context1.newPage();

        const context2 = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const page2 = await context2.newPage();

        // 1. Both join room POD1
        await page1.goto('/?room=POD1&name=ALFA');
        await page1.waitForTimeout(1000);
        await page2.goto('/?room=POD1&name=BETA');
        await page2.waitForTimeout(1500);

        // 2. Start race
        await page1.evaluate(() => (window as any).networkManager?.startRace());

        // 3. Both transition to MainScene and see starting semáforo
        await page1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game?.scene?.isActive('MainScene');
        }, { timeout: 8000 });

        // Capture screenshot of on-track countdown semáforo
        await page1.waitForTimeout(500);
        await page1.screenshot({ path: 'screenshots/on-track-countdown.png' });

        // 4. Wait for countdown to complete and race to become active
        await page1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            const main = game?.scene?.getScene('MainScene') as any;
            return main && main.isRaceActive === true;
        }, { timeout: 8000 });

        // Force Player 1 to cross finish line first into WinScene
        await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const main = game?.scene?.getScene('MainScene') as any;
            if (main) {
                main.finishRace();
            }
        });

        // 5. Wait for Player 1 to be in WinScene
        await page1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game?.scene?.isActive('WinScene');
        }, { timeout: 8000 });

        // Capture screenshot of Player 1 waiting for rivals on podium
        await page1.waitForTimeout(800);
        await page1.screenshot({ path: 'screenshots/podium-waiting-rivals.png' });

        // Verify Player 1 sees 2° pedestal as '--' initially
        const p2InitialTime = await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const win = game?.scene?.getScene('WinScene') as any;
            const slot2 = win?.pedestalSlots?.find((s: any) => s.rank === 2);
            return slot2?.timeText?.text || '';
        });
        expect(p2InitialTime).toContain('--');

        // 6. Now Player 2 finishes race
        await page2.evaluate(() => {
            const game = (window as any).__phaserGame;
            (window as any).networkManager?.finishRace(48200, 150);
        });

        // 7. Wait for Player 1's WinScene to dynamically update 2° pedestal live!
        await page1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            const win = game?.scene?.getScene('WinScene') as any;
            const slot2 = win?.pedestalSlots?.find((s: any) => s.rank === 2);
            return slot2 && slot2.timeText && slot2.timeText.text && !slot2.timeText.text.includes('--');
        }, { timeout: 6000 });

        // Capture screenshot of live updated podium with Player 2 in 2° place!
        await page1.waitForTimeout(600);
        await page1.screenshot({ path: 'screenshots/podium-live-updated.png' });

        const p2UpdatedName = await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const win = game?.scene?.getScene('WinScene') as any;
            const slot2 = win?.pedestalSlots?.find((s: any) => s.rank === 2);
            return slot2?.nameText?.text || '';
        });
        expect(p2UpdatedName.toUpperCase()).toContain('BETA');

        await context1.close();
        await context2.close();
    });
});
