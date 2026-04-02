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
    this.createBackgroundTexture();
    this.createHeroTextures();
  }

  create() {
    this.loadProgress();
    this.createAnimations();
    this.createLayout();
    this.beginLife();
  }

  update() {}

  createBackgroundTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });

    graphics.fillStyle(0x1c1330, 1);
    graphics.fillRect(0, 0, 216, 384);

    graphics.fillStyle(0x342454, 1);
    graphics.fillRect(0, 0, 216, 140);

    graphics.fillStyle(0x4f3a73, 1);
    for (let i = 0; i < 8; i += 1) {
      graphics.fillRect(i * 28, 110 - (i % 2) * 14, 26, 40 + (i % 3) * 12);
    }

    graphics.fillStyle(0x7f5aa5, 1);
    graphics.fillRect(0, 140, 216, 50);

    graphics.fillStyle(0x24351c, 1);
    graphics.fillRect(0, 190, 216, 84);

    graphics.fillStyle(0x385629, 1);
    for (let y = 190; y < 274; y += 8) {
      for (let x = 0; x < 216; x += 8) {
        if ((x + y) % 16 === 0) {
          graphics.fillRect(x, y, 8, 8);
        }
      }
    }

    graphics.fillStyle(0x182113, 1);
    graphics.fillRect(0, 274, 216, 110);

    graphics.fillStyle(0xf2e8a0, 1);
    const stars = [
      [18, 22], [48, 36], [96, 18], [132, 42], [170, 26], [194, 52]
    ];
    stars.forEach(([x, y]) => graphics.fillRect(x, y, 3, 3));

    graphics.fillStyle(0xceb16d, 1);
    graphics.fillRect(156, 54, 18, 18);
    graphics.fillStyle(0xe7d6a0, 1);
    graphics.fillRect(162, 60, 6, 6);

    graphics.fillStyle(0x6e4f38, 1);
    graphics.fillRect(28, 150, 46, 42);
    graphics.fillRect(144, 154, 54, 38);
    graphics.fillStyle(0xb88956, 1);
    graphics.fillRect(24, 144, 54, 12);
    graphics.fillRect(140, 146, 62, 12);
    graphics.fillStyle(0xf6d28b, 1);
    graphics.fillRect(45, 170, 10, 12);
    graphics.fillRect(166, 168, 10, 12);

    graphics.generateTexture("background", 216, 384);
    graphics.destroy();
  }

  createHeroTextures() {
    for (let frame = 0; frame < 4; frame += 1) {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      const bodyOffset = frame % 2 === 0 ? 0 : 1;
      const armOffset = frame === 1 ? 1 : frame === 3 ? -1 : 0;

      graphics.fillStyle(0x000000, 1);
      graphics.fillRect(10, 2, 12, 2);

      graphics.fillStyle(0xf4c89a, 1);
      graphics.fillRect(10, 4, 12, 10);

      graphics.fillStyle(0x3a2942, 1);
      graphics.fillRect(8, 2, 16, 4);
      graphics.fillRect(8, 6, 2, 4);
      graphics.fillRect(22, 6, 2, 4);

      graphics.fillStyle(0xffffff, 1);
      graphics.fillRect(13, 8, 2, 2);
      graphics.fillRect(17, 8, 2, 2);
      graphics.fillStyle(0x1f1724, 1);
      graphics.fillRect(14, 8, 1, 1);
      graphics.fillRect(18, 8, 1, 1);

      graphics.fillStyle(0x8d5ea8, 1);
      graphics.fillRect(9, 14, 14, 10);
      graphics.fillRect(11, 24, 4, 6);
      graphics.fillRect(17, 24, 4, 6);

      graphics.fillStyle(0xd9b281, 1);
      graphics.fillRect(8 + armOffset, 15, 2, 8);
      graphics.fillRect(22 + armOffset, 15, 2, 8);

      graphics.fillStyle(0x4b6ea8, 1);
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
        frames: [
          { key: "hero-0" },
          { key: "hero-1" },
          { key: "hero-2" },
          { key: "hero-3" }
        ],
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

    this.hero = this.add.sprite(GAME_WIDTH / 2, 464, "hero-0")
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
