import Bat from "../entities/lvl1/Bat.js";
import Eyeball from "../entities/lvl1/EyeBall.js";
import PlayerController from "../managers/PlayerController.js";
import PlayerData from "../systems/PlayerData.js";
import Shadow from "../entities/lvl1/Shadow.js";
import Shooter from "../entities/lvl1/Shooter.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    const MAP_WIDTH = 3000;
    const MAP_HEIGHT = 2000;

    // 🔄 IMPORTANTE: Inicializar flag de game over
    this.isGameOver = false;

    if (!this.scene.isActive("HUDScene")) {
      this.scene.launch("HUDScene");
    }
    this.hudScene = this.scene.get("HUDScene");

    this.bg = this.add.image(0, 0, "background").setOrigin(0);
    this.bg.setDisplaySize(MAP_WIDTH, MAP_HEIGHT);

    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.level1Music = this.sound.add("level1_music", {
      loop: true,
      volume: 0.05,
    });
    this.level1Music.play();

    this.player = this.physics.add.sprite(
      MAP_WIDTH / 2,
      MAP_HEIGHT / 2,
      "player_walk",
      0
    );
    this.player.setScale(0.4);
    this.player.setCollideWorldBounds(true);

    this.player.health = PlayerData.health;
    this.player.maxHealth = PlayerData.maxHealth;

    // 🔫 Sistema de armas simplificado - siempre pistol con 25 de daño
    this.currentWeapon = "pistol";
    this.weaponDamage = 25;

    this.coins = PlayerData.totalScore || 0;

    this.stats = {
      startTime: Date.now(),
      survivalTime: 0,
      totalKills: PlayerData.totalKills || 0,
      highestWave: PlayerData.highestWave || 1,
      coinsEarned: 0,
    };

    this.setupAnimations();

    this.playerController = new PlayerController(this, this.player);

    this.cameras.main.startFollow(this.player, true, 0.05, 0.05);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.setZoom(1);

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      runChildUpdate: true,
    });

    this.enemies = this.physics.add.group();
    this.coinDrops = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    this.waveSystem = {
      isActive: false,
      duration: 20000,
      startTime: 0,
      isPaused: false,
      enemySpawnRate: 2000,
      lastSpawnTime: 0,
      baseEnemiesAtOnce: 3,
    };

    this.currentWave = PlayerData.highestWave || 1;
    this.enemiesInWave = this.waveSystem.baseEnemiesAtOnce;

    // 🔥 Boosts - siempre en valores base (sin multiplicadores)
    this.activeBoosts = {
      damageMultiplier: 1,
      speedMultiplier: 1,
      hasShield: false,
      shieldHits: 0,
    };

    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.bulletHitEnemy,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.enemies,
      this.playerHitEnemy,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.enemyBullets,
      this.playerHitByBullet,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.coinDrops,
      this.collectCoin,
      null,
      this
    );

    this.events.on("playerShoot", this.handlePlayerShoot, this);
    this.events.on("playerReload", this.handlePlayerReload, this);
    this.events.on("shopClosed", this.handleShopClosed, this);

    this.game.events.on("toggleMusic", this.handleMusicToggle, this);
    this.game.events.on("toggleSFX", this.handleSFXToggle, this);

    // ADDED: registrar limpieza automática cuando la escena pare o sea destruida
    this.events.on("shutdown", this.onShutdown, this);
    this.events.on("destroy", this.onDestroy, this);

    this.escKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );
    this.isPaused = false;

    this.startWave();
  }

  setupAnimations() {
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers("player_walk", {
        start: 0,
        end: 19,
      }),
      frameRate: 15,
      repeat: -1,
    });

    this.anims.create({
      key: "shoot",
      frames: this.anims.generateFrameNumbers("player_shoot", {
        start: 0,
        end: 1,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "reload",
      frames: this.anims.generateFrameNumbers("player_reload", {
        start: 0,
        end: 3,
      }),
      frameRate: 5,
      repeat: 0,
    });

    this.anims.create({
      key: "bat_fly",
      frames: this.anims.generateFrameNumbers("bat", { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "eyeball_move",
      frames: this.anims.generateFrameNumbers("eyeball", { start: 0, end: 23 }),
      frameRate: 20,
      repeat: -1,
    });

    this.anims.create({
      key: "coin_spin",
      frames: this.anims.generateFrameNumbers("coin", { start: 0, end: 7 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shadow_run",
      frames: this.anims.generateFrameNumbers("shadow_run", {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shadow_attack",
      frames: this.anims.generateFrameNumbers("shadow_attack", {
        start: 0,
        end: 7,
      }),
      frameRate: 4,
      repeat: 0,
    });

    this.anims.create({
      key: "shooter_walk",
      frames: this.anims.generateFrameNumbers("shooter_walk", {
        start: 0,
        end: 5,
      }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: "shooter_attack",
      frames: this.anims.generateFrameNumbers("shooter_attack", {
        start: 0,
        end: 5,
      }),
      frameRate: 12,
      repeat: 0,
    });
  }

  getWeaponDamage(weapon) {
    const damages = { pistol: 25, shotgun: 40, rifle: 35 };
    return damages[weapon] || 25;
  }

  startWave() {
    this.waveSystem.isActive = true;
    this.waveSystem.isPaused = false;
    this.waveSystem.startTime = 0;
    this.waveSystem.lastSpawnTime = 0;

    this.waveSystem.duration = 20000 + (this.currentWave - 1) * 10000;
    this.enemiesInWave =
      this.waveSystem.baseEnemiesAtOnce + Math.floor(this.currentWave / 2);
    this.enemiesInWave = Math.min(this.enemiesInWave, 15);
    this.waveSystem.enemySpawnRate = Math.max(
      800,
      2000 - this.currentWave * 100
    );

    this.showWaveStartAnimation();
  }

  showWaveStartAnimation() {
    this.physics.pause();
    this.playerController.setEnabled(false);
    this.player.setVelocity(0, 0);

    const { width, height } = this.sys.game.config;

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0.7)
      .setScrollFactor(0)
      .setDepth(9000);

    const waveText = this.add
      .text(width / 2, height / 2 - 50, `OLEADA ${this.currentWave}`, {
        fontSize: "72px",
        color: "#00ff00",
        stroke: "#000",
        strokeThickness: 8,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9001)
      .setAlpha(0);

    const readyText = this.add
      .text(width / 2, height / 2 + 50, "PREPARATE!", {
        fontSize: "32px",
        color: "#ffff00",
        stroke: "#000",
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9001)
      .setAlpha(0);

    this.tweens.add({
      targets: [waveText, readyText],
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 500,
      ease: "Back.easeOut",
    });

    this.tweens.add({
      targets: readyText,
      alpha: { from: 1, to: 0.3 },
      duration: 400,
      yoyo: true,
      repeat: 3,
      delay: 500,
    });

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: [overlay, waveText, readyText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          waveText.destroy();
          readyText.destroy();
          this.physics.resume();
          this.playerController.setEnabled(true);
          this.player.setVelocity(0, 0);
          this.waveSystem.startTime = this.time.now;
        },
      });
    });
  }

  endWave() {
    this.waveSystem.isActive = false;
    this.waveSystem.isPaused = true;

    this.physics.pause();
    this.playerController.setEnabled(false);
    this.player.setVelocity(0, 0);

    this.enemies.children.entries.forEach((enemy) => {
      if (enemy.healthBar) enemy.healthBar.destroy();
      if (enemy.healthBarBg) enemy.healthBarBg.destroy();
    });
    this.enemies.clear(true, true);
    this.coinDrops.clear(true, true);

    PlayerData.updateHighestWave(this.currentWave);
    PlayerData.setHealth(this.player.health);

    this.stats.survivalTime = Math.floor(
      (Date.now() - this.stats.startTime) / 1000
    );
    this.stats.highestWave = this.currentWave;

    this.showWaveEndAnimation();
  }

  showWaveEndAnimation() {
    const { width, height } = this.sys.game.config;

    const overlay = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(9000);

    this.tweens.add({ targets: overlay, alpha: 0.85, duration: 800 });

    const victoryText = this.add
      .text(width / 2, height / 2 - 80, "OLEADA SUPERADA!", {
        fontSize: "64px",
        color: "#00ff00",
        stroke: "#000",
        strokeThickness: 8,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9001)
      .setAlpha(0)
      .setScale(0.5);

    const statsText = this.add
      .text(
        width / 2,
        height / 2 + 20,
        `Kills: ${this.stats.totalKills}  |  Monedas: ${this.coins}`,
        {
          fontSize: "28px",
          color: "#ffffff",
          stroke: "#000",
          strokeThickness: 4,
        }
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9001)
      .setAlpha(0);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: 1,
      duration: 600,
      ease: "Back.easeOut",
      delay: 300,
    });

    this.tweens.add({
      targets: statsText,
      alpha: 1,
      duration: 400,
      delay: 800,
    });

    this.tweens.add({
      targets: victoryText,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      delay: 1000,
    });

    this.time.delayedCall(2500, () => {
      this.tweens.add({
        targets: [overlay, victoryText, statsText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          victoryText.destroy();
          statsText.destroy();
          this.player.setPosition(1500, 1000);
          this.cameras.main.centerOn(1500, 1000);
          this.openShop();
        },
      });
    });
  }

  openShop() {
    this.playerController.setEnabled(false);
    this.player.setVelocity(0, 0);

    this.scene.launch("ShopScene", {
      gameScene: this,
      currentWave: this.currentWave,
      coins: this.coins,
      playerHealth: this.player.health,
      playerMaxHealth: this.player.maxHealth,
      totalKills: this.stats.totalKills,
      currentWeapon: this.currentWeapon,
      activeBoosts: this.activeBoosts,
      hudScene: this.hudScene,
    });

    this.scene.bringToTop("ShopScene");
  }

  handleShopClosed(data) {
    this.coins = data.coins;
    this.player.health = data.playerHealth;
    this.player.maxHealth = data.playerMaxHealth;
    this.activeBoosts = data.activeBoosts;

    if (data.currentWeapon !== this.currentWeapon) {
      this.upgradeWeapon(data.currentWeapon);
    }

    this.playerController.setEnabled(true);
    this.currentWave++;
    this.startWave();
  }

  upgradeWeapon(newWeapon) {
    this.currentWeapon = newWeapon;
    this.weaponDamage = this.getWeaponDamage(newWeapon);

    const weaponSprites = {
      pistol: "player_walk",
      shotgun: "player_shotgun",
      rifle: "player_rifle",
    };
    const newTexture = weaponSprites[newWeapon] || "player_walk";
    this.player.setTexture(newTexture, 0);

    this.setupWeaponAnimations(newWeapon);

    if (newWeapon === "shotgun") {
      this.playerController.setMaxBullets(6);
    } else if (newWeapon === "rifle") {
      this.playerController.setMaxBullets(30);
    } else {
      this.playerController.setMaxBullets(10);
    }
  }

  setupWeaponAnimations(weapon) {
    this.anims.create({
      key: "walk",
      frames: this.anims.generateFrameNumbers(`player_${weapon}`, {
        start: 0,
        end: 19,
      }),
      frameRate: 15,
      repeat: -1,
    });

    this.anims.create({
      key: "shoot",
      frames: this.anims.generateFrameNumbers(`player_${weapon}_shoot`, {
        start: 0,
        end: 1,
      }),
      frameRate: 15,
      repeat: 0,
    });

    this.anims.create({
      key: "reload",
      frames: this.anims.generateFrameNumbers(`player_${weapon}_reload`, {
        start: 0,
        end: 3,
      }),
      frameRate: 5,
      repeat: 0,
    });
  }

  updateHUD() {
    if (
      !this.hudScene ||
      !this.hudScene.playerHealthBar ||
      !this.hudScene.infoText ||
      !this.playerController
    )
      return;

    this.hudScene.updateHealthBar(this.player.health, this.player.maxHealth);

    let timeRemaining = 0;
    if (this.waveSystem.isActive && !this.waveSystem.isPaused) {
      const elapsed = this.time.now - this.waveSystem.startTime;
      timeRemaining = Math.max(
        0,
        Math.ceil((this.waveSystem.duration - elapsed) / 1000)
      );
    }

    this.hudScene.updateInfo(
      this.currentWave,
      this.stats.totalKills,
      timeRemaining,
      this.playerController.getCurrentBullets(),
      this.playerController.getMaxBullets()
    );

    if (this.hudScene.updateBoosters) {
      this.hudScene.updateBoosters(this.activeBoosts);
    }
  }

  spawnEnemies(time) {
    if (!this.waveSystem.isActive || this.waveSystem.isPaused) return;
    if (this.waveSystem.startTime === 0) return;

    const elapsedTime = time - this.waveSystem.startTime;
    if (elapsedTime >= this.waveSystem.duration) {
      this.endWave();
      return;
    }

    if (this.enemies.countActive(true) >= this.enemiesInWave) return;
    if (time - this.waveSystem.lastSpawnTime < this.waveSystem.enemySpawnRate)
      return;

    this.waveSystem.lastSpawnTime = time;
    this.spawnRandomEnemy();
  }

  spawnRandomEnemy() {
    const side = Phaser.Math.Between(0, 3);
    const margin = 100;
    const mapSize = 2000;
    let x, y;

    switch (side) {
      case 0:
        x = Phaser.Math.Between(margin, mapSize - margin);
        y = margin;
        break;
      case 1:
        x = mapSize - margin;
        y = Phaser.Math.Between(margin, mapSize - margin);
        break;
      case 2:
        x = Phaser.Math.Between(margin, mapSize - margin);
        y = mapSize - margin;
        break;
      case 3:
        x = margin;
        y = Phaser.Math.Between(margin, mapSize - margin);
        break;
    }

    let enemy;

    if (this.currentWave < 3) {
      enemy = new Bat(this, x, y, this.player);
    } else if (this.currentWave < 5) {
      const type = Phaser.Math.Between(0, 1);
      enemy =
        type === 0
          ? new Bat(this, x, y, this.player)
          : new Eyeball(this, x, y, this.player);
    } else if (this.currentWave < 8) {
      const roll = Phaser.Math.Between(0, 9);
      if (roll < 4) enemy = new Bat(this, x, y, this.player);
      else if (roll < 7) enemy = new Eyeball(this, x, y, this.player);
      else enemy = new Shooter(this, x, y, this.player);
    } else {
      const roll = Phaser.Math.Between(0, 9);
      if (roll < 3) enemy = new Bat(this, x, y, this.player);
      else if (roll < 5) enemy = new Eyeball(this, x, y, this.player);
      else if (roll < 7) enemy = new Shooter(this, x, y, this.player);
      else enemy = new Shadow(this, x, y, this.player);
    }

    this.enemies.add(enemy);
  }

  dropCoin(x, y) {
    const coin = this.physics.add.sprite(x, y, "coin");
    coin.setScale(1.5);
    coin.value = Phaser.Math.Between(5, 10);
    coin.play("coin_spin");
    this.coinDrops.add(coin);

    this.time.delayedCall(10000, () => {
      if (coin.active) coin.destroy();
    });
  }

  collectCoin(player, coin) {
    this.coins += coin.value || 10;
    this.stats.coinsEarned += coin.value || 10;
    PlayerData.addScore(coin.value || 10);

    if (!this.hudScene.getSFXMuted()) {
      this.sound.play("coin_collect", { volume: 1, seek: 0.2 });
    }

    coin.destroy();
    this.updateHUD();
  }

  handlePlayerShoot(bulletData) {
    const bullet = this.bullets.get(bulletData.x, bulletData.y, "bullet");

    if (bullet) {
      bullet.setActive(true).setVisible(true);
      bullet.body.reset(bulletData.x, bulletData.y);
      bullet.setRotation(bulletData.angle);

      // 🎯 Daño fijo: 25 (pistol base, sin multiplicadores)
      bullet.damage = 25;

      const velocity = this.physics.velocityFromRotation(
        bulletData.angle,
        bulletData.velocity
      );
      bullet.setVelocity(velocity.x, velocity.y);

      if (!this.hudScene.getSFXMuted()) {
        this.sound.play("hand_gun_shoot", { volume: 0.2 });
      }
    }
  }

  handlePlayerReload() {
    if (!this.hudScene.getSFXMuted()) {
      this.sound.play("hand_gun_reload", { volume: 0.2, seek: 0.9 });
      this.sound.play("hand_gun_reload", { volume: 0.2, seek: 0.5 });
    }
  }

  handleMusicToggle(isMuted) {
    if (isMuted) {
      this.level1Music.pause();
    } else {
      this.level1Music.resume();
    }
  }

  handleSFXToggle(isMuted) {}

  togglePause() {
    if (this.waveSystem.isPaused) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.physics.pause();
      this.level1Music.pause();

      this.pauseOverlay = this.add
        .rectangle(
          this.cameras.main.centerX,
          this.cameras.main.centerY,
          this.cameras.main.width * 2,
          this.cameras.main.height * 2,
          0x000000,
          0.7
        )
        .setScrollFactor(0)
        .setDepth(6000);

      this.pauseText = this.add
        .text(
          this.cameras.main.centerX,
          this.cameras.main.centerY,
          "PAUSA\n\nPresiona ESC para continuar",
          {
            fontSize: "48px",
            color: "#ffffff",
            align: "center",
            stroke: "#000000",
            strokeThickness: 6,
          }
        )
        .setScrollFactor(0)
        .setOrigin(0.5)
        .setDepth(6001);
    } else {
      this.physics.resume();
      if (!this.hudScene.getMusicMuted()) {
        this.level1Music.resume();
      }

      if (this.pauseOverlay) this.pauseOverlay.destroy();
      if (this.pauseText) this.pauseText.destroy();
    }
  }

  update(time, delta) {
  // Verificar tecla de pausa
  if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
    this.togglePause();
  }

  // No actualizar si está pausado o no hay controlador
  if (
    this.isPaused ||
    this.waveSystem?.isPaused ||
    !this.playerController || // 👈 agregado para evitar el crash
    this.isGameOver
  ) {
    return;
  }

  // Aplicar boost de velocidad
  const baseSpeed = 200;
  const boostedSpeed = baseSpeed * this.activeBoosts?.speedMultiplier || 1;

  // ✅ Seguridad: si el controlador existe
  const inputState = this.playerController?.update();
  if (!inputState) return;

  // Verificar teclas de audio
  if (inputState.musicKeyPressed) {
    this.hudScene.toggleMusic();
  }
  if (inputState.sfxKeyPressed) {
    this.hudScene.toggleSFX();
  }

  // Actualizar enemigos y HUD
  this.enemies.children.each((enemy) => {
    if (enemy.active && enemy.update) enemy.update(time, delta);
  });

  this.spawnEnemies(time);
  this.updateHUD();
}


  bulletHitEnemy(bullet, enemy) {
    if (!bullet.active || !enemy.active) return;

    // 🐛 DEBUG: Ver vida del enemigo
    const vidaAntes = enemy.health;

    enemy.health -= bullet.damage || 25;

    console.log(
      `💥 Enemigo golpeado - Vida antes: ${vidaAntes}, Daño: ${
        bullet.damage || 25
      }, Vida después: ${enemy.health}`
    );

    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => {
      if (enemy.active) enemy.clearTint();
    });

    bullet.setActive(false).setVisible(false);

    if (enemy.health <= 0) {
      console.log(`☠️ Enemigo eliminado`);
      if (enemy.healthBar) enemy.healthBar.destroy();
      if (enemy.die) enemy.die();

      this.dropCoin(enemy.x, enemy.y);

      enemy.destroy();
      this.stats.totalKills++;
      PlayerData.addKills(1);
    }
  }

  playerHitEnemy(player, enemy) {
    if (!player.active || !enemy.active) return;

    const now = this.time.now;

    if (!enemy.lastAttackTime) {
      enemy.lastAttackTime = 0;
    }

    if (now - enemy.lastAttackTime >= 1000) {
      enemy.lastAttackTime = now;

      if (this.activeBoosts.hasShield && this.activeBoosts.shieldHits > 0) {
        this.activeBoosts.shieldHits--;
        if (this.activeBoosts.shieldHits <= 0) {
          this.activeBoosts.hasShield = false;
        }

        player.setTint(0x00ffff);

        if (!this.hudScene.getSFXMuted()) {
          this.sound.play("shield_block", { volume: 0.3 });
        }

        this.time.delayedCall(200, () => {
          if (player.active) player.clearTint();
        });
        return;
      }

      player.health -= enemy.damage;
      player.health = Math.max(0, player.health);

      PlayerData.setHealth(player.health);
      this.updateHUD();

      player.setTint(0xff0000);
      if (!this.hudScene.getSFXMuted()) {
        this.sound.play("player_hit", { volume: 0.3 });
      }

      this.time.delayedCall(100, () => {
        if (player.active) player.clearTint();
        this.time.delayedCall(100, () => {
          if (player.active) player.setTint(0xff0000);
          this.time.delayedCall(100, () => {
            if (player.active) player.clearTint();
          });
        });
      });

      if (player.health <= 0) {
        if (!this.hudScene.getSFXMuted()) {
          this.sound.play("player_death", { volume: 0.5 });
        }
        this.gameOver();
      }
    }
  }

  playerHitByBullet(player, bullet) {
    if (!bullet.active) return;

    if (this.activeBoosts.hasShield && this.activeBoosts.shieldHits > 0) {
      this.activeBoosts.shieldHits--;
      if (this.activeBoosts.shieldHits <= 0) {
        this.activeBoosts.hasShield = false;
      }

      player.setTint(0x00ffff);
      if (!this.hudScene.getSFXMuted()) {
        this.sound.play("shield_block", { volume: 0.3 });
      }

      this.time.delayedCall(200, () => {
        if (player.active) player.clearTint();
      });

      bullet.destroy();
      return;
    }

    const damage = bullet.damage || 10;
    player.health -= damage;
    player.health = Math.max(0, player.health);

    PlayerData.setHealth(player.health);
    this.updateHUD();

    player.setTint(0xff0000);
    if (!this.hudScene.getSFXMuted()) {
      this.sound.play("player_hit", { volume: 0.3 });
    }

    this.time.delayedCall(100, () => {
      if (player.active) player.clearTint();
      this.time.delayedCall(100, () => {
        if (player.active) player.setTint(0xff0000);
        this.time.delayedCall(100, () => {
          if (player.active) player.clearTint();
        });
      });
    });

    bullet.destroy();

    if (player.health <= 0) {
      if (!this.hudScene.getSFXMuted()) {
        this.sound.play("player_death", { volume: 0.5 });
      }
      this.gameOver();
    }
  }
  onShutdown() {
    try {
      // quitar eventos ligados a this.events
      this.events.off("playerShoot", this.handlePlayerShoot, this);
      this.events.off("playerReload", this.handlePlayerReload, this);
      this.events.off("shopClosed", this.handleShopClosed, this);

      // quitar game-level events
      this.game.events.off("toggleMusic", this.handleMusicToggle, this);
      this.game.events.off("toggleSFX", this.handleSFXToggle, this);

      // Destruir controlador (remueve input listeners)
      if (this.playerController) {
        this.playerController.destroy();
        this.playerController = null;
      }

      // Parar y destruir música
      if (this.level1Music) {
        try {
          this.level1Music.stop();
          this.level1Music.destroy();
        } catch (e) {}
        this.level1Music = null;
      }

      // Limpiar tweens / timers
      if (this.tweens) this.tweens.killAll();
      if (this.time) this.time.removeAllEvents();

      // Limpiar grupos y children
      if (this.enemies) this.enemies.clear(true, true);
      if (this.bullets) this.bullets.clear(true, true);
      if (this.enemyBullets) this.enemyBullets.clear(true, true);
      if (this.coinDrops) this.coinDrops.clear(true, true);

      // remover input listeners restantes
      try {
        this.input.removeAllListeners();
      } catch (e) {}
    } catch (e) {
      console.warn("onShutdown error:", e);
    }
  }
  onDestroy() {
    // Llamar la misma limpieza por si Phaser destruye la escena
    this.onShutdown();
  }

  gameOver() {
  if (this.isGameOver) return;
  this.isGameOver = true;

  // ❌ Eliminar listeners de input y controlador
  this.input.removeAllListeners();
  if (this.playerController) {
    this.playerController.destroy?.();
    this.playerController = null;
  }

  this.physics.pause();
  this.level1Music?.stop();

  this.stats.survivalTime = Math.floor(
    (Date.now() - this.stats.startTime) / 1000
  );

  const finalStats = {
    survivalTime: this.stats.survivalTime,
    totalKills: this.stats.totalKills,
    highestWave: this.stats.highestWave,
    coinsEarned: this.stats.coinsEarned,
    weapon: this.currentWeapon || "Desconocida",
    finalHealth: 0,
    timestamp: Date.now(),
  };

  PlayerData.reset();

  // 🧹 Asegurar que todo se limpie
  this.scene.stop("HUDScene");
  this.scene.stop("ShopScene");

  this.scene.start("GameOverScene", { stats: finalStats });
}
}
