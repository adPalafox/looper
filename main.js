const STORAGE_KEY = "rekindled-loop-save";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const UI_FONT_STACK = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const STORY_FONT_STACK = '"Baskerville", "Iowan Old Style", Georgia, serif';
const TEXT_RESOLUTION = Math.max(2, Math.ceil(window.devicePixelRatio || 1));

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
    this.activeChoicePointerId = null;
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
      fontFamily: UI_FONT_STACK,
      fontSize: "18px",
      color: "#f4ecda",
      align: "center"
    }).setOrigin(0.5);
    this.loadingText.setResolution(TEXT_RESOLUTION);
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
      fontFamily: UI_FONT_STACK,
      color: "#f4ecda"
    });
    this.lifeText.setResolution(TEXT_RESOLUTION);

    this.statText = this.add.text(0, 0, "", {
      fontFamily: UI_FONT_STACK,
      color: "#c8cfdf"
    });
    this.statText.setResolution(TEXT_RESOLUTION);

    this.storyPanelShadow = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.18);
    this.storyPanel = this.add.rectangle(0, 0, 100, 100, 0x14111d, 0.94);
    this.storyPanel.setStrokeStyle(1, 0xffffff, 0.07);

    this.storyText = this.add.text(0, 0, "", {
      fontFamily: STORY_FONT_STACK,
      color: "#f7f3ea",
      lineSpacing: 8
    });
    this.storyText.setResolution(TEXT_RESOLUTION);

    this.choiceHint = this.add.text(0, 0, "DECISIONS", {
      fontFamily: UI_FONT_STACK,
      color: "#bba978"
    });
    this.choiceHint.setResolution(TEXT_RESOLUTION);

    this.divider = this.add.rectangle(0, 0, 100, 1, 0xffffff, 0.08).setOrigin(0, 0.5);

    this.choiceContainer = this.add.container(0, 0);
    this.choiceContainer.setDepth(10);
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
      if (
        this.choiceContentHeight > this.choiceViewportHeight &&
        this.isPointInChoiceViewport(pointer.x, pointer.y)
      ) {
        this.scrollChoices(deltaY * 0.9);
      }
    });

    this.input.on("pointerdown", (pointer) => {
      if (
        pointer.leftButtonDown() &&
        this.isPointInChoiceViewport(pointer.x, pointer.y) &&
        this.choiceContentHeight > this.choiceViewportHeight
      ) {
        this.choicePointerDown = true;
        this.activeChoicePointerId = pointer.id;
        this.lastDragY = pointer.y;
        this.dragStartY = pointer.y;
      }
    });

    this.input.on("pointermove", (pointer) => {
      if (
        !this.choicePointerDown ||
        this.activeChoicePointerId !== pointer.id ||
        !pointer.isDown
      ) {
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
      this.resetChoicePointerState();
    });

    this.input.on("pointerupoutside", () => {
      this.resetChoicePointerState();
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
    const panelPadding = Phaser.Math.Clamp(panelWidth * 0.065, 20, 30);
    const labelFont = Phaser.Math.Clamp(width * 0.03, 11, 13);
    const headerFont = Phaser.Math.Clamp(width * 0.043, 16, 20);
    const metaFont = Phaser.Math.Clamp(width * 0.034, 13, 15);
    const storyFont = Phaser.Math.Clamp(width * 0.043, 16, 19);
    const choiceFont = Phaser.Math.Clamp(width * 0.039, 15, 17);
    const choiceMetaFont = Phaser.Math.Clamp(width * 0.031, 12, 13);
    const storyWidth = panelWidth - panelPadding * 2;
    const minStoryHeight = Phaser.Math.Clamp(height * 0.14, 108, 170);
    const minChoicesHeight = Phaser.Math.Clamp(height * 0.22, 150, 240);
    const panelChromeHeight = 64;
    const topReserved = safeTop + headerHeight + 18;
    const maxPanelHeight = Math.max(
      minStoryHeight + minChoicesHeight + panelPadding * 2 + panelChromeHeight,
      height - safeBottom - topReserved
    );
    const minPanelHeight = Math.min(
      maxPanelHeight,
      Math.max(350, minStoryHeight + minChoicesHeight + panelPadding * 2 + panelChromeHeight)
    );

    this.ui = {
      width,
      height,
      marginX,
      safeTop,
      safeBottom,
      headerHeight,
      panelWidth,
      panelPadding,
      labelFont,
      headerFont,
      metaFont,
      storyFont,
      choiceFont,
      choiceMetaFont,
      storyWidth,
      minStoryHeight,
      minChoicesHeight,
      panelChromeHeight,
      minPanelHeight,
      maxPanelHeight,
      choicesX: marginX + panelPadding,
      choicesWidth: storyWidth,
      heroShadowWidth: Phaser.Math.Clamp(width * 0.34, 112, 190),
      heroShadowHeight: Phaser.Math.Clamp(height * 0.03, 18, 28)
    };

    this.drawBackground();
    this.layoutObjects(this.getCurrentNarrativeText());
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

  layoutObjects(storyContent = "") {
    const {
      width,
      height,
      marginX,
      safeTop,
      safeBottom,
      headerHeight,
      panelWidth,
      panelPadding,
      labelFont,
      headerFont,
      metaFont,
      storyFont,
      storyWidth,
      choicesX,
      choicesWidth,
      heroShadowWidth,
      heroShadowHeight,
      minStoryHeight,
      minChoicesHeight,
      panelChromeHeight,
      minPanelHeight,
      maxPanelHeight
    } = this.ui;

    this.storyText.setFontSize(storyFont);
    this.storyText.setLineSpacing(Math.round(storyFont * 0.36));
    this.storyText.setWordWrapWidth(storyWidth, true);
    this.storyText.setFixedSize(0, 0);
    this.storyText.setText(storyContent || " ");

    const measuredStoryHeight = Math.ceil(this.storyText.height);
    const maxStoryHeight = Math.max(
      minStoryHeight,
      maxPanelHeight - panelPadding * 2 - panelChromeHeight - minChoicesHeight
    );
    const storyHeight = Phaser.Math.Clamp(measuredStoryHeight, minStoryHeight, maxStoryHeight);
    const preferredChoicesHeight = Phaser.Math.Clamp(height * 0.24, minChoicesHeight, 240);
    const panelHeight = Phaser.Math.Clamp(
      storyHeight + preferredChoicesHeight + panelPadding * 2 + panelChromeHeight,
      minPanelHeight,
      maxPanelHeight
    );
    const panelTop = height - safeBottom - panelHeight;
    const choicesY = panelTop + panelPadding + storyHeight + 56;
    const choicesHeight = Math.max(minChoicesHeight, panelHeight - storyHeight - panelPadding * 2 - panelChromeHeight);
    const heroAreaTop = safeTop + headerHeight + 12;
    const heroAreaBottom = panelTop - 16;
    const heroAreaHeight = Math.max(96, heroAreaBottom - heroAreaTop);
    const heroCenterX = width / 2;
    const heroCenterY = heroAreaTop + heroAreaHeight * 0.8;
    const heroHeight = Phaser.Math.Clamp(heroAreaHeight * 0.95, 160, 410);
    const heroHaloWidth = Phaser.Math.Clamp(width * 0.48, 160, 260);
    const heroHaloHeight = Phaser.Math.Clamp(heroAreaHeight * 0.8, 150, 340);

    Object.assign(this.ui, {
      panelHeight,
      panelTop,
      storyHeight,
      choicesY,
      choicesHeight,
      heroCenterX,
      heroCenterY,
      heroHeight,
      heroHaloWidth,
      heroHaloHeight
    });

    this.heroHalo.setPosition(Math.round(heroCenterX), Math.round(heroCenterY - heroHeight * 0.45));
    this.heroHalo.setSize(heroHaloWidth, heroHaloHeight);

    this.heroGlow.setPosition(Math.round(heroCenterX), Math.round(heroCenterY + 8));
    this.heroGlow.setSize(heroShadowWidth, heroShadowHeight);

    this.hero.setPosition(Math.round(heroCenterX), Math.round(heroCenterY));
    this.hero.setScale(heroHeight / this.hero.height);

    this.headerPanel.setPosition(Math.round(width / 2), Math.round(safeTop + headerHeight / 2));
    this.headerPanel.setSize(panelWidth, headerHeight);

    this.lifeText.setPosition(Math.round(marginX + panelPadding), Math.round(safeTop + 16));
    this.lifeText.setFontSize(headerFont);
    this.lifeText.setColor("#f5ecdd");

    this.statText.setPosition(Math.round(marginX + panelPadding), Math.round(safeTop + 18 + headerFont * 1.35));
    this.statText.setFontSize(metaFont);
    this.statText.setColor("#b6bdcf");

    this.storyPanelShadow.setPosition(Math.round(width / 2), Math.round(panelTop + panelHeight / 2 + 8));
    this.storyPanelShadow.setSize(panelWidth, panelHeight);

    this.storyPanel.setPosition(Math.round(width / 2), Math.round(panelTop + panelHeight / 2));
    this.storyPanel.setSize(panelWidth, panelHeight);

    this.storyText.setPosition(Math.round(marginX + panelPadding), Math.round(panelTop + panelPadding));
    this.storyText.setFixedSize(storyWidth, storyHeight);

    this.choiceHint.setPosition(
      Math.round(marginX + panelPadding),
      Math.round(panelTop + panelPadding + storyHeight + 16)
    );
    this.choiceHint.setFontSize(labelFont);
    this.choiceHint.setAlpha(0.78);
    this.choiceHint.setLetterSpacing(2.4);

    this.divider.setPosition(
      Math.round(marginX + panelPadding),
      Math.round(panelTop + panelPadding + storyHeight + 42)
    );
    this.divider.width = storyWidth;

    this.choiceViewportHeight = Math.max(74, choicesHeight);
    this.choiceContainer.setPosition(Math.round(choicesX), Math.round(choicesY));

    this.choiceMaskGraphics.clear();
    this.choiceMaskGraphics.fillStyle(0xffffff, 1);
    this.choiceMaskGraphics.fillRect(
      Math.round(choicesX),
      Math.round(choicesY),
      Math.round(choicesWidth),
      Math.round(this.choiceViewportHeight)
    );
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

  getCurrentNarrativeText() {
    if (!this.currentEvent) {
      return "";
    }

    if (!this.currentEvent.death) {
      return this.currentEvent.text;
    }

    const carry = this.calculateCarryOver(this.currentStats);
    return [
      this.currentEvent.text,
      "",
      `End: ${this.currentEvent.deathLabel}`,
      `Carry over: STR ${carry.strength}  INT ${carry.intellect}  CHA ${carry.charm}`
    ].join("\n");
  }

  refreshCurrentView(skipTyping = false) {
    if (!this.currentEvent || !this.storyText) {
      return;
    }

    const narrativeText = this.getCurrentNarrativeText();
    this.layoutObjects(narrativeText);
    this.clearChoices();
    this.renderStats();

    if (this.currentEvent.death) {
      this.setStoryText(narrativeText, skipTyping, () => this.showDeathChoice());
      return;
    }

    this.setStoryText(narrativeText, skipTyping, () => this.showChoices(this.currentEvent.choices));
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
    this.resetChoicePointerState();
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
      offsetY += button.cardHeight + 14;
    });

    this.choiceContentHeight = Math.max(0, offsetY - 14);
    this.applyChoiceScroll();
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
  }

  createChoiceCard({ y, title, available, actionLabel, subtitle, onPress }) {
    const width = this.ui.choicesWidth;
    const inset = 16;
    const actionWidth = 82;
    const titleWidth = width - inset * 2 - actionWidth - 10;
    const titleFontSize = this.ui.choiceFont;
    const subtitleFontSize = this.ui.choiceMetaFont;
    const titleText = this.add.text(inset, 14, title, {
      fontFamily: UI_FONT_STACK,
      fontSize: `${titleFontSize}px`,
      fontStyle: "bold",
      color: available ? "#f6f2ea" : "#a69cab",
      wordWrap: { width: titleWidth, useAdvancedWrap: true }
    });
    titleText.setResolution(TEXT_RESOLUTION);

    const subtitleText = subtitle
      ? this.add.text(inset, titleText.y + titleText.height + 8, subtitle, {
          fontFamily: UI_FONT_STACK,
          fontSize: `${subtitleFontSize}px`,
          color: available ? "#bdb4c5" : "#7f7587",
          wordWrap: { width: width - inset * 2, useAdvancedWrap: true }
        })
      : null;
    if (subtitleText) {
      subtitleText.setResolution(TEXT_RESOLUTION);
    }

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
      fontFamily: UI_FONT_STACK,
      fontSize: `${subtitleFontSize}px`,
      fontStyle: "bold",
      color: available ? "#efe4cf" : "#988e99"
    }).setOrigin(0.5);
    actionText.setResolution(TEXT_RESOLUTION);
    actionText.setLetterSpacing(0.9);

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
        if (this.isDraggingChoices) {
          this.setChoiceCardState(container, "idle");
          return;
        }
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

  resetChoicePointerState() {
    this.choicePointerDown = false;
    this.activeChoicePointerId = null;
    this.lastDragY = 0;
    this.dragStartY = 0;
    this.time.delayedCall(0, () => {
      this.isDraggingChoices = false;
    });
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
