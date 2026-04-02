const STORAGE_KEY = "rekindled-loop-save";

class LoopScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoopScene" });
    this.baseStats = { strength: 1, intellect: 1, charm: 1 };
    this.currentStats = { strength: 1, intellect: 1, charm: 1 };
    this.lifeNumber = 1;
    this.currentEvent = null;
    this.choiceNodes = [];
    this.choiceScrollY = 0;
    this.choiceContentHeight = 0;
    this.choiceViewportHeight = 0;
    this.isTyping = false;
    this.isDraggingChoices = false;
    this.choicePointerDown = false;
    this.lastDragY = 0;
    this.dragStartY = 0;
    this.ui = {};
  }

  preload() {
    this.createHeroTextures();
  }

  create() {
    this.loadProgress();
    this.createAnimations();
    this.createObjects();
    this.bindInput();
    this.scale.on("resize", this.handleResize, this);
    this.handleResize(this.scale.gameSize);
    this.beginLife();
  }

  update() {}

  createHeroTextures() {
    for (let frame = 0; frame < 4; frame += 1) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      const bodyOffset = frame % 2 === 0 ? 0 : 1;
      const armOffset = frame === 1 ? 1 : frame === 3 ? -1 : 0;

      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(10, 2, 12, 2);

      graphics.fillStyle(0xf1c69a, 1);
      graphics.fillRect(10, 4, 12, 10);

      graphics.fillStyle(0x30243c, 1);
      graphics.fillRect(8, 2, 16, 4);
      graphics.fillRect(8, 6, 2, 4);
      graphics.fillRect(22, 6, 2, 4);

      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(13, 8, 2, 2);
      graphics.fillRect(17, 8, 2, 2);
      graphics.fillStyle(0x18111d, 1);
      graphics.fillRect(14, 8, 1, 1);
      graphics.fillRect(18, 8, 1, 1);

      graphics.fillStyle(0x7f5fa1, 1);
      graphics.fillRect(9, 14, 14, 10);
      graphics.fillRect(11, 24, 4, 6);
      graphics.fillRect(17, 24, 4, 6);

      graphics.fillStyle(0xd8b385, 1);
      graphics.fillRect(8 + armOffset, 15, 2, 8);
      graphics.fillRect(22 + armOffset, 15, 2, 8);

      graphics.fillStyle(0x5672a0, 1);
      graphics.fillRect(11, 30 - bodyOffset, 4, 2);
      graphics.fillRect(17, 28 + bodyOffset, 4, 2);

      graphics.generateTexture(`hero-${frame}`, 32, 32);
      graphics.destroy();
    }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const save = JSON.parse(raw);
      if (save && save.baseStats) {
        this.baseStats = {
          strength: Math.max(1, save.baseStats.strength || 1),
          intellect: Math.max(1, save.baseStats.intellect || 1),
          charm: Math.max(1, save.baseStats.charm || 1)
        };
      }

      if (save && Number.isInteger(save.lifeNumber) && save.lifeNumber > 0) {
        this.lifeNumber = save.lifeNumber;
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  saveProgress() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseStats: this.baseStats,
        lifeNumber: this.lifeNumber
      })
    );
  }

  createAnimations() {
    if (!this.anims.exists("hero-idle")) {
      this.anims.create({
        key: "hero-idle",
        frames: [{ key: "hero-0" }, { key: "hero-1" }, { key: "hero-2" }, { key: "hero-3" }],
        frameRate: 5,
        repeat: -1
      });
    }
  }

  createObjects() {
    this.background = this.add.graphics();
    this.vignette = this.add.graphics();

    this.heroGlow = this.add.ellipse(0, 0, 100, 40, 0x000000, 0.18);
    this.hero = this.add.sprite(0, 0, "hero-0").play("hero-idle");

    this.headerPanel = this.add.rectangle(0, 0, 100, 50, 0x120f1c, 0.76);
    this.headerPanel.setStrokeStyle(1, 0xffffff, 0.06);

    this.lifeText = this.add.text(0, 0, "", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#f4ecda"
    });

    this.statText = this.add.text(0, 0, "", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#c8cfdf"
    });

    this.storyPanelShadow = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.18);
    this.storyPanel = this.add.rectangle(0, 0, 100, 100, 0x14111d, 0.94);
    this.storyPanel.setStrokeStyle(1, 0xffffff, 0.07);

    this.storyText = this.add.text(0, 0, "", {
      fontFamily: 'Georgia, "Times New Roman", serif',
      color: "#f7f3ea",
      lineSpacing: 8
    });

    this.choiceHint = this.add.text(0, 0, "Choose your path", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#bba978"
    });

    this.divider = this.add.rectangle(0, 0, 100, 1, 0xffffff, 0.08).setOrigin(0, 0.5);

    this.choiceContainer = this.add.container(0, 0);
    this.choiceMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.choiceMask = this.choiceMaskGraphics.createGeometryMask();
    this.choiceContainer.setMask(this.choiceMask);

    this.tweens.add({
      targets: this.hero,
      y: "+=8",
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  bindInput() {
    this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
      if (this.choiceContentHeight > this.choiceViewportHeight) {
        this.scrollChoices(deltaY * 0.9);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      if (this.isPointInChoiceViewport(pointer.x, pointer.y) && this.choiceContentHeight > this.choiceViewportHeight) {
        this.choicePointerDown = true;
        this.lastDragY = pointer.y;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (!this.choicePointerDown) {
        return;
      }

      if (!this.isDraggingChoices && Math.abs(pointer.y - this.dragStartY) > 8) {
        this.isDraggingChoices = true;
      }

      if (!this.isDraggingChoices) {
        return;
      }

      const delta = this.lastDragY - pointer.y;
      this.lastDragY = pointer.y;
      this.scrollChoices(delta);
    });

    this.input.on("pointerup", () => {
      this.choicePointerDown = false;
      this.time.delayedCall(0, () => {
        this.isDraggingChoices = false;
      });
    });
  }

  handleResize(gameSize) {
    const width = Math.round(gameSize.width);
    const height = Math.round(gameSize.height);
    this.cameras.main.setViewport(0, 0, width, height);

    const marginX = Phaser.Math.Clamp(width * 0.055, 18, 32);
    const safeTop = Phaser.Math.Clamp(height * 0.04, 20, 38);
    const safeBottom = Phaser.Math.Clamp(height * 0.025, 16, 28);
    const headerHeight = Phaser.Math.Clamp(height * 0.095, 68, 96);
    const panelWidth = width - marginX * 2;
    const panelHeight = Phaser.Math.Clamp(height * 0.45, 300, height * 0.54);
    const panelTop = height - safeBottom - panelHeight;
    const panelPadding = Phaser.Math.Clamp(panelWidth * 0.055, 18, 26);
    const heroAreaTop = safeTop + headerHeight + 12;
    const heroAreaBottom = panelTop - 16;
    const heroAreaHeight = Math.max(120, heroAreaBottom - heroAreaTop);
    const baseFont = Phaser.Math.Clamp(width * 0.043, 15, 21);
    const storyFont = Phaser.Math.Clamp(width * 0.05, 18, 26);
    const choiceFont = Phaser.Math.Clamp(width * 0.043, 15, 20);

    this.ui = {
      width,
      height,
      marginX,
      safeTop,
      panelWidth,
      panelHeight,
      panelTop,
      panelPadding,
      baseFont,
      storyFont,
      choiceFont,
      storyWidth: panelWidth - panelPadding * 2,
      storyHeight: Phaser.Math.Clamp(panelHeight * 0.36, 100, 170),
      choicesX: marginX + panelPadding,
      choicesY: panelTop + panelPadding + Phaser.Math.Clamp(panelHeight * 0.36, 100, 170) + 52,
      choicesWidth: panelWidth - panelPadding * 2,
      choicesHeight: panelHeight - Phaser.Math.Clamp(panelHeight * 0.36, 100, 170) - panelPadding * 2 - 58,
      heroCenterX: width / 2,
      heroCenterY: heroAreaTop + heroAreaHeight * 0.58,
      heroScale: Math.max(3, Math.round(Phaser.Math.Clamp(width / 92, 3, 5))),
      heroShadowWidth: Phaser.Math.Clamp(width * 0.26, 92, 148),
      heroShadowHeight: Phaser.Math.Clamp(height * 0.028, 18, 26)
    };

    this.drawBackground();
    this.layoutObjects();
    this.refreshCurrentView(true);
  }

  drawBackground() {
    const { width, height } = this.ui;
    this.background.clear();
    this.vignette.clear();

    this.background.fillGradientStyle(0x13101b, 0x13101b, 0x1e1a29, 0x251d31, 1);
    this.background.fillRect(0, 0, width, height);

    this.background.fillStyle(0x2f2741, 1);
    this.background.fillRoundedRect(width * 0.08, height * 0.12, width * 0.84, height * 0.26, 28);

    this.background.fillStyle(0x221d2f, 1);
    for (let i = 0; i < 7; i += 1) {
      const x = (i / 6) * width;
      const w = width * 0.22;
      const h = height * (0.18 + (i % 3) * 0.035);
      this.background.fillRect(x - w * 0.5, height * 0.25 - h * 0.12, w, h);
    }

    this.background.fillStyle(0x54436f, 1);
    this.background.fillCircle(width * 0.76, height * 0.13, Math.min(width, height) * 0.06);

    this.background.fillStyle(0x26351f, 1);
    this.background.fillRect(0, height * 0.52, width, height * 0.16);

    this.background.fillStyle(0x324826, 1);
    for (let y = height * 0.52; y < height * 0.68; y += 10) {
      for (let x = 0; x < width; x += 10) {
        if (((x + y) / 10) % 2 === 0) {
          this.background.fillRect(x, y, 10, 10);
        }
      }
    }

    this.background.fillStyle(0x18141f, 1);
    this.background.fillRect(0, height * 0.68, width, height * 0.32);

    const stars = [
      [0.12, 0.09], [0.26, 0.06], [0.42, 0.1], [0.56, 0.08], [0.68, 0.06], [0.86, 0.1]
    ];

    this.background.fillStyle(0xf0e3b0, 0.85);
    stars.forEach(([x, y]) => {
      this.background.fillRect(width * x, height * y, 3, 3);
    });

    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.14, 0.04, 0.18, 0.24);
    this.vignette.fillRect(0, 0, width, height);
  }

  layoutObjects() {
    const {
      width,
      marginX,
      safeTop,
      headerHeight,
      panelWidth,
      panelHeight,
      panelTop,
      panelPadding,
      baseFont,
      storyFont,
      choiceFont,
      storyWidth,
      storyHeight,
      choicesX,
      choicesY,
      choicesWidth,
      choicesHeight,
      heroCenterX,
      heroCenterY,
      heroScale,
      heroShadowWidth,
      heroShadowHeight
    } = this.ui;

    this.heroGlow.setPosition(heroCenterX, heroCenterY + heroScale * 54);
    this.heroGlow.setSize(heroShadowWidth, heroShadowHeight);

    this.hero.setPosition(heroCenterX, heroCenterY);
    this.hero.setScale(heroScale);

    this.headerPanel.setPosition(width / 2, safeTop + headerHeight / 2);
    this.headerPanel.setSize(panelWidth, headerHeight);

    this.lifeText.setPosition(marginX + panelPadding, safeTop + 16);
    this.lifeText.setFontSize(baseFont * 1.02);

    this.statText.setPosition(marginX + panelPadding, safeTop + 16 + baseFont * 1.45);
    this.statText.setFontSize(baseFont * 0.92);

    this.storyPanelShadow.setPosition(width / 2, panelTop + panelHeight / 2 + 8);
    this.storyPanelShadow.setSize(panelWidth, panelHeight);

    this.storyPanel.setPosition(width / 2, panelTop + panelHeight / 2);
    this.storyPanel.setSize(panelWidth, panelHeight);

    this.storyText.setPosition(marginX + panelPadding, panelTop + panelPadding);
    this.storyText.setFontSize(storyFont);
    this.storyText.setWordWrapWidth(storyWidth, true);
    this.storyText.setFixedSize(storyWidth, storyHeight);

    this.choiceHint.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 16);
    this.choiceHint.setFontSize(baseFont * 0.9);

    this.divider.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 44);
    this.divider.width = storyWidth;

    this.choiceViewportHeight = Math.max(74, choicesHeight);
    this.choiceContainer.setPosition(choicesX, choicesY);

    this.choiceMaskGraphics.clear();
    this.choiceMaskGraphics.fillStyle(0xffffff, 1);
    this.choiceMaskGraphics.fillRect(choicesX, choicesY, choicesWidth, this.choiceViewportHeight);
  }

  beginLife() {
    this.currentStats = { ...this.baseStats };
    this.showEvent("start");
  }

  renderStats() {
    this.lifeText.setText(`Life ${this.lifeNumber}`);
    this.statText.setText(
      `STR ${this.currentStats.strength}   INT ${this.currentStats.intellect}   CHA ${this.currentStats.charm}`
    );
  }

  getEventById(eventId) {
    return EVENTS.find((event) => event.id === eventId) || EVENTS[0];
  }

  showEvent(eventId) {
    this.currentEvent = this.getEventById(eventId);
    this.refreshCurrentView(false);
  }

  refreshCurrentView(skipTyping = false) {
    if (!this.currentEvent || !this.storyText) {
      return;
    }

    this.clearChoices();
    this.renderStats();

    if (this.currentEvent.death) {
      const carry = this.calculateCarryOver(this.currentStats);
      const deathText = [
        this.currentEvent.text,
        "",
        `End: ${this.currentEvent.deathLabel}`,
        `Carry over: STR ${carry.strength}  INT ${carry.intellect}  CHA ${carry.charm}`
      ].join("\n");

      this.setStoryText(deathText, skipTyping, () => this.showDeathChoice());
      return;
    }

    this.setStoryText(this.currentEvent.text, skipTyping, () => this.showChoices(this.currentEvent.choices));
  }

  setStoryText(text, skipTyping, onComplete) {
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }

    if (skipTyping) {
      this.isTyping = false;
      this.storyText.setText(text);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    this.isTyping = true;
    this.storyText.setText("");
    let index = 0;

    this.typeEvent = this.time.addEvent({
      delay: 12,
      repeat: Math.max(text.length - 1, 0),
      callback: () => {
        index += 1;
        this.storyText.setText(text.slice(0, index));
        if (index >= text.length) {
          this.isTyping = false;
          if (onComplete) {
            onComplete();
          }
        }
      }
    });
  }

  clearChoices() {
    this.choiceNodes.forEach((node) => node.destroy());
    this.choiceNodes = [];
    this.choiceScrollY = 0;
    this.choiceContentHeight = 0;
    this.applyChoiceScroll();
  }

  showChoices(choices) {
    let offsetY = 0;

    choices.forEach((choice) => {
      const available = this.canChoose(choice);
      const label = available ? choice.text : `${choice.text} [need ${this.formatRequirement(choice.req)}]`;

      const button = this.add.text(0, offsetY, label, {
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: `${this.ui.choiceFont}px`,
        color: available ? "#f4f1e8" : "#a49cad",
        backgroundColor: available ? "#24202d" : "#1a1720",
        padding: { left: 14, right: 14, top: 12, bottom: 12 },
        fixedWidth: this.ui.choicesWidth,
        wordWrap: { width: this.ui.choicesWidth - 28, useAdvancedWrap: true }
      });

      if (available) {
        button.setInteractive({ useHandCursor: true });
        button.on("pointerover", () => button.setBackgroundColor("#2d2838"));
        button.on("pointerout", () => button.setBackgroundColor("#24202d"));
        button.on("pointerdown", () => this.pickChoice(choice));
      } else {
        button.setAlpha(0.84);
      }

      this.choiceContainer.add(button);
      this.choiceNodes.push(button);
      offsetY += button.height + 12;
    });

    this.choiceContentHeight = Math.max(0, offsetY - 12);
    this.applyChoiceScroll();
  }

  showDeathChoice() {
    const button = this.add.text(0, 0, "Begin the next life", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: `${this.ui.choiceFont}px`,
      color: "#f4f1e8",
      backgroundColor: "#2b2332",
      padding: { left: 14, right: 14, top: 14, bottom: 14 },
      fixedWidth: this.ui.choicesWidth
    });

    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setBackgroundColor("#352b3d"));
    button.on("pointerout", () => button.setBackgroundColor("#2b2332"));
    button.on("pointerdown", () => this.reincarnate());

    this.choiceContainer.add(button);
    this.choiceNodes.push(button);
    this.choiceContentHeight = button.height;
    this.applyChoiceScroll();
  }

  formatRequirement(req) {
    const parts = [];
    if (req.strength) {
      parts.push(`STR ${req.strength}`);
    }
    if (req.intellect) {
      parts.push(`INT ${req.intellect}`);
    }
    if (req.charm) {
      parts.push(`CHA ${req.charm}`);
    }
    return parts.join(", ");
  }

  canChoose(choice) {
    if (!choice.req) {
      return true;
    }
    return Object.entries(choice.req).every(([stat, value]) => this.currentStats[stat] >= value);
  }

  pickChoice(choice) {
    if (!this.canChoose(choice) || this.isTyping || this.isDraggingChoices) {
      return;
    }

    const effects = choice.effects || {};
    this.currentStats = {
      strength: Math.max(1, this.currentStats.strength + (effects.strength || 0)),
      intellect: Math.max(1, this.currentStats.intellect + (effects.intellect || 0)),
      charm: Math.max(1, this.currentStats.charm + (effects.charm || 0))
    };

    this.showEvent(choice.next);
  }

  calculateCarryOver(stats) {
    return {
      strength: Math.max(1, Math.floor(stats.strength * 0.5)),
      intellect: Math.max(1, Math.floor(stats.intellect * 0.5)),
      charm: Math.max(1, Math.floor(stats.charm * 0.5))
    };
  }

  reincarnate() {
    this.baseStats = this.calculateCarryOver(this.currentStats);
    this.lifeNumber += 1;
    this.saveProgress();
    this.beginLife();
  }

  getMaxChoiceScroll() {
    return Math.max(0, this.choiceContentHeight - this.choiceViewportHeight);
  }

  scrollChoices(delta) {
    this.choiceScrollY = Phaser.Math.Clamp(this.choiceScrollY + delta, 0, this.getMaxChoiceScroll());
    this.applyChoiceScroll();
  }

  applyChoiceScroll() {
    if (this.choiceContainer) {
      this.choiceContainer.y = this.ui.choicesY - this.choiceScrollY;
    }
  }

  isPointInChoiceViewport(x, y) {
    const { choicesX, choicesY, choicesWidth } = this.ui;
    return (
      x >= choicesX &&
      x <= choicesX + choicesWidth &&
      y >= choicesY &&
      y <= choicesY + this.choiceViewportHeight
    );
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  backgroundColor: "#111019",
  antialias: true,
  roundPixels: false,
  resolution: Math.max(1, window.devicePixelRatio || 1),
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [LoopScene]
};

new Phaser.Game(config);
