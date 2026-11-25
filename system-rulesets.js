// system-rulesets.js
// Central ruleset registry and D&D 5e mechanics helper module for RealmForge.
// Provides ability modifier math, skill/save bonus calculation, encounter XP difficulty
// thresholds, condition lists, item rarities, spell metadata, and 5e travel rules.

export const RULESET_DEFINITIONS = {
  generic: {
    id: "generic",
    label: "System-Agnostic",
    shortLabel: "Universal Core",
    available: true,
    description: "Flexible universal campaign planner suitable for any tabletop RPG."
  },
  dnd5e: {
    id: "dnd5e",
    label: "D&D 5e",
    shortLabel: "5th Edition",
    available: true,
    description:
      "Auto-calculated modifiers & skills, Spell Slots (1–9), Attunement, 5e Monster Statblocks, Condition pills, Party/Monster combat importer, Encounter XP meter, and 5e Travel Pace."
  },
  daggerheart: {
    id: "daggerheart",
    label: "Daggerheart",
    shortLabel: "Duality Dice",
    available: true,
    description:
      "Campaign Frames, 6 Character Traits, Hope/Fear/Stress/Armor Slots, Damage Thresholds, Experiences, Domain Cards, Adversary Tier/Role statblocks, Battle Points calculator & Spotlight tracker."
  },
  vtm5e: {
    id: "vtm5e",
    label: "Vampire 5e",
    shortLabel: "Coming Soon",
    available: false,
    description: "Hunger dice, Disciplines, Coterie tenets, Predator types, and Relationship maps."
  }
};

export function isDnd5e(stateOrSystem) {
  if (!stateOrSystem) return false;
  const sys = stateOrSystem.activeSystem ? stateOrSystem.activeSystem : stateOrSystem;
  return sys?.templateType === "dnd5e";
}

export function isDaggerheart(stateOrSystem) {
  if (!stateOrSystem) return false;
  const sys = stateOrSystem.activeSystem ? stateOrSystem.activeSystem : stateOrSystem;
  return sys?.templateType === "daggerheart";
}

export function getRulesetLabel(templateType) {
  return RULESET_DEFINITIONS[templateType]?.label || "System-Agnostic";
}

// ============================================================================
// 1. D&D 5E ABILITY SCORE, BONUS & LEVEL MATH
// ============================================================================

/**
 * Parses an ability score string such as "16" or "16 (+3)" and returns
 * { score: 16, mod: 3, modStr: "+3" }. Returns null if no leading integer is found.
 */
export function parseAbilityScore(raw) {
  if (raw === null || raw === undefined) return null;
  const match = String(raw).trim().match(/^(-?\d+)/);
  if (!match) return null;
  const score = parseInt(match[1], 10);
  if (isNaN(score)) return null;
  const mod = Math.floor((score - 10) / 2);
  return {
    score,
    mod,
    modStr: formatSigned(mod)
  };
}

/**
 * Parses a signed bonus string like "+3", "3", or "-1" into an integer (default 0).
 */
