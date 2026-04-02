const STORAGE_KEY = "rekindled-loop-save";
const IS_FILE_PROTOCOL = window.location.protocol === "file:";
const UI_FONT_STACK = '"Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const STORY_FONT_STACK = '"Baskerville", "Iowan Old Style", Georgia, serif';

const DEFAULT_STATS = Object.freeze({ strength: 1, intellect: 1, charm: 1 });
const LOAD_ERROR_TEXT = [
  "Unable to load bg.webp or character_50.webp.",
  "If you opened this with file://, run a local server",
  "or refresh after the files finish loading."
].join("\n");

const CHOICE_GAP = 14;
const CHOICE_DRAG_THRESHOLD = 8;
const CHOICE_WHEEL_SPEED = 0.9;

const TYPEWRITER_DELAY = 12;
const FAST_TYPEWRITER_DELAY = 3;
const HERO_FLOAT_OFFSET = 7;
const HERO_FLOAT_DURATION = 2200;
const HERO_BASE_SCALE = 0.65;
const VIEW_FADE_DURATION = 220;
const CHOICE_TRANSITION_DELAY = 140;
const REINCARNATE_DELAY = 520;

const FEEDBACK_COLORS = Object.freeze({
  warm: 0xd8b37a,
  cool: 0xaebde4,
  death: 0x5c2f3d,
  rebirth: 0xd9c596
});

const IMPORTANT_ANALYTICS_FLAGS = Object.freeze([
  "died_in_forest",
  "met_mysterious_girl",
  "heard_perfect_timeline",
  "found_memory_pearl",
  "earned_true_ending"
]);

const SESSION_ANALYTICS_KEY = "rekindled-loop-analytics-session";
const POSTHOG_PRODUCTION_HOSTNAME = "rekindled-loop.netlify.app";

const SOUL_TRAITS = Object.freeze({
  survivor: {
    label: "Survivor",
    description: "+2 STR at the start of every life.",
    bonuses: { strength: 2 }
  },
  noble_blood: {
    label: "Noble Blood",
    description: "+1 CHA at the start of every life.",
    bonuses: { charm: 1 }
  },
  scholar_mind: {
    label: "Scholar Mind",
    description: "+1 INT at the start of every life.",
    bonuses: { intellect: 1 }
  },
  wanderer_instinct: {
    label: "Wanderer Instinct",
    description: "You notice escape routes others miss.",
    bonuses: {}
  },
  echo_mark: {
    label: "Echo Mark",
    description: "Certain souls recognize you across lives.",
    bonuses: {}
  }
});

const IMPORTANT_FLAG_TEXT = Object.freeze({
  died_in_forest: "The forest now remembers your death.",
  met_mysterious_girl: "A silver-eyed girl now exists in your memory.",
  heard_perfect_timeline: "You heard whispers of a perfect timeline.",
  found_memory_pearl: "The memory pearl has entered your soul's history.",
  earned_true_ending: "You discovered the true ending."
});

function getAdaptiveTextResolution(width = window.innerWidth, devicePixelRatio = window.devicePixelRatio || 1, role = "ui") {
  if (role === "story") {
    if (width <= 480) {
      return 1;
    }

    if (width <= 768) {
      return 1.1;
    }

    return Math.min(1.5, Math.max(1.2, devicePixelRatio));
  }

  if (width <= 480) {
    return 1;
  }

  if (width <= 768) {
    return Math.min(1.25, Math.max(1, devicePixelRatio));
  }

  return Math.min(2, Math.max(1.25, devicePixelRatio));
}

function getPosthogConfig() {
  return window.POSTHOG_CONFIG || {};
}

function isProductionAnalyticsEnabled() {
  const config = getPosthogConfig();
  const enabledHostnames = config.enabledHostnames || [POSTHOG_PRODUCTION_HOSTNAME];
  return Boolean(config.apiKey) && enabledHostnames.includes(window.location.hostname);
}

