import { Scene } from 'phaser';
import { GameModeId, ROTATING_LESSONS, TOURNAMENT_ROUNDS } from '../types/game';
import { EventBus, GameEvents } from '../systems/EventBus';
import { SoundFX } from '../systems/SoundFX';
import { networkManager } from '../systems/NetworkManager';

export interface PodiumEntry {
    rank: number;
    playerId?: string;
    name: string;
    finishTimeMs?: number;
    timeSec: string;
    color?: number;
}

interface WinSceneData {
    mode?: GameModeId;
    round?: number;
    time: string;
    kwh: number;
    distance?: number;
    multiplayer?: boolean;
    rank?: number;
    totalPlayers?: number;
    podium?: PodiumEntry[];
}

export class WinScene extends Scene {
    private round: number = 1;
    private isQualified: boolean = false;
    private cutoffRank: number = 25;
    private finalTime: string = '0.0';
    private finalKwh: number = 0;
    private finalCo2: number = 0;
    private currentLessonIdx: number = 0;
    private isMultiplayer: boolean = false;
    private rank: number = 1;
    private totalPlayers: number = 50;
    private podium: PodiumEntry[] = [];

    private lessonTitleText!: Phaser.GameObjects.Text;
    private lessonBodyText!: Phaser.GameObjects.Text;
    private bannerTextObj?: Phaser.GameObjects.Text;
    private subTitleText?: Phaser.GameObjects.Text;
    private posStatText?: Phaser.GameObjects.Text;
    private liveToast?: Phaser.GameObjects.Container;
    private podiumTimer?: Phaser.Time.TimerEvent;
    private pedestalSlots: Array<{
        rank: number;
        gfx: Phaser.GameObjects.Graphics;
        nameText: Phaser.GameObjects.Text;
        timeText: Phaser.GameObjects.Text;
        isMe: boolean;
    }> = [];

    constructor() {
        super('WinScene');
    }

    init(data: WinSceneData): void {
        this.round = data.round || 1;
        this.finalTime = data.time || '45.0';
        this.finalKwh = Math.max(1, data.kwh || 120);
        this.finalCo2 = Math.round(this.finalKwh * 0.45);
        this.isMultiplayer = data.multiplayer === true;
        this.rank = data.rank || 1;
        this.totalPlayers = data.totalPlayers || (this.round === 1 ? 50 : this.round === 2 ? 25 : this.round === 3 ? 12 : 6);
        this.podium = data.podium || [];
        this.currentLessonIdx = Phaser.Math.Between(0, ROTATING_LESSONS.length - 1);

        if (this.round < 4) {
            this.cutoffRank = Math.ceil(this.totalPlayers * 0.5);
            this.isQualified = this.rank <= this.cutoffRank;
        } else {
            this.cutoffRank = 3;
            this.isQualified = true;
        }
    }

