// PlayerController.js
export default class PlayerController {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.pointer = null;

    // Estado de disparo y recarga
    this.isShooting = false;
    this.isReloading = false;
    this.enabled = true; // Control para deshabilitar controles

    // Sistema de balas
    this.maxBullets = 10;
    this.currentBullets = this.maxBullets;

    // referencias a handlers para poder removerlas
    this._onPointerMove = null;
    this._onPointerDown = null;

    // Configurar controles
    this.setupControls();
  }

  // Configura los controles de teclado y mouse
  setupControls() {
    // Teclas WASD para movimiento (guardamos las keys)
    this.wasd = this.scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Seguimiento del puntero del mouse
    this._onPointerMove = (pointer) => {
      this.pointer = pointer;
    };
    this.scene.input.on("pointermove", this._onPointerMove);

    // Disparo con click - guardamos la referencia para poder removerla
    this._onPointerDown = (pointer) => {
      // Solo disparar si los controles están habilitados
      if (!this.enabled) return;

      const bulletData = this.shoot(pointer);
      if (bulletData) {
        // Emitir evento para que la escena cree la bala
        this.scene.events.emit("playerShoot", bulletData);
      }
    };
    this.scene.input.on("pointerdown", this._onPointerDown);

    // Teclas rápidas para audio
    this.mKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.M
    );
    this.sKey = this.scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.T
    );
  }

  // Habilita o deshabilita los controles
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  // Actualiza el movimiento y rotacion del jugador cada frame
  update() {
    // No actualizar si los controles estan deshabilitados
    if (!this.enabled) {
      this.player.setVelocity(0);
      return {
        musicKeyPressed: false,
        sfxKeyPressed: false,
      };
    }

    const speed = 200;

    // Resetear velocidad
    this.player.setVelocity(0);

    // Movimiento con WASD
    if (this.wasd.left.isDown) this.player.setVelocityX(-speed);
    if (this.wasd.right.isDown) this.player.setVelocityX(speed);
    if (this.wasd.up.isDown) this.player.setVelocityY(-speed);
    if (this.wasd.down.isDown) this.player.setVelocityY(speed);

    // Determinar si el jugador se esta moviendo
    const moving =
      this.wasd.left.isDown ||
      this.wasd.right.isDown ||
      this.wasd.up.isDown ||
      this.wasd.down.isDown;

    // Reproducir animaciones segun el estado
    if (moving && !this.isShooting && !this.isReloading) {
      this.player.play("walk", true);
    } else if (!moving && !this.isShooting && !this.isReloading) {
      this.player.anims.stop();
    }

    // Rotar jugador hacia el puntero del mouse
    if (this.pointer) {
      const angle = Phaser.Math.Angle.Between(
        this.player.x,
        this.player.y,
        this.pointer.worldX,
        this.pointer.worldY
      );
      this.player.setRotation(angle);
    }

    // Auto recarga cuando se queda sin balas
    if (this.currentBullets <= 0 && !this.isReloading) {
      this.reload();
    }

    // Retornar informacion de teclas de audio presionadas
    return {
      musicKeyPressed: Phaser.Input.Keyboard.JustDown(this.mKey),
      sfxKeyPressed: Phaser.Input.Keyboard.JustDown(this.sKey),
    };
  }

  // Maneja la logica de disparo
  shoot(pointer) {
    // Verificar si puede disparar
    if (this.isShooting || this.isReloading) return null;
    if (this.currentBullets <= 0) {
      this.reload();
      return null;
    }

    // Calcular angulo de disparo
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.worldX,
      pointer.worldY
    );

    // Offset para que la bala salga del arma (ajustable segun sprite)
    const distanceFromCenter = 50;
    const baseVerticalOffset = 13;

    // Rotar el offset segun el angulo del jugador
    const rotatedOffsetX =
      Math.cos(angle) * distanceFromCenter -
      Math.sin(angle) * baseVerticalOffset;
    const rotatedOffsetY =
      Math.sin(angle) * distanceFromCenter +
      Math.cos(angle) * baseVerticalOffset;

    const bulletX = this.player.x + rotatedOffsetX;
    const bulletY = this.player.y + rotatedOffsetY;

    // Reducir balas y activar estado de disparo
    this.currentBullets--;
    this.isShooting = true;

    // Reproducir animacion de disparo
    this.player.play("shoot", true).once("animationcomplete", () => {
      this.isShooting = false;
    });

    // Retornar datos para que la escena cree la bala
    return {
      x: bulletX,
      y: bulletY,
      angle: angle,
      velocity: 600,
      damage: 25,
    };
  }

  // Maneja la logica de recarga
  reload() {
    if (this.isReloading) return false;

    this.isReloading = true;

    // Reproducir animacion de recarga
    this.player.play("reload", true);

    this.player.once("animationcomplete", () => {
      this.scene.time.delayedCall(200, () => {
        this.currentBullets = this.maxBullets;
        this.isReloading = false;
      });
    });

    // Emitir evento para que la escena reproduzca el sonido
    this.scene.events.emit("playerReload");

    return true;
  }

  // Obtiene el numero actual de balas
  getCurrentBullets() {
    return this.currentBullets;
  }

  // Obtiene el maximo de balas
  getMaxBullets() {
    return this.maxBullets;
  }

  // Verifica si esta disparando
  getIsShooting() {
    return this.isShooting;
  }

  // Verifica si esta recargando
  getIsReloading() {
    return this.isReloading;
  }

  // Permite cambiar la capacidad de municion (para diferentes armas)
  setMaxBullets(max) {
    this.maxBullets = max;
    this.currentBullets = Math.min(this.currentBullets, max);
  }

  // Destruye los listeners cuando ya no se necesita
  destroy() {
    try {
      if (this._onPointerDown) {
        this.scene.input.off("pointerdown", this._onPointerDown);
        this._onPointerDown = null;
      }
      if (this._onPointerMove) {
        this.scene.input.off("pointermove", this._onPointerMove);
        this._onPointerMove = null;
      }

      // remover teclas rápidas
      if (this.mKey) {
        this.scene.input.keyboard.removeKey(this.mKey);
        this.mKey = null;
      }
      if (this.sKey) {
        this.scene.input.keyboard.removeKey(this.sKey);
        this.sKey = null;
      }

      // remover wasd keys individuales
      if (this.wasd) {
        Object.values(this.wasd).forEach((key) => {
          if (key) this.scene.input.keyboard.removeKey(key);
        });
        this.wasd = null;
      }
    } catch (e) {
      console.warn("PlayerController.destroy error:", e);
    }

    this.scene = null;
    this.player = null;
  }
}