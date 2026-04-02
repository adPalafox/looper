const STORAGE_KEY = "rekindled-loop-save";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";

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

  preload() {}

  create() {
    this.showLoadingState();
    this.loadVisualAssets()
      .then(() => {
        this.loadingText.destroy();
        this.loadProgress();
        this.createObjects();
        this.bindInput();
        this.scale.on("resize", this.handleResize, this);
        this.handleResize(this.scale.gameSize);
        this.beginLife();
      })
      .catch(() => {
        this.loadingText.setText(
          "Unable to load bg.webp or character.webp.\nIf you opened this with file://, run a local server\nor refresh after the files finish loading."
        );
      });
  }

  update() {}

  showLoadingState() {
    const { width, height } = this.scale.gameSize;
    this.add.rectangle(width / 2, height / 2, width, height, 0x111019, 1);
    this.loadingText = this.add.text(width / 2, height / 2, "Loading artwork...", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "18px",
      color: "#f4ecda",
      align: "center"
    }).setOrigin(0.5);
  }

  loadVisualAssets() {
    return Promise.all([
      this.loadImageTexture("bg-scene", "bg.webp"),
      this.loadImageTexture("hero-portrait", "character.webp")
    ]);
  }

  loadImageTexture(key, path) {
    if (this.textures.exists(key)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (this.textures.exists(key)) {
          this.textures.remove(key);
        }
        this.textures.addImage(key, image);
        resolve();
      };
      image.onerror = () => {
        reject(new Error(`Failed to load ${path}`));
      };
      image.src = new URL(path, window.location.href).href;
    });
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

  createObjects() {
    this.background = this.add.image(0, 0, "bg-scene").setOrigin(0.5);
    this.backgroundShade = this.add.graphics();
    this.vignette = this.add.graphics();
    this.heroHalo = this.add.ellipse(0, 0, 100, 100, 0xd6d8ff, 0.12);
    this.heroGlow = this.add.ellipse(0, 0, 100, 40, 0x000000, 0.18);
    this.hero = this.add.image(0, 0, "hero-portrait").setOrigin(0.5, 1);

    this.headerPanel = this.add.rectangle(0, 0, 100, 50, 0x121019, 0.72);
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
      fontFamily: '"Iowan Old Style", Georgia, "Times New Roman", serif',
      color: "#f7f3ea",
      lineSpacing: 8
    });

    this.choiceHint = this.add.text(0, 0, "Decision", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: "#bba978"
    });

    this.divider = this.add.rectangle(0, 0, 100, 1, 0xffffff, 0.08).setOrigin(0, 0.5);

    this.choiceContainer = this.add.container(0, 0);
    this.choiceMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.choiceMask = this.choiceMaskGraphics.createGeometryMask();
    this.choiceContainer.setMask(this.choiceMask);

    this.tweens.add({
      targets: [this.hero, this.heroHalo],
      y: "+=7",
      duration: 2200,
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
    const panelPadding = Phaser.Math.Clamp(panelWidth * 0.065, 20, 30);
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
      storyHeight: Phaser.Math.Clamp(panelHeight * 0.38, 110, 184),
      choicesX: marginX + panelPadding,
      choicesY: panelTop + panelPadding + Phaser.Math.Clamp(panelHeight * 0.38, 110, 184) + 56,
      choicesWidth: panelWidth - panelPadding * 2,
      choicesHeight: panelHeight - Phaser.Math.Clamp(panelHeight * 0.38, 110, 184) - panelPadding * 2 - 64,
      heroCenterX: width / 2,
      heroCenterY: heroAreaTop + heroAreaHeight * 0.8,
      heroHeight: Phaser.Math.Clamp(heroAreaHeight * 0.95, 220, 410),
      heroShadowWidth: Phaser.Math.Clamp(width * 0.34, 112, 190),
      heroShadowHeight: Phaser.Math.Clamp(height * 0.03, 18, 28),
      heroHaloWidth: Phaser.Math.Clamp(width * 0.48, 160, 260),
      heroHaloHeight: Phaser.Math.Clamp(heroAreaHeight * 0.8, 190, 340)
    };

    this.drawBackground();
    this.layoutObjects();
    this.refreshCurrentView(true);
  }

  drawBackground() {
    const { width, height } = this.ui;
    const scale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setPosition(width / 2, height / 2);
    this.background.setScale(scale);

    this.backgroundShade.clear();
    this.vignette.clear();

    this.backgroundShade.fillGradientStyle(0x0f0e16, 0x0f0e16, 0x18151f, 0x19141f, 0.12, 0.08, 0.28, 0.64);
    this.backgroundShade.fillRect(0, 0, width, height);
    this.backgroundShade.fillStyle(0xffffff, 0.04);
    this.backgroundShade.fillEllipse(width * 0.5, height * 0.56, width * 0.92, height * 0.18);
    this.backgroundShade.fillStyle(0xdcd8ff, 0.06);
    this.backgroundShade.fillEllipse(width * 0.5, height * 0.28, width * 0.48, height * 0.2);

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
      heroHeight,
      heroShadowWidth,
      heroShadowHeight,
      heroHaloWidth,
      heroHaloHeight
    } = this.ui;

    this.heroHalo.setPosition(heroCenterX, heroCenterY - heroHeight * 0.45);
    this.heroHalo.setSize(heroHaloWidth, heroHaloHeight);

    this.heroGlow.setPosition(heroCenterX, heroCenterY + 8);
    this.heroGlow.setSize(heroShadowWidth, heroShadowHeight);

    this.hero.setPosition(heroCenterX, heroCenterY);
    this.hero.setScale(heroHeight / this.hero.height);

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
    this.storyText.setLineSpacing(Math.round(storyFont * 0.44));
    this.storyText.setWordWrapWidth(storyWidth, true);
    this.storyText.setFixedSize(storyWidth, storyHeight);

    this.choiceHint.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 16);
    this.choiceHint.setFontSize(baseFont * 0.74);
    this.choiceHint.setAlpha(0.88);

    this.divider.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 42);
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
        padding: { left: 16, right: 16, top: 14, bottom: 14 },
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
      offsetY += button.height + 14;
    });

    this.choiceContentHeight = Math.max(0, offsetY - 14);
    this.applyChoiceScroll();
  }

  showDeathChoice() {
    const button = this.add.text(0, 0, "Begin the next life", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: `${this.ui.choiceFont}px`,
      color: "#f4f1e8",
      backgroundColor: "#2b2332",
      padding: { left: 16, right: 16, top: 16, bottom: 16 },
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
  type: IS_FILE_PROTOCOL ? Phaser.CANVAS : Phaser.AUTO,
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