    create(): void {
        const { width, height } = this.scale;
        (window as any).__gameActive = false;

        // ── 1. Clean Light Mode Background ──
        const bg = this.add.graphics();
        bg.fillStyle(0xF1F5F9, 1);
        bg.fillRect(0, 0, width, height);

        // ── 2. Top Header Banner ──
        const bannerY = 32;
        const bannerW = width - 48;
        const bannerX = 24;

        const banner = this.add.graphics();
        let bannerBgColor = 0xDCFCE7;
        let bannerBorderColor = 0x16A34A;
        let bannerTitle = '';
        let bannerColor = '#15803D';

        if (this.round < 4) {
            if (this.isQualified) {
                bannerTitle = `¡CLASIFICASTE A RONDA ${this.round + 1}! (${this.rank}° DE ${this.totalPlayers})`;
                bannerColor = '#15803D';
                bannerBgColor = 0xDCFCE7;
                bannerBorderColor = 0x16A34A;
            } else {
                bannerTitle = `ELIMINADO EN RONDA ${this.round} (${this.rank}° DE ${this.totalPlayers})`;
                bannerColor = '#DC2626';
                bannerBgColor = 0xFEE2E2;
                bannerBorderColor = 0xEF4444;
            }
        } else {
            if (this.rank === 1) {
                bannerTitle = `¡CAMPEON ORO 2030! 1° LUGAR DE ${this.totalPlayers}`;
                bannerColor = '#B45309';
                bannerBgColor = 0xFEF3C7;
                bannerBorderColor = 0xF59E0B;
            } else if (this.rank === 2) {
                bannerTitle = `¡SUBCAMPEON PLATA! 2° LUGAR DE ${this.totalPlayers}`;
                bannerColor = '#475569';
                bannerBgColor = 0xF1F5F9;
                bannerBorderColor = 0x94A3B8;
            } else if (this.rank === 3) {
                bannerTitle = `¡PODIO BRONCE! 3° LUGAR DE ${this.totalPlayers}`;
                bannerColor = '#B45309';
                bannerBgColor = 0xFFEDD5;
                bannerBorderColor = 0xF97316;
            } else {
                bannerTitle = `¡FINALISTA TOP 6 DE LA RED 2030!`;
                bannerColor = '#0284C7';
                bannerBgColor = 0xE0F2FE;
                bannerBorderColor = 0x0284C7;
            }
        }

        banner.fillStyle(bannerBgColor, 1);
        banner.fillRect(bannerX, bannerY, bannerW, 36);
        banner.lineStyle(1, bannerBorderColor, 1);
        banner.strokeRect(bannerX, bannerY, bannerW, 36);

        this.bannerTextObj = this.add.text(width / 2, bannerY + 18, bannerTitle, {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: bannerColor,
            resolution: 3
        }).setOrigin(0.5);

        // ── 3. Animated Trophy / Vehicle Mascot ──
        const currentRoundCfg = TOURNAMENT_ROUNDS[this.round] || TOURNAMENT_ROUNDS[1];
        const nextRoundCfg = this.round < 4 ? TOURNAMENT_ROUNDS[this.round + 1] : undefined;
        const spriteKey = (this.isQualified && nextRoundCfg) ? nextRoundCfg.vehicleKey : currentRoundCfg.vehicleKey;

        const trophy = this.add.sprite(width / 2, 106, spriteKey).setScale(2.4);
        if (this.round === 4 && this.rank === 1) {
            trophy.setTint(0xF59E0B);
        }
        this.tweens.add({
            targets: trophy,
            y: 98,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        const subTitle = this.round < 4
            ? (this.isQualified
                ? `¡PREPARATE PARA ${nextRoundCfg?.name || 'LA SIGUIENTE RONDA'}!`
                : `RONDA ${this.round}/4 · ${currentRoundCfg.name}`)
            : `GRAN FINAL 2030 · ${currentRoundCfg.name}`;

        this.subTitleText = this.add.text(width / 2, 138, subTitle, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7',
            resolution: 3
        }).setOrigin(0.5);

        // Multiplayer real-time finish, race start & disconnect listeners
        if (this.isMultiplayer) {
            EventBus.on(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
            EventBus.on(GameEvents.RACE_COUNTDOWN, this.handleMultiplayerRaceStart, this);
            EventBus.on(GameEvents.PLAYER_LEFT, this.handlePeerLeft, this);
            this.events.once('shutdown', () => {
                EventBus.off(GameEvents.PLAYER_FINISHED, this.handlePeerFinished, this);
                EventBus.off(GameEvents.RACE_COUNTDOWN, this.handleMultiplayerRaceStart, this);
                EventBus.off(GameEvents.PLAYER_LEFT, this.handlePeerLeft, this);
                if (this.podiumTimer) {
                    this.podiumTimer.remove(false);
                    this.podiumTimer = undefined;
                }
            });
        }

        const cardX = 24;
        const cardW = width - 48;

        if (this.round === 4 || this.isMultiplayer) {
            this.createMultiplayerCards(cardX, cardW);
        } else {
            this.createSinglePlayerCards(cardX, cardW);
        }

        // ── 7. Primary Action Button ──
        const btnY = 698;
        const btnW = 280;
        const btnH = 46;
        const btnX = width / 2 - btnW / 2;

        const btnBg = this.add.graphics();
        let currentBtnColor: 'green' | 'amber' | 'slate' | 'red' = 'green';

        const renderBtn = (hover: boolean): void => {
            btnBg.clear();
            let fillC = 0x16A34A;
            let edgeC = 0x15803D;
            if (currentBtnColor === 'slate') {
                fillC = hover ? 0x475569 : 0x334155;
                edgeC = 0x1E293B;
            } else if (currentBtnColor === 'amber') {
                fillC = hover ? 0xFBBF24 : 0xF59E0B;
                edgeC = 0xB45309;
            } else if (currentBtnColor === 'red') {
                fillC = hover ? 0xEF4444 : 0xDC2626;
                edgeC = 0x991B1B;
            } else {
                fillC = hover ? 0x22C55E : 0x16A34A;
                edgeC = 0x15803D;
            }
            btnBg.fillStyle(fillC, 1);
            btnBg.fillRect(btnX, btnY, btnW, btnH);
            btnBg.fillStyle(edgeC, 1);
            btnBg.fillRect(btnX, btnY + btnH - 3, btnW, 3);
        };

        const btnText = this.add.text(width / 2, btnY + btnH / 2 - 1, '', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        const hitZone = this.add.zone(width / 2, btnY + btnH / 2, btnW, btnH)
            .setOrigin(0.5);

        if (this.isMultiplayer) {
            if (this.round < 4) {
                if (!this.isQualified) {
                    currentBtnColor = 'red';
                    renderBtn(false);
                    btnText.setText('ELIMINADO (TOP 50% LLENO)');
                } else if (!networkManager.isHost) {
                    currentBtnColor = 'slate';
                    renderBtn(false);
                    btnText.setText('ESPERANDO AL ANFITRION...');
                } else {
                    // Host: 3-second viewing delay for podium before allowing continuation
                    let cooldown = 3;
                    currentBtnColor = 'amber';
                    renderBtn(false);
                    btnText.setText(`MOSTRANDO PODIO (${cooldown}s)...`);

                    this.podiumTimer = this.time.addEvent({
                        delay: 1000,
                        repeat: 2,
                        callback: () => {
                            cooldown--;
                            if (cooldown > 0) {
                                btnText.setText(`MOSTRANDO PODIO (${cooldown}s)...`);
                            } else {
                                currentBtnColor = 'green';
                                renderBtn(false);
                                btnText.setText(`AVANZAR A RONDA ${this.round + 1} (HOST)`);
                                hitZone.setInteractive({ useHandCursor: true });
                            }
                        }
                    });

                    hitZone.on('pointerdown', () => {
                        hitZone.disableInteractive();
                        btnText.setText('INICIANDO RONDA...');
                        networkManager.startRace(this.round + 1);
                    });
                    hitZone.on('pointerover', () => renderBtn(true));
                    hitZone.on('pointerout', () => renderBtn(false));
                }
            } else {
                // Round 4 (Grand Final) in Multiplayer
                if (networkManager.isHost) {
                    currentBtnColor = 'amber';
                    renderBtn(false);
                    btnText.setText('NUEVO TORNEO (HOST)');
                    hitZone.setInteractive({ useHandCursor: true });
                    hitZone.on('pointerdown', () => {
                        hitZone.disableInteractive();
                        networkManager.startRace(1);
                    });
                    hitZone.on('pointerover', () => renderBtn(true));
                    hitZone.on('pointerout', () => renderBtn(false));
                } else {
                    currentBtnColor = 'slate';
                    renderBtn(false);
                    btnText.setText('FIN DEL TORNEO 2030');
                }
            }
        } else {
            // Solo Mode
            currentBtnColor = this.isQualified && this.round < 4 ? 'green' : 'amber';
            renderBtn(false);
            if (this.round < 4 && this.isQualified) {
                const nextShortName = nextRoundCfg?.name.split(' ')[0] || `R${this.round + 1}`;
                btnText.setText(`AVANZAR A RONDA ${this.round + 1}: ${nextShortName}`);
            } else if (this.round < 4) {
                btnText.setText('REINTENTAR TORNEO (R1)');
            } else {
                btnText.setText('NUEVO TORNEO (DESDE R1)');
            }
            hitZone.setInteractive({ useHandCursor: true });
            hitZone.on('pointerover', () => renderBtn(true));
            hitZone.on('pointerout', () => renderBtn(false));
            hitZone.on('pointerdown', () => {
                hitZone.disableInteractive();
                this.cameras.main.fadeOut(180, 241, 245, 249);
                this.time.delayedCall(180, () => {
                    this.scene.start('MainScene', {
                        round: this.round < 4 && this.isQualified ? this.round + 1 : 1,
                        skipGuide: true
                    });
                });
            });
        }

        // ── 8. Secondary Action: MENU PRINCIPAL ──
        const menuBtnY = 756;
        const menuBtnH = 38;
        const menuBtnX = width / 2 - btnW / 2;

        const menuBg = this.add.graphics();
        const renderMenuBtn = (hover: boolean): void => {
            menuBg.clear();
            menuBg.fillStyle(hover ? 0xE2E8F0 : 0xFFFFFF, 1);
            menuBg.fillRect(menuBtnX, menuBtnY, btnW, menuBtnH);
            menuBg.lineStyle(1, hover ? 0x94A3B8 : 0xCBD5E1, 1);
            menuBg.strokeRect(menuBtnX, menuBtnY, btnW, menuBtnH);
        };
        renderMenuBtn(false);

        this.add.text(width / 2, menuBtnY + menuBtnH / 2, 'MENU PRINCIPAL', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#334155'
        }).setOrigin(0.5);

        const menuHitZone = this.add.zone(width / 2, menuBtnY + menuBtnH / 2, btnW, menuBtnH)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const triggerMenu = (): void => {
            menuHitZone.disableInteractive();
            if (this.isMultiplayer) {
                networkManager.leaveRoom();
            }
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => {
                this.scene.start('MenuScene');
            });
        };

        menuHitZone.on('pointerover', () => renderMenuBtn(true));
        menuHitZone.on('pointerout', () => renderMenuBtn(false));
        menuHitZone.on('pointerdown', triggerMenu);

        // Keyboard triggers
        if (this.input.keyboard) {
            this.input.keyboard.once('keydown-SPACE', () => {
                if (hitZone.input && hitZone.input.enabled) {
                    hitZone.emit('pointerdown');
                }
            });
            this.input.keyboard.once('keydown-ENTER', () => {
                if (hitZone.input && hitZone.input.enabled) {
                    hitZone.emit('pointerdown');
                }
            });
            this.input.keyboard.once('keydown-ESC', triggerMenu);
        }

        this.cameras.main.fadeIn(200, 241, 245, 249);
    }

    private createMultiplayerCards(cardX: number, cardW: number): void {
        const { width } = this.scale;

        // ── 1. Card Podio 1° al 3° ──
        const podiumCardY = 166;
        const podiumCardH = 172;

        const pCard = this.add.graphics();
        pCard.fillStyle(0xFFFFFF, 1);
        pCard.fillRect(cardX, podiumCardY, cardW, podiumCardH);
        pCard.lineStyle(1.5, 0xF59E0B, 1);
        pCard.strokeRect(cardX, podiumCardY, cardW, podiumCardH);

        const cardTitle = this.round === 4 ? 'PODIO FINAL DE CAMPEONATO (TOP 3)' : 'PODIO DE SALA (TOP 3)';
        this.add.text(cardX + 16, podiumCardY + 12, cardTitle, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#B45309',
            resolution: 3
        });

        const p1 = this.podium[0] || (this.rank === 1 ? { name: 'TÚ', rank: 1, timeSec: this.finalTime } : { name: 'Oro', rank: 1, timeSec: this.finalTime });
        const p2 = this.podium[1] || (this.rank === 2 ? { name: 'TÚ', rank: 2, timeSec: this.finalTime } : { name: 'Plata', rank: 2, timeSec: '--' });
        const p3 = this.podium[2] || (this.rank === 3 ? { name: 'TÚ', rank: 3, timeSec: this.finalTime } : { name: 'Bronce', rank: 3, timeSec: '--' });

        const baseX = width / 2;
        const baseY = podiumCardY + 140;

        const pedestals = [
            { rank: 2, x: baseX - 138, w: 84, h: 58, bg: 0x94A3B8, border: 0x64748B, tag: '2°', data: p2 },
            { rank: 1, x: baseX - 42, w: 84, h: 84, bg: 0xF59E0B, border: 0xD97706, tag: '1°', data: p1 },
            { rank: 3, x: baseX + 54, w: 84, h: 42, bg: 0xD97706, border: 0xB45309, tag: '3°', data: p3 }
        ];

        this.pedestalSlots = [];
        pedestals.forEach(ped => {
            const isMe = ped.rank === this.rank;
            const py = baseY - ped.h;

            const gfx = this.add.graphics();
            gfx.fillStyle(ped.bg, 1);
            gfx.fillRect(ped.x, py, ped.w, ped.h);
            gfx.lineStyle(isMe ? 2.5 : 1.5, isMe ? 0x0284C7 : ped.border, 1);
            gfx.strokeRect(ped.x, py, ped.w, ped.h);

            // Step label
            this.add.text(ped.x + ped.w / 2, py + ped.h / 2, ped.tag, {
                fontSize: '13px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#FFFFFF',
                resolution: 3
            }).setOrigin(0.5);

            // Pilot name above pedestal
            const nameColor = isMe ? '#0284C7' : '#0F172A';
            const nameLabel = isMe ? '★ TÚ ★' : ped.data.name.slice(0, 6);
            const nameText = this.add.text(ped.x + ped.w / 2, py - 20, nameLabel, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: nameColor,
                resolution: 3
            }).setOrigin(0.5);

            // Time above pedestal
            const timeLabel = ped.data.timeSec ? `${ped.data.timeSec}s` : '--';
            const timeText = this.add.text(ped.x + ped.w / 2, py - 8, timeLabel, {
                fontSize: '8px',
                fontFamily: "'Silkscreen', monospace",
                color: '#64748B',
                resolution: 3
            }).setOrigin(0.5);

            this.pedestalSlots.push({
                rank: ped.rank,
                gfx,
                nameText,
                timeText,
                isMe
            });
        });

