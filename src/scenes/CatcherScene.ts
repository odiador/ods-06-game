import { Scene, Types } from 'phaser';
import { SoundFX } from '../systems/SoundFX';

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
    private readonly targetKwh: number = 350;
    private lives: number = 3;
    private combo: number = 0;
    private multiplier: number = 1;
    private isGameActive: boolean = false;
    private startTime: number = 0;

    // HUD Elements
    private scoreText!: Phaser.GameObjects.Text;
    private comboText!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private progressBarGfx!: Phaser.GameObjects.Graphics;
    private spawnerTimer?: Phaser.Time.TimerEvent;

    constructor() {
        super('CatcherScene');
    }

    create(): void {
        const { width, height } = this.scale;
        this.kwh = 0;
        this.lives = 3;
        this.combo = 0;
        this.multiplier = 1;
        this.isGameActive = true;
        this.startTime = this.time.now;
        (window as any).__gameActive = true;

        SoundFX.unlock();

        // ── 1. Retro Background (Solid, no blurry gradients) ──
        const bg = this.add.graphics();
        bg.fillStyle(0x080C16, 1);
        bg.fillRect(0, 0, width, height);

        // Distant city skyline & substation grid line
        this.add.tileSprite(width / 2, height - 140, width, 96, 'city_skyline').setAlpha(0.25);
        this.add.tileSprite(width / 2, height - 20, width, 40, 'substation_floor').setAlpha(0.85);

        // Ground collision barrier
        const ground = this.add.rectangle(width / 2, height - 10, width, 20, 0x1E293B, 1);
        this.physics.add.existing(ground, true);

        // ── 2. Player (BESS Grid Technician) ──
        this.player = this.physics.add.sprite(width / 2, height - 64, 'player_run').setScale(2.4);
        this.player.setCollideWorldBounds(true);
        const body = this.player.body as Phaser.Physics.Arcade.Body;
        body.setSize(22, 28);
        body.setOffset(5, 2);

        // Subtle shadow beneath player
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillEllipse(0, 0, 32, 10);
        this.events.on('update', () => {
            shadow.setPosition(this.player.x, this.player.y + 32);
        });

        // ── 3. Falling Items Groups ──
        this.cleanGroup = this.physics.add.group();
        this.hazardGroup = this.physics.add.group();

        this.physics.add.overlap(this.player, this.cleanGroup, this.handleCatchClean as any, undefined, this);
        this.physics.add.overlap(this.player, this.hazardGroup, this.handleHitHazard as any, undefined, this);

        // ── 4. Spawner Loop (Progressive cadence) ──
        this.spawnerTimer = this.time.addEvent({
            delay: 750,
            callback: this.spawnFallingElement,
            callbackScope: this,
            loop: true
        });

        // ── 5. Controls Input ──
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
            this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
        }

        // ── 6. HUD Dashboard (Solid retro bar) ──
        this.createHud(width);

        this.cameras.main.fadeIn(200, 8, 12, 22);
    }

    private createHud(width: number): void {
        const hudBg = this.add.graphics();
        hudBg.fillStyle(0x0D1322, 1);
        hudBg.fillRect(0, 0, width, 88);
        hudBg.fillStyle(0x1E293B, 1);
        hudBg.fillRect(0, 87, width, 1);

        // Score (kWh)
        this.add.text(20, 14, 'ENERGIA BESS', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#94A3B8'
        });

        this.scoreText = this.add.text(20, 28, '0 / 350 kWh', {
            fontSize: '12px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#FACC15'
        });

        // Multiplier / Combo
        this.comboText = this.add.text(20, 48, 'COMBO: 1x', {
            fontSize: '10px',
            fontFamily: "'Silkscreen', monospace",
            color: '#38BDF8'
        });

        // Grid Stability (Lives)
        this.add.text(width - 20, 14, 'ESTABILIDAD RED', {
            fontSize: '8px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#94A3B8'
        }).setOrigin(1, 0);

        this.livesText = this.add.text(width - 20, 28, '❤❤❤', {
            fontSize: '14px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#EF4444'
        }).setOrigin(1, 0);

        // Target progress bar at bottom of HUD
        this.progressBarGfx = this.add.graphics();
        this.renderProgressBar(width);

        // Exit / Return button at top center
        const exitBtn = this.add.text(width / 2, 22, '[ MENU ]', {
            fontSize: '9px',
            fontFamily: "'Press Start 2P', monospace",
            color: '#64748B'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        exitBtn.on('pointerover', () => exitBtn.setColor('#FACC15'));
        exitBtn.on('pointerout', () => exitBtn.setColor('#64748B'));
        exitBtn.on('pointerdown', () => {
            this.cameras.main.fadeOut(200, 8, 12, 22);
            this.time.delayedCall(200, () => this.scene.start('MenuScene'));
        });
    }

    private renderProgressBar(width: number): void {
        this.progressBarGfx.clear();
        const barX = 20;
        const barY = 70;
        const barW = width - 40;
        const barH = 8;

        // Background
        this.progressBarGfx.fillStyle(0x1E293B, 1);
        this.progressBarGfx.fillRect(barX, barY, barW, barH);

        // Progress fill
        const ratio = Math.min(1, this.kwh / this.targetKwh);
        this.progressBarGfx.fillStyle(0x22C55E, 1);
        this.progressBarGfx.fillRect(barX, barY, barW * ratio, barH);
    }

    private spawnFallingElement(): void {
        if (!this.isGameActive) return;

        const { width } = this.scale;
        const spawnX = Phaser.Math.Between(40, width - 40);

        // 70% chance clean energy, 30% chance fossil / surge hazard
        const isHazard = Math.random() < 0.30;

        // Base fall speed increases gently as score grows
        const fallSpeed = 160 + Math.min(140, (this.kwh / this.targetKwh) * 140);

        if (isHazard) {
            const hazardTypes = [
                { key: 'oil', label: '¡PETROLEO FOSIL!', points: -25, color: '#DC2626' },
                { key: 'coal', label: '¡CARBON TOXICO!', points: -20, color: '#991B1B' },
                { key: 'surge', label: '¡SOBRECARGA!', points: -15, color: '#F97316' }
            ];
            const chosen = Phaser.Math.RND.pick(hazardTypes);
            const hazard = this.physics.add.sprite(spawnX, -20, chosen.key) as FallingItem;
            hazard.setScale(2.2);
            hazard.itemType = 'hazard';
            hazard.points = chosen.points;
            hazard.label = chosen.label;
            hazard.itemColor = chosen.color;
            hazard.setVelocityY(fallSpeed);
            this.hazardGroup.add(hazard);
        } else {
            const cleanTypes = [
                { key: 'solar', label: '+10 kWh SOLAR', points: 10, color: '#FACC15' },
                { key: 'wind', label: '+15 kWh EOLICA', points: 15, color: '#38BDF8' },
                { key: 'hydro', label: '+20 kWh HIDRO', points: 20, color: '#60A5FA' },
                { key: 'battery', label: '+30 kWh BESS', points: 30, color: '#4ADE80' }
            ];
            const chosen = Phaser.Math.RND.pick(cleanTypes);
            const item = this.physics.add.sprite(spawnX, -20, chosen.key) as FallingItem;
            item.setScale(2.2);
            item.itemType = 'clean';
            item.points = chosen.points;
            item.label = chosen.label;
            item.itemColor = chosen.color;
            item.setVelocityY(fallSpeed);
            this.cleanGroup.add(item);
        }
    }

    private handleCatchClean(_playerObj: any, itemObj: any): void {
        if (!this.isGameActive) return;
        const item = itemObj as FallingItem;
        item.destroy();

        // Increment combo & multiplier
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

        // Show floating point popup
        this.showPopup(this.player.x, this.player.y - 30, `+${gained} kWh`, item.itemColor);

        this.updateHud();

        // Check victory condition
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
        this.cameras.main.flash(150, 180, 20, 20);

        this.showPopup(this.player.x, this.player.y - 30, hazard.label, hazard.itemColor);

        this.updateHud();

        // Check loss condition
        if (this.lives <= 0) {
            this.loseGame();
        }
    }

    private updateHud(): void {
        this.scoreText.setText(`${this.kwh} / ${this.targetKwh} kWh`);
        this.comboText.setText(`COMBO: ${this.multiplier}x (${this.combo} seguidos)`);

        const hearts = '❤'.repeat(Math.max(0, this.lives)) || 'SIN ENERGIA';
        this.livesText.setText(hearts);
        this.renderProgressBar(this.scale.width);
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

        this.cameras.main.fadeOut(300, 8, 12, 22);
        this.time.delayedCall(300, () => {
            this.scene.start('WinScene', {
                time: totalTime,
                kwh: this.kwh,
                distance: 2030,
                biome: 'solar'
            });
        });
    }

    private loseGame(): void {
        this.isGameActive = false;
        (window as any).__gameActive = false;
        if (this.spawnerTimer) this.spawnerTimer.remove();

        SoundFX.playGameOver();
        this.cameras.main.fadeOut(300, 8, 12, 22);
        this.time.delayedCall(300, () => {
            this.scene.start('GameOverScene', {
                score: this.kwh,
                progress: Math.round((this.kwh / this.targetKwh) * 100)
            });
        });
    }

    update(): void {
        if (!this.isGameActive) return;

        const { width, height } = this.scale;
        const touch = (window as any).__touchControls;

        // Clean items & hazards off-screen cleanup
        this.cleanGroup.children.each((child: any) => {
            if (child && child.y > height + 20) {
                child.destroy();
                // If a clean item falls uncollected, reset combo softly
                if (this.combo > 0) {
                    this.combo = 0;
                    this.multiplier = 1;
                    this.updateHud();
                }
            }
            return null;
        });

        this.hazardGroup.children.each((child: any) => {
            if (child && child.y > height + 20) {
                child.destroy();
            }
            return null;
        });

        // Movement Controls
        const left = (this.cursors && this.cursors.left.isDown) || (this.keyA && this.keyA.isDown) || (touch && touch.left);
        const right = (this.cursors && this.cursors.right.isDown) || (this.keyD && this.keyD.isDown) || (touch && touch.right);

        const moveSpeed = 360;
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
