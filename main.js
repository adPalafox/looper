const STORAGE_KEY = "rekindled-loop-save";
const GAME_WIDTH = 432;
const GAME_HEIGHT = 768;

class LoopScene extends Phaser.Scene {
  constructor() {
    super({ key: "LoopScene" });
    this.baseStats = { strength: 1, intellect: 1, charm: 1 };
    this.currentStats = { strength: 1, intellect: 1, charm: 1 };
    this.lifeNumber = 1;
    this.currentEventId = "start";
    this.currentEvent = null;
    this.choiceNodes = [];
    this.isTyping = false;
  }

  preload() {
    this.load.image("background", this.buildBackgroundDataUrl());
    this.load.spritesheet("hero", this.buildHeroSheetDataUrl(), {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  create() {
    this.loadProgress();
    this.createAnimations();
    this.createLayout();
    this.beginLife();
  }

  update() {}

  buildBackgroundDataUrl() {
    const canvas = document.createElement("canvas");
    canvas.width = 216;
    canvas.height = 384;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#1c1330";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#342454";
    ctx.fillRect(0, 0, canvas.width, 140);

    ctx.fillStyle = "#4f3a73";
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(i * 28, 110 - (i % 2) * 14, 26, 40 + (i % 3) * 12);
    }

    ctx.fillStyle = "#7f5aa5";
    ctx.fillRect(0, 140, canvas.width, 50);

    ctx.fillStyle = "#24351c";
    ctx.fillRect(0, 190, canvas.width, 84);

    ctx.fillStyle = "#385629";
    for (let y = 190; y < 274; y += 8) {
      for (let x = 0; x < canvas.width; x += 8) {
        if ((x + y) % 16 === 0) {
          ctx.fillRect(x, y, 8, 8);
        }
      }
    }

    ctx.fillStyle = "#182113";
    ctx.fillRect(0, 274, canvas.width, 110);

    ctx.fillStyle = "#f2e8a0";
    const stars = [
      [18, 22], [48, 36], [96, 18], [132, 42], [170, 26], [194, 52]
    ];
    stars.forEach(([x, y]) => ctx.fillRect(x, y, 3, 3));

    ctx.fillStyle = "#ceb16d";
    ctx.fillRect(156, 54, 18, 18);
    ctx.fillStyle = "#e7d6a0";
    ctx.fillRect(162, 60, 6, 6);

    ctx.fillStyle = "#6e4f38";
    ctx.fillRect(28, 150, 46, 42);
    ctx.fillRect(144, 154, 54, 38);
    ctx.fillStyle = "#b88956";
    ctx.fillRect(24, 144, 54, 12);
    ctx.fillRect(140, 146, 62, 12);
    ctx.fillStyle = "#f6d28b";
    ctx.fillRect(45, 170, 10, 12);
    ctx.fillRect(166, 168, 10, 12);

    return canvas.toDataURL("image/png");
  }

  buildHeroSheetDataUrl() {
    const frameSize = 32;
    const frames = 4;
    const canvas = document.createElement("canvas");
    canvas.width = frameSize * frames;
    canvas.height = frameSize;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    const drawFrame = (frame) => {
      const ox = frame * frameSize;
      const bodyOffset = frame % 2 === 0 ? 0 : 1;
      const armOffset = frame === 1 ? 1 : frame === 3 ? -1 : 0;

      ctx.fillStyle = "#000000";
      ctx.fillRect(ox + 10, 2, 12, 2);

      ctx.fillStyle = "#f4c89a";
      ctx.fillRect(ox + 10, 4, 12, 10);

      ctx.fillStyle = "#3a2942";
      ctx.fillRect(ox + 8, 2, 16, 4);
      ctx.fillRect(ox + 8, 6, 2, 4);
      ctx.fillRect(ox + 22, 6, 2, 4);

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(ox + 13, 8, 2, 2);
      ctx.fillRect(ox + 17, 8, 2, 2);
      ctx.fillStyle = "#1f1724";
      ctx.fillRect(ox + 14, 8, 1, 1);
      ctx.fillRect(ox + 18, 8, 1, 1);

      ctx.fillStyle = "#8d5ea8";
      ctx.fillRect(ox + 9, 14, 14, 10);
      ctx.fillRect(ox + 11, 24, 4, 6);
      ctx.fillRect(ox + 17, 24, 4, 6);

      ctx.fillStyle = "#d9b281";
      ctx.fillRect(ox + 8 + armOffset, 15, 2, 8);
      ctx.fillRect(ox + 22 + armOffset, 15, 2, 8);

      ctx.fillStyle = "#4b6ea8";
      ctx.fillRect(ox + 11, 30 - bodyOffset, 4, 2);
      ctx.fillRect(ox + 17, 30 + bodyOffset - 2, 4, 2);
    };

    for (let i = 0; i < frames; i += 1) {
      drawFrame(i);
    }

    return canvas.toDataURL("image/png");
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
    } catch (error) {
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
        frames: this.anims.generateFrameNumbers("hero", { start: 0, end: 3 }),
        frameRate: 5,
        repeat: -1
      });
    }
  }

  createLayout() {
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, "background")
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0);

    this.add.rectangle(GAME_WIDTH / 2, 508, 280, 180, 0x000000, 0.18)
      .setStrokeStyle(2, 0xe2d6a8, 0.15);

    this.hero = this.add.sprite(GAME_WIDTH / 2, 464, "hero")
      .setScale(4)
      .play("hero-idle");

    this.tweens.add({
      targets: this.hero,
      y: 460,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.headerPanel = this.add.rectangle(GAME_WIDTH / 2, 60, 388, 84, 0x120d1d, 0.88)
      .setStrokeStyle(3, 0xc8a96b, 0.8);

    this.lifeText = this.add.text(32, 28, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "18px",
      color: "#f7e6b6"
    });

    this.statText = this.add.text(32, 54, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "18px",
      color: "#ffffff"
    });

    this.storyPanel = this.add.rectangle(GAME_WIDTH / 2, 622, 388, 260, 0x120d1d, 0.94)
      .setStrokeStyle(3, 0xc8a96b, 0.8);

    this.storyText = this.add.text(28, 506, "", {
      fontFamily: '"Courier New", monospace',
      fontSize: "20px",
      color: "#f8f4ea",
      wordWrap: { width: 376, useAdvancedWrap: true },
      lineSpacing: 8
    });

    this.choiceHint = this.add.text(28, 628, "Choose your path:", {
      fontFamily: '"Courier New", monospace',
      fontSize: "18px",
      color: "#e5ca8b"
    });
  }

  beginLife() {
    this.currentStats = { ...this.baseStats };
    this.currentEventId = "start";
    this.renderStats();
    this.showEvent(this.currentEventId);
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
    this.currentEventId = eventId;
    this.currentEvent = this.getEventById(eventId);
    this.clearChoices();
    this.renderStats();
    this.typeStory(this.currentEvent.text, () => {
      if (this.currentEvent.death) {
        this.showDeathChoice();
      } else {
        this.showChoices(this.currentEvent.choices);
      }
    });
  }

  typeStory(text, onComplete) {
    if (this.typeEvent) {
      this.typeEvent.remove(false);
    }

    this.isTyping = true;
    this.storyText.setText("");
    let index = 0;

    this.typeEvent = this.time.addEvent({
      delay: 16,
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

    if (text.length === 0) {
      this.isTyping = false;
      if (onComplete) {
        onComplete();
      }
    }
  }

  clearChoices() {
    this.choiceNodes.forEach((node) => node.destroy());
    this.choiceNodes = [];
  }

  showChoices(choices) {
    const startY = 662;
    const spacing = 48;

    choices.forEach((choice, index) => {
      const available = this.canChoose(choice);
      const label = available ? choice.text : `${choice.text} [need ${this.formatRequirement(choice.req)}]`;
      const color = available ? "#9bf6b1" : "#f29191";

      const button = this.add.text(28, startY + index * spacing, label, {
        fontFamily: '"Courier New", monospace',
        fontSize: "18px",
        color,
        backgroundColor: available ? "#223122" : "#351d1d",
        padding: { left: 10, right: 10, top: 8, bottom: 8 },
        wordWrap: { width: 376, useAdvancedWrap: true }
      });

      if (available) {
        button.setInteractive({ useHandCursor: true });
        button.on("pointerover", () => button.setBackgroundColor("#304630"));
        button.on("pointerout", () => button.setBackgroundColor("#223122"));
        button.on("pointerdown", () => this.pickChoice(choice));
      } else {
        button.setAlpha(0.88);
      }

      this.choiceNodes.push(button);
    });
  }

  showDeathChoice() {
    const carry = this.calculateCarryOver(this.currentStats);
    const summary = [
      "",
      `End: ${this.currentEvent.deathLabel}`,
      `Carry over -> STR ${carry.strength}  INT ${carry.intellect}  CHA ${carry.charm}`
    ].join("\n");

    this.storyText.setText(`${this.currentEvent.text}${summary}`);

    const button = this.add.text(28, 690, "Begin the next life", {
      fontFamily: '"Courier New", monospace',
      fontSize: "19px",
      color: "#9bf6b1",
      backgroundColor: "#223122",
      padding: { left: 10, right: 10, top: 10, bottom: 10 }
    });

    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => button.setBackgroundColor("#304630"));
    button.on("pointerout", () => button.setBackgroundColor("#223122"));
    button.on("pointerdown", () => this.reincarnate());
    this.choiceNodes.push(button);
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
    if (!this.canChoose(choice) || this.isTyping) {
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
}

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: "game-container",
  backgroundColor: "#120d1d",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [LoopScene]
};

new Phaser.Game(config);
