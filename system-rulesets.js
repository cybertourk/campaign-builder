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
    shortLabel: "Coming Soon",
    available: false,
    description: "Duality Dice, Hope & Fear trackers, Evasion, Armor Slots, Stress, and Domain Cards."
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
