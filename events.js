const EVENTS = [
  {
    id: "start",
    text: (scene) => {
      if (scene.flags.earned_true_ending) {
        return "You are born again beneath a calmer dawn. Even now, some part of you remembers a life that finally fit the world instead of fighting it.";
      }

      return "You are born again beneath a red dawn. Somewhere beyond memory, a whisper insists that one life among many can still become the right one.";
    },
    choices: [
      { text: "Train your body in the yard (+1 Strength)", effects: { strength: 1 }, next: "yard" },
      { text: "Study old scrolls in the shrine (+1 Intellect)", effects: { intellect: 1 }, next: "shrine" },
      { text: "Help neighbors at the market (+1 Charm)", effects: { charm: 1 }, next: "market" }
    ]
  },
  {
    id: "yard",
    text: "A retired guard corrects your stance with exacting patience. \"Most people only get one life to waste,\" he says. \"You should know better by now.\"",
    choices: [
      { text: "Spar until sunset (+1 Strength)", effects: { strength: 1 }, next: "crossroads" },
      { text: "Escort a merchant caravan out of town (+1 Charm)", effects: { charm: 1 }, next: "caravan" },
      { text: "Study battlefield footwork (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" }
    ]
  },
  {
    id: "shrine",
    text: (scene) => {
      if (scene.flags.heard_perfect_timeline) {
        return "The shrine murals no longer look decorative. Their spirals now resemble instructions left behind for someone stubborn enough to keep returning.";
      }

      return "Dusty murals describe souls falling through countless ages. One damaged panel shows a line of gold threading through the loops, as if one perfect life could anchor all the rest.";
    },
    choices: [
      {
        text: "Study the gold-thread mural (+1 Intellect)",
        effects: { intellect: 1 },
        setFlags: { heard_perfect_timeline: true },
        next: "crossroads"
      },
      {
        text: "Trace the cracked altar seal",
        hiddenWhenLocked: true,
        reqAny: [
          { reqStats: { intellect: 3 } },
          { reqTraits: ["scholar_mind"] },
          { reqFlags: ["found_memory_pearl"] }
        ],
        next: "inner_sanctum"
      },
      { text: "Leave before the priests notice", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "market",
    text: "Merchants, storytellers, and beggars all want something from you. The market teaches the same lesson every lifetime: attention is a currency of its own.",
    choices: [
      { text: "Settle a shouting match (+1 Charm)", effects: { charm: 1 }, next: "council" },
      { text: "Follow rumors of a silver-eyed traveler (+1 Intellect)", effects: { intellect: 1 }, next: "caravan" },
      { text: "Win over the neighborhood families (+1 Charm)", effects: { charm: 1 }, next: "crossroads" }
    ]
  },
  {
    id: "caravan",
    text: "At dusk, a caravan master hires you for a handful of coins and a meal. Among the travelers sits a silver-eyed girl who watches you with the unsettling patience of someone waiting for a late guest.",
    choices: [
      { text: "Ride beside the silver-eyed girl", effects: {}, next: "mysterious_girl" },
      {
        text: "Lead the caravan along the route only drifters remember",
        effects: { intellect: 1 },
        hiddenWhenLocked: true,
        reqTraits: ["wanderer_instinct"],
        next: "mysterious_girl"
      },
      { text: "Fight when bandits descend", effects: { strength: 1 }, reqStats: { strength: 3 }, next: "hero_death" },
      { text: "Talk the bandits into taking tribute instead", effects: { charm: 1 }, reqStats: { charm: 3 }, next: "peace_death" },
      { text: "Hide beneath the cargo", effects: {}, next: "bandit_death" }
    ]
  },
  {
    id: "mysterious_girl",
    text: (scene) => {
      if (scene.traits.echo_mark) {
        return "\"There you are,\" the silver-eyed girl says, like she has been correcting an old scheduling mistake. She studies your face and smiles faintly. \"You still take the long road to me, but at least now you remember that I exist.\"";
      }

      return "The silver-eyed girl shifts aside to make room for you. Before you speak, she says, \"You have died in the forest, in dust, in glory, in shame. I was starting to wonder which version of you would arrive this time.\"";
    },
    unlockTraits: ["echo_mark"],
    setFlags: { met_mysterious_girl: true },
    choices: [
      {
        text: "Ask her what she means",
        effects: { intellect: 1 },
        setFlags: { heard_perfect_timeline: true },
        next: "crossroads"
      },
      {
        text: "Promise to meet her where the forest remembers",
        effects: { charm: 1 },
        setFlags: { heard_perfect_timeline: true },
        setRunFlags: { promised_forest_meeting: true },
        next: "crossroads"
      },
      { text: "Pretend you did not hear her", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "crossroads",
    text: (scene) => {
      if (scene.flags.heard_perfect_timeline) {
        return "Adulthood arrives with three familiar roads, but they no longer feel equal. Somewhere ahead, one of them bends toward the hidden shape of a better life.";
      }

      return "By adulthood, three roads define your fate: danger, wisdom, or influence. Every step feels haunted by choices you almost remember making before.";
    },
    choices: [
      { text: "Hunt the beast in the forest", effects: {}, next: "forest" },
      { text: "Seek truth in the buried crypt", effects: {}, next: "crypt" },
      { text: "Plead for peace before the village council", effects: {}, next: "council" }
    ]
  },
  {
    id: "inner_sanctum",
    text: "The altar gives way to a narrow sanctum lined with names scratched by hands that should not belong to you. At its center hangs a thread of pale light, tugging toward a life that has not happened yet.",
    setFlags: { heard_perfect_timeline: true },
    choices: [
      { text: "Follow the thread deeper into the crypt", effects: { intellect: 1 }, next: "crypt" },
      { text: "Memorize the names and return (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" },
      { text: "Seal the sanctum before anyone sees", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "forest",
    text: (scene) => {
      if (scene.flags.died_in_forest) {
        return "The forest feels insultingly familiar. Every snapped branch echoes the death you already suffered here, as if the trees have been rehearsing your return.";
      }

      return "The forest beast bursts from the brush, all fangs and rage. The path behind you vanishes beneath thorns, and the air tastes like a death waiting to happen.";
    },
    choices: [
      { text: "Stand firm and strike", effects: { strength: 1 }, reqStats: { strength: 3 }, next: "hero_death" },
      { text: "Soothe the beast with a steady voice", effects: { charm: 1 }, reqStats: { charm: 3 }, next: "peace_death" },
      { text: "Break and run", effects: {}, next: "wolf_death" },
      {
        text: "Follow the scarred trail you remember",
        hiddenWhenLocked: true,
        reqTraits: ["survivor"],
        reqFlags: ["died_in_forest", "met_mysterious_girl"],
        next: "moon_clearing"
      }
    ]
  },
  {
    id: "crypt",
    text: (scene) => {
      if (scene.flags.found_memory_pearl) {
        return "Cold lamps ignite on their own. The chamber already knows you, and the memory pearl at its center pulses like a heart relieved to see its owner return.";
      }

      return "Cold lamps ignite on their own. At the chamber center floats a memory pearl, pulsing with knowledge older than your name and brighter than the rest of the crypt deserves.";
    },
    choices: [
      {
        text: "Grasp the pearl of memory",
        effects: { intellect: 2 },
        reqStats: { intellect: 3 },
        setFlags: { found_memory_pearl: true, heard_perfect_timeline: true },
        next: "sage_death"
      },
      {
        text: "Map the tunnels and leave (+1 Intellect)",
        effects: { intellect: 1 },
        setFlags: { heard_perfect_timeline: true },
        next: "crossroads"
      },
      { text: "Touch the cursed sarcophagus", effects: {}, next: "curse_death" }
    ]
  },
  {
    id: "council",
    text: "Village leaders are one insult away from violence. Every eye turns to you as old grudges gather like storm clouds around the table.",
    choices: [
      {
        text: "Deliver a unifying speech",
        effects: { charm: 2 },
        reqStats: { charm: 3 },
        setRunFlags: { won_council: true },
        next: "peace_death"
      },
      {
        text: "Expose the hidden grain ledgers",
        effects: { intellect: 1 },
        reqStats: { intellect: 3 },
        setRunFlags: { won_council: true },
        next: "peace_death"
      },
      { text: "Challenge the loudest elder to a duel", effects: { strength: 1 }, reqStats: { strength: 3 }, next: "hero_death" }
    ]
  },
  {
    id: "moon_clearing",
    text: (scene) => {
      if (scene.flags.found_memory_pearl) {
        return "The scarred trail ends at a moonlit clearing untouched by the beast. The silver-eyed girl waits beside a still pond. \"Good,\" she says. \"You brought the memory pearl this time. That means you are finally close.\"";
      }

      return "The scarred trail opens into a moonlit clearing where the beast never follows. The silver-eyed girl stands beside a still pond, disappointed but not surprised. \"You found the place,\" she says. \"Now you only need to remember why it matters.\"";
    },
    choices: [
      {
        text: "Take her hand and name the perfect timeline",
        hiddenWhenLocked: true,
        reqTraits: ["echo_mark", "scholar_mind", "survivor"],
        reqFlags: ["met_mysterious_girl", "found_memory_pearl", "heard_perfect_timeline"],
        reqRunFlags: ["promised_forest_meeting"],
        next: "true_ending"
      },
      {
        text: "Ask her to wait for another lifetime",
        effects: { charm: 1 },
        next: "peace_death"
      },
      {
        text: "Turn back before you understand too much",
        effects: {},
        next: "wolf_death"
      }
    ]
  },
  {
    id: "wolf_death",
    text: "Branches whip your face as you flee, but the beast is faster. Teeth close, darkness follows, and the wheel turns again with fresh scars.",
    death: true,
    deathLabel: "Torn down by the forest beast",
    unlockTraits: ["survivor"],
    setFlags: { died_in_forest: true }
  },
  {
    id: "curse_death",
    text: "The sarcophagus exhales a century of dust. Your body crumbles in a breath, but your soul lingers just long enough to resent how familiar ending is becoming.",
    death: true,
    deathLabel: "Consumed by an ancient curse"
  },
  {
    id: "bandit_death",
    text: "You survive the ambush, but only by shrinking beneath it. Years later you die wondering how many doors fear closed before you even saw them.",
    death: true,
    deathLabel: "Lived small and died in regret",
    unlockTraits: ["wanderer_instinct"]
  },
  {
    id: "hero_death",
    text: "Your final battle becomes a village legend. Children shout your name in play long after your bones forget the shape of glory.",
    death: true,
    deathLabel: "Died a celebrated hero"
  },
  {
    id: "peace_death",
    text: "You spend a long life mending feuds and feeding hungry homes. When the end comes, it arrives gently, as if the world is thanking you for finally doing one thing right.",
    death: true,
    deathLabel: "Died old after a peaceful life",
    unlockTraits: ["noble_blood"]
  },
  {
    id: "sage_death",
    text: "The memory pearl opens like an eye. Dozens of former selves spill through you at once, and among them is one life that almost became whole.",
    death: true,
    deathLabel: "Ascended as a keeper of memory",
    unlockTraits: ["scholar_mind"],
    setFlags: { found_memory_pearl: true, heard_perfect_timeline: true }
  },
  {
    id: "true_ending",
    text: "The pond turns to glass beneath your joined hands. The beast sleeps. The village survives. The shrine thread stops trembling. For the first time, your memories stop fighting each other and settle into one coherent life. The silver-eyed girl closes her eyes and says, \"There. That is the one we were trying to remember.\"",
    death: true,
    deathLabel: "Discovered the true ending",
    trueEnding: true,
    setFlags: { earned_true_ending: true }
  }
];
