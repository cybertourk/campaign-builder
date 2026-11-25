// chapter-characters.js
// Dedicated interactive workbook for Chapter 9: Character Sheets.
// Supports Universal Core as well as full D&D 5e enhancements (auto-calculated ability
// modifiers, proficiency & expertise skill/save math, Spellcasting DC/Attack/Slots 1–9,
// Class Features / Racial Traits / Feats, and 3-Slot Magic Item Attunement tracker).

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  parseAbilityScore,
  parseBonus,
  formatSigned
} from "./system-rulesets.js";

export const CHARACTERS_TABS = [
  { id: "party-roster", label: "Party Character Sheets", icon: "user-check" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

const ABILITY_LIST = [
  { key: "strength", label: "Strength", abbr: "STR" },
  { key: "dexterity", label: "Dexterity", abbr: "DEX" },
  { key: "constitution", label: "Constitution", abbr: "CON" },
  { key: "intelligence", label: "Intelligence", abbr: "INT" },
  { key: "wisdom", label: "Wisdom", abbr: "WIS" },
  { key: "charisma", label: "Charisma", abbr: "CHA" }
];

const SKILLS_LIST = [
  { key: "acrobatics", label: "Acrobatics", stat: "DEX", statKey: "dexterity" },
  { key: "animalHandling", label: "Animal Handling", stat: "WIS", statKey: "wisdom" },
  { key: "arcana", label: "Arcana", stat: "INT", statKey: "intelligence" },
  { key: "athletics", label: "Athletics", stat: "STR", statKey: "strength" },
  { key: "deception", label: "Deception", stat: "CHA", statKey: "charisma" },
  { key: "history", label: "History", stat: "INT", statKey: "intelligence" },
  { key: "insight", label: "Insight", stat: "WIS", statKey: "wisdom" },
  { key: "intimidation", label: "Intimidation", stat: "CHA", statKey: "charisma" },
  { key: "investigation", label: "Investigation", stat: "INT", statKey: "intelligence" },
  { key: "medicine", label: "Medicine", stat: "WIS", statKey: "wisdom" },
  { key: "nature", label: "Nature", stat: "INT", statKey: "intelligence" },
  { key: "perception", label: "Perception", stat: "WIS", statKey: "wisdom" },
  { key: "performance", label: "Performance", stat: "CHA", statKey: "charisma" },
  { key: "persuasion", label: "Persuasion", stat: "CHA", statKey: "charisma" },
  { key: "religion", label: "Religion", stat: "INT", statKey: "intelligence" },
  { key: "sleightOfHand", label: "Sleight of Hand", stat: "DEX", statKey: "dexterity" },
  { key: "stealth", label: "Stealth", stat: "DEX", statKey: "dexterity" },
  { key: "survival", label: "Survival", stat: "WIS", statKey: "wisdom" }
];

let activeCharactersTab = "party-roster";
let selectedCharacterIndex = 0;

function getDefaultCharactersData() {
  return {
    characters: [],
    miscNotes: ""
  };
}

function createBlankSpellSlots() {
  const slots = {};
  for (let lvl = 1; lvl <= 9; lvl++) {
    slots[lvl] = { total: 0, used: [false, false, false, false] };
  }
  return slots;
}

function createBlankCharacter(index) {
  const saves = {};
  ABILITY_LIST.forEach((a) => {
    saves[a.key] = { prof: false, val: "" };
  });

  const skills = {};
  SKILLS_LIST.forEach((s) => {
    skills[s.key] = { prof: false, expertise: false, val: "" };
  });

  return {
    characterName: `Character ${index}`,
    imageUrl: "",
    classAndLevel: "",
    playerName: "",
    race: "",
    alignment: "",
    background: "",
    experiencePoints: "",
    height: "",
    weight: "",
    skin: "",
    hair: "",
    armorClass: "",
    initiative: "",
    speed: "",
    passiveWisdom: "",
    inspiration: "",
    proficiencyBonus: "+2",
    strength: "",
    dexterity: "",
    constitution: "",
    intelligence: "",
    wisdom: "",
    charisma: "",
    saves,
    skills,
    hpMax: "",
    hpCurrent: "",
    hpTemp: "",
    hitDiceTotal: "",
    hitDice: "",
    deathSuccess1: false,
    deathSuccess2: false,
    deathSuccess3: false,
    deathFailure1: false,
    deathFailure2: false,
    deathFailure3: false,
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    attacks: [
      { name: "", atkBonus: "", damageType: "" },
      { name: "", atkBonus: "", damageType: "" },
      { name: "", atkBonus: "", damageType: "" }
    ],
    cp: "",
    sp: "",
    ep: "",
    gp: "",
    pp: "",
    equipment: "",
    languagesProficiencies: "",
    alliesOrganizations: "",
    // D&D 5e Enhanced Fields
    spellcastingAbility: "",
    spellSaveDc: "",
    spellAttackBonus: "",
    spellSlots: createBlankSpellSlots(),
    spellNotes: "",
    classFeatures: "",
    racialTraits: "",
    feats: "",
    attunements: [
      { active: false, name: "" },
      { active: false, name: "" },
      { active: false, name: "" }
    ]
  };
}

/**
 * Computes live 5e modifiers, save totals, skill totals, passive perception, and spell DC/attack.
 */
function compute5eDerivedStats(ch) {
  const mods = {};
  ABILITY_LIST.forEach((a) => {
    const parsed = parseAbilityScore(ch[a.key]);
    mods[a.key] = parsed ? parsed.mod : 0;
  });
  const profBonus = parseBonus(ch.proficiencyBonus);

  const calcSaves = {};
  ABILITY_LIST.forEach((a) => {
    const sv = ch.saves?.[a.key] || { prof: false };
    calcSaves[a.key] = formatSigned(mods[a.key] + (sv.prof ? profBonus : 0));
  });

  const calcSkills = {};
  SKILLS_LIST.forEach((sk) => {
    const skObj = ch.skills?.[sk.key] || { prof: false, expertise: false };
    const bonus =
      mods[sk.statKey] +
      (skObj.prof ? profBonus : 0) +
      (skObj.expertise ? profBonus : 0);
    calcSkills[sk.key] = formatSigned(bonus);
  });

  const percSkill = ch.skills?.perception || { prof: false, expertise: false };
  const autoPassive =
    10 +
    mods.wisdom +
    (percSkill.prof ? profBonus : 0) +
    (percSkill.expertise ? profBonus : 0);

  const spellAbilityKey = ch.spellcastingAbility || "";
  const spellMod = spellAbilityKey && mods[spellAbilityKey] !== undefined ? mods[spellAbilityKey] : 0;
  const autoSpellDc = spellAbilityKey ? 8 + profBonus + spellMod : "";
  const autoSpellAtk = spellAbilityKey ? formatSigned(profBonus + spellMod) : "";

  return {
    mods,
    profBonus,
    calcSaves,
    calcSkills,
    autoPassive,
    autoSpellDc,
    autoSpellAtk
  };
}

export function renderCharactersChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeCharactersTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const existingDoc = state.entities.find((e) => e.type === "character-sheets");
  const data = {
    ...getDefaultCharactersData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.characters)) data.characters = [];

  if (selectedCharacterIndex >= data.characters.length) {
    selectedCharacterIndex = Math.max(0, data.characters.length - 1);
  }

  const currentSection =
    CHARACTERS_TABS.find((t) => t.id === activeCharactersTab) || CHARACTERS_TABS[0];

  paneContainer.innerHTML = `
    <!-- Chapter & Active Section Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="${currentSection.icon}" class="w-5 h-5 text-indigo-400"></i>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl font-bold text-white">${escapeHtml(currentSection.label)}</h1>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              Chapter 9: Character Sheets${dndMode ? " • D&D 5e" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dndMode
                ? "Full D&D 5e character sheets with auto-calculated modifiers, skills, spell slots (1–9), class features, and attunement."
                : "Manage player character sheets, ability scores, saving throws, skills, attacks, equipment, and portraits."
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="chars-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-chars-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Characters
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderCharactersTabContent(activeCharactersTab, data, dndMode)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="character-sheets"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectCharactersForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#chars-save-status");
  paneContainer.querySelectorAll("input, textarea, select").forEach((el) => {
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeCharactersTab === "party-roster") {
    wireCharacterControls(paneContainer, state, existingDoc, data, dndMode);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-chars-btn").addEventListener("click", async () => {
    collectCharactersForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary =
      data.characters.length > 0
        ? `Party: ${data.characters.map((c) => c.characterName || "Unnamed").join(", ")}`
        : "Character Sheets";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Character Sheets",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "character-sheets",
          title: "Character Sheets",
          content: summary,
          systemData: data
        });
      }
      statusEl.textContent = "Saved to cloud";
      statusEl.className = "text-xs text-emerald-400";
    } catch (err) {
      statusEl.textContent = "Save failed";
      statusEl.className = "text-xs text-rose-400";
    }
  });
}

function renderCharactersTabContent(tabId, data, dndMode) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Character Sheets — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Keep track of party marching order, shared loot, passive perception notes, or character arc ideas.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Party & Character Notes</label>
          <textarea data-chars-misc="miscNotes" rows="12"
            placeholder="Write party notes, house character creation rules, or personal quest reminders here..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
        </div>
      </div>
    `;
  }

  const characters = data.characters || [];
  const activeChar = characters[selectedCharacterIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Party Roster & Character Sheets</h3>
        <p class="text-xs text-slate-400">Add player characters or key companions with full character sheets and portraits.</p>
      </div>
      <button type="button" id="add-char-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Character
      </button>
    </div>

    ${
      characters.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="user-check" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Character Sheets Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Character" to create a character sheet.</p>
          </div>
        `
        : `
          <!-- Character Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${characters
              .map(
                (ch, i) => `
              <button type="button" data-char-idx="${i}" class="select-char-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedCharacterIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(ch.characterName || `Character #${i + 1}`)}${ch.classAndLevel ? ` (${escapeHtml(ch.classAndLevel)})` : ""}
              </button>
            `
              )
              .join("")}
          </div>

          ${activeChar ? renderFullCharacterSheet(activeChar, dndMode) : ""}
        `
    }
  `;
}

function renderFullCharacterSheet(ch, dndMode) {
  const saves = ch.saves || {};
  const skills = ch.skills || {};
  const attacks = Array.isArray(ch.attacks) ? ch.attacks : [];
  const spellSlots = ch.spellSlots || createBlankSpellSlots();
  const attunements = Array.isArray(ch.attunements)
    ? ch.attunements
    : [
        { active: false, name: "" },
        { active: false, name: "" },
        { active: false, name: "" }
      ];
  const derived = compute5eDerivedStats(ch);
  const activeAttunementCount = attunements.filter((a) => a.active).length;

  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-6">
      <!-- Top Header: Character Name & Remove -->
      <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-4 flex-wrap">
        <div class="flex-1 min-w-[200px]">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Character Name</label>
          <input type="text" data-char-field="characterName" value="${escapeHtml(ch.characterName || "")}"
            placeholder="e.g., Thalion Duskwalker"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div class="flex items-center gap-2 self-end">
          ${
            dndMode
              ? `<button type="button" id="recalc-5e-stats-btn"
                  title="Auto-fill Saving Throws, Skills, Passive Perception, and Spell DC/Attack from your Ability Scores & Proficiency Bonus"
                  class="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-2 rounded-lg border border-slate-700 transition font-medium">
                  Auto-Fill 5e Bonuses
                </button>`
              : ""
          }
          <button type="button" id="delete-char-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-2 rounded-lg border border-slate-800 hover:border-rose-800/60 transition">
            Remove Character
          </button>
        </div>
      </div>

      <!-- Character Portrait Image URL & Preview -->
      <div class="space-y-2.5">
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Character Portrait Image URL (Optional)
        </label>
        <input type="url" data-char-field="imageUrl" value="${escapeHtml(ch.imageUrl || "")}"
          placeholder="https://... (Paste a character portrait, token, or HeroForge image link)"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        <div id="char-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
          ${
            ch.imageUrl
              ? `<img src="${escapeHtml(ch.imageUrl)}" alt="Character Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" />`
              : `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the character portrait here.</p>`
          }
        </div>
      </div>

      <!-- Identity Metadata -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Class & Level</label>
          <input type="text" data-char-field="classAndLevel" value="${escapeHtml(ch.classAndLevel || "")}"
            placeholder="e.g., Ranger 5"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Player Name</label>
          <input type="text" data-char-field="playerName" value="${escapeHtml(ch.playerName || "")}"
            placeholder="Player's name"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">${dndMode ? "Species / Race" : "Race / Ancestry"}</label>
          <input type="text" data-char-field="race" value="${escapeHtml(ch.race || "")}"
            placeholder="e.g., Wood Elf"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Background</label>
          <input type="text" data-char-field="background" value="${escapeHtml(ch.background || "")}"
            placeholder="e.g., Outlander"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Alignment</label>
          <input type="text" data-char-field="alignment" value="${escapeHtml(ch.alignment || "")}"
            placeholder="e.g., Chaotic Good"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Experience Points</label>
          <input type="text" data-char-field="experiencePoints" value="${escapeHtml(ch.experiencePoints || "")}"
            placeholder="e.g., 6,500 XP"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <!-- Appearance Row -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Height</label>
          <input type="text" data-char-field="height" value="${escapeHtml(ch.height || "")}" placeholder="e.g., 5'11&quot;"
            class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Weight</label>
          <input type="text" data-char-field="weight" value="${escapeHtml(ch.weight || "")}" placeholder="e.g., 165 lbs"
            class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Skin</label>
          <input type="text" data-char-field="skin" value="${escapeHtml(ch.skin || "")}" placeholder="Skin tone / markings"
            class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Hair</label>
          <input type="text" data-char-field="hair" value="${escapeHtml(ch.hair || "")}" placeholder="Hair color / style"
            class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <!-- Combat Vitals Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Armor Class</label>
          <input type="text" data-char-field="armorClass" value="${escapeHtml(ch.armorClass || "")}" placeholder="16"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Initiative</label>
          <input type="text" data-char-field="initiative" value="${escapeHtml(ch.initiative || "")}"
            placeholder="${dndMode ? formatSigned(derived.mods.dexterity) : "+3"}"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Speed</label>
          <input type="text" data-char-field="speed" value="${escapeHtml(ch.speed || "")}" placeholder="30 ft."
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Passive Perc. ${dndMode ? `(${derived.autoPassive})` : ""}
          </label>
          <input type="text" data-char-field="passiveWisdom" value="${escapeHtml(ch.passiveWisdom || "")}"
            placeholder="${dndMode ? String(derived.autoPassive) : "14"}"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">${dndMode ? "Heroic Insp." : "Inspiration"}</label>
          <input type="text" data-char-field="inspiration" value="${escapeHtml(ch.inspiration || "")}" placeholder="0 / Yes"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300 focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Prof. Bonus</label>
          <input type="text" data-char-field="proficiencyBonus" value="${escapeHtml(ch.proficiencyBonus || "")}" placeholder="+2"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-indigo-300 focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <!-- Main Grid: Ability Scores + Saving Throws + Skills (Left) | HP + Death Saves + Personality (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <!-- Left 6 Columns -->
        <div class="lg:col-span-6 space-y-4">
          <!-- 6 Ability Scores with Live 5e Modifier Badges -->
          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
            ${ABILITY_LIST.map((a) => {
              const parsed = parseAbilityScore(ch[a.key]);
              return `
                <div class="text-center">
                  <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">${a.abbr}</label>
                  <input type="text" data-char-field="${a.key}" value="${escapeHtml(ch[a.key] || "")}"
                    placeholder="10"
                    class="w-full px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-semibold text-center text-white focus:outline-none focus:border-indigo-500" />
                  ${
                    dndMode
                      ? `<div class="mt-1 text-[11px] font-bold text-indigo-300">${parsed ? parsed.modStr : "+0"}</div>`
                      : ""
                  }
                </div>
              `;
            }).join("")}
          </div>

          <!-- Saving Throws -->
          <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Saving Throws</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              ${ABILITY_LIST.map((a) => {
                const sv = saves[a.key] || { prof: false, val: "" };
                const placeholderVal = dndMode ? derived.calcSaves[a.key] : "+0";
                return `
                  <div class="flex items-center gap-2 bg-slate-950/80 border border-slate-800/80 rounded-lg px-2.5 py-1.5">
                    <input type="checkbox" data-save-prof="${a.key}" ${sv.prof ? "checked" : ""} title="Proficient"
                      class="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                    <input type="text" data-save-val="${a.key}" value="${escapeHtml(sv.val || "")}" placeholder="${placeholderVal}"
                      class="w-11 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-indigo-500" />
                    <span class="text-xs text-slate-200">${a.label}</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>

          <!-- 18 Skills (with Proficiency & 5e Expertise checkboxes) -->
          <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between mb-2">
              <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Skills</h4>
              ${dndMode ? `<span class="text-[10px] text-slate-400">Prof • Exp (2x)</span>` : ""}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              ${SKILLS_LIST.map((sk) => {
                const skObj = skills[sk.key] || { prof: false, expertise: false, val: "" };
                const placeholderVal = dndMode ? derived.calcSkills[sk.key] : "+0";
                return `
                  <div class="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800/70 rounded-lg px-2 py-1">
                    <input type="checkbox" data-skill-prof="${sk.key}" ${skObj.prof ? "checked" : ""} title="Proficiency"
                      class="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500" />
                    ${
                      dndMode
                        ? `<input type="checkbox" data-skill-exp="${sk.key}" ${skObj.expertise ? "checked" : ""} title="Expertise (2x Proficiency)"
                            class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500" />`
                        : ""
                    }
                    <input type="text" data-skill-val="${sk.key}" value="${escapeHtml(skObj.val || "")}" placeholder="${placeholderVal}"
                      class="w-10 px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-indigo-500" />
                    <span class="text-xs text-slate-200 truncate">${sk.label}</span>
                    <span class="text-[10px] text-slate-500 ml-auto">(${sk.stat})</span>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <!-- Right 6 Columns -->
        <div class="lg:col-span-6 space-y-4">
          <!-- Hit Points & Death Saves Box -->
          <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Hit Points & Death Saves</h4>
            <div class="grid grid-cols-3 gap-2.5">
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 mb-1">Hit Point Maximum</label>
                <input type="text" data-char-field="hpMax" value="${escapeHtml(ch.hpMax || "")}" placeholder="45"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 mb-1">Current Hit Points</label>
                <input type="text" data-char-field="hpCurrent" value="${escapeHtml(ch.hpCurrent || "")}" placeholder="45"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-emerald-300 focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold text-slate-400 mb-1">Temporary Hit Points</label>
                <input type="text" data-char-field="hpTemp" value="${escapeHtml(ch.hpTemp || "")}" placeholder="0"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div class="space-y-1.5">
                <label class="block text-[11px] font-semibold text-slate-400">Hit Dice (Total / Remaining)</label>
                <div class="grid grid-cols-2 gap-2">
                  <input type="text" data-char-field="hitDiceTotal" value="${escapeHtml(ch.hitDiceTotal || "")}" placeholder="Total (5d10)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                  <input type="text" data-char-field="hitDice" value="${escapeHtml(ch.hitDice || "")}" placeholder="Left (5)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="block text-[11px] font-semibold text-slate-400">Death Saves</label>
                <div class="flex items-center justify-between text-xs bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
                  <span class="text-emerald-400 font-medium">Successes</span>
                  <div class="flex items-center gap-1.5">
                    <input type="checkbox" data-char-check="deathSuccess1" ${ch.deathSuccess1 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-emerald-500" />
                    <input type="checkbox" data-char-check="deathSuccess2" ${ch.deathSuccess2 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-emerald-500" />
                    <input type="checkbox" data-char-check="deathSuccess3" ${ch.deathSuccess3 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-emerald-500" />
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs bg-slate-950 border border-slate-800 rounded px-2.5 py-1">
                  <span class="text-rose-400 font-medium">Failures</span>
                  <div class="flex items-center gap-1.5">
                    <input type="checkbox" data-char-check="deathFailure1" ${ch.deathFailure1 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-rose-500" />
                    <input type="checkbox" data-char-check="deathFailure2" ${ch.deathFailure2 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-rose-500" />
                    <input type="checkbox" data-char-check="deathFailure3" ${ch.deathFailure3 ? "checked" : ""} class="rounded bg-slate-900 border-slate-700 text-rose-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          ${
            dndMode
              ? `
                <!-- D&D 5e Attunement Tracker (0 / 3) -->
                <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Magic Item Attunement</h4>
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-950 text-amber-300 border border-slate-800">
                      ${activeAttunementCount} / 3 Attuned
                    </span>
                  </div>
                  <div class="space-y-1.5">
                    ${[0, 1, 2]
                      .map((slotIdx) => {
                        const att = attunements[slotIdx] || { active: false, name: "" };
                        return `
                          <div class="flex items-center gap-2">
                            <input type="checkbox" data-attune-check="${slotIdx}" ${att.active ? "checked" : ""}
                              class="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500" />
                            <input type="text" data-attune-name="${slotIdx}" value="${escapeHtml(att.name || "")}"
                              placeholder="Attuned Magic Item #${slotIdx + 1}..."
                              class="flex-1 px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              `
              : ""
          }

          <!-- Personality Traits, Ideals, Bonds, Flaws -->
          <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Personality & Background</h4>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Personality Traits</label>
              <textarea data-char-field="personalityTraits" rows="2" placeholder="Quirks, demeanor, habits..."
                class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.personalityTraits || "")}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Ideals</label>
              <textarea data-char-field="ideals" rows="2" placeholder="Core beliefs, principles, moral code..."
                class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.ideals || "")}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Bonds</label>
              <textarea data-char-field="bonds" rows="2" placeholder="People, places, oaths, or relics they protect..."
                class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.bonds || "")}</textarea>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Flaws</label>
              <textarea data-char-field="flaws" rows="2" placeholder="Weaknesses, vices, fears, secrets..."
                class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.flaws || "")}</textarea>
            </div>
          </div>
        </div>
      </div>

      ${
        dndMode
          ? `
            <!-- D&D 5e Spellcasting & Spell Slots (Levels 1–9) -->
            <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <h4 class="text-xs font-bold uppercase tracking-wider text-purple-400">D&amp;D 5e Spellcasting &amp; Spell Slots</h4>
                <span class="text-[11px] text-slate-400">Check boxes to mark expended slots during combat</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1">Spellcasting Ability</label>
                  <select data-char-field="spellcastingAbility"
                    class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500">
                    <option value="" ${!ch.spellcastingAbility ? "selected" : ""}>None / Non-Caster</option>
                    <option value="intelligence" ${ch.spellcastingAbility === "intelligence" ? "selected" : ""}>Intelligence (Wizard, Artificer)</option>
                    <option value="wisdom" ${ch.spellcastingAbility === "wisdom" ? "selected" : ""}>Wisdom (Cleric, Druid, Ranger)</option>
                    <option value="charisma" ${ch.spellcastingAbility === "charisma" ? "selected" : ""}>Charisma (Bard, Paladin, Sorcerer, Warlock)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                    Spell Save DC ${derived.autoSpellDc ? `(Auto: ${derived.autoSpellDc})` : ""}
                  </label>
                  <input type="text" data-char-field="spellSaveDc" value="${escapeHtml(ch.spellSaveDc || "")}"
                    placeholder="${derived.autoSpellDc ? String(derived.autoSpellDc) : "14"}"
                    class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold text-slate-400 mb-1">
                    Spell Attack Bonus ${derived.autoSpellAtk ? `(Auto: ${derived.autoSpellAtk})` : ""}
                  </label>
                  <input type="text" data-char-field="spellAttackBonus" value="${escapeHtml(ch.spellAttackBonus || "")}"
                    placeholder="${derived.autoSpellAtk || "+6"}"
                    class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <!-- 1st–9th Level Spell Slot Grid -->
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                ${Array.from({ length: 9 }, (_, idx) => {
                  const lvl = idx + 1;
                  const slotObj = spellSlots[lvl] || { total: 0, used: [false, false, false, false] };
                  const total = Math.max(0, Math.min(4, Number(slotObj.total) || 0));
                  const usedArr = Array.isArray(slotObj.used) ? slotObj.used : [false, false, false, false];
                  return `
                    <div class="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-center space-y-1.5">
                      <div class="text-[10px] font-bold uppercase text-indigo-400">Lvl ${lvl}</div>
                      <select data-slot-total="${lvl}"
                        class="w-full px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-center text-white">
                        ${[0, 1, 2, 3, 4]
                          .map((n) => `<option value="${n}" ${total === n ? "selected" : ""}>${n} slots</option>`)
                          .join("")}
                      </select>
                      <div class="flex items-center justify-center gap-1 min-h-[18px]">
                        ${
                          total === 0
                            ? `<span class="text-[10px] text-slate-500">—</span>`
                            : Array.from({ length: total }, (_, sIdx) => `
                                <input type="checkbox" data-slot-used-lvl="${lvl}" data-slot-used-idx="${sIdx}"
                                  ${usedArr[sIdx] ? "checked" : ""} title="Expended Slot ${sIdx + 1}"
                                  class="rounded border-slate-700 bg-slate-900 text-purple-500" />
                              `).join("")
                        }
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>

              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Prepared Spells, Cantrips &amp; Pact Magic Notes</label>
                <textarea data-char-field="spellNotes" rows="3"
                  placeholder="Cantrips: Fire Bolt, Mage Hand, Prestidigitation | 1st: Shield, Magic Missile, Bless..."
                  class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.spellNotes || "")}</textarea>
              </div>
            </div>

            <!-- D&D 5e Class Features, Species Traits & Feats -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Class &amp; Subclass Features</label>
                <textarea data-char-field="classFeatures" rows="4"
                  placeholder="Second Wind, Action Surge, Sneak Attack (3d6), Wild Shape, Channel Divinity..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.classFeatures || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Species / Racial Traits</label>
                <textarea data-char-field="racialTraits" rows="4"
                  placeholder="Darkvision 60 ft., Fey Ancestry, Trance, Stonecunning, Breath Weapon..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.racialTraits || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Feats &amp; Fighting Styles</label>
                <textarea data-char-field="feats" rows="4"
                  placeholder="Alert, War Caster, Sharpshooter, Sentinel, Defense Fighting Style..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.feats || "")}</textarea>
              </div>
            </div>
          `
          : ""
      }

      <!-- Bottom Grid: Attacks & Spellcasting + Equipment & Coinage -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-800/80">
        <!-- Attacks & Spellcasting -->
        <div class="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">Attacks &amp; Weapon Actions</h4>
            <button type="button" id="add-char-attack-btn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700 transition">
              + Add Row
            </button>
          </div>
          <div class="grid grid-cols-12 gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
            <div class="col-span-5">Name</div>
            <div class="col-span-3">ATK Bonus</div>
            <div class="col-span-3">Damage / Type</div>
            <div class="col-span-1"></div>
          </div>
          <div class="space-y-1.5">
            ${attacks
              .map(
                (atk, aIdx) => `
              <div class="grid grid-cols-12 gap-1.5 items-center">
                <input type="text" data-atk-idx="${aIdx}" data-atk-field="name" value="${escapeHtml(atk.name || "")}" placeholder="Longbow"
                  class="col-span-5 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                <input type="text" data-atk-idx="${aIdx}" data-atk-field="atkBonus" value="${escapeHtml(atk.atkBonus || "")}" placeholder="+7"
                  class="col-span-3 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-white focus:outline-none focus:border-indigo-500" />
                <input type="text" data-atk-idx="${aIdx}" data-atk-field="damageType" value="${escapeHtml(atk.damageType || "")}" placeholder="1d8+4 Piercing"
                  class="col-span-3 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                <button type="button" data-del-atk="${aIdx}" class="del-char-atk-btn col-span-1 text-slate-500 hover:text-rose-400 flex justify-center">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Equipment & Coinage -->
        <div class="lg:col-span-6 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
          <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Equipment &amp; Currency</h4>
          <div class="grid grid-cols-5 gap-2">
            ${[
              ["cp", "CP"],
              ["sp", "SP"],
              ["ep", "EP"],
              ["gp", "GP"],
              ["pp", "PP"]
            ]
              .map(
                ([coinKey, coinLabel]) => `
              <div class="text-center">
                <label class="block text-[10px] font-bold uppercase text-amber-300/80 mb-0.5">${coinLabel}</label>
                <input type="text" data-char-field="${coinKey}" value="${escapeHtml(ch[coinKey] || "")}" placeholder="0"
                  class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-semibold text-center text-white focus:outline-none focus:border-indigo-500" />
              </div>
            `
              )
              .join("")}
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Equipment &amp; Inventory</label>
            <textarea data-char-field="equipment" rows="5" placeholder="Weapons, armor, packs, potions, magical trinkets..."
              class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.equipment || "")}</textarea>
          </div>
        </div>
      </div>

      <!-- Bottom Row: Languages/Proficiencies + Allies/Organizations -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Languages / Proficiencies</label>
          <textarea data-char-field="languagesProficiencies" rows="4"
            placeholder="Known languages, armor/weapon proficiencies, tools, instruments..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.languagesProficiencies || "")}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Allies / Organizations</label>
          <textarea data-char-field="alliesOrganizations" rows="4"
            placeholder="Faction memberships, patrons, contacts, mounts, companions..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(ch.alliesOrganizations || "")}</textarea>
        </div>
      </div>
    </div>
  `;
}

function wireCharacterControls(paneContainer, state, existingDoc, data, dndMode) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "character-sheets", title: "Character Sheets", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "character-sheets");
    renderCharactersChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-char-btn")?.addEventListener("click", () => {
    collectCharactersForm(paneContainer, data);
    data.characters.push(createBlankCharacter(data.characters.length + 1));
    selectedCharacterIndex = data.characters.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-char-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectCharactersForm(paneContainer, data);
      selectedCharacterIndex = Number(btn.getAttribute("data-char-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-char-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.characters.splice(selectedCharacterIndex, 1);
    selectedCharacterIndex = Math.max(0, selectedCharacterIndex - 1);
    rerenderWithLocalData();
  });

  // D&D 5e Auto-Fill Bonuses button
  paneContainer.querySelector("#recalc-5e-stats-btn")?.addEventListener("click", () => {
    collectCharactersForm(paneContainer, data);
    const ch = data.characters[selectedCharacterIndex];
    if (!ch) return;
    const derived = compute5eDerivedStats(ch);
    ABILITY_LIST.forEach((a) => {
      if (!ch.saves) ch.saves = {};
      if (!ch.saves[a.key]) ch.saves[a.key] = { prof: false, val: "" };
      ch.saves[a.key].val = derived.calcSaves[a.key];
    });
    SKILLS_LIST.forEach((sk) => {
      if (!ch.skills) ch.skills = {};
      if (!ch.skills[sk.key]) ch.skills[sk.key] = { prof: false, expertise: false, val: "" };
      ch.skills[sk.key].val = derived.calcSkills[sk.key];
    });
    ch.passiveWisdom = String(derived.autoPassive);
    if (!ch.initiative) ch.initiative = formatSigned(derived.mods.dexterity);
    if (derived.autoSpellDc) ch.spellSaveDc = String(derived.autoSpellDc);
    if (derived.autoSpellAtk) ch.spellAttackBonus = derived.autoSpellAtk;
    rerenderWithLocalData();
  });

  // Re-render spell slots grid when total slots dropdown changes
  if (dndMode) {
    paneContainer.querySelectorAll("[data-slot-total]").forEach((sel) => {
      sel.addEventListener("change", () => {
        collectCharactersForm(paneContainer, data);
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelector('[data-char-field="spellcastingAbility"]')?.addEventListener("change", () => {
      collectCharactersForm(paneContainer, data);
      rerenderWithLocalData();
    });
  }

  // Add / Remove Attack rows
  paneContainer.querySelector("#add-char-attack-btn")?.addEventListener("click", () => {
    collectCharactersForm(paneContainer, data);
    const ch = data.characters[selectedCharacterIndex];
    if (ch) {
      if (!Array.isArray(ch.attacks)) ch.attacks = [];
      ch.attacks.push({ name: "", atkBonus: "", damageType: "" });
      rerenderWithLocalData();
    }
  });

  paneContainer.querySelectorAll(".del-char-atk-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const aIdx = Number(btn.getAttribute("data-del-atk"));
      collectCharactersForm(paneContainer, data);
      const ch = data.characters[selectedCharacterIndex];
      if (ch && Array.isArray(ch.attacks)) {
        ch.attacks.splice(aIdx, 1);
        rerenderWithLocalData();
      }
    });
  });

  // Live Character Portrait Image preview
  const imgInput = paneContainer.querySelector('[data-char-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#char-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (val) {
      imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Character Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the character portrait here.</p>`;
    }
  });
}