function getSessionDistinctId() {
  const existing = window.sessionStorage.getItem(SESSION_ANALYTICS_KEY);
  if (existing) {
    return existing;
  }

  const generated = `rl_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  window.sessionStorage.setItem(SESSION_ANALYTICS_KEY, generated);
  return generated;
}

function initializePostHog() {
  if (!isProductionAnalyticsEnabled() || window.posthog || window.__posthogLoading) {
    return;
  }

  const config = getPosthogConfig();
  window.__posthogLoading = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `${config.apiHost || "https://us.i.posthog.com"}/static/array.js`;
  script.onload = () => {
    window.__posthogLoading = false;
    if (!window.posthog?.init) {
      return;
    }

    window.posthog.init(config.apiKey, {
      api_host: config.apiHost || "https://us.i.posthog.com",
      ui_host: config.uiHost || "https://us.posthog.com",
      autocapture: !config.disableAutocapture,
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: "never",
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: { password: true },
        sampleRate: config.sessionRecordingSampleRate || 0.15
      },
      surveys: config.enableSurveys !== false,
      loaded: (posthog) => {
        posthog.register({ session_distinct_id: getSessionDistinctId() });
        analytics.flush();
      }
    });
  };
  script.onerror = () => {
    window.__posthogLoading = false;
  };

  document.head.appendChild(script);
}

const analytics = {
  initialized: false,
  pendingEvents: [],

  init() {
    if (this.initialized) {
      return;
    }

    this.initialized = true;
    initializePostHog();
  },

  isEnabled() {
    return Boolean(window.posthog?.capture) && isProductionAnalyticsEnabled();
  },

  track(name, props = {}) {
    if (!isProductionAnalyticsEnabled()) {
      return;
    }

    if (!window.posthog?.capture) {
      this.pendingEvents.push({ name, props });
      return;
    }

    window.posthog.capture(name, {
      session_distinct_id: getSessionDistinctId(),
      ...props
    });
  },

  flush() {
    if (!this.isEnabled() || !this.pendingEvents.length) {
      return;
    }

    const queued = [...this.pendingEvents];
    this.pendingEvents = [];
    queued.forEach(({ name, props }) => this.track(name, props));
  },

  buildAnalyticsContext(scene, extra = {}) {
    return {
      event_id: scene.currentEvent?.id || null,
      life_number: scene.lifeNumber,
      current_stats: { ...scene.currentStats },
      base_stats: { ...scene.baseStats },
      traits_count: Object.keys(scene.traits).length,
      trait_ids: Object.keys(scene.traits).sort(),
      flags_count: Object.keys(scene.flags).length,
      seen_before: scene.currentEventSeenBefore,
      is_mobile: window.matchMedia("(max-width: 768px)").matches,
      viewport_width: Math.round(window.innerWidth),
      ...extra
    };
  }
};

function slugifyAnalyticsLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

function getChoiceAnalyticsId(eventId, choice) {
  if (choice.analyticsId) {
    return choice.analyticsId;
  }

  return `${eventId || "unknown"}__${slugifyAnalyticsLabel(choice.text || choice.next || "choice")}`;
}

function getChoiceCategory(choice) {
  const source = `${choice.text || ""} ${choice.next || ""}`.toLowerCase();

  if (source.includes("forest") || source.includes("fight") || source.includes("duel") || source.includes("strike")) {
    return "combat";
  }

  if (source.includes("shrine") || source.includes("crypt") || source.includes("memory") || source.includes("mural")) {
    return "mystery";
  }

  if (source.includes("speech") || source.includes("talk") || source.includes("charm") || source.includes("peace")) {
    return "social";
  }

  if (source.includes("run") || source.includes("hide") || source.includes("escape")) {
    return "escape";
  }

  return "progression";
}

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
    this.traits = {};
    this.flags = {};
    this.seenEvents = {};
    this.endingState = { trueEndingUnlocked: false, trueEndingLife: null };

    this.currentEvent = null;
    this.currentEventSeenBefore = false;
    this.currentNarrativeText = "";
    this.typeEvent = null;
    this.storyCompleteCallback = null;
    this.currentTypingDelay = TYPEWRITER_DELAY;

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
    this.isTransitioning = false;
    this.ui = {};
    this.textNodes = [];
    this.runFlags = {};
    this.currentLifeTraitUnlocks = [];
    this.currentLifeDiscoveries = [];
    this.revealedHiddenChoices = {};
  }

  bootstrapScene() {
    this.loadingText.destroy();
    this.loadProgress();
    analytics.init();
    this.createObjects();
    this.bindInput();
    this.scale.on("resize", this.handleResize, this);
    this.handleResize(this.scale.gameSize);
    analytics.track("game_loaded", {
      is_returning_player: this.lifeNumber > 1 || Object.keys(this.seenEvents).length > 0,
      saved_life_number: this.lifeNumber,
      saved_traits_count: Object.keys(this.traits).length,
      saved_true_ending: this.endingState.trueEndingUnlocked
    });
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
      this.loadImageTexture("hero-portrait", "character_50.webp")
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

      this.traits = this.normalizeBooleanMap(save?.traits, Object.keys(SOUL_TRAITS));
      this.flags = this.normalizeBooleanMap(save?.flags, Object.keys(IMPORTANT_FLAG_TEXT));
      this.seenEvents = this.normalizeBooleanMap(save?.seenEvents);
      this.endingState = this.normalizeEndingState(save?.endingState, this.flags.earned_true_ending, this.lifeNumber);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  saveProgress() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        baseStats: this.baseStats,
        lifeNumber: this.lifeNumber,
        traits: this.traits,
        flags: this.flags,
        seenEvents: this.seenEvents,
        endingState: this.endingState
      })
    );
  }

  createObjects() {
    this.createBackgroundObjects();
    this.createHeaderObjects();
    this.createStoryObjects();
    this.createChoiceObjects();
    this.createFeedbackObjects();
    this.createAmbientTweens();
  }

  createBackgroundObjects() {
    this.background = this.add.image(0, 0, "bg-scene").setOrigin(0.5);
    this.backgroundShade = this.add.graphics();
    this.vignette = this.add.graphics();
    this.heroHalo = this.add.ellipse(0, 0, 100, 100, 0xd6d8ff, 0.12);
    this.heroGlow = this.add.ellipse(0, 0, 100, 40, 0x000000, 0.18);
    this.hero = this.add.image(0, 0, "hero-portrait").setOrigin(0.5, 1);
    this.hero.setDepth(2);
    this.heroHalo.setDepth(1);
    this.heroGlow.setDepth(1);
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

    this.traitText = this.createText(0, 0, "", {
      fontFamily: UI_FONT_STACK,
      color: "#9ea8bc"
    });
  }

  createStoryObjects() {
    this.storyPanelShadow = this.add.rectangle(0, 0, 100, 100, 0x000000, 0.18);
    this.storyPanel = this.add.rectangle(0, 0, 100, 100, 0x14111d, 0.94);
    this.storyPanel.setStrokeStyle(1, 0xffffff, 0.07);
    this.storyPanelShadow.setDepth(20);
    this.storyPanel.setDepth(21);

    this.storyText = this.createText(0, 0, "", {
      fontFamily: STORY_FONT_STACK,
      color: "#f7f3ea",
      lineSpacing: 8
    }, "story");
    this.storyText.setDepth(22);
    this.storyText.setStroke("#120f18", 1);
  }

  createChoiceObjects() {
    this.choiceHint = this.createText(0, 0, "DECISIONS", {
      fontFamily: UI_FONT_STACK,
      color: "#bba978"
    });
    this.choiceHint.setDepth(22);

    this.divider = this.add.rectangle(0, 0, 100, 1, 0xffffff, 0.08).setOrigin(0, 0.5);
    this.divider.setDepth(22);
    this.choiceContainer = this.add.container(0, 0);
    this.choiceContainer.setDepth(24);

    this.choiceMaskGraphics = this.make.graphics({ x: 0, y: 0, add: false });
    this.choiceMask = this.choiceMaskGraphics.createGeometryMask();
    this.choiceContainer.setMask(this.choiceMask);
  }

  createFeedbackObjects() {
    this.transitionVeil = this.add.rectangle(0, 0, 10, 10, FEEDBACK_COLORS.cool, 0).setOrigin(0, 0);
    this.transitionVeil.setDepth(60);

    this.statusBanner = this.createText(0, 0, "", {
      fontFamily: UI_FONT_STACK,
      fontSize: "16px",
      fontStyle: "bold",
      color: "#f8f1df",
      align: "center"
    }).setOrigin(0.5);
    this.statusBanner.setDepth(70);
    this.statusBanner.setAlpha(0);

    this.statEchoLayer = this.add.container(0, 0);
    this.statEchoLayer.setDepth(65);
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
    if (this.isTyping) {
      this.revealStoryText();
      return;
    }

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
    this.updateTextResolution(metrics.width);

    this.drawBackground();
    this.layoutScene(this.getCurrentNarrativeText());
    this.refreshCurrentView(true, { suppressEventFeedback: true });
  }

  buildResponsiveMetrics(gameSize) {
    const width = Math.round(gameSize.width);
    const height = Math.round(gameSize.height);
    const marginX = Phaser.Math.Clamp(width * 0.055, 18, 32);
    const safeTop = Phaser.Math.Clamp(height * 0.04, 20, 38);
    const safeBottom = Phaser.Math.Clamp(height * 0.025, 16, 28);
    const headerHeight = Phaser.Math.Clamp(height * 0.115, 84, 122);
    const panelWidth = width - marginX * 2;
    const panelPadding = Phaser.Math.Clamp(panelWidth * 0.065, 20, 30);
    const labelFont = Phaser.Math.Clamp(width * 0.03, 11, 13);
    const headerFont = Phaser.Math.Clamp(width * 0.043, 16, 20);
    const metaFont = Phaser.Math.Clamp(width * 0.034, 13, 15);
    const traitFont = Phaser.Math.Clamp(width * 0.029, 11, 13);
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
      traitFont,
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
    this.layoutFeedback();
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
      heroCenterY: heroAreaTop + heroAreaHeight * 0.92,
      heroScale: HERO_BASE_SCALE,
      heroHaloWidth: Phaser.Math.Clamp(width * 0.48, 160, 260),
      heroHaloHeight: Phaser.Math.Clamp(heroAreaHeight * 0.8, 150, 340)
    };
  }

  layoutHero() {
    const { heroCenterX, heroCenterY, heroScale, heroHaloWidth, heroHaloHeight, heroShadowWidth, heroShadowHeight } = this.ui;

    this.heroHalo.setPosition(this.round(heroCenterX), this.round(heroCenterY - this.hero.displayHeight * 0.38));
    this.heroHalo.setSize(heroHaloWidth, heroHaloHeight);

    this.heroGlow.setPosition(this.round(heroCenterX), this.round(heroCenterY + 8));
    this.heroGlow.setSize(heroShadowWidth, heroShadowHeight);

    this.hero.setPosition(this.round(heroCenterX), this.round(heroCenterY));
    this.hero.setScale(heroScale);
  }

  layoutHeader() {
    const { width, safeTop, headerHeight, panelWidth, marginX, panelPadding, headerFont, metaFont, traitFont, storyWidth } = this.ui;

    this.headerPanel.setPosition(this.round(width / 2), this.round(safeTop + headerHeight / 2));
    this.headerPanel.setSize(panelWidth, headerHeight);

    this.lifeText.setPosition(this.round(marginX + panelPadding), this.round(safeTop + 16));
    this.lifeText.setFontSize(headerFont);
    this.lifeText.setColor("#f5ecdd");

    this.statText.setPosition(this.round(marginX + panelPadding), this.round(safeTop + 18 + headerFont * 1.35));
    this.statText.setFontSize(metaFont);
    this.statText.setColor("#b6bdcf");

    this.traitText.setPosition(this.round(marginX + panelPadding), this.round(safeTop + 24 + headerFont * 1.35 + metaFont));
    this.traitText.setFontSize(traitFont);
    this.traitText.setColor("#98a3b7");
    this.traitText.setWordWrapWidth(storyWidth, true);
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

  layoutFeedback() {
    const { width, height, panelTop } = this.ui;
    this.transitionVeil.setSize(width, height);
    this.transitionVeil.setPosition(0, 0);
    this.statusBanner.setPosition(this.round(width / 2), this.round(Math.max(88, panelTop - 26)));
  }

  beginLife() {
    this.runFlags = {};
    this.currentLifeTraitUnlocks = [];
    this.currentLifeDiscoveries = [];
    this.revealedHiddenChoices = {};
    this.currentStats = this.applyEffects(this.baseStats, this.getTraitBonuses());
    analytics.track("life_started", analytics.buildAnalyticsContext(this, {
      trait_bonus_stats: this.getTraitBonuses(),
      starting_stats: { ...this.currentStats }
    }));
    this.showEvent("start");
  }

  showEvent(eventId, options = {}) {
    this.currentEvent = this.getEventById(eventId);
    this.currentEventSeenBefore = Boolean(this.seenEvents[eventId]);
    this.applyEventState(this.currentEvent);
    analytics.track("story_event_viewed", analytics.buildAnalyticsContext(this, {
      event_id: eventId,
      is_death_event: Boolean(this.currentEvent.death),
      is_true_ending: Boolean(this.currentEvent.trueEnding)
    }));
    this.refreshCurrentView(false, options);
  }

  getEventById(eventId) {
    return EVENTS.find((event) => event.id === eventId) || EVENTS[0];
  }

  getCurrentNarrativeText() {
    if (!this.currentEvent) {
      return "";
    }

    const eventText = this.resolveEventText(this.currentEvent);
    if (!this.currentEvent.death) {
      return eventText;
    }

    const carry = this.calculateCarryOver(this.currentStats);
    const traitBonuses = this.getTraitBonuses();
    const nextLifeStats = this.applyEffects(carry, traitBonuses);
    const lines = [
      eventText,
      "",
      `End: ${this.currentEvent.deathLabel}`,
      `Final stats: STR ${this.currentStats.strength}  INT ${this.currentStats.intellect}  CHA ${this.currentStats.charm}`,
      `Next base carry-over: STR ${carry.strength}  INT ${carry.intellect}  CHA ${carry.charm}`,
      `Trait bonuses: STR +${traitBonuses.strength}  INT +${traitBonuses.intellect}  CHA +${traitBonuses.charm}`,
      `Next life starts at: STR ${nextLifeStats.strength}  INT ${nextLifeStats.intellect}  CHA ${nextLifeStats.charm}`
    ];

    const newTraits = this.getCurrentLifeUnlockedTraitLabels();
    if (newTraits.length) {
      lines.push(`Soul trait unlocked: ${newTraits.join(", ")}`);
    }

    const memories = this.getCurrentLifeDiscoveryText();
    if (memories.length) {
      lines.push(`Memory gained: ${memories.join(" / ")}`);
    }

    if (this.currentEvent.trueEnding) {
      lines.push("The hidden perfect timeline has been discovered.");
    }

    return lines.join("\n");
  }

  refreshCurrentView(skipTyping = false, options = {}) {
    if (!this.currentEvent || !this.storyText) {
      return;
    }

    const narrativeText = this.getCurrentNarrativeText();
    this.currentNarrativeText = narrativeText;
    this.layoutScene(narrativeText);
    this.clearChoices();
    this.renderStats();
    this.animateNarrativeEntrance();

    const onComplete = this.currentEvent.death
      ? () => this.showDeathChoice()
      : () => this.showChoices(this.currentEvent.choices);

    this.setStoryText(narrativeText, skipTyping, onComplete);
    if (!options.suppressEventFeedback) {
      this.playEventFeedback(this.currentEvent);
    }
  }

  renderStats() {
    this.lifeText.setText(this.endingState.trueEndingUnlocked ? `Life ${this.lifeNumber}  |  True Ending Found` : `Life ${this.lifeNumber}`);
    this.statText.setText(
      `STR ${this.currentStats.strength}   INT ${this.currentStats.intellect}   CHA ${this.currentStats.charm}`
    );
    this.traitText.setText(`Traits: ${this.getTraitSummaryText()}`);
  }

  setStoryText(text, skipTyping, onComplete) {
    this.stopTyping();
    this.storyCompleteCallback = onComplete || null;
    this.currentTypingDelay = this.currentEventSeenBefore ? FAST_TYPEWRITER_DELAY : TYPEWRITER_DELAY;

    if (skipTyping) {
      this.completeStoryText(text);
      return;
    }

    this.isTyping = true;
    this.storyText.setText("");
    let index = 0;

    this.typeEvent = this.time.addEvent({
      delay: this.currentTypingDelay,
      repeat: Math.max(text.length - 1, 0),
      callback: () => {
        index += 1;
        this.storyText.setText(text.slice(0, index));
        if (index >= text.length) {
          this.completeStoryText(text);
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

  revealStoryText() {
    if (!this.isTyping) {
      return;
    }

    analytics.track("story_text_skipped", analytics.buildAnalyticsContext(this));
    this.stopTyping();
    this.completeStoryText(this.currentNarrativeText);
  }

  completeStoryText(text) {
    this.isTyping = false;
    this.typeEvent = null;
    this.storyText.setText(text);
    this.markEventSeen(this.currentEvent?.id);

    const callback = this.storyCompleteCallback;
    this.storyCompleteCallback = null;
    if (callback) {
      callback();
    }
  }

  markEventSeen(eventId) {
    if (!eventId || this.seenEvents[eventId]) {
      return;
    }

    this.seenEvents[eventId] = true;
    this.saveProgress();
  }

  clearChoices() {
    this.resetChoicePointerState();
    this.choiceNodes.forEach((node) => node.destroy());
    this.choiceNodes = [];
    this.choiceScrollY = 0;
    this.choiceContentHeight = 0;
    this.choiceContainer.alpha = 1;
    this.applyChoiceScroll();
  }

  showChoices(choices) {
    let offsetY = 0;
    let availableCount = 0;
    let lockedCount = 0;
    let hiddenAvailableCount = 0;

    choices.forEach((choice) => {
      const available = this.canChoose(choice);
      if (choice.hiddenWhenLocked && !available) {
        return;
      }

       if (available) {
        availableCount += 1;
      } else {
        lockedCount += 1;
      }

      if (choice.hiddenWhenLocked && available) {
        hiddenAvailableCount += 1;
        this.trackHiddenPathReveal(choice);
      }

      const button = this.createChoiceCard({
        y: offsetY,
        title: this.getChoiceLabel(choice, available),
        available,
        actionLabel: available ? "Choose" : "Locked",
        subtitle: available ? null : `Requires ${this.formatRequirement(choice)}`,
        onPress: () => this.pickChoice(choice)
      });

      this.choiceContainer.add(button);
      this.choiceNodes.push(button);
      offsetY += button.cardHeight + CHOICE_GAP;
    });

    this.choiceContentHeight = Math.max(0, offsetY - CHOICE_GAP);
    this.applyChoiceScroll();
    this.animateChoicesEntrance();
    analytics.track("choice_list_viewed", analytics.buildAnalyticsContext(this, {
      choices_total: this.choiceNodes.length,
      choices_available: availableCount,
      choices_locked: lockedCount,
      hidden_choices_available: hiddenAvailableCount
    }));
  }

  showDeathChoice() {
    const button = this.createChoiceCard({
      y: 0,
      title: this.currentEvent?.trueEnding ? "Return to the wheel" : "Begin the next life",
      available: true,
      actionLabel: this.currentEvent?.trueEnding ? "Reawaken" : "Reincarnate",
      subtitle: this.currentEvent?.trueEnding
        ? "The perfect timeline is found, but the wheel still turns if you ask it to."
        : "Carry your strongest fragments into another run.",
      onPress: () => this.reincarnate()
    });

    this.choiceContainer.add(button);
    this.choiceNodes.push(button);

    const feedbackButton = this.createFeedbackChoice(button.cardHeight + CHOICE_GAP);
    if (feedbackButton) {
      this.choiceContainer.add(feedbackButton);
      this.choiceNodes.push(feedbackButton);
    }

    this.choiceContentHeight = this.choiceNodes.reduce((height, node, index) => {
      const gap = index > 0 ? CHOICE_GAP : 0;
      return height + node.cardHeight + gap;
    }, 0);
    this.applyChoiceScroll();
    this.animateChoicesEntrance();
  }

  createFeedbackChoice(offsetY) {
    const feedbackUrl = getPosthogConfig().feedbackUrl;
    if (!feedbackUrl) {
      return null;
    }

    return this.createChoiceCard({
      y: offsetY,
      title: this.currentEvent?.trueEnding ? "Share feedback about the ending" : "Send quick feedback",
      available: true,
      actionLabel: "Open",
      subtitle: "Tell me where the run felt confusing, slow, or memorable.",
      onPress: () => {
        analytics.track("feedback_link_opened", analytics.buildAnalyticsContext(this, {
          target: feedbackUrl,
          is_true_ending: Boolean(this.currentEvent?.trueEnding)
        }));
        window.open(feedbackUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  trackHiddenPathReveal(choice) {
    const choiceId = getChoiceAnalyticsId(this.currentEvent?.id, choice);
    if (this.revealedHiddenChoices[choiceId]) {
      return;
    }

    this.revealedHiddenChoices[choiceId] = true;
    analytics.track("hidden_path_revealed", analytics.buildAnalyticsContext(this, {
      choice_id: choiceId,
      next_event_id: choice.next,
      unlock_source: "requirements_met"
    }));
  }

  getChoiceLabel(choice, available) {
    if (available) {
      return choice.text;
    }

    return `${choice.text} [need ${this.formatRequirement(choice)}]`;
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
    const stats = req?.reqStats || req?.req;

    if (stats?.strength) {
      parts.push(`STR ${stats.strength}`);
    }
    if (stats?.intellect) {
      parts.push(`INT ${stats.intellect}`);
    }
    if (stats?.charm) {
      parts.push(`CHA ${stats.charm}`);
    }
    if (req?.reqTraits?.length) {
      parts.push(req.reqTraits.map((traitId) => SOUL_TRAITS[traitId]?.label || traitId).join(" + "));
    }
    if (req?.reqFlags?.length) {
      parts.push(req.reqFlags.map((flagId) => IMPORTANT_FLAG_TEXT[flagId] || flagId).join(" + "));
    }
    if (req?.reqRunFlags?.length) {
      parts.push("a matching life path");
    }
    if (req?.reqAny?.length) {
      parts.push("one hidden memory condition");
    }
    return parts.join(", ");
  }

  canChoose(choice) {
    return this.matchesRequirements(choice);
  }

  pickChoice(choice) {
    if (!this.canChoose(choice) || this.isTyping || this.isDraggingChoices || this.isTransitioning) {
      return;
    }

    const previousStats = { ...this.currentStats };
    const nextStats = this.applyEffects(this.currentStats, choice.effects || {});
    const statDelta = this.getStatDelta(previousStats, nextStats);

    this.currentStats = nextStats;
    analytics.track("choice_selected", analytics.buildAnalyticsContext(this, {
      choice_id: getChoiceAnalyticsId(this.currentEvent?.id, choice),
      choice_text: choice.text,
      next_event_id: choice.next,
      choice_category: getChoiceCategory(choice),
      is_hidden_path: Boolean(choice.hiddenWhenLocked)
    }));
    if (choice.hiddenWhenLocked) {
      analytics.track("hidden_path_taken", analytics.buildAnalyticsContext(this, {
        choice_id: getChoiceAnalyticsId(this.currentEvent?.id, choice),
        next_event_id: choice.next
      }));
    }
    this.applyPersistentFlags(choice.setFlags);
    this.applyRunFlags(choice.setRunFlags);
    this.unlockTraits(choice.unlockTraits);
    this.renderStats();
    this.playChoiceFeedback(statDelta);
    this.transitionToEvent(choice.next);
  }

  applyEffects(stats, effects) {
    return {
      strength: Math.max(1, stats.strength + (effects.strength || 0)),
      intellect: Math.max(1, stats.intellect + (effects.intellect || 0)),
      charm: Math.max(1, stats.charm + (effects.charm || 0))
    };
  }

  normalizeBooleanMap(value, allowedKeys = null) {
    if (!value || typeof value !== "object") {
      return {};
    }

    return Object.entries(value).reduce((result, [key, flag]) => {
      if (allowedKeys && !allowedKeys.includes(key)) {
        return result;
      }

      if (flag) {
        result[key] = true;
      }
      return result;
    }, {});
  }

  normalizeEndingState(value, earnedTrueEnding, currentLifeNumber) {
    if (!value || typeof value !== "object") {
      return {
        trueEndingUnlocked: Boolean(earnedTrueEnding),
        trueEndingLife: earnedTrueEnding ? currentLifeNumber : null
      };
    }

    return {
      trueEndingUnlocked: Boolean(value.trueEndingUnlocked || earnedTrueEnding),
      trueEndingLife: Number.isInteger(value.trueEndingLife) ? value.trueEndingLife : (earnedTrueEnding ? currentLifeNumber : null)
    };
  }

  resolveEventText(event) {
    if (!event) {
      return "";
    }

    return typeof event.text === "function" ? event.text(this) : event.text;
  }

  applyEventState(event) {
    if (!event) {
      return;
    }

    this.applyPersistentFlags(event.setFlags);
    this.applyRunFlags(event.setRunFlags);

    if (this.matchesRequirements(event)) {
      this.unlockTraits(event.unlockTraits);
    }

    if (event.trueEnding) {
      this.endingState.trueEndingUnlocked = true;
      if (!this.endingState.trueEndingLife) {
        this.endingState.trueEndingLife = this.lifeNumber;
      }
      analytics.track("true_ending_reached", analytics.buildAnalyticsContext(this, {
        seen_events_count: Object.keys(this.seenEvents).length
      }));
      this.saveProgress();
    }
  }

  applyPersistentFlags(flagMap) {
    if (!flagMap) {
      return;
    }

    let changed = false;

    Object.entries(flagMap).forEach(([flagId, nextValue]) => {
      if (!nextValue) {
        return;
      }

      if (!this.flags[flagId]) {
        this.flags[flagId] = true;
        changed = true;

        const discoveryText = IMPORTANT_FLAG_TEXT[flagId];
        if (discoveryText && !this.currentLifeDiscoveries.includes(discoveryText)) {
          this.currentLifeDiscoveries.push(discoveryText);
        }

        if (IMPORTANT_ANALYTICS_FLAGS.includes(flagId)) {
          analytics.track("world_flag_unlocked", analytics.buildAnalyticsContext(this, {
            flag_id: flagId,
            source_event_id: this.currentEvent?.id || null
          }));
        }
      }
    });

    if (changed) {
      this.saveProgress();
    }
  }

  applyRunFlags(flagMap) {
    if (!flagMap) {
      return;
    }

    Object.entries(flagMap).forEach(([flagId, nextValue]) => {
      if (nextValue) {
        this.runFlags[flagId] = true;
      }
    });
  }

  unlockTraits(traitIds = []) {
    if (!traitIds?.length) {
      return;
    }

    let changed = false;

    traitIds.forEach((traitId) => {
      if (!SOUL_TRAITS[traitId] || this.traits[traitId]) {
        return;
      }

      this.traits[traitId] = true;
      changed = true;

      if (!this.currentLifeTraitUnlocks.includes(traitId)) {
        this.currentLifeTraitUnlocks.push(traitId);
      }

      analytics.track("trait_unlocked", analytics.buildAnalyticsContext(this, {
        trait_id: traitId,
        source_event_id: this.currentEvent?.id || null
      }));
    });

    if (changed) {
      this.saveProgress();
    }
  }

  getTraitBonuses() {
    return Object.keys(this.traits).reduce((bonuses, traitId) => {
      const trait = SOUL_TRAITS[traitId];
      if (!trait?.bonuses) {
        return bonuses;
      }

      return {
        strength: bonuses.strength + (trait.bonuses.strength || 0),
        intellect: bonuses.intellect + (trait.bonuses.intellect || 0),
        charm: bonuses.charm + (trait.bonuses.charm || 0)
      };
    }, { strength: 0, intellect: 0, charm: 0 });
  }

  matchesRequirements(source) {
    if (!source) {
      return true;
    }

    const stats = source.reqStats || source.req;
    if (stats && !Object.entries(stats).every(([stat, value]) => this.currentStats[stat] >= value)) {
      return false;
    }

    if (source.reqTraits && !source.reqTraits.every((traitId) => this.traits[traitId])) {
      return false;
    }

    if (source.reqFlags && !source.reqFlags.every((flagId) => this.flags[flagId])) {
      return false;
    }

    if (source.reqRunFlags && !source.reqRunFlags.every((flagId) => this.runFlags[flagId])) {
      return false;
    }

    if (source.reqAny?.length) {
      const anyMatch = source.reqAny.some((option) => this.matchesRequirements(option));
      if (!anyMatch) {
        return false;
      }
    }

    return true;
  }

  getCurrentLifeUnlockedTraitLabels() {
    return this.currentLifeTraitUnlocks.map((traitId) => SOUL_TRAITS[traitId]?.label || traitId);
  }

  getCurrentLifeDiscoveryText() {
    return this.currentLifeDiscoveries;
  }

  getTraitSummaryText() {
    const labels = Object.keys(this.traits).map((traitId) => SOUL_TRAITS[traitId]?.label || traitId);
    return labels.length ? labels.join(", ") : "None yet";
  }

  calculateCarryOver(stats) {
    return {
      strength: Math.max(1, Math.floor(stats.strength * 0.5)),
      intellect: Math.max(1, Math.floor(stats.intellect * 0.5)),
      charm: Math.max(1, Math.floor(stats.charm * 0.5))
    };
  }

  reincarnate() {
    const nextBaseStats = this.calculateCarryOver(this.currentStats);
    analytics.track("life_reincarnated", analytics.buildAnalyticsContext(this, {
      from_life_number: this.lifeNumber,
      to_life_number: this.lifeNumber + 1,
      next_base_stats: nextBaseStats
    }));
    this.baseStats = nextBaseStats;
    this.lifeNumber += 1;
    this.saveProgress();
    this.playReincarnationFeedback(() => this.beginLife());
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

  createText(x, y, value, style, role = "ui") {
    const text = this.add.text(x, y, value, style);
    text.textRole = role;
    text.setResolution(getAdaptiveTextResolution(this.scale.gameSize.width, window.devicePixelRatio || 1, role));
    this.textNodes.push(text);
    return text;
  }

  updateTextResolution(width) {
    this.textNodes.forEach((text) => {
      if (!text || !text.scene) {
        return;
      }

      const resolution = getAdaptiveTextResolution(width, window.devicePixelRatio || 1, text.textRole || "ui");
      text.setResolution(resolution);
      text.updateText();
    });
  }

  animateNarrativeEntrance() {
    this.storyPanel.alpha = 0.94;
    this.storyPanelShadow.alpha = 0.1;
    this.storyText.alpha = 0.3;
    this.choiceHint.alpha = 0.2;
    this.divider.alpha = 0.04;

    this.tweens.add({
      targets: this.storyText,
      alpha: 1,
      duration: VIEW_FADE_DURATION
    });

    this.tweens.add({
      targets: this.storyPanelShadow,
      alpha: 1,
      duration: VIEW_FADE_DURATION
    });

    this.tweens.add({
      targets: this.choiceHint,
      alpha: 0.78,
      duration: VIEW_FADE_DURATION
    });

    this.tweens.add({
      targets: this.divider,
      alpha: 0.08,
      duration: VIEW_FADE_DURATION
    });
  }

  animateChoicesEntrance() {
    const baseY = this.ui.choicesY - this.choiceScrollY;
    this.choiceContainer.alpha = 0;
    this.choiceContainer.y = baseY + 10;

    this.tweens.add({
      targets: this.choiceContainer,
      alpha: 1,
      y: baseY,
      duration: VIEW_FADE_DURATION,
      ease: "Quad.out"
    });
  }

  playChoiceFeedback(statDelta) {
    this.pulseHeroHalo(FEEDBACK_COLORS.warm, 0.2);
    this.pulsePanelGlow(FEEDBACK_COLORS.warm, 0.12);
    this.playVeilPulse(FEEDBACK_COLORS.warm, 0.06, 180);

    if (this.hasStatDelta(statDelta)) {
      this.playStatChangeFeedback(statDelta);
    }
  }

  playStatChangeFeedback(statDelta) {
    const label = this.formatStatDelta(statDelta);
    if (!label) {
      return;
    }

    const echo = this.createText(this.lifeText.x, this.statText.y - 14, label, {
      fontFamily: UI_FONT_STACK,
      fontSize: `${this.ui.metaFont}px`,
      fontStyle: "bold",
      color: "#f4dfb9"
    });
    echo.setDepth(66);
    this.statEchoLayer.add(echo);

    this.tweens.add({
      targets: echo,
      y: echo.y - 22,
      alpha: 0,
      duration: 900,
      ease: "Sine.out",
      onComplete: () => echo.destroy()
    });

    this.tweens.add({
      targets: [this.lifeText, this.statText],
      scaleX: 1.035,
      scaleY: 1.035,
      duration: 130,
      yoyo: true,
      ease: "Quad.out"
    });
  }

  playEventFeedback(event) {
    if (!event?.death) {
      return;
    }

    analytics.track("death_reached", analytics.buildAnalyticsContext(this, {
      death_label: event.deathLabel,
      final_stats: { ...this.currentStats },
      next_base_stats: this.calculateCarryOver(this.currentStats),
      trait_unlocks_this_life: [...this.currentLifeTraitUnlocks],
      discoveries_this_life: [...this.currentLifeDiscoveries]
    }));

    this.pulseHeroHalo(FEEDBACK_COLORS.death, 0.24);
    this.pulsePanelGlow(FEEDBACK_COLORS.death, 0.14);
    this.playVeilPulse(FEEDBACK_COLORS.death, 0.16, 520);
    this.showStatusBanner(
      event.trueEnding ? "True Ending Discovered" : `Life ${this.lifeNumber} Ends`,
      event.trueEnding ? "#f2df9f" : "#e9c6c8"
    );
  }

  playReincarnationFeedback(onComplete) {
    this.isTransitioning = true;
    this.pulseHeroHalo(FEEDBACK_COLORS.rebirth, 0.28);
    this.playVeilPulse(FEEDBACK_COLORS.rebirth, 0.2, REINCARNATE_DELAY);
    this.showStatusBanner(`Life ${this.lifeNumber} Rekindled`, "#f5ebc8", REINCARNATE_DELAY);

    this.tweens.add({
      targets: [this.hero, this.storyPanel, this.choiceContainer],
      alpha: 0.78,
      duration: 180,
      yoyo: true,
      ease: "Sine.inOut"
    });

    this.time.delayedCall(REINCARNATE_DELAY, () => {
      this.isTransitioning = false;
      if (onComplete) {
        onComplete();
      }
    });
  }

  transitionToEvent(eventId) {
    this.isTransitioning = true;

    this.tweens.add({
      targets: [this.storyText, this.choiceContainer, this.choiceHint, this.divider],
      alpha: 0.45,
      duration: 110,
      yoyo: true,
      ease: "Sine.inOut"
    });

    this.time.delayedCall(CHOICE_TRANSITION_DELAY, () => {
      this.isTransitioning = false;
      this.showEvent(eventId);
    });
  }

  showStatusBanner(text, color = "#f8f1df", hold = 1200) {
    this.statusBanner.setText(text);
    this.statusBanner.setColor(color);
    this.statusBanner.setAlpha(0);
    this.statusBanner.setScale(0.96);
    this.statusBanner.setY(this.round(Math.max(88, this.ui.panelTop - 26)));

    this.tweens.add({
      targets: this.statusBanner,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 220,
      ease: "Quad.out",
      yoyo: false
    });

    this.time.delayedCall(hold, () => {
      this.tweens.add({
        targets: this.statusBanner,
        alpha: 0,
        y: this.statusBanner.y - 8,
        duration: 340,
        ease: "Sine.out",
        onComplete: () => {
          this.statusBanner.y = this.round(Math.max(88, this.ui.panelTop - 26));
        }
      });
    });
  }

  playVeilPulse(color, peakAlpha, duration) {
    this.transitionVeil.setFillStyle(color, peakAlpha);
    this.transitionVeil.alpha = 0;

    this.tweens.add({
      targets: this.transitionVeil,
      alpha: 1,
      duration: duration * 0.35,
      yoyo: true,
      ease: "Sine.inOut"
    });
  }

  pulseHeroHalo(color, alpha) {
    const originalFill = this.heroHalo.fillColor;
    const originalAlpha = this.heroHalo.fillAlpha;
    this.heroHalo.setFillStyle(color, alpha);

    this.tweens.add({
      targets: this.heroHalo,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 220,
      yoyo: true,
      ease: "Sine.out",
      onComplete: () => {
        this.heroHalo.setScale(1);
        this.heroHalo.setFillStyle(originalFill, originalAlpha);
      }
    });
  }

  pulsePanelGlow(color, alpha) {
    this.storyPanel.setStrokeStyle(1, color, alpha);
    this.tweens.add({
      targets: this.storyPanel,
      scaleX: 1.005,
      scaleY: 1.005,
      duration: 160,
      yoyo: true,
      ease: "Sine.inOut",
      onComplete: () => {
        this.storyPanel.setScale(1);
        this.storyPanel.setStrokeStyle(1, 0xffffff, 0.07);
      }
    });
  }

  getStatDelta(previousStats, nextStats) {
    return {
      strength: nextStats.strength - previousStats.strength,
      intellect: nextStats.intellect - previousStats.intellect,
      charm: nextStats.charm - previousStats.charm
    };
  }

  hasStatDelta(statDelta) {
    return Object.values(statDelta).some((value) => value !== 0);
  }

  formatStatDelta(statDelta) {
    const labels = [];
    if (statDelta.strength) {
      labels.push(`${statDelta.strength > 0 ? "+" : ""}${statDelta.strength} STR`);
    }
    if (statDelta.intellect) {
      labels.push(`${statDelta.intellect > 0 ? "+" : ""}${statDelta.intellect} INT`);
    }
    if (statDelta.charm) {
      labels.push(`${statDelta.charm > 0 ? "+" : ""}${statDelta.charm} CHA`);
    }
    return labels.join("   ");
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
