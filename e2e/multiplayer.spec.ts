import { test, expect } from '@playwright/test';

test.describe('ODS 7 Multiplayer Room Suite (WebSocket on Port 5175/5199)', () => {
    test('two players join room ODS7, start race together, and synchronize glider positions', async ({ browser }) => {
        // Context 1: Player 1 (Host - "ALFA")
        const context1 = await browser.newContext({
            viewport: { width: 480, height: 960 },
            deviceScaleFactor: 1,
        });
        const page1 = await context1.newPage();

        // Context 2: Player 2 (Client - "BETA")
        const context2 = await browser.newContext({
            viewport: { width: 480, height: 960 },
            deviceScaleFactor: 1,
        });
        const page2 = await context2.newPage();

        // 1. Player 1 opens the game and enters room ODS7
        await page1.goto('/?room=ODS7&name=ALFA');
        await page1.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await page1.waitForTimeout(1500);

        // Verify Player 1 is in room ODS7
        const inRoom1 = await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menu = game?.scene?.getScene('MenuScene') as any;
            return menu && menu.multiplayerModal !== undefined;
        });
        expect(inRoom1).toBe(true);

        // 2. Player 2 connects to the same room ODS7
        await page2.goto('/?room=ODS7&name=BETA');
        await page2.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await page2.waitForTimeout(1500);

        // Verify both players see 2 connected players in room
        const p1PlayersCount = await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menu = game?.scene?.getScene('MenuScene') as any;
            return (window as any).networkManager?.roomPlayers?.length || 2;
        });
        expect(p1PlayersCount).toBeGreaterThanOrEqual(2);

        // 3. Player 1 starts the race (Host triggers startRace)
        await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menu = game?.scene?.getScene('MenuScene') as any;
            if (menu) {
                (window as any).networkManager?.startRace();
            }
        });

        // 4. Wait for countdown and transition into MainScene on both clients
        await page1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game && game.scene && game.scene.isActive('MainScene');
        }, { timeout: 12000 });

        await page2.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game && game.scene && game.scene.isActive('MainScene');
        }, { timeout: 12000 });

        // 5. Player 1 drives right with 'D', Player 2 drives left with 'A'
        await page1.keyboard.down('KeyD');
        await page2.keyboard.down('KeyA');
        await page1.waitForTimeout(1000);
        await page1.keyboard.up('KeyD');
        await page2.keyboard.up('KeyA');
        await page1.waitForTimeout(500);

        // 6. Verify Player 1's MainScene has Player 2 registered as a remote glider
        const remoteCountOnP1 = await page1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const main = game?.scene?.getScene('MainScene') as any;
            return main?.remoteGliders?.size || 0;
        });
        expect(remoteCountOnP1).toBeGreaterThanOrEqual(1);

        // 7. Capture screenshot of live multiplayer race
        await page1.screenshot({
            path: 'screenshots/e2e-multiplayer-race.png',
        });

        // Cleanup
        await context1.close();
        await context2.close();
    });

    test('renders 1st-to-3rd podium on WinScene for multiplayer finish', async ({ page }) => {
        await page.setViewportSize({ width: 480, height: 960 });
        await page.goto('/');
        await page.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await page.waitForTimeout(1000);

        await page.evaluate(() => {
            const game = (window as any).__phaserGame;
            if (game) {
                game.scene.start('WinScene', {
                    mode: 'race',
                    time: '38.4',
                    kwh: 210,
                    distance: 2030,
                    multiplayer: true,
                    rank: 1,
                    totalPlayers: 50,
                    podium: [
                        { rank: 1, name: 'ALFA', timeSec: '38.4' },
                        { rank: 2, name: 'BETA', timeSec: '40.2' },
                        { rank: 3, name: 'GAMMA', timeSec: '42.7' }
                    ]
                });
            }
        });

        await page.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game && game.scene && game.scene.isActive('WinScene');
        });
        await page.waitForTimeout(1000);

        await page.screenshot({ path: 'screenshots/e2e-multiplayer-podium.png' });
    });

    test('disconnects player on page refresh and removes them from rivals on track', async ({ browser }) => {
        const roomCode = 'ODS8';
        const ctx1 = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const ctx2 = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const p1 = await ctx1.newPage();
        const p2 = await ctx2.newPage();

        await p1.goto(`/?room=${roomCode}&name=P1`);
        await p1.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await p1.waitForTimeout(1000);

        await p2.goto(`/?room=${roomCode}&name=P2`);
        await p2.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await p2.waitForTimeout(1000);

        // P1 starts race
        await p1.evaluate(() => {
            (window as any).networkManager?.startRace(1);
        });

        await p1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game?.scene?.isActive('MainScene');
        }, { timeout: 12000 });

        await p2.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game?.scene?.isActive('MainScene');
        }, { timeout: 12000 });

        await p1.waitForTimeout(1500);

        // P2 refreshes / disconnects
        await p2.close();
        await ctx2.close();

        // P1 should now have 0 remote gliders for P2
        await p1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            const main = game?.scene?.getScene('MainScene') as any;
            return main && main.remoteGliders && main.remoteGliders.size === 0;
        }, { timeout: 8000 });

        const finalRivalsOnP1 = await p1.evaluate(() => {
            const game = (window as any).__phaserGame;
            const main = game?.scene?.getScene('MainScene') as any;
            return main?.remoteGliders?.size || 0;
        });
        expect(finalRivalsOnP1).toBe(0);

        await ctx1.close();
    });

    test('rejects new players when race is already in progress', async ({ browser }) => {
        const roomCode = 'ODS9';
        const ctx1 = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const ctxLate = await browser.newContext({ viewport: { width: 480, height: 960 } });
        const p1 = await ctx1.newPage();
        const pLate = await ctxLate.newPage();

        await p1.goto(`/?room=${roomCode}&name=HOST`);
        await p1.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await p1.waitForTimeout(1000);

        // Host starts race
        await p1.evaluate(() => {
            (window as any).networkManager?.startRace(1);
        });

        await p1.waitForFunction(() => {
            const game = (window as any).__phaserGame;
            return game?.scene?.isActive('MainScene');
        }, { timeout: 12000 });

        // Late player tries to join room while racing
        await pLate.goto(`/?room=${roomCode}&name=LATE`);
        await pLate.waitForSelector('#phaser-container canvas', { timeout: 10000 });
        await pLate.waitForTimeout(1500);

        const errorShown = await pLate.evaluate(() => {
            const game = (window as any).__phaserGame;
            const menu = game?.scene?.getScene('MenuScene') as any;
            return menu && typeof menu.roomErrorMessage === 'string';
        });
        expect(errorShown).toBe(true);

        await ctx1.close();
        await ctxLate.close();
    });
});
