const EVENTS = [
  {
    id: "start",
    text: (scene) => {
      if (scene.flags.earned_true_ending) {
        return "You are born again beneath a gentler dawn. The roofs, the shrine, and the trees beyond the village look the same, but your soul no longer arrives empty. Somewhere inside you rests the memory of one life that finally refused the lie. The world does not feel healed. It feels witnessed.";
      }

      return "You are born beneath a red dawn, and the village watches you the way people watch a house after lightning strikes it twice. Some call you fortunate. Others go quiet when you pass. Even before you can name it, you feel the hunger that will ruin so many of your lives: not just to live, but to matter. The village was built on a wound no one will name, and something in you has always preferred a useful role to an honest answer.";
    },
    choices: [
      { text: "Train in the yard (+1 Strength)", effects: { strength: 1 }, next: "yard" },
      { text: "Study the old shrine scrolls (+1 Intellect)", effects: { intellect: 1 }, next: "shrine" },
      { text: "Help the neighbors in the market (+1 Charm)", effects: { charm: 1 }, next: "market" }
    ]
  },
  {
    id: "yard",
    text: "The retired guard trains children the way a bitter man mends armor: roughly, carefully, and without pretending tenderness. He knocks the spear from your hands, adjusts your footing with his boot, and studies you with the grim patience of someone who has seen too many young fools mistake force for courage. \"Again,\" he says. When you rise too quickly, eager to impress him, he exhales through his nose. \"That's your problem. You'd rather look brave than stand steady.\"",
    choices: [
      { text: "Spar until sunset (+1 Strength)", effects: { strength: 1 }, next: "crossroads" },
      { text: "Escort a merchant caravan (+1 Charm)", effects: { charm: 1 }, next: "caravan" },
      { text: "Study battlefield footwork (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" }
    ]
  },
  {
    id: "shrine",
    text: (scene) => {
      if (scene.flags.heard_perfect_timeline) {
        return "Now that you know there may be one life that breaks the pattern, the shrine looks uglier. The murals no longer seem mysterious; they seem careful. Every polished prayer, every restored border, every damaged face feels like part of the same effort to turn one old crime into something survivable. The gold thread does not look divine. It looks like resistance.";
      }

      return "The shrine walls are painted with saints, kings, and circles of rebirth, but the murals feel less like faith than revision. Gold lines thread through cracked scenes of famine, prayer, and kneeling figures whose faces have been worn away on purpose. The priests call it sacred order. Up close, it looks like edited guilt. When your fingers hover near the gold thread, the oldest priest stiffens. \"Some things are not meant to be remembered plainly,\" he says. That is the first honest thing you have heard in here.";
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
      { text: "Slip out before the priests notice", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "market",
    text: "The market teaches the village more honestly than the shrine ever could. Bread is traded on favors. Old grief hides inside arguments over grain. Mothers forgive liars who keep their children fed and despise honest men who arrive empty-handed. Here you learn how easy it is to become loved by being useful, and how dangerous that can be. A village built on silence still laughs, bargains, and survives. That is what makes its guilt durable.",
    choices: [
      { text: "Break up the shouting match (+1 Charm)", effects: { charm: 1 }, next: "council" },
      { text: "Follow rumors of a silver-eyed traveler (+1 Intellect)", effects: { intellect: 1 }, next: "caravan" },
      { text: "Win over the neighborhood families (+1 Charm)", effects: { charm: 1 }, next: "crossroads" }
    ]
  },
  {
    id: "caravan",
    text: "At dusk, a caravan master hires you for scraps of coin and a place beside the wagons. Traders mutter over routes, horses stamp, and tired children sleep on sacks of grain. Among the travelers sits a girl with silver eyes, watching you with the expression of someone who has spent too long being disappointed by the same person in different bodies. When you draw near, she shifts to make room without smiling. \"There you are,\" she says. \"I was beginning to think you'd die before you found me again.\" Before you can ask who she is, her gaze hardens. \"Don't look so startled. You've spent more lives arriving late than I care to count.\"",
    choices: [
      { text: "Ride beside the silver-eyed girl", effects: {}, next: "mysterious_girl" },
      {
        text: "Guide the caravan by the drifters' path (+1 Intellect)",
        effects: { intellect: 1 },
        hiddenWhenLocked: true,
        reqTraits: ["wanderer_instinct"],
        next: "mysterious_girl"
      },
      { text: "Fight when the bandits attack (+1 Strength)", effects: { strength: 1 }, reqStats: { strength: 3 }, next: "hero_death" },
      { text: "Negotiate tribute with the bandits (+1 Charm)", effects: { charm: 1 }, reqStats: { charm: 3 }, next: "peace_death" },
      { text: "Hide beneath the cargo", effects: {}, next: "bandit_death" }
    ]
  },
  {
    id: "mysterious_girl",
    text: (scene) => {
      if (scene.traits.echo_mark) {
        return "She studies your face, then lets out a short breath that might be relief if it were not so exhausted. \"There you are,\" she says. \"You still take the long road, but at least now you remember enough to stop pretending I'm a dream.\" Her eyes narrow. \"Don't mistake that for progress. You've remembered me before and still chosen the wrong version of yourself.\"";
      }

      return "She does not introduce herself. She looks at you the way a surgeon looks at an old wound that never healed cleanly. \"You always come to me after you've already failed somewhere else,\" she says. \"In one life, you ran. In another, you made yourself a hero. In another, you called delay wisdom until a child was dead and the village thanked you for your restraint.\" Her voice is tired, not cruel, which makes it worse. \"I know what you are before you become it. You want to matter so badly you'll wear any noble mask that lets you avoid the truth.\"";
    },
    unlockTraits: ["echo_mark"],
    setFlags: { met_mysterious_girl: true },
    choices: [
      {
        text: "Ask what she means (+1 Intellect)",
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
        return "The three roads no longer feel equal. One leads toward consequence, one toward confession, one toward compromise, and all of them bend around the same buried crime. Somewhere ahead is a life that does not flinch. You are no longer sure you deserve to find it, but the choice is waiting anyway.";
      }

      return "By adulthood, the village offers you three respectable ways to spend a life: hunt danger, seek truth, or keep the peace. It calls them different virtues. They are not. They are three ways of circling the same wound. The forest holds the consequence. The crypt holds the memory. The council holds the lie dressed up as order. You feel, with gathering dread, that you have stood at these roads before and chosen badly for reasons that sounded noble at the time.";
    },
    choices: [
      { text: "Hunt the beast in the forest", effects: {}, next: "forest" },
      { text: "Seek truth in the buried crypt", effects: {}, next: "crypt" },
      { text: "Plead for peace before the village council", effects: {}, next: "council" }
    ]
  },
  {
    id: "inner_sanctum",
    text: "The cracked altar seal gives way to a hidden chamber no priest ever mentioned. The walls are scratched with names, some fresh, some ancient, some carved so deeply they look desperate. A few seem impossibly familiar, as if your hand once knew their shape. At the center hangs a pale thread of light, trembling over a hollow in the stone. This is not a holy place. It is an archive of failed honesty. The shrine did not preserve truth here. It trapped the pieces that refused to stay buried.",
    setFlags: { heard_perfect_timeline: true },
    choices: [
      { text: "Follow the pale thread into the crypt (+1 Intellect)", effects: { intellect: 1 }, next: "crypt" },
      { text: "Memorize the names and return (+1 Intellect)", effects: { intellect: 1 }, next: "crossroads" },
      { text: "Seal the sanctum and leave", effects: {}, next: "crossroads" }
    ]
  },
  {
    id: "forest",
    text: (scene) => {
      if (scene.flags.died_in_forest) {
        return "The forest remembers you. Every snapped branch, every bend in the trail, every gust through the leaves carries the humiliation of your last death. When the beast appears, recognition moves between you like a live wire. You have died here before. The land knows it. Somewhere deep in your bones, you know the beast does not hate you for being weak. It hates what you keep refusing to face.";
      }

      return "The beast erupts from the brush with the force of something that was not born wild, but made furious. Black fur, broken antlers, human-looking eyes for one terrible instant. It does not feel like a hunter finding prey. It feels like a wound recognizing one of the people who helped create it. Thorn branches close the path behind you. The village always called this thing a monster. Standing before it now, you feel another possibility pressing at the edge of memory: that monsters are sometimes what guilt looks like when no one dares to name it.";
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
        return "The chamber recognizes you now. The lamps do not merely ignite; they lean toward you. The pearl's light quickens, relieved and accusing at once. You have touched the truth before and still gone back into the world half-honest. It waits like a witness who knows you have run out of dignified excuses.";
      }

      return "The crypt lamps flare awake as if your arrival completes a sentence long left unfinished. At the chamber's center hovers a pearl of pale light, pulsing with a rhythm too human to be holy. The air tastes of cold stone and old secrecy. You understand, without knowing how, that the shrine above was built to soften memory and this place was built to keep one memory sharp. Whatever the village buried did not stay buried willingly.";
    },
    choices: [
      {
        text: "Grasp the memory pearl (+2 Intellect)",
        effects: { intellect: 2 },
        reqStats: { intellect: 3 },
        setFlags: { found_memory_pearl: true, heard_perfect_timeline: true },
        next: "sage_death"
      },
      {
        text: "Map the tunnels and escape alive (+1 Intellect)",
        effects: { intellect: 1 },
        setFlags: { heard_perfect_timeline: true },
        next: "peace_death"
      },
      { text: "Touch the cursed sarcophagus", effects: {}, next: "curse_death" }
    ]
  },
  {
    id: "council",
    text: "The council hall smells of damp wood, old grain, and arguments repeated for generations. Village leaders speak of fairness, necessity, and keeping order, but every phrase sounds rehearsed, as if this room has been teaching people how to excuse themselves for a very long time. Ledgers lie open on the table. So do grudges. One missing storehouse, one bad harvest, one insult too many, and the whole village is ready to turn on itself. Looking at the elders, you feel a terrible clarity: whatever happened here long ago did not end in the forest. It settled into policy.",
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
        return "The clearing is silent except for the pond and your breathing. The girl looks at you, then at the light moving under your skin where the pearl's memory has taken hold. For the first time, her anger gives way to something more dangerous: hope she does not trust. \"Good,\" she says quietly. \"You brought the truth with you this time. Then stop asking me for comfort and listen.\" She gestures toward the pond. \"The beast, the shrine, the council, the hunger, the child they chose, the night you failed to speak. It is all one story.\"";
      }

      return "The scarred trail opens into a clearing the beast will not cross. A pond lies still beneath the moon, bright as polished glass. The silver-eyed girl is waiting there, arms folded, as if she has long since given up pretending your timing might improve. Her gaze flicks over you and hardens. \"So,\" she says, \"you found the place. That means your fear finally got tired before I did.\" She steps aside so you can see the water. \"This is where the village's lie runs out of room.\"";
    },
    choices: [
      {
        text: "Take her hand and name the true life",
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
    text: "You run because running is cleaner than knowing, but the forest has no patience left for that bargain. Branches tear your face. Roots catch your feet. Behind you, the beast closes the distance with the certainty of a debt long overdue. When it strikes, terror strips away every noble story you have told yourself about caution and timing. You die knowing one honest thing at last: fear has been choosing for you longer than you admitted.",
    death: true,
    deathLabel: "Torn down by the forest beast",
    unlockTraits: ["survivor"],
    setFlags: { died_in_forest: true }
  },
  {
    id: "curse_death",
    text: "The sarcophagus cracks under your hand and exhales dust that tastes of old prayer and sealed mouths. Your body fails almost instantly, but death is not the worst part. In your final moments, you understand why the crypt rejected you. You came to truth as if it were an artifact to inspect, not a wound to confess. The dead have no use for curiosity without courage.",
    death: true,
    deathLabel: "Consumed by an ancient curse"
  },
  {
    id: "bandit_death",
    text: "You survive the ambush by making yourself smaller than your fear. It works. You live. Years pass quietly. No songs are written about you. No one curses your name either. You learn routes, shortcuts, exits. You become excellent at leaving before the world can demand too much. When death comes, it comes gently enough to feel merciful, and that mercy sickens you. You understand too late that a life can be safe, long, and still wasted by the shape it forced you into.",
    death: true,
    deathLabel: "Lived small and died in regret",
    unlockTraits: ["wanderer_instinct"]
  },
  {
    id: "hero_death",
    text: "You fight like the sort of person people build statues for. Steel flashes, blood spills, and witnesses go home with a story that makes them feel cleaner than the truth. Your name survives you. Children shout it in games. Elders praise your courage. The village learns to love the version of you that died before it had to say anything harder. Glory carries you into death like a hymn, and only at the end do you see the trap: being admired is not the same as making anything right.",
    death: true,
    deathLabel: "Died a celebrated hero"
  },
  {
    id: "peace_death",
    text: "You live a long life easing quarrels, feeding hungry homes, settling debts, and giving frightened people reasons to believe they are decent. The village thanks you for your calm voice, your useful hands, your willingness to carry burdens without forcing anyone to look too closely at where they came from. It is, by every outward measure, a good life. That is what makes the failure cut so deep. When the end comes, you know you helped people survive. You also know you left the oldest wound untouched because being loved for peace felt easier than being hated for the truth.",
    death: true,
    deathLabel: "Died old after a peaceful life",
    unlockTraits: ["noble_blood"]
  },
  {
    id: "sage_death",
    text: "The memory pearl opens, and the village loses the right to stay simple. You see the famine, the council's fear, the priests' sanction, the child led into the forest beneath language meant to make murder sound orderly. You see the silver-eyed girl fighting, pleading, refusing the lie. Then you see yourself: not ignorant, not absent, but there, hesitating because speaking in time would have cost you your place among them. The truth enters you too completely to survive. You die under its weight, but for once the soul carries something better than myth into the next life: an accusation with your own face on it.",
    death: true,
    deathLabel: "Ascended as a keeper of memory",
    unlockTraits: ["scholar_mind"],
    setFlags: { found_memory_pearl: true, heard_perfect_timeline: true }
  },
  {
    id: "true_ending",
    text: "You take her hand, and she does not squeeze back. Mercy is not what she is offering. The pond goes still as polished glass, and the memory you have spent lifetimes circling finally opens without mercy or blur. The child. The famine. The shrine dressing terror as duty. The council calling delay wisdom. Your own voice, long ago, saying not yet when the moment demanded now. You fall to your knees under the full shape of it. The beast enters the clearing and lowers its head, no longer a mystery, only the living consequence of what the village made and refused to mourn. Beside you, the silver-eyed girl speaks through gritted grief. \"If you want the life that ends this, you do not get to be noble. You tell the truth where everyone can hear it.\" So you return with her to the village and speak the buried history aloud before shrine, council, and people. The confession costs everything it should: innocence, admiration, excuses, the comfort of being remembered as good. Some curse you. Some weep. Some finally understand what their peace was built on. The beast sleeps not because it was conquered, but because the wound that fed it has at last been witnessed in public. When it is over, she looks at you with exhausted, unsparing recognition. Not forgiveness. Not romance. Something harder won. \"There,\" she says softly. \"That is the first life where you arrived without hiding.\"",
    death: true,
    deathLabel: "Discovered the true ending",
    trueEnding: true,
    setFlags: { earned_true_ending: true }
  }
];

if (typeof module !== "undefined") {
  module.exports = { EVENTS };
}
