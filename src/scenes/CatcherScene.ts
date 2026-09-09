import { Scene, Types } from 'phaser';
import { SoundFX } from '../systems/SoundFX';
import { InitialGuideModal } from '../ui/InitialGuideModal';

interface FallingItem extends Phaser.Physics.Arcade.Sprite {
    itemType: 'clean' | 'hazard';
    points: number;
    label: string;
    itemColor: string;
}

export class CatcherScene extends Scene {
    private player!: Phaser.Physics.Arcade.Sprite;
    private cursors!: Types.Input.Keyboard.CursorKeys;
    private keyA?: Phaser.Input.Keyboard.Key;
    private keyD?: Phaser.Input.Keyboard.Key;

    private cleanGroup!: Phaser.Physics.Arcade.Group;
    private hazardGroup!: Phaser.Physics.Arcade.Group;

    // Game stats
    private kwh: number = 0;
    private readonly targetKwh: number = 1000; // Increased target kWh as requested
    private lives: number = 5; // 5 lives total as requested
    private combo: number = 0;
    private multiplier: number = 1;
    private isGameActive: boolean = false;
    private startTime: number = 0;

    // HUD Elements
    private hudGroup!: Phaser.GameObjects.Group;
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private progressBarGfx!: Phaser.GameObjects.Graphics;
    private spawnerTimer?: Phaser.Time.TimerEvent;
    private showGuide: boolean = true;

    constructor() {
        super('CatcherScene');
    }

    init(data?: { skipGuide?: boolean }): void {
        this.showGuide = data?.skipGuide !== true;
    }

    create(): void {
        const { width, height } = this.scale;
        this.kwh = 0;
        this.lives = 5;
        this.combo = 0;
        this.multiplier = 1;
        this.isGameActive = false;
        this.startTime = this.time.now;
        (window as any).__gameActive = false;

        SoundFX.unlock();

        // ── 1. Light Mode Retro Background ──
        const bg = this.add.graphics().setDepth(0);
        bg.fillStyle(0xF1F5F9, 1);
        bg.fillRect(0, 0, width, height);

        // Distant city skyline & substation ground
        this.add.tileSprite(width / 2, height - 140, width, 96, 'city_skyline')
            .setAlpha(0.20)
            .setDepth(1);
        this.add.tileSprite(width / 2, height - 20, width, 40, 'substation_floor')
            .setAlpha(0.70)
            .setDepth(2);

        // Ground barrier
        const ground = this.add.rectangle(width / 2, height - 10, width, 20, 0xCBD5E1, 1).setDepth(2);
        this.physics.add.existing(ground, true);

        // ── 2. Player (BESS Grid Technician) ──
        this.player = this.physics.add.sprite(width / 2, height - 64, 'player_run')
            .setScale(2.5)
            .setDepth(15);
        this.player.setCollideWorldBounds(true);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(22, 28);
        body.setOffset(5, 2);

        // Ground shadow
        const shadow = this.add.graphics().setDepth(14);
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillEllipse(0, 0, 34, 10);
        this.events.on('update', () => {
            shadow.setPosition(this.player.x, this.player.y + 32);
        });

        // ── 3. Falling Groups (Rendered under HUD at Depth 10) ──
        this.cleanGroup = this.physics.add.group();
        this.hazardGroup = this.physics.add.group();

        this.physics.add.overlap(this.player, this.cleanGroup, this.handleCatchClean as any, undefined, this);
        this.physics.add.overlap(this.player, this.hazardGroup, this.handleHitHazard as any, undefined, this);

        // ── 4. Spawner Loop (Starts at 650ms, ramps faster) ──
        this.spawnerTimer = this.time.addEvent({
            delay: 650,
            callback: this.spawnFallingElement,
            callbackScope: this,
            loop: true,
            paused: this.showGuide
        });

        // ── 5. Controls Input ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        }

        // ── 6. HUD Dashboard (Set to Depth 100 so items fall behind it) ──
        this.createHud(width);

        this.cameras.main.fadeIn(200, 241, 245, 249);

        if (this.showGuide) {
            new InitialGuideModal(this, {
                mode: 'catcher',
                durationSeconds: 10,
                onComplete: () => {
                    this.isGameActive = true;
                    this.startTime = this.time.now;
                    (window as any).__gameActive = true;
                    if (this.spawnerTimer) {
                        this.spawnerTimer.paused = false;
                    }
                }
            });
        } else {
            this.isGameActive = true;
            this.startTime = this.time.now;
            (window as any).__gameActive = true;
            if (this.spawnerTimer) {
                this.spawnerTimer.paused = false;
            }
        }
    }

