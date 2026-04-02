const STORAGE_KEY = "rekindled-loop-save";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const TEXT_RESOLUTION = Math.max(2, Math.ceil(window.devicePixelRatio || 1));
const UI_FONT_STACK = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const STORY_FONT_STACK = '"Baskerville", "Iowan Old Style", Georgia, serif';

const DEFAULT_STATS = Object.freeze({ strength: 1, intellect: 1, charm: 1 });
const LOAD_ERROR_TEXT = [
  "Unable to load bg.webp or character.webp.",
  "If you opened this with file://, run a local server",
  "or refresh after the files finish loading."
].join("\n");

const CHOICE_GAP = 14;
const CHOICE_DRAG_THRESHOLD = 8;
const CHOICE_WHEEL_SPEED = 0.9;

const TYPEWRITER_DELAY = 12;
const HERO_FLOAT_OFFSET = 7;
const HERO_FLOAT_DURATION = 2200;

class LoopScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoopScene" });
    this.initializeState();
  }

  preload() {}

  create() {
    this.showLoadingState();
    this.loadVisualAssets()
      .then(() => this.bootstrapScene())
      .catch(() => {
        this.loadingText.setText(LOAD_ERROR_TEXT);
      });
  }

  update() {}

  initializeState() {
    this.baseStats = { ...DEFAULT_STATS };
    this.currentStats = { ...DEFAULT_STATS };
    this.lifeNumber = 1;
    this.currentEvent = null;
    this.typeEvent = null;

    this.choiceNodes = [];
    this.choiceScrollY = 0;
    this.choiceContentHeight = 0;
    this.choiceViewportHeight = 0;
    this.choicePointerDown = false;
    this.isDraggingChoices = false;
    this.activeChoicePointerId = null;
    this.lastDragY = 0;
    this.dragStartY = 0;

    this.isTyping = false;
    this.ui = {};
  }

  bootstrapScene() {
    this.loadingText.destroy();
    this.loadProgress();
    this.createObjects();
    this.bindInput();
    this.scale.on("resize", this.handleResize, this);
    this.handleResize(this.scale.gameSize);
    this.beginLife();
  }

  showLoadingState() {
    const { width, height } = this.scale.gameSize;
    this.add.rectangle(width / 2, height / 2, width, height, 0x111019, 1);
    this.loadingText = this.createText(width / 2, height / 2, "Loading artwork...", {
      fontFamily: UI_FONT_STACK,
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
      image.onerror = () => reject(new Error(`Failed to load ${path}`));
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
      if (save?.baseStats) {
        this.baseStats = this.normalizeStats(save.baseStats);
      }

      if (Number.isInteger(save?.lifeNumber) && save.lifeNumber > 0) {
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
    this.createBackgroundObjects();
    this.createHeaderObjects();
    this.createStoryObjects();
    this.createChoiceObjects();
    this.createAmbientTweens();
  }

  createBackgroundObjects() {
    this.background = this.add.image(0, 0, "bg-scene").setOrigin(0.5);
    this.backgroundShade = this.add.graphics();
    this.vignette = this.add.graphics();
    this.heroHalo = this.add.ellipse(0, 0, 100, 100, 0xd6d8ff, 0.12);
    this.heroGlow = this.add.ellipse(0, 0, 100, 40, 0x000000, 0.18);
    this.hero = this.add.image(0, 0, "hero-portrait").setOrigin(0.5, 1);
  }

  createHeaderObjects() {
    this.headerPanel = this.add.rectangle(0, 0, 100, 50, 0x121019, 0.72);
    this.headerPanel.setStrokeStyle(1, 0xffffff, 0.06);

    this.lifeText = this.createText(0, 0, "", {
      fontFamily: UI_FONT_STACK,
      color: "#f4ecda"
    });

    this.statText = this.createText(0, 0, "", {
      fontFamily: UI_FONT_STACK,
      color: "#c8cfdf"
    });
  }

  createStoryObjects() {
    this.storyPanelShadow = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.18);
    this.storyPanel = this.add.rectangle(0, 0, 100, 100, 0x14111d, 0.94);
    this.storyPanel.setStrokeStyle(1, 0xffffff, 0.07);

    this.storyText = this.createText(0, 0, "", {
      fontFamily: STORY_FONT_STACK,
      color: "#f7f3ea",
      lineSpacing: 8
    });
  }

  createChoiceObjects() {
    this.choiceHint = this.createText(0, 0, "DECISIONS", {
      fontFamily: UI_FONT_STACK,
      color: "#bba978"
    });

    this.divider = this.add.rectangle(0, 0, 100, 1, 0xffffff, 0.08).setOrigin(0, 0.5);
    this.choiceContainer = this.add.container(0, 0);
    this.choiceContainer.setDepth(10);

    this.choiceMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.choiceMask = this.choiceMaskGraphics.createGeometryMask();
    this.choiceContainer.setMask(this.choiceMask);
  }

  createAmbientTweens() {
    this.tweens.add({
      targets: [this.hero, this.heroHalo],
      y: `+=${HERO_FLOAT_OFFSET}`,
      duration: HERO_FLOAT_DURATION,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }

  bindInput() {
    this.input.on("wheel", this.handleChoiceWheel, this);
    this.input.on("pointerdown", this.handleChoicePointerDown, this);
    this.input.on("pointermove", this.handleChoicePointerMove, this);
    this.input.on("pointerup", this.resetChoicePointerState, this);
    this.input.on("pointerupoutside", this.resetChoicePointerState, this);
  }

  handleChoiceWheel(pointer, gameObjects, deltaX, deltaY) {
    if (!this.canScrollChoices() || !this.isPointInChoiceViewport(pointer.x, pointer.y)) {
      return;
    }

    this.scrollChoices(deltaY * CHOICE_WHEEL_SPEED);
  }

  handleChoicePointerDown(pointer) {
    if (!pointer.leftButtonDown() || !this.canStartChoiceDrag(pointer)) {
      return;
    }

    this.choicePointerDown = true;
    this.activeChoicePointerId = pointer.id;
    this.lastDragY = pointer.y;
    this.dragStartY = pointer.y;
  }

  handleChoicePointerMove(pointer) {
    if (!this.isTrackedChoicePointer(pointer)) {
      return;
    }

    if (!this.isDraggingChoices && Math.abs(pointer.y - this.dragStartY) > CHOICE_DRAG_THRESHOLD) {
      this.isDraggingChoices = true;
    }

    if (!this.isDraggingChoices) {
      return;
    }

    const delta = this.lastDragY - pointer.y;
    this.lastDragY = pointer.y;
    this.scrollChoices(delta);
  }

  canStartChoiceDrag(pointer) {
    return this.canScrollChoices() && this.isPointInChoiceViewport(pointer.x, pointer.y);
  }

  isTrackedChoicePointer(pointer) {
    return this.choicePointerDown && this.activeChoicePointerId === pointer.id && pointer.isDown;
  }

  canScrollChoices() {
    return this.choiceContentHeight > this.choiceViewportHeight;
  }

  handleResize(gameSize) {
    const metrics = this.buildResponsiveMetrics(gameSize);
    this.cameras.main.setViewport(0, 0, metrics.width, metrics.height);
    this.ui = metrics;

    this.drawBackground();
    this.layoutScene(this.getCurrentNarrativeText());
    this.refreshCurrentView(true);
  }

  buildResponsiveMetrics(gameSize) {
    const width = Math.round(gameSize.width);
    const height = Math.round(gameSize.height);
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

    return {
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
  }

  drawBackground() {
    const { width, height } = this.ui;
    const scale = Math.max(width / this.background.width, height / this.background.height);
    this.background.setPosition(width / 2, height / 2);
    this.background.setScale(scale);

    this.backgroundShade.clear();
    this.backgroundShade.fillGradientStyle(0x0f0e16, 0x0f0e16, 0x18151f, 0x19141f, 0.12, 0.08, 0.28, 0.64);
    this.backgroundShade.fillRect(0, 0, width, height);
    this.backgroundShade.fillStyle(0xffffff, 0.04);
    this.backgroundShade.fillEllipse(width * 0.5, height * 0.56, width * 0.92, height * 0.18);
    this.backgroundShade.fillStyle(0xdcd8ff, 0.06);
    this.backgroundShade.fillEllipse(width * 0.5, height * 0.28, width * 0.48, height * 0.2);

    this.vignette.clear();
    this.vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.14, 0.04, 0.18, 0.24);
    this.vignette.fillRect(0, 0, width, height);
  }

  layoutScene(storyContent = "") {
    const panelLayout = this.measurePanelLayout(storyContent);
    Object.assign(this.ui, panelLayout);

    this.layoutHero();
    this.layoutHeader();
    this.layoutStoryPanel();
    this.layoutChoiceViewport();
  }

  measurePanelLayout(storyContent) {
    const {
      width,
      height,
      safeTop,
      safeBottom,
      headerHeight,
      panelPadding,
      storyFont,
      storyWidth,
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
    const choicesHeight = Math.max(
      minChoicesHeight,
      panelHeight - storyHeight - panelPadding * 2 - panelChromeHeight
    );

    const heroAreaTop = safeTop + headerHeight + 12;
    const heroAreaBottom = panelTop - 16;
    const heroAreaHeight = Math.max(96, heroAreaBottom - heroAreaTop);

    return {
      panelHeight,
      panelTop,
      storyHeight,
      choicesY,
      choicesHeight,
      heroCenterX: width / 2,
      heroCenterY: heroAreaTop + heroAreaHeight * 0.8,
      heroHeight: Phaser.Math.Clamp(heroAreaHeight * 0.95, 160, 410),
      heroHaloWidth: Phaser.Math.Clamp(width * 0.48, 160, 260),
      heroHaloHeight: Phaser.Math.Clamp(heroAreaHeight * 0.8, 150, 340)
    };
  }

  layoutHero() {
    const { heroCenterX, heroCenterY, heroHeight, heroHaloWidth, heroHaloHeight, heroShadowWidth, heroShadowHeight } = this.ui;

    this.heroHalo.setPosition(this.round(heroCenterX), this.round(heroCenterY - heroHeight * 0.45));
    this.heroHalo.setSize(heroHaloWidth, heroHaloHeight);

    this.heroGlow.setPosition(this.round(heroCenterX), this.round(heroCenterY + 8));
    this.heroGlow.setSize(heroShadowWidth, heroShadowHeight);

    this.hero.setPosition(this.round(heroCenterX), this.round(heroCenterY));
    this.hero.setScale(heroHeight / this.hero.height);
  }

  layoutHeader() {
    const { width, safeTop, headerHeight, panelWidth, marginX, panelPadding, headerFont, metaFont } = this.ui;

    this.headerPanel.setPosition(this.round(width / 2), this.round(safeTop + headerHeight / 2));
    this.headerPanel.setSize(panelWidth, headerHeight);

    this.lifeText.setPosition(this.round(marginX + panelPadding), this.round(safeTop + 16));
    this.lifeText.setFontSize(headerFont);
    this.lifeText.setColor("#f5ecdd");

    this.statText.setPosition(this.round(marginX + panelPadding), this.round(safeTop + 18 + headerFont * 1.35));
    this.statText.setFontSize(metaFont);
    this.statText.setColor("#b6bdcf");
  }

  layoutStoryPanel() {
    const { width, panelTop, panelHeight, panelWidth, marginX, panelPadding, storyWidth, storyHeight } = this.ui;

    this.storyPanelShadow.setPosition(this.round(width / 2), this.round(panelTop + panelHeight / 2 + 8));
    this.storyPanelShadow.setSize(panelWidth, panelHeight);

    this.storyPanel.setPosition(this.round(width / 2), this.round(panelTop + panelHeight / 2));
    this.storyPanel.setSize(panelWidth, panelHeight);

    this.storyText.setPosition(this.round(marginX + panelPadding), this.round(panelTop + panelPadding));
    this.storyText.setFixedSize(storyWidth, storyHeight);
  }

  layoutChoiceViewport() {
    const { marginX, panelPadding, panelTop, storyHeight, storyWidth, choicesX, choicesY, choicesWidth, labelFont, choicesHeight } = this.ui;

    this.choiceHint.setPosition(
      this.round(marginX + panelPadding),
      this.round(panelTop + panelPadding + storyHeight + 16)
    );
    this.choiceHint.setFontSize(labelFont);
    this.choiceHint.setAlpha(0.78);
    this.choiceHint.setLetterSpacing(2.4);

    this.divider.setPosition(
      this.round(marginX + panelPadding),
      this.round(panelTop + panelPadding + storyHeight + 42)
    );
    this.divider.width = storyWidth;

    this.choiceViewportHeight = Math.max(74, choicesHeight);
    this.choiceContainer.setPosition(this.round(choicesX), this.round(choicesY));

    this.choiceMaskGraphics.clear();
    this.choiceMaskGraphics.fillStyle(0xffffff, 1);
    this.choiceMaskGraphics.fillRect(
      this.round(choicesX),
      this.round(choicesY),
      this.round(choicesWidth),
      this.round(this.choiceViewportHeight)
    );
  }

  beginLife() {
    this.currentStats = { ...this.baseStats };
    this.showEvent("start");
  }

  showEvent(eventId) {
    this.currentEvent = this.getEventById(eventId);
    this.refreshCurrentView(false);
  }

  getEventById(eventId) {
    return EVENTS.find((event) => event.id === eventId) || EVENTS[0];
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
    this.layoutScene(narrativeText);
    this.clearChoices();
    this.renderStats();

    const onComplete = this.currentEvent.death
      ? () => this.showDeathChoice()
      : () => this.showChoices(this.currentEvent.choices);

    this.setStoryText(narrativeText, skipTyping, onComplete);
  }

  renderStats() {
    this.lifeText.setText(`Life ${this.lifeNumber}`);
    this.statText.setText(
      `STR ${this.currentStats.strength}   INT ${this.currentStats.intellect}   CHA ${this.currentStats.charm}`
    );
  }

  setStoryText(text, skipTyping, onComplete) {
    this.stopTyping();

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
      delay: TYPEWRITER_DELAY,
      repeat: Math.max(text.length - 1, 0),
      callback: () => {
        index += 1;
        this.storyText.setText(text.slice(0, index));
        if (index >= text.length) {
          this.isTyping = false;
          this.typeEvent = null;
          if (onComplete) {
            onComplete();
          }
        }
      }
    });
  }

  stopTyping() {
    if (this.typeEvent) {
      this.typeEvent.remove(false);
      this.typeEvent = null;
    }
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
      const button = this.createChoiceCard({
        y: offsetY,
        title: this.getChoiceLabel(choice, available),
        available,
        actionLabel: available ? "Choose" : "Locked",
        subtitle: available ? null : `Requires ${this.formatRequirement(choice.req)}`,
        onPress: () => this.pickChoice(choice)
      });

      this.choiceContainer.add(button);
      this.choiceNodes.push(button);
      offsetY += button.cardHeight + CHOICE_GAP;
    });

    this.choiceContentHeight = Math.max(0, offsetY - CHOICE_GAP);
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

  getChoiceLabel(choice, available) {
    if (available) {
      return choice.text;
    }

    return `${choice.text} [need ${this.formatRequirement(choice.req)}]`;
  }

  createChoiceCard({ y, title, available, actionLabel, subtitle, onPress }) {
    const metrics = this.getChoiceCardMetrics();
    const titleText = this.createChoiceTitle(metrics, title, available);
    const subtitleText = this.createChoiceSubtitle(metrics, titleText, subtitle, available);
    const cardHeight = this.getChoiceCardHeight(titleText, subtitleText);

    const container = this.add.container(0, y);
    const parts = this.createChoiceCardParts(metrics, cardHeight, available, actionLabel);
    container.add([parts.shadow, parts.card, parts.accent, parts.actionPill, parts.actionText, titleText]);

    if (subtitleText) {
      container.add(subtitleText);
    }

    const hitArea = this.createChoiceHitArea(metrics.width, cardHeight, available, container, onPress);
    container.add(hitArea);

    container.cardHeight = cardHeight;
    container.stateParts = { ...parts, titleText, subtitleText };
    container.isAvailable = available;

    this.setChoiceCardState(container, available ? "idle" : "locked");
    return container;
  }

  getChoiceCardMetrics() {
    const width = this.ui.choicesWidth;
    const inset = 16;
    const actionWidth = 82;

    return {
      width,
      inset,
      actionWidth,
      titleWidth: width - inset * 2 - actionWidth - 10,
      titleFontSize: this.ui.choiceFont,
      subtitleFontSize: this.ui.choiceMetaFont
    };
  }

  createChoiceTitle(metrics, title, available) {
    return this.createText(metrics.inset, 14, title, {
      fontFamily: UI_FONT_STACK,
      fontSize: `${metrics.titleFontSize}px`,
      fontStyle: "bold",
      color: available ? "#f6f2ea" : "#a69cab",
      wordWrap: { width: metrics.titleWidth, useAdvancedWrap: true }
    });
  }

  createChoiceSubtitle(metrics, titleText, subtitle, available) {
    if (!subtitle) {
      return null;
    }

    return this.createText(metrics.inset, titleText.y + titleText.height + 8, subtitle, {
      fontFamily: UI_FONT_STACK,
      fontSize: `${metrics.subtitleFontSize}px`,
      color: available ? "#bdb4c5" : "#7f7587",
      wordWrap: { width: metrics.width - metrics.inset * 2, useAdvancedWrap: true }
    });
  }

  getChoiceCardHeight(titleText, subtitleText) {
    const contentBottom = subtitleText
      ? subtitleText.y + subtitleText.height
      : titleText.y + titleText.height;

    return Math.max(72, contentBottom + 14);
  }

  createChoiceCardParts(metrics, cardHeight, available, actionLabel) {
    const shadow = this.add.rectangle(0, 4, metrics.width, cardHeight, 0x000000, available ? 0.18 : 0.1)
      .setOrigin(0, 0);
    const card = this.add.rectangle(0, 0, metrics.width, cardHeight, available ? 0x24212d : 0x17141d, 1)
      .setOrigin(0, 0);
    card.setStrokeStyle(1, available ? 0x625472 : 0x3c3444, available ? 0.85 : 0.7);

    const accent = this.add.rectangle(0, 0, 4, cardHeight, available ? 0xc49b62 : 0x574d59, 1)
      .setOrigin(0, 0);

    const actionPill = this.add.rectangle(
      metrics.width - metrics.actionWidth - metrics.inset,
      14,
      metrics.actionWidth,
      28,
      available ? 0x332c3f : 0x221d28,
      1
    ).setOrigin(0, 0);
    actionPill.setStrokeStyle(1, available ? 0x7c688d : 0x4f4458, 0.9);

    const actionText = this.createText(actionPill.x + metrics.actionWidth / 2, actionPill.y + 14, actionLabel, {
      fontFamily: UI_FONT_STACK,
      fontSize: `${metrics.subtitleFontSize}px`,
      fontStyle: "bold",
      color: available ? "#efe4cf" : "#988e99"
    }).setOrigin(0.5);
    actionText.setLetterSpacing(0.9);

    return { shadow, card, accent, actionPill, actionText };
  }

  createChoiceHitArea(width, cardHeight, available, container, onPress) {
    const hitArea = this.add.zone(0, 0, width, cardHeight).setOrigin(0, 0);
    if (!available) {
      return hitArea;
    }

    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on("pointerover", () => this.setChoiceCardState(container, "hover"));
    hitArea.on("pointerout", () => this.setChoiceCardState(container, "idle"));
    hitArea.on("pointerdown", () => this.setChoiceCardState(container, "pressed"));
    hitArea.on("pointerup", () => {
      if (this.isDraggingChoices) {
        this.setChoiceCardState(container, "idle");
        return;
      }

      this.setChoiceCardState(container, "hover");
      onPress();
    });

    return hitArea;
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

    this.currentStats = this.applyEffects(this.currentStats, choice.effects || {});
    this.showEvent(choice.next);
  }

  applyEffects(stats, effects) {
    return {
      strength: Math.max(1, stats.strength + (effects.strength || 0)),
      intellect: Math.max(1, stats.intellect + (effects.intellect || 0)),
      charm: Math.max(1, stats.charm + (effects.charm || 0))
    };
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

  resetChoicePointerState() {
    this.choicePointerDown = false;
    this.activeChoicePointerId = null;
    this.lastDragY = 0;
    this.dragStartY = 0;
    this.time.delayedCall(0, () => {
      this.isDraggingChoices = false;
    });
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

  normalizeStats(stats) {
    return {
      strength: Math.max(1, stats.strength || DEFAULT_STATS.strength),
      intellect: Math.max(1, stats.intellect || DEFAULT_STATS.intellect),
      charm: Math.max(1, stats.charm || DEFAULT_STATS.charm)
    };
  }

  createText(x, y, value, style) {
    const text = this.add.text(x, y, value, style);
    text.setResolution(TEXT_RESOLUTION);
    return text;
  }

  round(value) {
    return Math.round(value);
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
