const EVENTS = [
  {
    id: "start",
    text: "You are born again beneath a red dawn. A quiet memory whispers: this life can shape the next.",
    choices: [
      { text: "Train your body in the yard (+1 Strength)", effects: { strength: 1 }, next: "yard" },
      { text: "Study old scrolls in the shrine (+1 Intellect)", effects: { intellect: 1 }, next: "shrine" },
      { text: "Help neighbors at the market (+1 Charm)", effects: { charm: 1 }, next: "market" }
    ]
  },
  {
    id: "yard",
    text: "A retired guard watches your stance. \"Discipline can harden a short life into a meaningful one,\" he says.",
    choices: [
      { text: "Spar until sunset (+1 Strength)", effects: { strength: 1 }, next: "crossroads" },
      { text: "Volunteer to guard a caravan (+1 Charm)", effects: { charm: 1 }, next: "caravan" },
      { text: "Rest and think on your future", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "shrine",
    text: "Dusty murals describe souls falling through countless ages. A sealed passage hums behind the altar.",
    choices: [
      { text: "Decode the murals (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" },
      { text: "Open the hidden passage", effects: {}, next: "crypt", req: { intellect: 2 } },
      { text: "Leave before the priests notice", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "market",
    text: "Merchants, storytellers, and beggars all want something from you. A kind word opens surprising doors.",
    choices: [
      { text: "Settle a shouting match (+1 Charm)", effects: { charm: 1 }, next: "crossroads" },
      { text: "Charm a trader into sharing rumors (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" },
      { text: "Sign on with a traveling caravan", effects: {}, next: "caravan" }
    ]
  },
  {
    id: "crossroads",
    text: "By adulthood, three roads define your fate: danger, wisdom, or influence. Your past lives tug at each choice.",
    choices: [
      { text: "Hunt the beast in the forest", effects: {}, next: "forest" },
      { text: "Seek truth in the buried crypt", effects: {}, next: "crypt" },
      { text: "Plead for peace before the village council", effects: {}, next: "council" }
    ]
  },
  {
    id: "forest",
    text: "The forest beast bursts from the brush, all fangs and rage. One clean choice decides whether you become prey or legend.",
    choices: [
      { text: "Stand firm and strike", effects: { strength: 1 }, next: "hero_death", req: { strength: 3 } },
      { text: "Distract it with calm words", effects: { charm: 1 }, next: "peace_death", req: { charm: 3 } },
      { text: "Break and run", effects: {}, next: "wolf_death" }
    ]
  },
  {
    id: "crypt",
    text: "Cold lamps ignite on their own. At the chamber center floats a memory pearl, pulsing with knowledge older than your name.",
    choices: [
      { text: "Grasp the pearl of memory", effects: { intellect: 2 }, next: "sage_death", req: { intellect: 3 } },
      { text: "Map the tunnels and leave (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" },
      { text: "Touch the cursed sarcophagus", effects: {}, next: "curse_death" }
    ]
  },
  {
    id: "council",
    text: "Village leaders are one insult away from violence. Every eye turns to you as the room fractures into fear and blame.",
    choices: [
      { text: "Deliver a unifying speech", effects: { charm: 2 }, next: "peace_death", req: { charm: 3 } },
      { text: "Expose the hidden grain records", effects: { intellect: 1 }, next: "peace_death", req: { intellect: 3 } },
      { text: "Challenge the loudest elder to a duel", effects: { strength: 1 }, next: "hero_death", req: { strength: 3 } }
    ]
  },
  {
    id: "caravan",
    text: "On the road, bandits descend at dusk. Fear spreads faster than fire through the wagons.",
    choices: [
      { text: "Fight beside the guards", effects: { strength: 1 }, next: "hero_death", req: { strength: 3 } },
      { text: "Negotiate safe passage", effects: { charm: 1 }, next: "peace_death", req: { charm: 3 } },
      { text: "Hide beneath the cargo", effects: {}, next: "bandit_death" }
    ]
  },
  {
    id: "wolf_death",
    text: "Branches whip your face as you flee, but the beast is faster. Teeth close, darkness follows, and the wheel turns again.",
    death: true,
    deathLabel: "Torn down by the forest beast"
  },
  {
    id: "curse_death",
    text: "The sarcophagus exhales a century of dust. Your body crumbles in a breath, but your soul feels strangely familiar with ending.",
    death: true,
    deathLabel: "Consumed by an ancient curse"
  },
  {
    id: "bandit_death",
    text: "You survive the ambush, but not the shame. Years later you die forgotten, wondering what courage might have changed.",
    death: true,
    deathLabel: "Lived small and died in regret"
  },
  {
    id: "hero_death",
    text: "Your final battle becomes a village legend. Children shout your name in games long after your body returns to dust.",
    death: true,
    deathLabel: "Died a celebrated hero"
  },
  {
    id: "peace_death",
    text: "You spend a long life mending conflicts and feeding hungry homes. When the end comes, it arrives gently beside grateful hands.",
    death: true,
    deathLabel: "Died old after a peaceful life"
  },
  {
    id: "sage_death",
    text: "The memory pearl reveals dozens of past selves. You leave this body smiling, certain the next life will begin stronger.",
    death: true,
    deathLabel: "Ascended as a keeper of memory"
  }
];
