import { Scene } from 'phaser';
import { TrackObstacle } from '../gameobjects/TrackObstacle';
import { WindGlider } from '../gameobjects/WindGlider';
import { WindTurbo } from '../gameobjects/WindTurbo';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { MAIN_CIRCUIT, SingleCircuitConfig } from '../types/game';
import { InitialGuideModal } from '../ui/InitialGuideModal';
import { networkManager, RemotePlayerInfo } from '../systems/NetworkManager';

interface RoadsideDecoration {
    main: Phaser.GameObjects.Sprite;
    extra?: Phaser.GameObjects.Sprite;
}

interface RemoteGliderObject {
    container: Phaser.GameObjects.Container;
    sprite: Phaser.GameObjects.Sprite;
    nameText: Phaser.GameObjects.Text;
    targetX: number;
    targetDistance: number;
}

export class MainScene extends Scene {
    // Player
    private glider!: WindGlider;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private keyA?: Phaser.Input.Keyboard.Key;
    private keyD?: Phaser.Input.Keyboard.Key;
    private touchSteer: number = 0;

    // Single unified circuit configuration
    private currentCircuit: SingleCircuitConfig = MAIN_CIRCUIT;

    // Track layers
    private trackTile!: Phaser.GameObjects.TileSprite;
    private leftBorderTile!: Phaser.GameObjects.TileSprite;
    private rightBorderTile!: Phaser.GameObjects.TileSprite;

    // Roadside decorations
    private sideDecorations: RoadsideDecoration[] = [];

    // Groups
    private turbos!: Phaser.Physics.Arcade.Group;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private batteries!: Phaser.Physics.Arcade.Group;
    private finishLineObj?: Phaser.Physics.Arcade.Sprite;

    // Telemetry & Race state
    private distanceTraveled: number = 0; // meters (0 to 2,030)
    private readonly targetDistance: number = 2030;
    private cleanKwh: number = 0;
    private raceStartTime: number = 0;
    private isRaceActive: boolean = false;
    private hasSpawnedFinishLine: boolean = false;
    private showGuide: boolean = true;

    // Multiplayer room support
    private isMultiplayer: boolean = false;
    private roomCode?: string;
    private remoteGliders: Map<string, RemoteGliderObject> = new Map();
    private multiScoreboardText?: Phaser.GameObjects.Text;
    private multiScoreboardBg?: Phaser.GameObjects.Graphics;

    constructor() {
        super('MainScene');
    }

    init(data?: { skipGuide?: boolean; multiplayer?: boolean; roomCode?: string }): void {
        this.distanceTraveled = 0;
        this.cleanKwh = 0;
        this.isRaceActive = false;
        this.hasSpawnedFinishLine = false;
        this.finishLineObj = undefined;
        this.sideDecorations = [];
        this.remoteGliders.clear();
        this.showGuide = data?.skipGuide !== true;
        this.isMultiplayer = data?.multiplayer === true || networkManager.isMultiplayerActive();
        this.roomCode = data?.roomCode || networkManager.roomCode || undefined;
        (window as any).__gameActive = false;
    }

