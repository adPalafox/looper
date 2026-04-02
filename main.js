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
    this.isTransitioning = false;
    this.feedbackNodes = [];
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
    this.storyPanelAccent = this.add.rectangle(0, 0, 100, 3, 0xc49b62, 0.85).setOrigin(0.5, 0);

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
    this.choiceContainer.setDepth(10);
    this.choiceMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.choiceMask = this.choiceMaskGraphics.createGeometryMask();
    this.choiceContainer.setMask(this.choiceMask);
    this.feedbackLayer = this.add.container(0, 0).setDepth(40);
    this.screenFlash = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setOrigin(0).setDepth(45);
    this.eventBanner = this.add.container(0, 0).setDepth(50);
    this.eventBannerBg = this.add.rectangle(0, 0, 180, 36, 0x15121d, 0.92).setOrigin(0.5);
    this.eventBannerBg.setStrokeStyle(1, 0xffffff, 0.08);
    this.eventBannerText = this.add.text(0, 0, "", {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "14px",
      color: "#f8f1df"
    }).setOrigin(0.5);
    this.eventBanner.add([this.eventBannerBg, this.eventBannerText]);
    this.eventBanner.setAlpha(0);

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
    this.storyPanelAccent.setPosition(width / 2, panelTop);
    this.storyPanelAccent.width = panelWidth;

    this.storyText.setPosition(marginX + panelPadding, panelTop + panelPadding);
    this.storyText.setFontSize(storyFont);
    this.storyText.setLineSpacing(Math.round(storyFont * 0.44));
    this.storyText.setWordWrapWidth(storyWidth, true);
    this.storyText.setFixedSize(storyWidth, storyHeight);

    this.choiceHint.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 16);
    this.choiceHint.setFontSize(baseFont * 0.74);
    this.choiceHint.setAlpha(0.88);
    this.choiceHint.setLetterSpacing(1.2);

    this.divider.setPosition(marginX + panelPadding, panelTop + panelPadding + storyHeight + 42);
    this.divider.width = storyWidth;

    this.choiceViewportHeight = Math.max(74, choicesHeight);
    this.choiceContainer.setPosition(choicesX, choicesY);

    this.choiceMaskGraphics.clear();
    this.choiceMaskGraphics.fillStyle(0xffffff, 1);
    this.choiceMaskGraphics.fillRect(choicesX, choicesY, choicesWidth, this.choiceViewportHeight);

    this.screenFlash.setSize(width, height);
    this.eventBanner.setPosition(width / 2, panelTop - 20);
    this.eventBannerBg.setSize(Math.min(panelWidth * 0.72, 280), Math.max(36, baseFont * 2.1));
    this.eventBannerText.setFontSize(baseFont * 0.82);
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
    this.playEventTransition(this.currentEvent, skipTyping);

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
      this.storyText.setAlpha(1);
      this.storyText.setText(text);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    this.isTyping = true;
    this.storyText.setAlpha(0.92);
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
          this.tweens.add({
            targets: this.storyText,
            alpha: 1,
            duration: 220,
            ease: "Quad.out"
          });
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
    const cards = [];

    choices.forEach((choice) => {
      const available = this.canChoose(choice);
      const label = available ? choice.text : `${choice.text} [need ${this.formatRequirement(choice.req)}]`;
      const button = this.createChoiceCard({
        y: offsetY,
        title: label,
        available,
        actionLabel: available ? "Choose" : "Locked",
        subtitle: available ? null : `Requires ${this.formatRequirement(choice.req)}`,
        onPress: () => this.pickChoice(choice)
      });

      this.choiceContainer.add(button);
      this.choiceNodes.push(button);
      cards.push(button);
      offsetY += button.cardHeight + 14;
    });

    this.choiceContentHeight = Math.max(0, offsetY - 14);
    this.applyChoiceScroll();
    this.animateChoiceCards(cards);
  }

  showDeathChoice() {
    const button = this.createChoiceCard({
      y: 0,
      title: "Begin the next life",
      available: true,
      actionLabel: "Reincarnate",
      subtitle: "Carry your strongest fragments into another run.",
      onPress: () => this.reincarnate()
    });

    this.choiceContainer.add(button);
    this.choiceNodes.push(button);
    this.choiceContentHeight = button.cardHeight;
    this.applyChoiceScroll();
    this.animateChoiceCards([button]);
  }

  createChoiceCard({ y, title, available, actionLabel, subtitle, onPress }) {
    const width = this.ui.choicesWidth;
    const inset = 16;
    const actionWidth = 82;
    const titleWidth = width - inset * 2 - actionWidth - 10;
    const titleText = this.add.text(inset, 14, title, {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: `${this.ui.choiceFont}px`,
      fontStyle: "600",
      color: available ? "#f6f2ea" : "#a69cab",
      wordWrap: { width: titleWidth, useAdvancedWrap: true }
    });

    const subtitleText = subtitle
      ? this.add.text(inset, titleText.y + titleText.height + 8, subtitle, {
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: `${Math.max(12, this.ui.choiceFont * 0.72)}px`,
          color: available ? "#bdb4c5" : "#7f7587",
          wordWrap: { width: width - inset * 2, useAdvancedWrap: true }
        })
      : null;

    const contentBottom = subtitleText
      ? subtitleText.y + subtitleText.height
      : titleText.y + titleText.height;
    const cardHeight = Math.max(72, contentBottom + 14);

    const container = this.add.container(0, y);
    const shadow = this.add.rectangle(0, 4, width, cardHeight, 0x000000, available ? 0.18 : 0.1)
      .setOrigin(0, 0);
    const card = this.add.rectangle(0, 0, width, cardHeight, available ? 0x24212d : 0x17141d, 1)
      .setOrigin(0, 0);
    card.setStrokeStyle(1, available ? 0x625472 : 0x3c3444, available ? 0.85 : 0.7);

    const accent = this.add.rectangle(0, 0, 4, cardHeight, available ? 0xc49b62 : 0x574d59, 1)
      .setOrigin(0, 0);

    const actionPill = this.add.rectangle(width - actionWidth - inset, 14, actionWidth, 28, available ? 0x332c3f : 0x221d28, 1)
      .setOrigin(0, 0);
    actionPill.setStrokeStyle(1, available ? 0x7c688d : 0x4f4458, 0.9);

    const actionText = this.add.text(actionPill.x + actionWidth / 2, actionPill.y + 14, actionLabel, {
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: `${Math.max(11, this.ui.choiceFont * 0.66)}px`,
      color: available ? "#efe4cf" : "#988e99"
    }).setOrigin(0.5);
    actionText.setLetterSpacing(0.8);

    container.add([shadow, card, accent, actionPill, actionText, titleText]);
    if (subtitleText) {
      container.add(subtitleText);
    }

    const hitArea = this.add.zone(0, 0, width, cardHeight).setOrigin(0, 0);
    if (available) {
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on("pointerover", () => this.setChoiceCardState(container, "hover"));
      hitArea.on("pointerout", () => this.setChoiceCardState(container, "idle"));
      hitArea.on("pointerdown", () => {
        this.setChoiceCardState(container, "pressed");
      });
      hitArea.on("pointerup", () => {
        this.setChoiceCardState(container, "hover");
        onPress();
      });
    }

    container.add(hitArea);
    container.cardHeight = cardHeight;
    container.stateParts = { shadow, card, accent, actionPill, actionText, titleText, subtitleText };
    container.isAvailable = available;
    this.setChoiceCardState(container, available ? "idle" : "locked");
    return container;
  }

  setChoiceCardState(container, state) {
    const { shadow, card, accent, actionPill, actionText, titleText, subtitleText } = container.stateParts;

    if (!container.isAvailable || state === "locked") {
      shadow.y = 2;
      shadow.alpha = 0.1;
      card.y = 0;
      card.setFillStyle(0x17141d, 1);
      card.setStrokeStyle(1, 0x3c3444, 0.7);
      accent.setFillStyle(0x574d59, 1);
      actionPill.setFillStyle(0x221d28, 1);
      actionPill.setStrokeStyle(1, 0x4f4458, 0.9);
      actionText.setColor("#988e99");
      titleText.setColor("#a69cab");
      if (subtitleText) {
        subtitleText.setColor("#7f7587");
      }
      return;
    }

    if (state === "pressed") {
      shadow.y = 1;
      shadow.alpha = 0.14;
      card.y = 2;
      accent.y = 2;
      actionPill.y = 16;
      actionText.y = 30;
      card.setFillStyle(0x2e2937, 1);
      card.setStrokeStyle(1, 0xd2ae77, 0.95);
      accent.setFillStyle(0xe2b777, 1);
      actionPill.setFillStyle(0x413649, 1);
      actionPill.setStrokeStyle(1, 0xe2b777, 0.95);
      actionText.setColor("#fff5df");
      return;
    }

    if (state === "hover") {
      shadow.y = 3;
      shadow.alpha = 0.22;
      card.y = -1;
      accent.y = -1;
      actionPill.y = 13;
      actionText.y = 27;
      card.setFillStyle(0x2d2837, 1);
      card.setStrokeStyle(1, 0xb99561, 0.95);
      accent.setFillStyle(0xd4a96c, 1);
      actionPill.setFillStyle(0x3a3244, 1);
      actionPill.setStrokeStyle(1, 0x9b8460, 0.95);
      actionText.setColor("#fff0d7");
      titleText.setColor("#fff8ef");
      if (subtitleText) {
        subtitleText.setColor("#d0c7d8");
      }
      return;
    }

    shadow.y = 4;
    shadow.alpha = 0.18;
    card.y = 0;
    accent.y = 0;
    actionPill.y = 14;
    actionText.y = 28;
    card.setFillStyle(0x24212d, 1);
    card.setStrokeStyle(1, 0x625472, 0.85);
    accent.setFillStyle(0xc49b62, 1);
    actionPill.setFillStyle(0x332c3f, 1);
    actionPill.setStrokeStyle(1, 0x7c688d, 0.9);
    actionText.setColor("#efe4cf");
    titleText.setColor("#f6f2ea");
    if (subtitleText) {
      subtitleText.setColor("#bdb4c5");
    }
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
    if (!this.canChoose(choice) || this.isTyping || this.isDraggingChoices || this.isTransitioning) {
      return;
    }

    const effects = choice.effects || {};
    const previousStats = { ...this.currentStats };
    this.currentStats = {
      strength: Math.max(1, this.currentStats.strength + (effects.strength || 0)),
      intellect: Math.max(1, this.currentStats.intellect + (effects.intellect || 0)),
      charm: Math.max(1, this.currentStats.charm + (effects.charm || 0))
    };
    const deltas = {
      strength: this.currentStats.strength - previousStats.strength,
      intellect: this.currentStats.intellect - previousStats.intellect,
      charm: this.currentStats.charm - previousStats.charm
    };

    this.isTransitioning = true;
    this.renderStats();
    this.emitStatFeedback(deltas);
    this.pulseStats(deltas);
    this.flashScene(choice.next);

    this.time.delayedCall(260, () => {
      this.isTransitioning = false;
      this.showEvent(choice.next);
    });
  }

  calculateCarryOver(stats) {
    return {
      strength: Math.max(1, Math.floor(stats.strength * 0.5)),
      intellect: Math.max(1, Math.floor(stats.intellect * 0.5)),
      charm: Math.max(1, Math.floor(stats.charm * 0.5))
    };
  }

  reincarnate() {
    this.showBanner("Fragments Return", 0x8a74d6, 0xf5efff);
    this.flashScreen(0xc7b7ff, 0.14, 520);
    this.baseStats = this.calculateCarryOver(this.currentStats);
    this.lifeNumber += 1;
    this.saveProgress();
    this.time.delayedCall(280, () => this.beginLife());
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

  animateChoiceCards(cards) {
    cards.forEach((card, index) => {
      card.alpha = 0;
      card.y += 12;
      this.tweens.add({
        targets: card,
        alpha: 1,
        y: card.y - 12,
        duration: 220,
        delay: index * 45,
        ease: "Quad.out"
      });
    });
  }

  emitStatFeedback(deltas) {
    const entries = [
      ["strength", "STR", "#e0b977"],
      ["intellect", "INT", "#8dc7ff"],
      ["charm", "CHA", "#e1a6d7"]
    ].filter(([key]) => deltas[key] !== 0);

    entries.forEach(([key, label, color], index) => {
      const value = deltas[key] > 0 ? `+${deltas[key]}` : `${deltas[key]}`;
      const toast = this.add.text(
        this.lifeText.x,
        this.statText.y + this.statText.height + 8 + index * 18,
        `${label} ${value}`,
        {
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: `${Math.max(12, this.ui.baseFont * 0.78)}px`,
          color
        }
      ).setDepth(48);

      this.feedbackNodes.push(toast);
      this.tweens.add({
        targets: toast,
        y: toast.y - 18,
        alpha: 0,
        duration: 900,
        ease: "Cubic.out",
        onComplete: () => toast.destroy()
      });
    });
  }

  pulseStats(deltas) {
    const positiveChange = Object.values(deltas).some((value) => value > 0);
    const flashColor = positiveChange ? "#f5e7c9" : "#c8cfdf";
    this.statText.setColor(flashColor);
    this.tweens.add({
      targets: [this.lifeText, this.statText],
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 140,
      yoyo: true,
      ease: "Quad.out",
      onComplete: () => {
        this.lifeText.setScale(1);
        this.statText.setScale(1);
        this.statText.setColor("#c8cfdf");
      }
    });
  }

  playEventTransition(event, skipTyping) {
    if (skipTyping) {
      this.storyPanelAccent.setAlpha(0.85);
      return;
    }

    const accentColor = event.death ? 0xb78080 : 0xc49b62;
    this.storyPanelAccent.setFillStyle(accentColor, 0.92);
    this.storyPanelAccent.setAlpha(0.2);
    this.storyPanel.setAlpha(0.97);
    this.tweens.add({
      targets: [this.storyPanel, this.storyPanelShadow],
      alpha: { from: 0.82, to: 1 },
      duration: 260,
      ease: "Quad.out"
    });
    this.tweens.add({
      targets: this.storyPanelAccent,
      alpha: { from: 0.18, to: 0.85 },
      duration: 320,
      ease: "Sine.out"
    });

    if (event.death) {
      this.showBanner("A Life Ends", 0x8a505e, 0xffeef1);
      this.flashScreen(0x8a505e, 0.12, 480);
    } else if (event.id === "start") {
      this.showBanner(`Life ${this.lifeNumber}`, 0x8a74d6, 0xf4efff);
      if (this.lifeNumber > 1) {
        this.flashScreen(0xc7b7ff, 0.08, 360);
      }
    }
  }

  flashScene(nextEventId) {
    const target = this.getEventById(nextEventId);
    if (target.death) {
      this.flashScreen(0x8a505e, 0.1, 360);
      return;
    }

    this.flashScreen(0xf0d8a8, 0.06, 240);
  }

  flashScreen(color, alpha, duration) {
    this.screenFlash.setFillStyle(color, 1);
    this.screenFlash.setAlpha(alpha);
    this.tweens.killTweensOf(this.screenFlash);
    this.tweens.add({
      targets: this.screenFlash,
      alpha: 0,
      duration,
      ease: "Quad.out"
    });
  }

  showBanner(text, bgColor, textColor) {
    this.eventBannerText.setText(text);
    this.eventBannerText.setColor(textColor);
    this.eventBannerBg.setFillStyle(bgColor, 0.22);
    this.eventBannerBg.setStrokeStyle(1, bgColor, 0.62);
    this.eventBanner.y += 8;
    this.eventBanner.setAlpha(0);
    this.tweens.killTweensOf(this.eventBanner);
    this.tweens.add({
      targets: this.eventBanner,
      alpha: 1,
      y: this.eventBanner.y - 8,
      duration: 240,
      ease: "Quad.out",
      onComplete: () => {
        this.tweens.add({
          targets: this.eventBanner,
          alpha: 0,
          delay: 900,
          duration: 420,
          ease: "Quad.in"
        });
      }
    });
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