function collectCharactersForm(container, data) {
  container.querySelectorAll("[data-chars-misc]").forEach((el) => {
    data[el.getAttribute("data-chars-misc")] = el.value;
  });

  if (activeCharactersTab === "party-roster" && data.characters[selectedCharacterIndex]) {
    const ch = data.characters[selectedCharacterIndex];

    container.querySelectorAll("[data-char-field]").forEach((el) => {
      ch[el.getAttribute("data-char-field")] = el.value;
    });

    container.querySelectorAll("[data-char-check]").forEach((el) => {
      ch[el.getAttribute("data-char-check")] = el.checked;
    });

    if (!ch.saves) ch.saves = {};
    container.querySelectorAll("[data-save-prof]").forEach((el) => {
      const k = el.getAttribute("data-save-prof");
      if (!ch.saves[k]) ch.saves[k] = { prof: false, val: "" };
      ch.saves[k].prof = el.checked;
    });
    container.querySelectorAll("[data-save-val]").forEach((el) => {
      const k = el.getAttribute("data-save-val");
      if (!ch.saves[k]) ch.saves[k] = { prof: false, val: "" };
      ch.saves[k].val = el.value;
    });

    if (!ch.skills) ch.skills = {};
    container.querySelectorAll("[data-skill-prof]").forEach((el) => {
      const k = el.getAttribute("data-skill-prof");
      if (!ch.skills[k]) ch.skills[k] = { prof: false, expertise: false, val: "" };
      ch.skills[k].prof = el.checked;
    });
    container.querySelectorAll("[data-skill-exp]").forEach((el) => {
      const k = el.getAttribute("data-skill-exp");
      if (!ch.skills[k]) ch.skills[k] = { prof: false, expertise: false, val: "" };
      ch.skills[k].expertise = el.checked;
    });
    container.querySelectorAll("[data-skill-val]").forEach((el) => {
      const k = el.getAttribute("data-skill-val");
      if (!ch.skills[k]) ch.skills[k] = { prof: false, expertise: false, val: "" };
      ch.skills[k].val = el.value;
    });

    container.querySelectorAll("[data-atk-field]").forEach((el) => {
      const aIdx = Number(el.getAttribute("data-atk-idx"));
      const aField = el.getAttribute("data-atk-field");
      if (Array.isArray(ch.attacks) && ch.attacks[aIdx]) {
        ch.attacks[aIdx][aField] = el.value;
      }
    });

    // D&D 5e Spell Slots
    if (!ch.spellSlots) ch.spellSlots = createBlankSpellSlots();
    container.querySelectorAll("[data-slot-total]").forEach((el) => {
      const lvl = Number(el.getAttribute("data-slot-total"));
      if (!ch.spellSlots[lvl]) ch.spellSlots[lvl] = { total: 0, used: [false, false, false, false] };
      ch.spellSlots[lvl].total = Number(el.value) || 0;
    });
    container.querySelectorAll("[data-slot-used-lvl]").forEach((el) => {
      const lvl = Number(el.getAttribute("data-slot-used-lvl"));
      const sIdx = Number(el.getAttribute("data-slot-used-idx"));
      if (!ch.spellSlots[lvl]) ch.spellSlots[lvl] = { total: 0, used: [false, false, false, false] };
      if (!Array.isArray(ch.spellSlots[lvl].used)) ch.spellSlots[lvl].used = [false, false, false, false];
      ch.spellSlots[lvl].used[sIdx] = el.checked;
    });

    // D&D 5e Attunements
    if (!Array.isArray(ch.attunements)) {
      ch.attunements = [
        { active: false, name: "" },
        { active: false, name: "" },
        { active: false, name: "" }
      ];
    }
    container.querySelectorAll("[data-attune-check]").forEach((el) => {
      const idx = Number(el.getAttribute("data-attune-check"));
      if (ch.attunements[idx]) ch.attunements[idx].active = el.checked;
    });
    container.querySelectorAll("[data-attune-name]").forEach((el) => {
      const idx = Number(el.getAttribute("data-attune-name"));
      if (ch.attunements[idx]) ch.attunements[idx].name = el.value;
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