    create(): void {
        const { width, height } = this.scale;
        this.raceStartTime = this.time.now;
        SoundFX.unlock();

        // Ensure clean HUD lifecycle
        this.scene.stop('HudScene');
        this.scene.launch('HudScene', { targetDistance: this.targetDistance });

        // ── 1. Track & Borders ──
        this.leftBorderTile = this.add.tileSprite(24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1);
        this.rightBorderTile = this.add.tileSprite(width - 24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1).setFlipX(true);

        // Center smooth aerodynamic racing lane
        this.trackTile = this.add.tileSprite(width / 2, height / 2, width - 96, height, this.currentCircuit.trackKey).setDepth(2);

        // Roadside environmental wind turbines
        for (let i = 0; i < 4; i++) {
            const leftY = 120 + i * 240;
            const rightY = 40 + i * 240;

            const leftTower = this.add.sprite(22, leftY, 'turbine_tower').setScale(1.5).setDepth(3);
            const leftBlades = this.add.sprite(22, leftY - 14, 'turbine_blades').setScale(1.5).setDepth(4);
            const rightTower = this.add.sprite(width - 22, rightY, 'turbine_tower').setScale(1.5).setDepth(3);
            const rightBlades = this.add.sprite(width - 22, rightY - 14, 'turbine_blades').setScale(1.5).setDepth(4);

            this.sideDecorations.push(
                { main: leftTower, extra: leftBlades },
                { main: rightTower, extra: rightBlades }
            );
        }

        // ── 2. Glider / Speeder ──
        this.glider = new WindGlider(this, width / 2, height - 160, this.currentCircuit.vehicleKey, this.currentCircuit.themeColorHex);

        // ── 3. Groups & Overlaps ──
        this.turbos = this.physics.add.group({ runChildUpdate: false });
        this.obstacles = this.physics.add.group({ runChildUpdate: false });
        this.batteries = this.physics.add.group({ runChildUpdate: false });

        this.physics.add.overlap(
            this.glider,
            this.turbos,
            this.handleTurboCollect as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.glider,
            this.obstacles,
            this.handleObstacleHit as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        this.physics.add.overlap(
            this.glider,
            this.batteries,
            this.handleBatteryCollect as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
            undefined,
            this
        );

        // ── 4. Input (Keyboard + Direct Touch/Click) ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        }

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!this.isRaceActive) return;
            const { width } = this.scale;
            this.touchSteer = pointer.x < width / 2 ? -1 : 1;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!this.isRaceActive || !pointer.isDown) return;
            const { width } = this.scale;
            this.touchSteer = pointer.x < width / 2 ? -1 : 1;
        });

        this.input.on('pointerup', () => {
            this.touchSteer = 0;
        });

        // ── 5. Spawner Timers ──
        this.time.addEvent({
            delay: 650,
            callback: this.spawnTrackElements,
            callbackScope: this,
            loop: true
        });

        // ── 6. Multiplayer Widget & Network Sync ──
        if (this.isMultiplayer) {
            const sbX = 14;
            const sbY = 96;
            const sbW = 184;
            const sbH = 90;

            this.multiScoreboardBg = this.add.graphics().setDepth(150);
            this.multiScoreboardBg.fillStyle(0x0F172A, 0.90);
            this.multiScoreboardBg.fillRect(sbX, sbY, sbW, sbH);
            this.multiScoreboardBg.lineStyle(1.5, 0x0284C7, 1);
            this.multiScoreboardBg.strokeRect(sbX, sbY, sbW, sbH);

            this.multiScoreboardText = this.add.text(sbX + 8, sbY + 6, `SALA: ${this.roomCode || 'ONLINE'}\nCONECTANDO...`, {
                fontSize: '9px',
                fontFamily: "'Silkscreen', monospace",
                color: '#38BDF8',
                lineSpacing: 3,
                resolution: 3
            }).setDepth(151);

            EventBus.on(GameEvents.PLAYERS_STATE, this.handleRemotePlayersState, this);
            EventBus.on(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
        }

        // Clean up listeners on shutdown
        this.events.once('shutdown', () => {
            EventBus.off(GameEvents.PLAYERS_STATE, this.handleRemotePlayersState, this);
            EventBus.off(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
        });

        // ── 7. Race Initialization ──
        if (this.showGuide) {
            new InitialGuideModal(this, {
                mode: 'race',
                durationSeconds: 10,
                onComplete: () => {
                    this.startActiveRace();
                }
            });
        } else {
            this.startActiveRace();
        }
    }

    private startActiveRace(): void {
        this.isRaceActive = true;
        this.raceStartTime = this.time.now;
        (window as any).__gameActive = true;
    }

    update(_time: number, delta: number): void {
        if (!this.isRaceActive) return;

        const currentSpeed = this.glider.speed;
        const baseScroll = (currentSpeed / 45) * (delta / 16.666) * 5;

        // Animate Roadside Turbines
        for (const deco of this.sideDecorations) {
            deco.main.y += baseScroll * 1.0;
            if (deco.extra) {
                deco.extra.y += baseScroll * 1.0;
                deco.extra.angle += currentSpeed * 0.08;
            }
            if (deco.main.y > this.scale.height + 60) {
                deco.main.y = -60;
                if (deco.extra) deco.extra.y = -74;
            }
        }

        // Scroll track
        this.trackTile.tilePositionY -= baseScroll;
        this.leftBorderTile.tilePositionY -= baseScroll;
        this.rightBorderTile.tilePositionY -= baseScroll;

        // Player Controls
        const touch = (window as any).__touchControls;
        const activePtr = this.input.activePointer;
        const ptrSteer = (activePtr && activePtr.isDown) ? (activePtr.x < this.scale.width / 2 ? -1 : 1) : 0;

        let moveX = 0;
        if (this.cursors?.left.isDown || this.keyA?.isDown || this.touchSteer < 0 || ptrSteer < 0 || touch?.left) moveX = -1;
        else if (this.cursors?.right.isDown || this.keyD?.isDown || this.touchSteer > 0 || ptrSteer > 0 || touch?.right) moveX = 1;

        if (moveX < 0) this.glider.steerLeft();
        else if (moveX > 0) this.glider.steerRight();
        else this.glider.centerSteering();

        // Update Track Objects (turbos, obstacles, batteries)
        this.updateTrackObjects(baseScroll);

        // Distance Progression
        const metersThisFrame = (currentSpeed / 3.6) * (delta / 1000) * 1.8;
        this.distanceTraveled += metersThisFrame;

        const curDist = Math.min(this.targetDistance, Math.round(this.distanceTraveled));
        const progressPct = (curDist / this.targetDistance) * 100;
        EventBus.emit(GameEvents.DISTANCE_UPDATED, {
            current: curDist,
            target: this.targetDistance,
            progress: progressPct,
            distance: curDist
        });

        EventBus.emit(GameEvents.SPEED_UPDATED, Math.round(currentSpeed));

        // Spawn finish line banner at 2000m
        if (this.distanceTraveled >= this.targetDistance - 30 && !this.hasSpawnedFinishLine) {
            this.spawnFinishLine();
        }

        // Scroll finish line
        if (this.finishLineObj) {
            this.finishLineObj.y += baseScroll * 1.2;
            if (this.finishLineObj.y >= this.glider.y) {
                this.finishRace();
            }
        }

        // ── Multiplayer Position Sync & Interpolation ──
        if (this.isMultiplayer) {
            networkManager.sendPlayerUpdate(this.glider.x, this.distanceTraveled, currentSpeed);

            const { height } = this.scale;
            const localGliderY = height - 160;

            for (const [, remote] of this.remoteGliders) {
                if (!remote.container.visible) continue;

                // Smooth interpolation of rival X
                remote.container.x += (remote.targetX - remote.container.x) * 0.25;

                // Relative Y based on track distance delta
                const deltaDist = remote.targetDistance - this.distanceTraveled;
                const targetY = localGliderY - deltaDist * 2.2;
                remote.container.y += (targetY - remote.container.y) * 0.25;

                // Hide if far off screen
                const isVisible = remote.container.y > -80 && remote.container.y < height + 80;
                remote.container.setVisible(isVisible);
            }
        }
    }

    private handleRemotePlayersState(players: RemotePlayerInfo[]): void {
        if (!this.isMultiplayer) return;

        // 1. Leaderboard & Telemetry
        const sorted = [...players].sort((a, b) => b.distance - a.distance);
        const total = sorted.length;
        const myIdx = sorted.findIndex(p => p.id === networkManager.playerId);
        const myRank = myIdx !== -1 ? myIdx + 1 : 1;

        let standingsStr = `SALA: ${this.roomCode || 'ONLINE'} (${total}P)\n`;
        const showCount = Math.min(4, total);
        for (let i = 0; i < showCount; i++) {
            const p = sorted[i];
            const isMe = p.id === networkManager.playerId;
            const tag = isMe ? 'TÚ' : p.name.slice(0, 6);
            standingsStr += `${i + 1}° ${tag}: ${Math.round(p.distance)}m\n`;
        }
        if (myRank > 4) {
            standingsStr += `..\n${myRank}° TÚ: ${Math.round(this.distanceTraveled)}m\n`;
        }

        if (this.multiScoreboardText) {
            this.multiScoreboardText.setText(standingsStr.trim());
        }

        // 2. Spatial Culling: exactly 2 ahead and 2 behind
        const aheadRivals = players
            .filter(p => p.id !== networkManager.playerId && p.distance >= this.distanceTraveled)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 2);

        const behindRivals = players
            .filter(p => p.id !== networkManager.playerId && p.distance < this.distanceTraveled)
            .sort((a, b) => b.distance - a.distance)
            .slice(0, 2);

        const activeRivals = [...aheadRivals, ...behindRivals];
        const activeIds = new Set<string>(activeRivals.map(r => r.id));

        for (const p of activeRivals) {
            let remote = this.remoteGliders.get(p.id);
            if (!remote) {
                const container = this.add.container(p.x, -200).setDepth(10);
                const sprite = this.add.sprite(0, 0, this.currentCircuit.vehicleKey).setScale(1.2);
                sprite.setTint(p.color || 0xF59E0B);

                const nameText = this.add.text(0, -28, p.name, {
                    fontSize: '9px',
                    fontFamily: "'Silkscreen', monospace",
                    color: '#FFFFFF',
                    backgroundColor: '#0F172A',
                    padding: { left: 4, right: 4, top: 2, bottom: 2 },
                    resolution: 3
                }).setOrigin(0.5);

                container.add(sprite);
                container.add(nameText);

                remote = {
                    container,
                    sprite,
                    nameText,
                    targetX: p.x,
                    targetDistance: p.distance
                };
                this.remoteGliders.set(p.id, remote);
            }

            remote.targetX = p.x;
            remote.targetDistance = p.distance;
            remote.container.setVisible(true);
        }

        // Hide rivals that are not in the 4-rival active frustum
        for (const [id, remote] of this.remoteGliders) {
            if (!activeIds.has(id)) {
                remote.container.setVisible(false);
            }
        }
    }

    private handlePeerFinished(data: { name: string; rank: number }): void {
        this.showPopup(this.scale.width / 2, 200, `¡${data.name} CRUZO EN ${data.rank}°!`, '#F59E0B');
    }

    private updateTrackObjects(scrollSpeed: number): void {
        const { height } = this.scale;

        // Move Turbos
        this.turbos.children.each((child) => {
            const turbo = child as WindTurbo;
            turbo.y += scrollSpeed;
            if (turbo.y > height + 60) turbo.destroy();
            return null;
        });

        // Move Obstacles
        this.obstacles.children.each((child) => {
            const obs = child as TrackObstacle;
            obs.y += scrollSpeed;
            if (obs.y > height + 60) obs.destroy();
            return null;
        });

        // Move Batteries
        this.batteries.children.each((child) => {
            const bat = child as Phaser.Physics.Arcade.Sprite;
            bat.y += scrollSpeed;
            if (bat.y > height + 60) bat.destroy();
            return null;
        });
    }

    private spawnTrackElements(): void {
        if (!this.isRaceActive || this.hasSpawnedFinishLine) return;

        const { width } = this.scale;
        const spawnX = Phaser.Math.Between(80, width - 80);
        const roll = Math.random();

        if (roll < 0.35) {
            const battery = this.physics.add.sprite(spawnX, -40, this.currentCircuit.batteryKey);
            battery.setScale(2.0).setDepth(5);
            this.batteries.add(battery);
        } else if (roll < 0.65) {
            const turbo = new WindTurbo(this, spawnX, -40, this.currentCircuit.turboKey, this.currentCircuit.themeColorHex);
            this.turbos.add(turbo);
        } else {
            const obsKey = Phaser.Math.RND.pick(this.currentCircuit.obstacleKeys);
            const obstacle = new TrackObstacle(this, spawnX, -40, obsKey as any);
            this.obstacles.add(obstacle);
        }
    }

    private handleTurboCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        turboObj: Phaser.GameObjects.GameObject
    ): void {
        const turbo = turboObj as WindTurbo;
        if (turbo.isCollected) return;

        turbo.collect();
        this.glider.applyTurboBoost();
        this.cleanKwh += 5;

        SoundFX.playWindTurbo();
        this.cameras.main.flash(180, 2, 132, 199, false);

        EventBus.emit(GameEvents.SCORE_UPDATED, this.cleanKwh);
        this.showPopup(this.glider.x, this.glider.y - 40, '+50 KM/H TURBO', '#0284C7');
    }

    private handleObstacleHit(
        _gliderObj: Phaser.GameObjects.GameObject,
        obstacleObj: Phaser.GameObjects.GameObject
    ): void {
        const obs = obstacleObj as TrackObstacle;
        if (obs.isHit || this.glider.isSpinningOut) return;
        obs.hit();
        this.glider.triggerSpinOut();

        SoundFX.playSpinOut();
        this.cameras.main.shake(300, 0.015);
        this.showPopup(this.glider.x, this.glider.y - 40, '¡TROMPO! -VELOCIDAD', '#DC2626');
    }

    private handleBatteryCollect(
        _gliderObj: Phaser.GameObjects.GameObject,
        batteryObj: Phaser.GameObjects.GameObject
    ): void {
        const battery = batteryObj as Phaser.Physics.Arcade.Sprite;
        battery.destroy();

        this.cleanKwh += 15;
        SoundFX.playCollect(2);

        EventBus.emit(GameEvents.SCORE_UPDATED, this.cleanKwh);
        this.showPopup(battery.x, battery.y, '+15 kWh LIMPIA', '#16A34A');
    }

    private spawnFinishLine(): void {
        this.hasSpawnedFinishLine = true;
        const { width } = this.scale;
        this.finishLineObj = this.physics.add.sprite(width / 2, -50, 'finish_line');
        this.finishLineObj.setScale(2.5, 2.0).setDepth(6);
    }

    private showPopup(x: number, y: number, text: string, color: string): void {
        const popup = this.add.text(x, y, text, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: color
        }).setOrigin(0.5).setDepth(20);

        this.tweens.add({
            targets: popup,
            y: y - 35,
            alpha: 0,
            duration: 600,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy()
        });
    }

    private finishRace(): void {
        if (!this.isRaceActive) return;
        this.isRaceActive = false;
        (window as any).__gameActive = false;

        const totalTimeMs = Math.round(this.time.now - this.raceStartTime);
        const totalTimeSeconds = (totalTimeMs / 1000).toFixed(1);
        SoundFX.playWin();

        if (this.isMultiplayer) {
            networkManager.finishRace(totalTimeMs, this.cleanKwh);
        }

        let finalRank = networkManager.myFinishRank;
        if (!finalRank && this.isMultiplayer) {
            const finishedCount = networkManager.roomPlayers.filter(p => p.finished).length;
            finalRank = finishedCount + 1;
        }

        const podiumData = networkManager.roomPodium.length > 0
            ? networkManager.roomPodium
            : undefined;

        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(250, 241, 245, 249);
        this.time.delayedCall(250, () => {
            this.scene.start('WinScene', {
                mode: 'race',
                time: totalTimeSeconds,
                kwh: this.cleanKwh,
                distance: this.targetDistance,
                multiplayer: this.isMultiplayer,
                rank: finalRank || 1,
                totalPlayers: networkManager.totalPlayersInRoom || networkManager.roomPlayers.length || 1,
                podium: podiumData
            });
        });
    }
}
