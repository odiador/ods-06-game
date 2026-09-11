import { Scene } from 'phaser';
import { TrackObstacle } from '../gameobjects/TrackObstacle';
import { WindGlider } from '../gameobjects/WindGlider';
import { WindTurbo } from '../gameobjects/WindTurbo';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { TOURNAMENT_ROUNDS, TournamentRoundConfig, computeTournamentMaxRounds, computeQualificationCutoff, getCutoffDescription } from '../types/game';
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

    // Tournament configuration
    private round: number = 1;
    private maxRounds: number = 4;
    private currentCircuit: TournamentRoundConfig = TOURNAMENT_ROUNDS[1];
    private totalTournamentPlayers: number = 50;
    private qualifiedCutoff: number = 25;

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
    private latestRemotePlayers: Map<string, RemotePlayerInfo> = new Map();
    private lastLeaderboardUpdate: number = 0;

    // Background tab simulation & state
    private backgroundWorker: Worker | null = null;
    private lastHiddenTime: number = 0;
    private hasFinished: boolean = false;

    // Countdown and starting grid
    private countdownSeconds: number = 0;
    private countdownContainer?: Phaser.GameObjects.Container;
    private countdownTimer?: Phaser.Time.TimerEvent;
    private countdownLightsGfx?: Phaser.GameObjects.Graphics;
    private countdownLabelText?: Phaser.GameObjects.Text;
    private startAt: number = 0;
    private targetStartLocalTime: number = 0;
    private lastCountdownSec: number = -1;
    private spawnTimer?: Phaser.Time.TimerEvent;
    private startLineObj?: Phaser.GameObjects.Sprite;
    private idleGliderTween?: Phaser.Tweens.Tween;

    private singleMapMode: boolean = false;

    constructor() {
        super('MainScene');
    }

    init(data?: {
        round?: number;
        maxRounds?: number;
        skipGuide?: boolean;
        multiplayer?: boolean;
        roomCode?: string;
        countdownSeconds?: number;
        singleMapMode?: boolean;
        startAt?: number;
        serverTime?: number;
    }): void {
        this.round = data?.round && TOURNAMENT_ROUNDS[data.round] ? data.round : 1;
        this.currentCircuit = TOURNAMENT_ROUNDS[this.round];
        this.distanceTraveled = 0;
        this.cleanKwh = 0;
        this.isRaceActive = false;
        this.hasFinished = false;
        this.lastHiddenTime = 0;
        this.lastLeaderboardUpdate = 0;
        this.latestRemotePlayers.clear();
        this.hasSpawnedFinishLine = false;
        this.finishLineObj = undefined;
        this.startLineObj = undefined;
        this.sideDecorations = [];
        this.remoteGliders.clear();
        this.showGuide = data?.skipGuide !== true;
        this.isMultiplayer = data?.multiplayer === true || networkManager.isMultiplayerActive();
        this.roomCode = data?.roomCode || networkManager.roomCode || undefined;
        this.countdownSeconds = data?.countdownSeconds !== undefined ? data.countdownSeconds : (this.isMultiplayer ? 3 : 0);
        this.countdownContainer = undefined;
        this.countdownTimer = undefined;
        this.countdownLightsGfx = undefined;
        this.countdownLabelText = undefined;
        this.idleGliderTween = undefined;

        this.startAt = data?.startAt || networkManager.serverStartAt || 0;
        if (this.isMultiplayer && this.startAt > 0) {
            this.targetStartLocalTime = this.startAt - networkManager.serverClockOffset;
        } else if (this.isMultiplayer && this.countdownSeconds > 0) {
            this.targetStartLocalTime = Date.now() + this.countdownSeconds * 1000;
        } else {
            this.targetStartLocalTime = 0;
        }
        this.lastCountdownSec = -1;

        this.singleMapMode = data?.singleMapMode === true;
        if (this.isMultiplayer) {
            this.totalTournamentPlayers = networkManager.totalPlayersInRoom || networkManager.roomPlayers.length || 2;
            this.maxRounds = data?.maxRounds || networkManager.maxRounds || computeTournamentMaxRounds(this.totalTournamentPlayers, this.singleMapMode);
        } else {
            this.totalTournamentPlayers = this.singleMapMode ? 1 : (this.round === 1 ? 50 : this.round === 2 ? 25 : this.round === 3 ? 12 : 6);
            this.maxRounds = this.singleMapMode ? 1 : 4;
        }
        this.qualifiedCutoff = computeQualificationCutoff(this.round, this.maxRounds, this.totalTournamentPlayers);
        (window as any).__gameActive = false;
    }

    create(): void {
        const { width, height } = this.scale;
        this.cameras.main.setRoundPixels(true);
        this.raceStartTime = this.time.now;
        SoundFX.unlock();

        // Ensure clean HUD lifecycle with current round info
        this.scene.stop('HudScene');
        const dynCutoffDesc = getCutoffDescription(this.round, this.maxRounds, this.totalTournamentPlayers);
        this.scene.launch('HudScene', {
            targetDistance: this.targetDistance,
            round: this.round,
            maxRounds: this.maxRounds,
            circuitName: this.currentCircuit.name,
            cutoffDescription: dynCutoffDesc
        });

        // ── 1. Track & Borders ──
        this.leftBorderTile = this.add.tileSprite(24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1);
        this.rightBorderTile = this.add.tileSprite(width - 24, height / 2, 48, height, this.currentCircuit.borderKey).setDepth(1).setFlipX(true);

        // Center smooth aerodynamic racing lane
        this.trackTile = this.add.tileSprite(width / 2, height / 2, width - 96, height, this.currentCircuit.trackKey).setDepth(2);

        // Roadside environmental decorations based on current biome
        this.sideDecorations = [];
        const decoType = this.currentCircuit.sideDecoration;
        for (let i = 0; i < 4; i++) {
            const leftY = 120 + i * 240;
            const rightY = 40 + i * 240;

            if (decoType === 'turbines') {
                const leftTower = this.add.sprite(22, leftY, 'turbine_tower').setScale(1.5).setDepth(3);
                const leftBlades = this.add.sprite(22, leftY - 14, 'turbine_blades').setScale(1.5).setDepth(4);
                const rightTower = this.add.sprite(width - 22, rightY, 'turbine_tower').setScale(1.5).setDepth(3);
                const rightBlades = this.add.sprite(width - 22, rightY - 14, 'turbine_blades').setScale(1.5).setDepth(4);
                this.sideDecorations.push(
                    { main: leftTower, extra: leftBlades },
                    { main: rightTower, extra: rightBlades }
                );
            } else if (decoType === 'solar_towers') {
                const leftTower = this.add.sprite(22, leftY, 'solar_tower').setScale(1.5).setDepth(3);
                const rightTower = this.add.sprite(width - 22, rightY, 'solar_tower').setScale(1.5).setDepth(3);
                this.sideDecorations.push({ main: leftTower }, { main: rightTower });
            } else if (decoType === 'hydro_pylons') {
                const leftTower = this.add.sprite(22, leftY, 'hydro_pylon').setScale(1.5).setDepth(3);
                const rightTower = this.add.sprite(width - 22, rightY, 'hydro_pylon').setScale(1.5).setDepth(3);
                this.sideDecorations.push({ main: leftTower }, { main: rightTower });
            } else {
                // grid_towers
                const leftTower = this.add.sprite(22, leftY, 'grid_tower').setScale(1.5).setDepth(3);
                const rightTower = this.add.sprite(width - 22, rightY, 'grid_tower').setScale(1.5).setDepth(3);
                this.sideDecorations.push({ main: leftTower }, { main: rightTower });
            }
        }

        // ── 2. Glider / Speeder ──
        const myInfo = this.isMultiplayer ? networkManager.roomPlayers.find(p => p.id === networkManager.playerId) : undefined;
        const initialGliderX = (this.isMultiplayer && myInfo && typeof myInfo.x === 'number') ? myInfo.x : width / 2;
        this.glider = new WindGlider(this, initialGliderX, height - 160, this.currentCircuit.vehicleKey, this.currentCircuit.themeColorHex);

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
        this.spawnTimer = this.time.addEvent({
            delay: 650,
            callback: this.spawnTrackElements,
            callbackScope: this,
            loop: true,
            paused: this.countdownSeconds > 0
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
                lineSpacing: 3
            }).setDepth(151);

            EventBus.on(GameEvents.PLAYERS_STATE, this.handleRemotePlayersState, this);
            EventBus.on(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
            EventBus.on(GameEvents.PLAYER_LEFT, this.handlePlayerLeft, this);
            EventBus.on(GameEvents.RACE_STARTED, this.handleServerRaceStarted, this);

            // Populate starting grid with existing room players immediately
            if (networkManager.roomPlayers.length > 0) {
                this.handleRemotePlayersState(networkManager.roomPlayers);
            }
            networkManager.sendPlayerUpdate(this.glider.x, this.distanceTraveled, 0);
        }

        // Initialize background tab simulation
        this.initBackgroundSimulation();
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', this.handleVisibilityChange);
        }

        // Clean up listeners on shutdown
        this.events.once('shutdown', () => {
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', this.handleVisibilityChange);
            }
            this.stopBackgroundSimulation();
            if (this.backgroundWorker) {
                this.backgroundWorker.terminate();
                this.backgroundWorker = null;
            }
            EventBus.off(GameEvents.PLAYERS_STATE, this.handleRemotePlayersState, this);
            EventBus.off(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
            EventBus.off(GameEvents.PLAYER_LEFT, this.handlePlayerLeft, this);
            EventBus.off(GameEvents.RACE_STARTED, this.handleServerRaceStarted, this);
            if (this.countdownTimer) {
                this.countdownTimer.remove(false);
                this.countdownTimer = undefined;
            }
            if (this.idleGliderTween) {
                this.idleGliderTween.stop();
                this.idleGliderTween = undefined;
            }
            this.countdownLightsGfx = undefined;
            this.countdownLabelText = undefined;
        });

        // ── 7. Race Initialization ──
        if (this.isMultiplayer && (this.countdownSeconds > 0 || this.targetStartLocalTime > 0)) {
            this.isRaceActive = false;
            // Place starting grid line across the track
            this.startLineObj = this.add.sprite(width / 2, height - 120, 'finish_line').setScale(2.5, 1.0).setDepth(2);
            // Glider gentle idle engine rumble
            this.idleGliderTween = this.tweens.add({
                targets: this.glider,
                y: height - 162,
                duration: 80,
                yoyo: true,
                repeat: -1
            });

            const now = Date.now();
            if (this.targetStartLocalTime > 0 && now >= this.targetStartLocalTime) {
                this.triggerRaceStartGo();
            } else {
                this.startMultiplayerCountdown();
            }
        } else if (this.showGuide) {
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
        if (this.spawnTimer) {
            this.spawnTimer.paused = false;
        }
        (window as any).__gameActive = true;
    }

    update(_time: number, delta: number): void {
        if (!this.isRaceActive) {
            // Synchronize positions & interpolate remote gliders on starting grid during countdown
            if (this.isMultiplayer) {
                this.syncMultiplayerPositions(0);
                this.updateSynchronizedCountdown();
            }
            return;
        }

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

        // Scroll starting grid line down off screen
        if (this.startLineObj) {
            this.startLineObj.y += baseScroll * 1.0;
            if (this.startLineObj.y > this.scale.height + 60) {
                this.startLineObj.destroy();
                this.startLineObj = undefined;
            }
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
            this.syncMultiplayerPositions(currentSpeed);
        }
    }

    private syncMultiplayerPositions(currentSpeed: number): void {
        networkManager.sendPlayerUpdate(this.glider.x, this.distanceTraveled, currentSpeed);

        // Update local scoreboard in real time with our live distance
        const now = this.time.now;
        if (now - this.lastLeaderboardUpdate > 150) {
            this.lastLeaderboardUpdate = now;
            this.updateLeaderboardUI();
        }

        const { height } = this.scale;
        const localGliderY = height - 160;

        for (const [, remote] of this.remoteGliders) {
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

    private handleRemotePlayersState(players: RemotePlayerInfo[]): void {
        if (!this.isMultiplayer) return;

        // Cache latest telemetry for all remote rivals
        for (const p of players) {
            if (p.id !== networkManager.playerId) {
                this.latestRemotePlayers.set(p.id, p);
            }
        }

        // 1. Leaderboard & Telemetry
        this.updateLeaderboardUI();

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
                const initialY = (this.scale.height - 160) - (p.distance - this.distanceTraveled) * 2.2;
                const container = this.add.container(p.x, initialY).setDepth(10);
                const sprite = this.add.sprite(0, 0, this.currentCircuit.vehicleKey).setScale(1.2);
                sprite.setTint(p.color || 0xF59E0B);

                const nameText = this.add.text(0, -28, p.name, {
                    fontSize: '9px',
                    fontFamily: "'Silkscreen', monospace",
                    color: '#FFFFFF',
                    backgroundColor: '#0F172A',
                    padding: { left: 4, right: 4, top: 2, bottom: 2 }
                }).setOrigin(0.5);

                const indicator = this.add.graphics();
                indicator.fillStyle(p.color || 0xF59E0B, 1);
                indicator.fillTriangle(-6, -16, 6, -16, 0, -8);

                container.add([sprite, indicator]);
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

    private updateLeaderboardUI(): void {
        if (!this.isMultiplayer || !this.multiScoreboardText) return;

        // Build list of all participants: remote rivals + local player with live distance
        const allParticipants: Array<{ id: string; name: string; distance: number; isMe: boolean }> = [];

        for (const remote of this.latestRemotePlayers.values()) {
            allParticipants.push({
                id: remote.id,
                name: remote.name,
                distance: remote.distance,
                isMe: false
            });
        }

        allParticipants.push({
            id: networkManager.playerId || 'local_me',
            name: networkManager.playerName || 'TÚ',
            distance: this.distanceTraveled,
            isMe: true
        });

        // Sort descending by real-time distance
        allParticipants.sort((a, b) => b.distance - a.distance);

        const total = Math.max(allParticipants.length, networkManager.totalPlayersInRoom || 2);
        const myIdx = allParticipants.findIndex(p => p.isMe);
        const myRank = myIdx !== -1 ? myIdx + 1 : 1;

        let standingsStr = `SALA: ${this.roomCode || 'ONLINE'} (${total}P)\n`;
        const showCount = Math.min(4, allParticipants.length);
        for (let i = 0; i < showCount; i++) {
            const p = allParticipants[i];
            const tag = p.isMe ? 'TÚ' : p.name.slice(0, 6);
            standingsStr += `${i + 1}° ${tag}: ${Math.round(p.distance)}m\n`;
        }
        if (myRank > 4) {
            standingsStr += `..\n${myRank}° TÚ: ${Math.round(this.distanceTraveled)}m\n`;
        }

        this.multiScoreboardText.setText(standingsStr.trim());
    }

    // ── Background Tab Simulation Support ──
    private handleVisibilityChange = (): void => {
        if (typeof document === 'undefined') return;
        if (document.hidden) {
            this.lastHiddenTime = performance.now();
            this.startBackgroundSimulation();
        } else {
            this.stopBackgroundSimulation();
            this.catchUpFromBackground();
        }
    };

    private initBackgroundSimulation(): void {
        if (typeof window === 'undefined') return;
        try {
            const workerBlob = new Blob([`
                let interval = null;
                self.onmessage = function(e) {
                    if (e.data === 'start') {
                        if (!interval) {
                            interval = setInterval(function() {
                                self.postMessage('tick');
                            }, 100);
                        }
                    } else if (e.data === 'stop') {
                        if (interval) {
                            clearInterval(interval);
                            interval = null;
                        }
                    }
                };
            `], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(workerBlob);
            this.backgroundWorker = new Worker(blobUrl);
            this.backgroundWorker.onmessage = () => {
                this.simulateBackgroundTick();
            };
        } catch {
            // Worker unsupported or blocked; catchUpFromBackground handles catch-up on focus
        }
    }

    private startBackgroundSimulation(): void {
        if (!this.isRaceActive || this.hasFinished) return;
        this.backgroundWorker?.postMessage('start');
    }

    private stopBackgroundSimulation(): void {
        this.backgroundWorker?.postMessage('stop');
    }

    private simulateBackgroundTick(): void {
        if (!this.isRaceActive || this.hasFinished) return;

        const now = performance.now();
        const deltaSec = (now - this.lastHiddenTime) / 1000;
        this.lastHiddenTime = now;

        if (deltaSec <= 0 || deltaSec > 2) return;

        const currentSpeed = this.glider ? this.glider.speed : 45;
        const meters = (currentSpeed / 3.6) * deltaSec * 1.8;
        this.distanceTraveled += meters;

        const curDist = Math.min(this.targetDistance, Math.round(this.distanceTraveled));
        const progressPct = (curDist / this.targetDistance) * 100;
        EventBus.emit(GameEvents.DISTANCE_UPDATED, {
            current: curDist,
            target: this.targetDistance,
            progress: progressPct,
            distance: curDist
        });
        EventBus.emit(GameEvents.SPEED_UPDATED, Math.round(currentSpeed));

        if (this.isMultiplayer) {
            networkManager.sendPlayerUpdate(this.glider.x, this.distanceTraveled, currentSpeed);
            this.updateLeaderboardUI();
        }

        if (this.distanceTraveled >= this.targetDistance) {
            this.stopBackgroundSimulation();
            this.finishRace();
        }
    }

    private catchUpFromBackground(): void {
        if (!this.isRaceActive || this.hasFinished || !this.lastHiddenTime) return;

        const now = performance.now();
        const deltaSec = (now - this.lastHiddenTime) / 1000;
        this.lastHiddenTime = now;

        if (deltaSec > 0.05 && deltaSec < 120) {
            const currentSpeed = this.glider ? this.glider.speed : 45;
            const meters = (currentSpeed / 3.6) * deltaSec * 1.8;
            this.distanceTraveled += meters;

            const curDist = Math.min(this.targetDistance, Math.round(this.distanceTraveled));
            const progressPct = (curDist / this.targetDistance) * 100;
            EventBus.emit(GameEvents.DISTANCE_UPDATED, {
                current: curDist,
                target: this.targetDistance,
                progress: progressPct,
                distance: curDist
            });
            EventBus.emit(GameEvents.SPEED_UPDATED, Math.round(currentSpeed));

            if (this.isMultiplayer) {
                networkManager.sendPlayerUpdate(this.glider.x, this.distanceTraveled, currentSpeed);
                this.updateLeaderboardUI();
            }

            if (this.distanceTraveled >= this.targetDistance) {
                this.finishRace();
            }
        }
    }

    private handlePeerFinished(data: { name: string; rank: number }): void {
        this.showPopup(this.scale.width / 2, 200, `¡${data.name} CRUZO EN ${data.rank}°!`, '#F59E0B');
    }

    private handlePlayerLeft(data: { playerId: string; playerName?: string }): void {
        const remote = this.remoteGliders.get(data.playerId);
        if (remote) {
            remote.container.destroy();
            this.remoteGliders.delete(data.playerId);
        }
        this.latestRemotePlayers.delete(data.playerId);
        this.updateLeaderboardUI();
        this.showPopup(this.scale.width / 2, 220, `¡${data.playerName || 'PILOTO'} SE DESCONECTO!`, '#EF4444');
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
            // Borde verde para cosas buenas (baterias limpias)
            if (battery.preFX) {
                battery.preFX.addGlow(0x10B981, 4, 1.2, false, 0.1, 10);
            }
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
        this.showPopup(this.glider.x, this.glider.y - 40, this.currentCircuit.turboPopup, this.currentCircuit.themeColor);
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

    public onFinishRace(): void {
        this.isRaceActive = true;
        this.finishRace();
    }

    private finishRace(): void {
        if (!this.isRaceActive || this.hasFinished) return;
        this.isRaceActive = false;
        this.hasFinished = true;
        this.stopBackgroundSimulation();
        (window as any).__gameActive = false;

        const totalTimeMs = Math.round(this.time.now - this.raceStartTime);
        const totalTimeSeconds = (totalTimeMs / 1000).toFixed(1);
        SoundFX.playWin();

        if (this.isMultiplayer) {
            networkManager.finishRace(totalTimeMs, this.cleanKwh);
        }

        let finalRank = 1;
        if (this.isMultiplayer) {
            finalRank = networkManager.myFinishRank;
            if (!finalRank) {
                const finishedCount = networkManager.roomPlayers.filter(p => p.finished).length;
                finalRank = finishedCount + 1;
            }
            finalRank = Math.max(1, Math.min(finalRank, this.totalTournamentPlayers));
        } else {
            // Solo tournament rank simulation based on performance:
            const timeSec = totalTimeMs / 1000;
            if (timeSec < 42 && this.cleanKwh >= 35) {
                finalRank = 1;
            } else if (timeSec < 47) {
                finalRank = Phaser.Math.Between(2, Math.min(3, this.qualifiedCutoff));
            } else if (timeSec < 53) {
                finalRank = Phaser.Math.Between(4, Math.min(8, this.qualifiedCutoff));
            } else if (timeSec < 60) {
                finalRank = Phaser.Math.Between(9, this.qualifiedCutoff);
            } else if (timeSec < 68) {
                finalRank = Phaser.Math.Between(this.qualifiedCutoff + 1, Math.min(this.qualifiedCutoff + 5, this.totalTournamentPlayers));
            } else {
                finalRank = Phaser.Math.Between(this.qualifiedCutoff + 4, this.totalTournamentPlayers);
            }
            finalRank = Math.max(1, Math.min(finalRank, this.totalTournamentPlayers));
        }

        let podiumData = networkManager.roomPodium.length > 0
            ? networkManager.roomPodium
            : undefined;

        if (!podiumData && !this.isMultiplayer) {
            const rivalPool = ['Aero-1', 'Solaris', 'Hydro-X', 'Volt-9', 'TerraPulse'];
            const r1 = finalRank === 1 ? 'TÚ' : rivalPool[0];
            const r2 = finalRank === 2 ? 'TÚ' : rivalPool[1];
            const r3 = finalRank === 3 ? 'TÚ' : rivalPool[2];
            const baseTime = Number(totalTimeSeconds);

            podiumData = [
                { rank: 1, playerId: 'p1', finishTimeMs: Math.round(Number(totalTimeSeconds) * 1000), name: r1, timeSec: finalRank === 1 ? totalTimeSeconds : (Math.max(37, baseTime - 1.5)).toFixed(1) },
                { rank: 2, playerId: 'p2', finishTimeMs: Math.round((Number(totalTimeSeconds) + 0.9) * 1000), name: r2, timeSec: finalRank === 2 ? totalTimeSeconds : (finalRank === 1 ? (baseTime + 0.9).toFixed(1) : (baseTime - 0.5).toFixed(1)) },
                { rank: 3, playerId: 'p3', finishTimeMs: Math.round((Number(totalTimeSeconds) + 2.1) * 1000), name: r3, timeSec: finalRank === 3 ? totalTimeSeconds : (finalRank <= 2 ? (baseTime + 2.1).toFixed(1) : (baseTime + 0.8).toFixed(1)) }
            ];
        }

        this.scene.stop('HudScene');
        this.cameras.main.fadeOut(250, 241, 245, 249);
        this.time.delayedCall(250, () => {
            const authoritativeRank = (this.isMultiplayer && networkManager.myFinishRank > 0)
                ? networkManager.myFinishRank
                : finalRank;
            const validRank = Math.max(1, Math.min(authoritativeRank, this.totalTournamentPlayers));

            this.scene.start('WinScene', {
                mode: 'race',
                round: this.round,
                maxRounds: this.maxRounds,
                time: totalTimeSeconds,
                kwh: this.cleanKwh,
                distance: this.targetDistance,
                multiplayer: this.isMultiplayer,
                rank: validRank,
                totalPlayers: this.totalTournamentPlayers,
                podium: podiumData,
                singleMapMode: this.singleMapMode
            });
        });
    }

    private startMultiplayerCountdown(): void {
        const { width, height } = this.scale;
        const centerY = height / 2 - 50;

        const container = this.add.container(width / 2, centerY).setDepth(500);
        this.countdownContainer = container;

        const boxW = 280;
        const boxH = 130;

        const gantry = this.add.graphics();
        // Drop shadow
        gantry.fillStyle(0x000000, 0.45);
        gantry.fillRoundedRect(-boxW / 2 + 4, -boxH / 2 + 4, boxW, boxH, 10);
        // Container background
        gantry.fillStyle(0x0F172A, 0.95);
        gantry.fillRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 10);
        gantry.lineStyle(2, 0x0284C7, 1);
        gantry.strokeRoundedRect(-boxW / 2, -boxH / 2, boxW, boxH, 10);

        const titleText = this.add.text(0, -boxH / 2 + 18, 'SEMAFORO DE SALIDA', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#94A3B8'
        }).setOrigin(0.5);

        this.countdownLightsGfx = this.add.graphics();

        this.countdownLabelText = this.add.text(0, 38, '3', {
            fontSize: '26px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#EF4444'
        }).setOrigin(0.5);

        container.add([gantry, titleText, this.countdownLightsGfx, this.countdownLabelText]);

        // Immediate first step calculation and render
        this.updateSynchronizedCountdown();
    }

    private drawCountdownLights(activeCount: number, isGo: boolean): void {
        if (!this.countdownLightsGfx) return;
        const lightGfx = this.countdownLightsGfx;
        const lightPositions = [-70, 0, 70];
        const lightY = -5;
        const lightR = 18;

        lightGfx.clear();
        lightPositions.forEach((lx, i) => {
            // Bezel
            lightGfx.fillStyle(0x1E293B, 1);
            lightGfx.fillCircle(lx, lightY, lightR + 3);
            lightGfx.lineStyle(1.5, 0x475569, 1);
            lightGfx.strokeCircle(lx, lightY, lightR + 3);

            // Bulb
            let bulbColor = 0x334155; // Off
            if (isGo) {
                bulbColor = 0x10B981; // Green
            } else if (i < activeCount) {
                bulbColor = i === 0 ? 0xEF4444 : 0xF59E0B;
            }

            lightGfx.fillStyle(bulbColor, 1);
            lightGfx.fillCircle(lx, lightY, lightR);

            if (isGo || (i < activeCount)) {
                // Highlight reflection
                lightGfx.fillStyle(0xFFFFFF, 0.4);
                lightGfx.fillCircle(lx - 5, lightY - 5, lightR / 3);
            }
        });
    }

    private updateSynchronizedCountdown(): void {
        if (this.isRaceActive) return;

        if (this.targetStartLocalTime <= 0) {
            return;
        }

        const now = Date.now();
        const remainingMs = this.targetStartLocalTime - now;

        if (remainingMs <= 0) {
            this.triggerRaceStartGo();
            return;
        }

        // Compute step 3, 2, or 1 based on remaining milliseconds
        const sec = Math.min(3, Math.max(1, Math.ceil(remainingMs / 1000)));
        if (sec !== this.lastCountdownSec) {
            this.lastCountdownSec = sec;

            if (sec === 3) {
                this.drawCountdownLights(1, false);
                if (this.countdownLabelText) {
                    this.countdownLabelText.setText('3');
                    this.countdownLabelText.setColor('#EF4444');
                }
                SoundFX.playCollect(1);
            } else if (sec === 2) {
                this.drawCountdownLights(2, false);
                if (this.countdownLabelText) {
                    this.countdownLabelText.setText('2');
                    this.countdownLabelText.setColor('#F59E0B');
                    this.countdownLabelText.setScale(1.4);
                    this.tweens.add({ targets: this.countdownLabelText, scale: 1.0, duration: 200, ease: 'Back.easeOut' });
                }
                SoundFX.playCollect(1);
            } else if (sec === 1) {
                this.drawCountdownLights(3, false);
                if (this.countdownLabelText) {
                    this.countdownLabelText.setText('1');
                    this.countdownLabelText.setColor('#F59E0B');
                    this.countdownLabelText.setScale(1.4);
                    this.tweens.add({ targets: this.countdownLabelText, scale: 1.0, duration: 200, ease: 'Back.easeOut' });
                }
                SoundFX.playCollect(2);
            }
        }
    }

    private triggerRaceStartGo(): void {
        if (this.isRaceActive) return;

        if (this.countdownTimer) {
            this.countdownTimer.remove(false);
            this.countdownTimer = undefined;
        }

        if (this.idleGliderTween) {
            this.idleGliderTween.stop();
            this.idleGliderTween = undefined;
            this.glider.y = this.scale.height - 160;
        }

        if (this.countdownContainer) {
            if (this.countdownLabelText && this.countdownLabelText.setText) {
                this.countdownLabelText.setText('¡SALIDA!');
                this.countdownLabelText.setColor('#10B981');
                this.countdownLabelText.setScale(1.5);
                this.tweens.add({ targets: this.countdownLabelText, scale: 1.0, duration: 200, ease: 'Back.easeOut' });
            }

            this.drawCountdownLights(3, true);

            this.tweens.add({
                targets: this.countdownContainer,
                alpha: 0,
                y: this.countdownContainer.y - 25,
                duration: 400,
                delay: 350,
                onComplete: () => {
                    this.countdownContainer?.destroy();
                    this.countdownContainer = undefined;
                    this.countdownLightsGfx = undefined;
                    this.countdownLabelText = undefined;
                }
            });
        }

        SoundFX.playWindTurbo();
        this.cameras.main.shake(150, 0.005);
        if (this.spawnTimer) {
            this.spawnTimer.paused = false;
        }
        this.startActiveRace();
    }

    private handleServerRaceStarted(): void {
        if (!this.isRaceActive) {
            this.triggerRaceStartGo();
        }
    }
}