export function parseBonus(raw) {
  if (raw === null || raw === undefined) return 0;
  const match = String(raw).trim().match(/([+-]?\d+)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? 0 : num;
}

export function formatSigned(num) {
  const n = Number(num) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Extracts total character level from strings like "Fighter 5" or "Wizard 3 / Cleric 2".
 */
export function parseLevelFromClass(classAndLevel) {
  if (!classAndLevel) return 0;
  const matches = String(classAndLevel).match(/\d+/g);
  if (!matches) return 0;
  return matches.reduce((sum, m) => sum + parseInt(m, 10), 0);
}

// ============================================================================
// 2. D&D 5E CONSTANTS (CONDITIONS, RARITIES, SCHOOLS, SIZES)
// ============================================================================

export const DND5E_CONDITIONS = [
  "Concentrating",
  "Blinded",
  "Charmed",
  "Deafened",
  "Frightened",
  "Grappled",
  "Incapacitated",
  "Invisible",
  "Paralyzed",
  "Petrified",
  "Poisoned",
  "Prone",
  "Restrained",
  "Stunned",
  "Unconscious"
];

export const DND5E_RARITIES = [
  "Common",
  "Uncommon",
  "Rare",
  "Very Rare",
  "Legendary",
  "Artifact"
];

export const DND5E_SPELL_SCHOOLS = [
  "Abjuration",
  "Conjuration",
  "Divination",
  "Enchantment",
  "Evocation",
  "Illusion",
  "Necromancy",
  "Transmutation"
];

export const DND5E_SPELL_LEVELS = [
  "Cantrip",
  "1st Level",
  "2nd Level",
  "3rd Level",
  "4th Level",
  "5th Level",
  "6th Level",
  "7th Level",
  "8th Level",
  "9th Level"
];

export const DND5E_CREATURE_SIZES = [
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan"
];

// ============================================================================
// 3. D&D 5E ENCOUNTER XP & DIFFICULTY CALCULATOR
// ============================================================================

export const DND5E_CR_TO_XP = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "25": 75000,
  "26": 90000,
  "27": 105000,
  "28": 120000,
  "29": 135000,
  "30": 155000
};

// DMG XP Thresholds per Character Level (Levels 1–20): [Easy, Medium, Hard, Deadly]
const LEVEL_XP_THRESHOLDS = {
  1: [25, 50, 75, 100],
  2: [50, 100, 150, 200],
  3: [75, 150, 225, 400],
  4: [125, 250, 375, 500],
  5: [250, 500, 750, 1100],
  6: [300, 600, 900, 1400],
  7: [350, 750, 1100, 1700],
  8: [450, 900, 1400, 2100],
  9: [550, 1100, 1600, 2400],
  10: [600, 1200, 1900, 2800],
  11: [800, 1600, 2400, 3600],
  12: [1000, 2000, 3000, 4500],
  13: [1100, 2200, 3400, 5100],
  14: [1250, 2500, 3800, 5700],
  15: [1400, 2800, 4300, 6400],
  16: [1600, 3200, 4800, 7200],
  17: [2000, 3900, 5900, 8800],
  18: [2100, 4200, 6300, 9500],
  19: [2400, 4900, 7300, 10900],
  20: [2800, 5700, 8500, 12700]
};

/**
 * Extracts XP from a challenge string such as "CR 4 (1,100 XP)", "1100", or "CR 1/2".
 */
export function parseEnemyXp(challengeOrXp) {
  if (!challengeOrXp) return 0;
  const str = String(challengeOrXp).trim();

  // Check for explicit XP mention like "(1,100 XP)" or "450 xp"
  const xpMatch = str.match(/([\d,]+)\s*xp/i);
  if (xpMatch) {
    const val = parseInt(xpMatch[1].replace(/,/g, ""), 10);
    return isNaN(val) ? 0 : val;
  }

  // Check for CR fraction or number like "CR 1/4" or "CR 5"
  const crMatch = str.match(/cr\s*(1\/8|1\/4|1\/2|\d+)/i);
  if (crMatch && DND5E_CR_TO_XP[crMatch[1]] !== undefined) {
    return DND5E_CR_TO_XP[crMatch[1]];
  }

  // If plain number >= 10, treat directly as XP; if <= 30, look up CR
  const plainNum = parseInt(str.replace(/,/g, ""), 10);
  if (!isNaN(plainNum)) {
    if (plainNum >= 10 && plainNum !== 10 && plainNum > 30) return plainNum;
    if (DND5E_CR_TO_XP[String(plainNum)] !== undefined) {
      return DND5E_CR_TO_XP[String(plainNum)];
    }
    return plainNum;
  }

  return 0;
}

/**
 * Calculates DMG 5e encounter XP & difficulty rating for a list of party levels and enemy XPs.
 */
export function calculate5eEncounterDifficulty(partyLevels = [], enemyXpValues = []) {
  const validEnemies = enemyXpValues.filter((x) => Number(x) > 0);
  const count = validEnemies.length;
  const rawXp = validEnemies.reduce((sum, x) => sum + Number(x), 0);

  let multiplier = 1;
  if (count === 2) multiplier = 1.5;
  else if (count >= 3 && count <= 6) multiplier = 2;
  else if (count >= 7 && count <= 10) multiplier = 2.5;
  else if (count >= 11 && count <= 14) multiplier = 3;
  else if (count >= 15) multiplier = 4;

  const adjustedXp = Math.round(rawXp * multiplier);

  const validLevels = partyLevels
    .map((l) => Math.max(1, Math.min(20, Number(l) || 0)))
    .filter((l) => l >= 1);

  const thresholds = { easy: 0, medium: 0, hard: 0, deadly: 0 };
  validLevels.forEach((lvl) => {
    const row = LEVEL_XP_THRESHOLDS[lvl] || LEVEL_XP_THRESHOLDS[1];
    thresholds.easy += row[0];
    thresholds.medium += row[1];
    thresholds.hard += row[2];
    thresholds.deadly += row[3];
  });

  let difficulty = "No Enemies";
  if (count > 0 && validLevels.length === 0) {
    difficulty = "Set Party Levels";
  } else if (count > 0) {
    if (adjustedXp >= thresholds.deadly) difficulty = "Deadly";
    else if (adjustedXp >= thresholds.hard) difficulty = "Hard";
    else if (adjustedXp >= thresholds.medium) difficulty = "Medium";
    else if (adjustedXp >= thresholds.easy) difficulty = "Easy";
    else difficulty = "Trivial";
  }

  return {
    rawXp,
    adjustedXp,
    multiplier,
    difficulty,
    thresholds,
    partySize: validLevels.length
  };
}

// ============================================================================
// 4. D&D 5E OVERLAND TRAVEL PACE & EXHAUSTION TABLES
// ============================================================================

export const DND5E_TRAVEL_PACE = [
  {
    pace: "Fast",
    minute: "400 feet",
    hour: "4 miles",
    day: "30 miles",
    effect: "-5 penalty to passive Wisdom (Perception) scores; cannot use Stealth."
  },
  {
    pace: "Normal",
    minute: "300 feet",
    hour: "3 miles",
    day: "24 miles",
    effect: "Standard travel pace; no penalty to passive Perception."
  },
  {
    pace: "Slow",
    minute: "200 feet",
    hour: "2 miles",
    day: "18 miles",
    effect: "Able to use Stealth while traveling."
  }
];

export const DND5E_EXHAUSTION_LEVELS = [
  { level: 1, effect: "Disadvantage on ability checks" },
  { level: 2, effect: "Speed halved" },
  { level: 3, effect: "Disadvantage on attack rolls and saving throws" },
  { level: 4, effect: "Hit point maximum halved" },
  { level: 5, effect: "Speed reduced to 0" },
  { level: 6, effect: "Death" }
];

// ============================================================================
// 5. DAGGERHEART CONSTANTS, TRAITS, DOMAINS & BATTLE POINTS CALCULATOR
// ============================================================================

export const DAGGERHEART_TRAITS = [
  { key: "agility", label: "Agility", verbs: "Sprint • Leap • Maneuver" },
  { key: "strength", label: "Strength", verbs: "Lift • Smash • Grapple" },
  { key: "finesse", label: "Finesse", verbs: "Control • Hide • Tinker" },
  { key: "instinct", label: "Instinct", verbs: "Perceive • Sense • Navigate" },
  { key: "presence", label: "Presence", verbs: "Charm • Perform • Deceive" },
  { key: "knowledge", label: "Knowledge", verbs: "Recall • Analyze • Comprehend" }
];

export const DAGGERHEART_CLASSES = [
  { name: "Bard", domains: ["Grace", "Codex"], evasion: 10, hp: 5 },
  { name: "Druid", domains: ["Sage", "Arcana"], evasion: 10, hp: 6 },
  { name: "Guardian", domains: ["Valor", "Blade"], evasion: 9, hp: 7 },
  { name: "Ranger", domains: ["Bone", "Sage"], evasion: 12, hp: 6 },
  { name: "Rogue", domains: ["Midnight", "Grace"], evasion: 12, hp: 6 },
  { name: "Seraph", domains: ["Splendor", "Valor"], evasion: 9, hp: 7 },
  { name: "Sorcerer", domains: ["Arcana", "Midnight"], evasion: 10, hp: 6 },
  { name: "Warrior", domains: ["Blade", "Bone"], evasion: 11, hp: 6 },
  { name: "Wizard", domains: ["Codex", "Splendor"], evasion: 11, hp: 5 }
];

export const DAGGERHEART_DOMAINS = [
  "Arcana",
  "Blade",
  "Bone",
  "Codex",
  "Grace",
  "Midnight",
  "Sage",
  "Splendor",
  "Valor"
];

export const DAGGERHEART_COMMUNITIES = [
  "Highborne",
  "Loreborne",
  "Orderborne",
  "Ridgeborne",
  "Seaborne",
  "Slyborne",
  "Underborne",
  "Wanderborne",
  "Wildborne"
];

export const DAGGERHEART_ANCESTRIES = [
  "Clank",
  "Drakona",
  "Dwarf",
  "Elf",
  "Faerie",
  "Faun",
  "Firbolg",
  "Fungril",
  "Galapa",
  "Giant",
  "Goblin",
  "Halfling",
  "Human",
  "Infernis",
  "Katari",
  "Orc",
  "Ribbet",
  "Simiah",
  "Mixed Ancestry"
];

export const DAGGERHEART_RANGE_BANDS = [
  "Melee",
  "Very Close",
  "Close",
  "Far",
  "Very Far"
];

export const DAGGERHEART_TIERS = [
  "Tier 1 (Lvl 1)",
  "Tier 2 (Lvls 2–4)",
  "Tier 3 (Lvls 5–7)",
  "Tier 4 (Lvls 8–10)"
];

export const DAGGERHEART_ADVERSARY_TYPES = [
  { type: "Minion", points: 1 },
  { type: "Social", points: 1 },
  { type: "Support", points: 1 },
  { type: "Horde", points: 2 },
  { type: "Ranged", points: 2 },
  { type: "Skulk", points: 2 },
  { type: "Standard", points: 2 },
  { type: "Leader", points: 3 },
  { type: "Bruiser", points: 4 },
  { type: "Solo", points: 5 }
];

export const DAGGERHEART_CONDITIONS = [
  "Hidden",
  "Restrained",
  "Vulnerable"
];

export const DAGGERHEART_DUALITY_OUTCOMES = [
  {
    outcome: "Critical Success (Matching Dice)",
    effect: "Succeed with bonus! Gain 1 Hope and clear 1 Stress. In combat, deal maximum base damage + roll."
  },
  {
    outcome: "Success with Hope (Total ≥ Difficulty, Hope > Fear)",
    effect: "You achieve what you set out to do, and you gain 1 Hope."
  },
  {
    outcome: "Success with Fear (Total ≥ Difficulty, Fear > Hope)",
    effect: "You succeed, but with a cost or complication. The GM gains 1 Fear and may take the Spotlight."
  },
  {
    outcome: "Failure with Hope (Total < Difficulty, Hope > Fear)",
    effect: "Things don't go as planned and the GM makes a move, but you still gain 1 Hope."
  },
  {
    outcome: "Failure with Fear (Total < Difficulty, Fear > Hope)",
    effect: "Things go badly wrong! The GM gains 1 Fear and makes a major GM move."
  }
];

export const DAGGERHEART_DOWNTIME_MOVES = [
  {
    move: "Tend to Wounds",
    shortRest: "Clear 1d4 + Tier Hit Points for yourself or an ally.",
    longRest: "Clear all Hit Points for yourself or an ally."
  },
  {
    move: "Clear Stress",
    shortRest: "Clear 1d4 + Tier Stress.",
    longRest: "Clear all Stress."
  },
  {
    move: "Repair Armor",
    shortRest: "Clear 1d4 + Tier Armor Slots on your or an ally's armor.",
    longRest: "Clear all Armor Slots on your or an ally's armor."
  },
  {
    move: "Prepare",
    shortRest: "Gain 1 Hope (or 2 Hope each if preparing with at least one party member).",
    longRest: "Gain 1 Hope (or 2 Hope each if preparing with at least one party member)."
  },
  {
    move: "Work on a Project",
    shortRest: "Advance a long-term project countdown clock.",
    longRest: "Advance a long-term project countdown clock."
  }
];

export function getDaggerheartTierForLevel(levelRaw) {
  const lvl = Math.max(1, Math.min(10, parseInt(levelRaw, 10) || 1));
  if (lvl === 1) return "Tier 1";
  if (lvl <= 4) return "Tier 2";
  if (lvl <= 7) return "Tier 3";
  return "Tier 4";
}

export function getDaggerheartBattlePointCost(adversaryType) {
  const found = DAGGERHEART_ADVERSARY_TYPES.find(
    (t) => t.type.toLowerCase() === String(adversaryType || "").toLowerCase()
  );
  return found ? found.points : 2;
}

export function calculateDaggerheartBattlePoints(pcCount = 4, adversaries = []) {
  const pcs = Math.max(1, parseInt(pcCount, 10) || 4);
  const budget = 3 * pcs + 2;
  const activeAdversaries = adversaries.filter((a) => a.name && a.name.trim());
  const spent = activeAdversaries.reduce((sum, a) => {
    const explicit = parseInt(a.battlePoints, 10);
    if (!isNaN(explicit) && explicit > 0) return sum + explicit;
    return sum + getDaggerheartBattlePointCost(a.adversaryType);
  }, 0);

  let rating = "Balanced";
  if (activeAdversaries.length === 0) rating = "No Adversaries";
  else if (spent < budget - 3) rating = "Light Skirmish";
  else if (spent <= budget) rating = "Standard Encounter";
  else if (spent <= budget + 3) rating = "Challenging";
  else rating = "Climactic / Deadly";

  return {
    budget,
    spent,
    remaining: budget - spent,
    rating
  };
}