        // Extra rank status badge if player is not in top 3
        if (this.rank > 3) {
            const badgeY = podiumCardY + 150;
            this.add.text(width / 2, badgeY, `TU LUGAR: ${this.rank}° DE ${this.totalPlayers} PILOTOS (${this.finalTime}s)`, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#0284C7',
                backgroundColor: '#F0F9FF',
                padding: { left: 8, right: 8, top: 4, bottom: 4 },
                resolution: 3
            }).setOrigin(0.5);
        }

        // ── 2. Card Telemetria ──
        const cardY = 348;
        const cardH = 150;

        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 1);
        card.fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0xCBD5E1, 1);
        card.strokeRect(cardX, cardY, cardW, cardH);

        this.add.text(cardX + 16, cardY + 14, `TELEMETRIA TORNEO · RONDA ${this.round}/4`, {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B',
            resolution: 3
        });

        const statusStr = this.round === 4
            ? (this.rank <= 3 ? '¡PODIO FINAL!' : 'FINALISTA')
            : (this.isQualified ? '¡CLASIFICADO!' : 'ELIMINADO');
        const statusCol = this.isQualified ? '#16A34A' : '#DC2626';

        const stats = [
            { label: 'POSICION', val: `${this.rank}° / ${this.totalPlayers}`, color: '#0284C7' },
            { label: 'ESTADO', val: statusStr, color: statusCol },
            { label: 'TIEMPO', val: `${this.finalTime} s`, color: '#0F172A' },
            { label: 'ENERGIA LIMPIA', val: `${this.finalKwh} kWh`, color: '#D97706' },
            { label: 'CO2 EVITADO', val: `~${this.finalCo2} kg`, color: '#16A34A' }
        ];

        stats.forEach((row, i) => {
            const yPos = cardY + 34 + i * 22;
            this.add.text(cardX + 16, yPos, row.label, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#64748B',
                resolution: 3
            });

            const valText = this.add.text(cardX + cardW - 16, yPos, row.val, {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
                color: row.color,
                resolution: 3
            }).setOrigin(1, 0);

            if (row.label === 'POSICION') {
                this.posStatText = valText;
            }
        });

        // ── 3. Card Leccion Rotativa ODS 7 ──
        const lessonCardY = 508;
        const lessonCardH = 168;

        const lessonCard = this.add.graphics();
        lessonCard.fillStyle(0xFFFFFF, 1);
        lessonCard.fillRect(cardX, lessonCardY, cardW, lessonCardH);
        lessonCard.lineStyle(1, 0xCBD5E1, 1);
        lessonCard.strokeRect(cardX, lessonCardY, cardW, lessonCardH);

        this.add.text(cardX + 16, lessonCardY + 14, 'DATO ODS 7 E INGENIERIA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7',
            resolution: 3
        });

        const cycleBtn = this.add.text(cardX + cardW - 16, lessonCardY + 14, '[ OTRO DATO ]', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#D97706',
            resolution: 3
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        cycleBtn.on('pointerover', () => cycleBtn.setColor('#B45309'));
        cycleBtn.on('pointerout', () => cycleBtn.setColor('#D97706'));
        cycleBtn.on('pointerdown', () => this.nextLesson(cardX, lessonCardY, cardW));

        const divider = this.add.graphics();
        divider.fillStyle(0xE2E8F0, 1);
        divider.fillRect(cardX + 16, lessonCardY + 28, cardW - 32, 1);

        const initialLesson = ROTATING_LESSONS[this.currentLessonIdx];

        this.lessonTitleText = this.add.text(cardX + 16, lessonCardY + 38, initialLesson.title, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A',
            resolution: 3
        });

        this.lessonBodyText = this.add.text(cardX + 16, lessonCardY + 56, initialLesson.text, {
            fontSize: '13px',
            fontFamily: "'Outfit', sans-serif",
            color: '#475569',
            lineSpacing: 4,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true },
            resolution: 3
        });
    }

    private createSinglePlayerCards(cardX: number, cardW: number): void {
        const currentCfg = TOURNAMENT_ROUNDS[this.round] || TOURNAMENT_ROUNDS[1];
        const nextCfg = this.round < 4 ? TOURNAMENT_ROUNDS[this.round + 1] : undefined;

        // ── Card 1: Telemetria y Estado del Torneo ──
        const cardY = 168;
        const cardH = 150;

        const card = this.add.graphics();
        card.fillStyle(0xFFFFFF, 1);
        card.fillRect(cardX, cardY, cardW, cardH);
        card.lineStyle(1, 0xCBD5E1, 1);
        card.strokeRect(cardX, cardY, cardW, cardH);

        this.add.text(cardX + 16, cardY + 14, `BALANCE RONDA ${this.round}/4 · ${currentCfg.name}`, {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B',
            resolution: 3
        });

        const statusLabel = this.round === 4
            ? (this.rank <= 3 ? '¡PODIO FINAL!' : 'FINALISTA')
            : (this.isQualified ? '¡CLASIFICADO!' : 'ELIMINADO');
        const statusColor = this.isQualified ? '#16A34A' : '#DC2626';

        const stats = [
            { label: 'POSICION', val: `${this.rank}° / ${this.totalPlayers}`, color: '#0284C7' },
            { label: 'ESTADO', val: statusLabel, color: statusColor },
            { label: 'TIEMPO', val: `${this.finalTime} s`, color: '#0F172A' },
            { label: 'ENERGIA LIMPIA', val: `${this.finalKwh} kWh`, color: '#D97706' },
            { label: 'CO2 EVITADO', val: `~${this.finalCo2} kg`, color: '#16A34A' }
        ];

        stats.forEach((row, i) => {
            const yPos = cardY + 34 + i * 22;
            this.add.text(cardX + 16, yPos, row.label, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#64748B',
                resolution: 3
            });

            this.add.text(cardX + cardW - 16, yPos, row.val, {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
                color: row.color,
                resolution: 3
            }).setOrigin(1, 0);
        });

        // ── Card 2: Siguiente Etapa o Desafio ──
        const nextCardY = 328;
        const nextCardH = 158;

        const nextCard = this.add.graphics();
        nextCard.fillStyle(0xFFFFFF, 1);
        nextCard.fillRect(cardX, nextCardY, cardW, nextCardH);
        nextCard.lineStyle(1, 0xCBD5E1, 1);
        nextCard.strokeRect(cardX, nextCardY, cardW, nextCardH);

        if (this.round < 4 && this.isQualified && nextCfg) {
            this.add.text(cardX + 16, nextCardY + 14, `PROXIMA ETAPA: ${nextCfg.stageName}`, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#15803D',
                resolution: 3
            });

            const divider1 = this.add.graphics();
            divider1.fillStyle(0xE2E8F0, 1);
            divider1.fillRect(cardX + 16, nextCardY + 28, cardW - 32, 1);

            this.add.text(cardX + 16, nextCardY + 38, `• CIRCUITO: ${nextCfg.name}`, {
                fontSize: '9px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#0F172A',
                resolution: 3
            });

            this.add.text(cardX + 16, nextCardY + 54, nextCfg.description, {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#475569',
                lineSpacing: 3,
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });

            this.add.text(cardX + 16, nextCardY + 98, `• REGLA DE CORTE:`, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#D97706',
                resolution: 3
            });

            this.add.text(cardX + 16, nextCardY + 114, nextCfg.cutoffDescription || 'Clasifica el top 50%', {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#334155',
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });
        } else if (this.round < 4) {
            this.add.text(cardX + 16, nextCardY + 14, `CORTE ELIMINATORIO ODS 7`, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#DC2626',
                resolution: 3
            });

            const divider1 = this.add.graphics();
            divider1.fillStyle(0xE2E8F0, 1);
            divider1.fillRect(cardX + 16, nextCardY + 28, cardW - 32, 1);

            this.add.text(cardX + 16, nextCardY + 42, `En este Gran Premio ODS 7, solo clasifica el 50% más veloz en cada circuito.`, {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#475569',
                lineSpacing: 4,
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });

            this.add.text(cardX + 16, nextCardY + 95, `Tu posición fue ${this.rank}°, pero el corte era el puesto ${this.cutoffRank}°. ¡Aprovecha mejor los turbos y evita trompos!`, {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#0F172A',
                lineSpacing: 4,
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });
        } else {
            this.add.text(cardX + 16, nextCardY + 14, `GRAN PREMIO ODS 7 CULMINADO`, {
                fontSize: '8px',
                fontFamily: "'Press Start 2P', monospace",
                color: '#B45309',
                resolution: 3
            });

            const divider1 = this.add.graphics();
            divider1.fillStyle(0xE2E8F0, 1);
            divider1.fillRect(cardX + 16, nextCardY + 28, cardW - 32, 1);

            this.add.text(cardX + 16, nextCardY + 42, `¡Completaste las 4 etapas del torneo por la transición energética limpia 2030!`, {
                fontSize: '13px',
                fontFamily: "'Outfit', sans-serif",
                color: '#15803D',
                fontStyle: 'bold',
                lineSpacing: 4,
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });

            this.add.text(cardX + 16, nextCardY + 90, `Superaste Eólica, Solar, Hidroeléctrica y la Red Inteligente. ¡Eres pionero de la energía sostenible!`, {
                fontSize: '12px',
                fontFamily: "'Outfit', sans-serif",
                color: '#475569',
                lineSpacing: 4,
                wordWrap: { width: cardW - 32, useAdvancedWrap: true },
                resolution: 3
            });
        }

        // ── Card 3: Leccion Rotativa ODS 7 ──
        const lessonCardY = 498;
        const lessonCardH = 175;

        const lessonCard = this.add.graphics();
        lessonCard.fillStyle(0xFFFFFF, 1);
        lessonCard.fillRect(cardX, lessonCardY, cardW, lessonCardH);
        lessonCard.lineStyle(1, 0xCBD5E1, 1);
        lessonCard.strokeRect(cardX, lessonCardY, cardW, lessonCardH);

        this.add.text(cardX + 16, lessonCardY + 14, 'DATO ODS 7 E INGENIERIA', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0284C7',
            resolution: 3
        });

        const cycleBtn = this.add.text(cardX + cardW - 16, lessonCardY + 14, '[ OTRO DATO ]', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#D97706',
            resolution: 3
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        cycleBtn.on('pointerover', () => cycleBtn.setColor('#B45309'));
        cycleBtn.on('pointerout', () => cycleBtn.setColor('#D97706'));
        cycleBtn.on('pointerdown', () => this.nextLesson(cardX, lessonCardY, cardW));

        const divider2 = this.add.graphics();
        divider2.fillStyle(0xE2E8F0, 1);
        divider2.fillRect(cardX + 16, lessonCardY + 28, cardW - 32, 1);

        const initialLesson = ROTATING_LESSONS[this.currentLessonIdx];

        this.lessonTitleText = this.add.text(cardX + 16, lessonCardY + 38, initialLesson.title, {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#0F172A',
            resolution: 3
        });

        this.lessonBodyText = this.add.text(cardX + 16, lessonCardY + 56, initialLesson.text, {
            fontSize: '13px',
            fontFamily: "'Outfit', sans-serif",
            color: '#475569',
            lineSpacing: 4,
            wordWrap: { width: cardW - 32, useAdvancedWrap: true },
            resolution: 3
        });
    }

    private nextLesson(_cardX: number, _cardY: number, _cardW: number): void {
        this.currentLessonIdx = (this.currentLessonIdx + 1) % ROTATING_LESSONS.length;
        const lesson = ROTATING_LESSONS[this.currentLessonIdx];
        this.lessonTitleText.setText(lesson.title);
        this.lessonBodyText.setText(lesson.text);
    }

    private handlePeerFinished(data: any): void {
        if (!data) return;

        // 1. Update total players if more players arrived or connected
        if (typeof data.totalPlayers === 'number' && data.totalPlayers > this.totalPlayers) {
            this.totalPlayers = data.totalPlayers;
            if (this.subTitleText) {
                this.subTitleText.setText(`SALA MULTIJUGADOR EN VIVO (${this.totalPlayers} PILOTOS)`);
            }
            if (this.bannerTextObj && this.rank === 1) {
                this.bannerTextObj.setText(`¡CAMPEON ORO! 1° LUGAR DE ${this.totalPlayers}`);
            }
            if (this.posStatText) {
                this.posStatText.setText(`${this.rank}° / ${this.totalPlayers}`);
            }
        }

        // 2. Extract incoming podium entries
        const incomingPodium: PodiumEntry[] = Array.isArray(data.podium) ? data.podium : [];
        if (incomingPodium.length > 0) {
            this.podium = incomingPodium;
        }

        const finishRank = Number(data.rank);
        const finishName = String(data.name || 'Piloto');
        const finishTimeSec = data.finishTimeMs ? (Number(data.finishTimeMs) / 1000).toFixed(1) : (data.timeSec || '--');

        // 3. Update pedestal slots live (2°, 3°, or others)
        this.pedestalSlots.forEach(slot => {
            if (slot.isMe) return; // Never overwrite local player's spot

            const entry = incomingPodium.find(p => p.rank === slot.rank);
            if (entry) {
                const timeStr = entry.timeSec ? `${entry.timeSec}s` : (entry.finishTimeMs ? `${(entry.finishTimeMs / 1000).toFixed(1)}s` : '--');
                slot.nameText.setText(entry.name.slice(0, 6));
                slot.timeText.setText(timeStr);
            } else if (slot.rank === finishRank) {
                slot.nameText.setText(finishName.slice(0, 6));
                slot.timeText.setText(`${finishTimeSec}s`);
            }

            // If this slot was updated right now with this arrival
            if (slot.rank === finishRank) {
                this.tweens.add({
                    targets: [slot.nameText, slot.timeText],
                    scale: 1.3,
                    duration: 180,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
                SoundFX.playCollect(2);
            }
        });

        // 4. Floating arrival notification banner
        this.showLiveArrivalToast(finishName, finishRank, finishTimeSec);
    }

    private showLiveArrivalToast(name: string, rank: number, timeSec: string): void {
        const { width } = this.scale;
        if (this.liveToast) {
            this.liveToast.destroy();
            this.liveToast = undefined;
        }

        const toast = this.add.container(width / 2, -15).setDepth(300);
        this.liveToast = toast;

        const toastW = width - 48;
        const toastH = 26;

        const bg = this.add.graphics();
        bg.fillStyle(0x0F172A, 0.96);
        bg.fillRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 6);
        bg.lineStyle(1.5, 0x0284C7, 1);
        bg.strokeRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 6);
        toast.add(bg);

        const rankTag = timeSec === 'DESCONECTADO' ? 'DESCONECTADO' : (rank === 1 ? '1° ORO' : rank === 2 ? '2° PLATA' : rank === 3 ? '3° BRONCE' : `${rank}° LUGAR`);
        const msg = timeSec === 'DESCONECTADO' ? `[ DESCONECTADO ] ${name.slice(0, 8)} SALIO DE LA SALA` : `[ ${rankTag} ] ${name.slice(0, 8)} CRUZO META (${timeSec}s)`;
        const text = this.add.text(0, 0, msg, {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: timeSec === 'DESCONECTADO' ? '#EF4444' : '#38BDF8',
            resolution: 3
        }).setOrigin(0.5);
        toast.add(text);

        toast.setAlpha(0);
        toast.setScale(0.95);
        this.tweens.add({
            targets: toast,
            alpha: 1,
            scale: 1,
            y: 18,
            duration: 220,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    if (this.liveToast === toast) {
                        this.tweens.add({
                            targets: toast,
                            alpha: 0,
                            y: -15,
                            duration: 200,
                            onComplete: () => {
                                toast.destroy();
                                if (this.liveToast === toast) this.liveToast = undefined;
                            }
                        });
                    }
                });
            }
        });
    }

    private handleMultiplayerRaceStart = (data: { round?: number; countdownSeconds?: number }): void => {
        this.cameras.main.fadeOut(180, 241, 245, 249);
        this.time.delayedCall(180, () => {
            this.scene.start('MainScene', {
                round: data?.round || this.round + 1,
                multiplayer: true,
                skipGuide: true,
                countdownSeconds: data?.countdownSeconds || 3,
                roomCode: networkManager.roomCode
            });
        });
    };

    private handlePeerLeft = (data: { playerId: string; playerName?: string; players?: any[] }): void => {
        this.showLiveArrivalToast(data.playerName || 'PILOTO', 0, 'DESCONECTADO');
        if (data.players) {
            this.totalPlayers = data.players.length;
            if (this.posStatText) {
                this.posStatText.setText(`${this.rank}° DE ${this.totalPlayers}`);
            }
        }
    };
}