    private createHud(width: number): void {
        this.hudGroup = this.add.group();

        // Top HUD solid white bar (Depth 100)
        const hudBg = this.add.graphics().setDepth(100);
        hudBg.fillStyle(0xFFFFFF, 1);
        hudBg.fillRect(0, 0, width, 88);
        hudBg.fillStyle(0xCBD5E1, 1);
        hudBg.fillRect(0, 87, width, 1);
        this.hudGroup.add(hudBg);

        // Score (kWh)
        const lbl1 = this.add.text(20, 14, 'ENERGIA BESS', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setDepth(101);
        this.hudGroup.add(lbl1);

        this.scoreText = this.add.text(20, 28, `0 / ${this.targetKwh} kWh`, {
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#D97706'
        }).setDepth(101);
        this.hudGroup.add(this.scoreText);

        // Multiplier / Combo
        this.comboText = this.add.text(20, 48, 'COMBO: 1x (0 seguidos)', {
            fontSize: '11px',
            fontFamily: "'Silkscreen', monospace",
            color: '#0284C7'
        }).setDepth(101);
        this.hudGroup.add(this.comboText);

        // Grid Stability (5 Hearts)
        const lbl2 = this.add.text(width - 20, 14, 'ESTABILIDAD RED (5 MAX)', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(1, 0).setDepth(101);
        this.hudGroup.add(lbl2);

        this.livesText = this.add.text(width - 20, 28, '❤❤❤❤❤', {
            fontSize: '13px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#DC2626'
        }).setOrigin(1, 0).setDepth(101);
        this.hudGroup.add(this.livesText);

        // Target progress bar
        this.progressBarGfx = this.add.graphics().setDepth(101);
        this.renderProgressBar(width);
        this.hudGroup.add(this.progressBarGfx);

        // Exit / Return button at top center
        const exitBtn = this.add.text(width / 2, 22, '[ MENU ]', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5).setDepth(101).setInteractive({ useHandCursor: true });

        exitBtn.on('pointerover', () => exitBtn.setColor('#B45309'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#64748B'));
        exitBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(180, 241, 245, 249);
            this.time.delayedCall(180, () => this.scene.start('MenuScene'));
        });
        this.hudGroup.add(exitBtn);
    }

    private renderProgressBar(width: number): void {
        this.progressBarGfx.clear();
        const barX = 20;
        const barY = 70;
        const barW = width - 40;
        const barH = 8;

        // Background
        this.progressBarGfx.fillStyle(0xE2E8F0, 1);
        this.progressBarGfx.fillRect(barX, barY, barW, barH);

        // Progress fill
        const ratio = Math.min(1, this.kwh / this.targetKwh);
        this.progressBarGfx.fillStyle(0x16A34A, 1);
        this.progressBarGfx.fillRect(barX, barY, barW * ratio, barH);
    }

    private spawnFallingElement(): void {
        if (!this.isGameActive) return;

        const { width } = this.scale;
        const progressRatio = Math.min(1, this.kwh / this.targetKwh);

        // Progressively increase fall speed
        const fallSpeed = 190 + progressRatio * 240;

        // Dynamically speed up spawner delay as game progresses
        if (this.spawnerTimer) {
            this.spawnerTimer.reset({
                delay: Math.max(380, 650 - Math.round(progressRatio * 270)),
                callback: this.spawnFallingElement,
                callbackScope: this,
                loop: true
            });
        }

        // Chance to spawn 2 items simultaneously at higher progress
        const count = progressRatio > 0.35 && Math.random() < 0.4 ? 2 : 1;

        for (let i = 0; i < count; i++) {
            const spawnX = Phaser.Math.Between(40, width - 40);
            const isHazard = Math.random() < 0.30;

            if (isHazard) {
                const hazardTypes = [
                    { key: 'oil', label: '¡PETROLEO!', points: -30, color: '#DC2626' },
                    { key: 'coal', label: '¡CARBON!', points: -25, color: '#991B1B' },
                    { key: 'surge', label: '¡SOBRECARGA!', points: -20, color: '#EA580C' }
                ];
                const chosen = Phaser.Math.RND.pick(hazardTypes);
                const hazard = this.physics.add.sprite(spawnX, 40, chosen.key) as FallingItem;
                hazard.setScale(2.2);
                hazard.setDepth(10); // Underneath HUD
                hazard.itemType = 'hazard';
                hazard.points = chosen.points;
                hazard.label = chosen.label;
                hazard.itemColor = chosen.color;
                hazard.setVelocityY(fallSpeed);
                this.hazardGroup.add(hazard);
            } else {
                const cleanTypes = [
                    { key: 'solar', label: '+10 kWh SOLAR', points: 10, color: '#D97706' },
                    { key: 'wind', label: '+15 kWh EOLICA', points: 15, color: '#0284C7' },
                    { key: 'hydro', label: '+20 kWh HIDRO', points: 20, color: '#2563EB' },
                    { key: 'battery', label: '+35 kWh BESS', points: 35, color: '#16A34A' }
                ];
                const chosen = Phaser.Math.RND.pick(cleanTypes);
                const item = this.physics.add.sprite(spawnX, 40, chosen.key) as FallingItem;
                item.setScale(2.2);
                item.setDepth(10); // Underneath HUD
                item.itemType = 'clean';
                item.points = chosen.points;
                item.label = chosen.label;
                item.itemColor = chosen.color;
                item.setVelocityY(fallSpeed);
                this.cleanGroup.add(item);
            }
        }
    }

    private handleCatchClean(_playerObj: any, itemObj: any): void {
        if (!this.isGameActive) return;
        const item = itemObj as FallingItem;
        item.destroy();

        this.combo++;
        if (this.combo >= 10) {
            this.multiplier = 3;
        } else if (this.combo >= 4) {
            this.multiplier = 2;
        } else {
            this.multiplier = 1;
        }

        const gained = item.points * this.multiplier;
        this.kwh += gained;
        SoundFX.playCollect(this.combo);

        this.showPopup(this.player.x, this.player.y - 32, `+${gained} kWh`, item.itemColor);
        this.updateHud();

        if (this.kwh >= this.targetKwh) {
            this.winGame();
        }
    }

    private handleHitHazard(_playerObj: any, hazardObj: any): void {
        if (!this.isGameActive) return;
        const hazard = hazardObj as FallingItem;
        hazard.destroy();

        this.lives--;
        this.combo = 0;
        this.multiplier = 1;

        SoundFX.playHazard();
        this.cameras.main.shake(200, 0.012);
        this.cameras.main.flash(150, 220, 38, 38);

        this.showPopup(this.player.x, this.player.y - 32, hazard.label, hazard.itemColor);
        this.updateHud();

        if (this.lives <= 0) {
            this.loseGame();
        }
    }

    /**
     * Penalty when a clean item escapes off-screen (as requested: loses 1 life)
     */
    private handleEscapedCleanItem(x: number): void {
        if (!this.isGameActive) return;
        this.lives--;
        this.combo = 0;
        this.multiplier = 1;

        SoundFX.playHazard();
        this.cameras.main.shake(150, 0.008);

        this.showPopup(x, this.scale.height - 40, '¡SE ESCAPO! -1 VIDA', '#DC2626');
        this.updateHud();

        if (this.lives <= 0) {
            this.loseGame();
        }
    }

    private updateHud(): void {
        this.scoreText.setText(`${this.kwh} / ${this.targetKwh} kWh`);
        this.comboText.setText(`COMBO: ${this.multiplier}x (${this.combo} seguidos)`);

        const hearts = '❤'.repeat(Math.max(0, this.lives)) || 'AGOTADA';
        this.livesText.setText(hearts);
        this.renderProgressBar(this.scale.width);
    }

    private showPopup(x: number, y: number, text: string, color: string): void {
        const popup = this.add.text(x, y, text, {
            fontSize: '10px',
            fontFamily: "'Press Start 2P', monospace",
            color: color
        }).setOrigin(0.5).setDepth(105);

        this.tweens.add({
            targets: popup,
            y: y - 35,
            alpha: 0,
            duration: 650,
            ease: 'Cubic.easeOut',
            onComplete: () => popup.destroy()
        });
    }

    private winGame(): void {
        this.isGameActive = false;
        (window as any).__gameActive = false;
        if (this.spawnerTimer) this.spawnerTimer.remove();

        const totalTime = ((this.time.now - this.startTime) / 1000).toFixed(1);
        SoundFX.playWin();

        this.cameras.main.fadeOut(250, 241, 245, 249);
        this.time.delayedCall(250, () => {
            this.scene.start('WinScene', {
                mode: 'catcher',
                time: totalTime,
                kwh: this.kwh
            });
        });
    }

    private loseGame(): void {
        this.isGameActive = false;
        (window as any).__gameActive = false;
        if (this.spawnerTimer) this.spawnerTimer.remove();

        SoundFX.playGameOver();
        this.cameras.main.fadeOut(250, 241, 245, 249);
        this.time.delayedCall(250, () => {
            this.scene.start('GameOverScene', {
                mode: 'catcher',
                score: this.kwh,
                progress: Math.round((this.kwh / this.targetKwh) * 100)
            });
        });
    }

    update(): void {
        if (!this.isGameActive) return;

        const { width, height } = this.scale;
        const touch = (window as any).__touchControls;

        // Clean items off-screen check: losing a life if missed!
        this.cleanGroup.children.each((child: any) => {
            if (child && child.y > height + 20) {
                const escapeX = child.x;
                child.destroy();
                this.handleEscapedCleanItem(escapeX);
            }
            return null;
        });

        // Hazards off-screen check: successfully dodged!
        this.hazardGroup.children.each((child: any) => {
            if (child && child.y > height + 20) {
                child.destroy();
            }
            return null;
        });

        // Movement Controls
        const left = (this.cursors && this.cursors.left.isDown) || (this.keyA && this.keyA.isDown) || (touch && touch.left);
        const right = (this.cursors && this.cursors.right.isDown) || (this.keyD && this.keyD.isDown) || (touch && touch.right);

        const moveSpeed = 380;
        if (left && this.player.x > 32) {
            this.player.setVelocityX(-moveSpeed);
            this.player.setFlipX(true);
        } else if (right && this.player.x < width - 32) {
            this.player.setVelocityX(moveSpeed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }
    }
}
