// chapter-characters.js
// Dedicated interactive workbook for Chapter 9: Character Sheets.
// Organized with clean inner pill sub-tabs (Full Sheet, Stats & Combat, Gear & Cards,
// Story & Notes) so players and DMs can focus on one section or view everything on PC.

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  isDaggerheart,
  parseAbilityScore,
  parseBonus,
  formatSigned,
  DAGGERHEART_TRAITS,
  DAGGERHEART_CLASSES,
  DAGGERHEART_DOMAINS,
  DAGGERHEART_COMMUNITIES,
  DAGGERHEART_ANCESTRIES,
  getDaggerheartTierForLevel
} from "./system-rulesets.js";

export const CHARACTERS_TABS = [
  { id: "party-roster", label: "Hero Sheets", icon: "user-check" },
  { id: "misc-notes", label: "Party Notes", icon: "sticky-note" }
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
let activeCharSubView = "all"; // 'all' | 'stats' | 'gear' | 'story'
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
    ],
    dhPronouns: "",
    dhLevel: "1",
    dhClass: "",
    dhSubclass: "",
    dhMulticlass: "",
    dhCommunity: "",
    dhAncestry: "",
    dhEvasion: "10",
    dhArmorScore: "0",
    dhArmorSlotsTotal: "3",
    dhArmorSlotsMarked: [false, false, false, false, false, false],
    dhProficiency: "1",
    dhThresholdMajor: "5",
    dhThresholdSevere: "10",
    dhHpTotal: "6",
    dhHpMarked: [false, false, false, false, false, false, false, false, false, false],
    dhStressTotal: "6",
    dhStressMarked: [false, false, false, false, false, false, false, false],
    dhHopeCount: 2,
    dhTraits: {
      agility: "+0",
      strength: "+0",
      finesse: "+0",
      instinct: "+0",
      presence: "+0",
      knowledge: "+0"
    },
    dhExperiences: [
      { name: "", modifier: "+2" },
      { name: "", modifier: "+2" }
    ],
    dhPrimaryWeapon: { name: "", traitRange: "", damageDice: "", feature: "" },
    dhSecondaryWeapon: { name: "", traitRange: "", damageDice: "", feature: "" },
    dhActiveArmor: { name: "", baseThresholds: "", baseScore: "", feature: "" },
    dhGoldHandfuls: "1",
    dhGoldBags: "0",
    dhGoldChests: "0",
    dhDomainCards: [],
    dhClassHopeFeature: "",
    dhHeritageFeatures: "",
    dhConnectionsNotes: ""
  };
}

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

function renderCharSubtabBar(dhMode) {
  const tabs = [
    ["all", "layout-grid", "Full Sheet"],
    ["stats", "shield", dhMode ? "Traits & Vitals" : "Stats & Combat"],
    ["gear", "sword", dhMode ? "Weapons, Armor & Cards" : "Attacks, Spells & Gear"],
    ["story", "book-open", dhMode ? "Features & Connections" : "Features & Backstory"]
  ];

  return `
    <div class="rpg-subtab-bar">
      ${tabs
        .map(
          ([subId, icon, label]) => `
        <button type="button" data-char-subtab="${subId}"
          class="char-subtab-btn rpg-subtab-btn ${activeCharSubView === subId ? "is-active" : ""}">
          <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
          <span>${label}</span>
        </button>
      `
        )
        .join("")}
    </div>
  `;
}

export function renderCharactersChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeCharactersTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const dhMode = isDaggerheart(state);
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
              Phase I • Heroes & Party Roster${dhMode ? " • Daggerheart" : dndMode ? " • D&D 5e" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Daggerheart character sheets with 6 Traits, Hope/Stress/HP/Armor slot trackers, Damage Thresholds, Experiences, Weapons, and Domain Cards."
                : dndMode
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
      ${renderCharactersTabContent(activeCharactersTab, data, dndMode, dhMode)}
    </div>
  `;

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

  const statusEl = paneContainer.querySelector("#chars-save-status");
  paneContainer.querySelectorAll("input, textarea, select").forEach((el) => {
    const eventName = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeCharactersTab === "party-roster") {
    wireCharacterControls(paneContainer, state, existingDoc, data, dndMode, dhMode);
  }

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

function renderCharactersTabContent(tabId, data, dndMode, dhMode) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Character Sheets — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Keep track of party marching order, shared loot, passive perception notes, or character arc ideas.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Party &amp; Character Notes</label>
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
        <h3 class="text-sm font-bold text-white">Party Roster &amp; Character Sheets</h3>
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
          <div class="flex items-center gap-2 flex-wrap">
            ${characters
              .map((ch, i) => {
                const subLabel = dhMode
                  ? [ch.dhClass, ch.dhLevel ? `Lvl ${ch.dhLevel}` : ""].filter(Boolean).join(" ")
                  : ch.classAndLevel;
                return `
                  <button type="button" data-char-idx="${i}" class="select-char-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    i === selectedCharacterIndex
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                  }">
                    ${escapeHtml(ch.characterName || `Character #${i + 1}`)}${subLabel ? ` (${escapeHtml(subLabel)})` : ""}
                  </button>
                `;
              })
              .join("")}
          </div>

          ${
            activeChar
              ? dhMode
                ? renderDaggerheartCharacterSheet(activeChar)
                : renderFullCharacterSheet(activeChar, dndMode)
              : ""
          }
        `
    }
  `;
}

function renderFullCharacterSheet(ch, dndMode) {
  const derived = compute5eDerivedStats(ch);
  const attacks = Array.isArray(ch.attacks) ? ch.attacks : [];
  const spellSlots = ch.spellSlots || createBlankSpellSlots();
  const attunements = Array.isArray(ch.attunements)
    ? ch.attunements
    : [
        { active: false, name: "" },
        { active: false, name: "" },
        { active: false, name: "" }
      ];
  const attunedCount = attunements.filter((a) => a.active).length;

  const showStats = activeCharSubView === "all" || activeCharSubView === "stats";
  const showGear = activeCharSubView === "all" || activeCharSubView === "gear";
  const showStory = activeCharSubView === "all" || activeCharSubView === "story";

  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-6">
      <!-- Top Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-slate-800 pb-4">
        <div class="flex-1">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Character Name</label>
          <input type="text" data-char-field="characterName" value="${escapeHtml(ch.characterName || "")}"
            placeholder="e.g., Thalion Stormweaver"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${
            dndMode
              ? `<button type="button" id="recalc-5e-stats-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-3 py-2 rounded-lg border border-slate-700 font-semibold transition">
                  Auto-Fill 5e Bonuses
                </button>`
              : ""
          }
          <button type="button" id="delete-char-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-2 rounded-lg border border-slate-800 hover:border-rose-800/60 transition">
            Remove
          </button>
        </div>
      </div>

      ${renderCharSubtabBar(false)}

      <!-- Collapsible Portrait URL & Preview -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Character Portrait URL (Optional)</label>
        <input type="url" data-char-field="imageUrl" value="${escapeHtml(ch.imageUrl || "")}"
          placeholder="https://... (Paste a character illustration or token link)"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        <div id="char-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
          ${
            ch.imageUrl
              ? `<img src="${escapeHtml(ch.imageUrl)}" alt="Character Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" />`
              : `<p class="text-xs text-slate-500 py-3">Paste an image URL above to preview the character portrait here.</p>`
          }
        </div>
      </div>

      <!-- Identity Row -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Class &amp; Level</label>
          <input type="text" data-char-field="classAndLevel" value="${escapeHtml(ch.classAndLevel || "")}"
            placeholder="e.g., Paladin 5"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-semibold text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Player Name</label>
          <input type="text" data-char-field="playerName" value="${escapeHtml(ch.playerName || "")}"
            placeholder="Player's name"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Race / Species</label>
          <input type="text" data-char-field="race" value="${escapeHtml(ch.race || "")}"
            placeholder="e.g., Half-Elf"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Alignment</label>
          <input type="text" data-char-field="alignment" value="${escapeHtml(ch.alignment || "")}"
            placeholder="e.g., Chaotic Good"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Background</label>
          <input type="text" data-char-field="background" value="${escapeHtml(ch.background || "")}"
            placeholder="e.g., Noble, Outlander"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Experience Points</label>
          <input type="text" data-char-field="experiencePoints" value="${escapeHtml(ch.experiencePoints || "")}"
            placeholder="e.g., 6,500 XP"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-amber-300" />
        </div>
      </div>

      ${
        showStats
          ? `
            <!-- 6 Ability Scores -->
            <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
              ${ABILITY_LIST.map((ab) => {
                const parsed = parseAbilityScore(ch[ab.key]);
                return `
                  <div class="text-center">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">${ab.abbr}</label>
                    <input type="text" data-char-field="${ab.key}" value="${escapeHtml(ch[ab.key] || "")}"
                      placeholder="10"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm font-bold text-center text-white" />
                    <span class="block text-[11px] font-bold text-amber-300 mt-0.5">${parsed ? parsed.modStr : "+0"}</span>
                  </div>
                `;
              }).join("")}
            </div>

            <!-- Core Combat Vitals -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Armor Class</label>
                <input type="text" data-char-field="armorClass" value="${escapeHtml(ch.armorClass || "")}"
                  placeholder="16"
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Initiative</label>
                <input type="text" data-char-field="initiative" value="${escapeHtml(ch.initiative || "")}"
                  placeholder="${formatSigned(derived.mods.dexterity)}"
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Speed</label>
                <input type="text" data-char-field="speed" value="${escapeHtml(ch.speed || "")}"
                  placeholder="30 ft."
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Proficiency</label>
                <input type="text" data-char-field="proficiencyBonus" value="${escapeHtml(ch.proficiencyBonus || "+2")}"
                  placeholder="+2"
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Passive Perc.</label>
                <input type="text" data-char-field="passiveWisdom" value="${escapeHtml(ch.passiveWisdom || "")}"
                  placeholder="${derived.autoPassive}"
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-emerald-300" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Inspiration</label>
                <input type="text" data-char-field="inspiration" value="${escapeHtml(ch.inspiration || "")}"
                  placeholder="0 / 1"
                  class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-purple-300" />
              </div>
            </div>

            <!-- Hit Points, Hit Dice & Death Saves -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
              <div class="md:col-span-6 grid grid-cols-3 gap-2">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Max HP</label>
                  <input type="text" data-char-field="hpMax" value="${escapeHtml(ch.hpMax || "")}"
                    placeholder="44"
                    class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-emerald-300" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Current HP</label>
                  <input type="text" data-char-field="hpCurrent" value="${escapeHtml(ch.hpCurrent || "")}"
                    placeholder="44"
                    class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Temp HP</label>
                  <input type="text" data-char-field="hpTemp" value="${escapeHtml(ch.hpTemp || "")}"
                    placeholder="0"
                    class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300" />
                </div>
              </div>
              <div class="md:col-span-3 grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Total HD</label>
                  <input type="text" data-char-field="hitDiceTotal" value="${escapeHtml(ch.hitDiceTotal || "")}"
                    placeholder="5d10"
                    class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white" />
                </div>
                <div>
                  <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hit Dice</label>
                  <input type="text" data-char-field="hitDice" value="${escapeHtml(ch.hitDice || "")}"
                    placeholder="5d10"
                    class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white" />
                </div>
              </div>
              <div class="md:col-span-3 flex flex-col justify-center gap-1.5 text-xs">
                <div class="flex items-center justify-between">
                  <span class="text-emerald-400 font-semibold">Successes</span>
                  <div class="flex gap-1.5">
                    <input type="checkbox" data-char-check="deathSuccess1" ${ch.deathSuccess1 ? "checked" : ""} />
                    <input type="checkbox" data-char-check="deathSuccess2" ${ch.deathSuccess2 ? "checked" : ""} />
                    <input type="checkbox" data-char-check="deathSuccess3" ${ch.deathSuccess3 ? "checked" : ""} />
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-rose-400 font-semibold">Failures</span>
                  <div class="flex gap-1.5">
                    <input type="checkbox" data-char-check="deathFailure1" ${ch.deathFailure1 ? "checked" : ""} />
                    <input type="checkbox" data-char-check="deathFailure2" ${ch.deathFailure2 ? "checked" : ""} />
                    <input type="checkbox" data-char-check="deathFailure3" ${ch.deathFailure3 ? "checked" : ""} />
                  </div>
                </div>
              </div>
            </div>

            <!-- Saving Throws & Skills -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div class="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Saving Throws</h4>
                <div class="space-y-1.5">
                  ${ABILITY_LIST.map((ab) => {
                    const sv = ch.saves?.[ab.key] || { prof: false, val: "" };
                    return `
                      <div class="flex items-center justify-between gap-2 text-xs">
                        <label class="inline-flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" data-save-prof="${ab.key}" ${sv.prof ? "checked" : ""} />
                          <span class="text-slate-200">${ab.label}</span>
                        </label>
                        <input type="text" data-save-val="${ab.key}" value="${escapeHtml(sv.val || "")}"
                          placeholder="${derived.calcSaves[ab.key]}"
                          class="w-14 px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-center font-semibold text-white" />
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>

              <div class="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Skills (Proficiency &amp; Expertise)</h4>
                  <span class="text-[10px] text-slate-400">Prof • Exp • Bonus</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-4 gap-y-1.5">
                  ${SKILLS_LIST.map((sk) => {
                    const skObj = ch.skills?.[sk.key] || { prof: false, expertise: false, val: "" };
                    return `
                      <div class="flex items-center justify-between gap-1.5 text-xs">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <input type="checkbox" data-skill-prof="${sk.key}" ${skObj.prof ? "checked" : ""} title="Proficient" />
                          ${
                            dndMode
                              ? `<input type="checkbox" data-skill-exp="${sk.key}" ${skObj.expertise ? "checked" : ""} title="Expertise (2x Prof)" />`
                              : ""
                          }
                          <span class="truncate text-slate-200">${sk.label} <span class="text-[10px] text-slate-400">(${sk.stat})</span></span>
                        </div>
                        <input type="text" data-skill-val="${sk.key}" value="${escapeHtml(skObj.val || "")}"
                          placeholder="${derived.calcSkills[sk.key]}"
                          class="w-12 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs text-center font-semibold text-white shrink-0" />
                      </div>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          `
          : ""
      }

      ${
        showGear
          ? `
            <!-- Attacks & Spellcasting -->
            <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">Attacks &amp; Cantrips</h4>
                <button type="button" id="add-char-attack-btn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700">
                  + Add Attack
                </button>
              </div>
              <div class="space-y-1.5">
                ${attacks
                  .map(
                    (atk, aIdx) => `
                  <div class="grid grid-cols-12 gap-2 items-center">
                    <input type="text" data-atk-idx="${aIdx}" data-atk-field="name" value="${escapeHtml(atk.name || "")}"
                      placeholder="Weapon / Spell Name"
                      class="col-span-5 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-semibold text-white" />
                    <input type="text" data-atk-idx="${aIdx}" data-atk-field="atkBonus" value="${escapeHtml(atk.atkBonus || "")}"
                      placeholder="+7"
                      class="col-span-2 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-center text-amber-300 font-bold" />
                    <input type="text" data-atk-idx="${aIdx}" data-atk-field="damageType" value="${escapeHtml(atk.damageType || "")}"
                      placeholder="1d8+4 slashing"
                      class="col-span-4 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-rose-300" />
                    <button type="button" data-del-atk="${aIdx}" class="del-char-atk-btn col-span-1 text-slate-500 hover:text-rose-400 flex justify-center">
                      <i data-lucide="x" class="w-3.5 h-3.5"></i>
                    </button>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>

            ${
              dndMode
                ? `
                  <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-400 mb-1">Spellcasting Ability</label>
                        <select data-char-field="spellcastingAbility" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                          <option value="">None / Non-Caster</option>
                          <option value="intelligence" ${ch.spellcastingAbility === "intelligence" ? "selected" : ""}>Intelligence (INT)</option>
                          <option value="wisdom" ${ch.spellcastingAbility === "wisdom" ? "selected" : ""}>Wisdom (WIS)</option>
                          <option value="charisma" ${ch.spellcastingAbility === "charisma" ? "selected" : ""}>Charisma (CHA)</option>
                        </select>
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-400 mb-1">Spell Save DC</label>
                        <input type="text" data-char-field="spellSaveDc" value="${escapeHtml(ch.spellSaveDc || "")}"
                          placeholder="${derived.autoSpellDc || "13"}"
                          class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-purple-300" />
                      </div>
                      <div>
                        <label class="block text-[11px] font-semibold text-slate-400 mb-1">Spell Attack Bonus</label>
                        <input type="text" data-char-field="spellAttackBonus" value="${escapeHtml(ch.spellAttackBonus || "")}"
                          placeholder="${derived.autoSpellAtk || "+5"}"
                          class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-purple-300" />
                      </div>
                    </div>

                    <div class="grid grid-cols-3 sm:grid-cols-9 gap-2">
                      ${[1, 2, 3, 4, 5, 6, 7, 8, 9]
                        .map((lvl) => {
                          const slotObj = spellSlots[lvl] || { total: 0, used: [false, false, false, false] };
                          const total = Number(slotObj.total) || 0;
                          return `
                            <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2 text-center space-y-1">
                              <div class="text-[10px] font-bold uppercase text-purple-300">Lvl ${lvl}</div>
                              <select data-slot-total="${lvl}" class="w-full px-1 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-white">
                                ${[0, 1, 2, 3, 4]
                                  .map((n) => `<option value="${n}" ${total === n ? "selected" : ""}>${n}</option>`)
                                  .join("")}
                              </select>
                              <div class="flex justify-center gap-1 pt-0.5">
                                ${Array.from({ length: total }, (_, sIdx) => `
                                  <input type="checkbox" data-slot-used-lvl="${lvl}" data-slot-used-idx="${sIdx}"
                                    ${slotObj.used?.[sIdx] ? "checked" : ""} title="Expended Slot" />
                                `).join("")}
                              </div>
                            </div>
                          `;
                        })
                        .join("")}
                    </div>

                    <textarea data-char-field="spellNotes" rows="3"
                      placeholder="Prepared spells, cantrips, ritual spells, or domain/oath spells..."
                      class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.spellNotes || "")}</textarea>
                  </div>
                `
                : ""
            }

            <!-- Currency & Equipment -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div class="lg:col-span-4 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Coinage</h4>
                <div class="grid grid-cols-5 gap-1.5 text-center">
                  ${[
                    ["cp", "CP"],
                    ["sp", "SP"],
                    ["ep", "EP"],
                    ["gp", "GP"],
                    ["pp", "PP"]
                  ]
                    .map(
                      ([k, lbl]) => `
                    <div>
                      <label class="block text-[10px] font-bold text-slate-400 mb-1">${lbl}</label>
                      <input type="text" data-char-field="${k}" value="${escapeHtml(ch[k] || "")}"
                        placeholder="0"
                        class="w-full px-1 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-amber-300" />
                    </div>
                  `
                    )
                    .join("")}
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-300 mb-1 mt-2">Proficiencies &amp; Languages</label>
                  <textarea data-char-field="languagesProficiencies" rows="3"
                    placeholder="Armor, weapons, tools, saving throws, languages..."
                    class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-100">${escapeHtml(ch.languagesProficiencies || "")}</textarea>
                </div>
              </div>

              <div class="lg:col-span-8 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Equipment, Backpack &amp; Treasure</label>
                <textarea data-char-field="equipment" rows="6"
                  placeholder="Weapons, armor, adventuring pack, potions, quest items..."
                  class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100">${escapeHtml(ch.equipment || "")}</textarea>
              </div>
            </div>
          `
          : ""
      }

      ${
        showStory
          ? `
            ${
              dndMode
                ? `
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Class Features &amp; Subclass Abilities</label>
                      <textarea data-char-field="classFeatures" rows="4"
                        placeholder="Second Wind, Action Surge, Sneak Attack, Divine Smite, Wild Shape..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.classFeatures || "")}</textarea>
                    </div>
                    <div class="space-y-3">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Racial Traits &amp; Feats</label>
                        <textarea data-char-field="racialTraits" rows="2"
                          placeholder="Darkvision, Fey Ancestry, Sentinel, War Caster..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.racialTraits || "")}</textarea>
                      </div>
                      <div class="bg-slate-900/50 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
                        <div class="text-[11px] font-bold uppercase text-amber-300">Magic Item Attunement (${attunedCount} / 3)</div>
                        ${attunements
                          .map(
                            (att, idx) => `
                          <div class="flex items-center gap-2">
                            <input type="checkbox" data-attune-check="${idx}" ${att.active ? "checked" : ""} />
                            <input type="text" data-attune-name="${idx}" value="${escapeHtml(att.name || "")}"
                              placeholder="Attuned item #${idx + 1}..."
                              class="flex-1 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                          </div>
                        `
                          )
                          .join("")}
                      </div>
                    </div>
                  </div>
                `
                : ""
            }

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Personality Traits</label>
                <textarea data-char-field="personalityTraits" rows="3"
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.personalityTraits || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Ideals</label>
                <textarea data-char-field="ideals" rows="3"
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.ideals || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Bonds</label>
                <textarea data-char-field="bonds" rows="3"
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.bonds || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Flaws</label>
                <textarea data-char-field="flaws" rows="3"
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100">${escapeHtml(ch.flaws || "")}</textarea>
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderDaggerheartCharacterSheet(ch) {
  const traits = ch.dhTraits || {
    agility: "+0",
    strength: "+0",
    finesse: "+0",
    instinct: "+0",
    presence: "+0",
    knowledge: "+0"
  };
  const tierLabel = getDaggerheartTierForLevel(ch.dhLevel);
  const selectedClassObj = DAGGERHEART_CLASSES.find((c) => c.name === ch.dhClass);
  const classDomainsText = selectedClassObj
    ? `${selectedClassObj.domains[0]} & ${selectedClassObj.domains[1]}`
    : "Choose Class for Domains";

  const hpTotal = Math.max(1, Math.min(10, parseInt(ch.dhHpTotal, 10) || 6));
  const hpMarked = Array.isArray(ch.dhHpMarked) ? ch.dhHpMarked : [];
  const stressTotal = Math.max(1, Math.min(8, parseInt(ch.dhStressTotal, 10) || 6));
  const stressMarked = Array.isArray(ch.dhStressMarked) ? ch.dhStressMarked : [];
  const armorSlotsTotal = Math.max(0, Math.min(6, parseInt(ch.dhArmorSlotsTotal, 10) || 0));
  const armorSlotsMarked = Array.isArray(ch.dhArmorSlotsMarked) ? ch.dhArmorSlotsMarked : [];
  const hopeCount = Math.max(0, Math.min(6, Number(ch.dhHopeCount) ?? 2));

  const experiences = Array.isArray(ch.dhExperiences)
    ? ch.dhExperiences
    : [
        { name: "", modifier: "+2" },
        { name: "", modifier: "+2" }
      ];
  const priWpn = ch.dhPrimaryWeapon || { name: "", traitRange: "", damageDice: "", feature: "" };
  const secWpn = ch.dhSecondaryWeapon || { name: "", traitRange: "", damageDice: "", feature: "" };
  const actArm = ch.dhActiveArmor || { name: "", baseThresholds: "", baseScore: "", feature: "" };
  const domainCards = Array.isArray(ch.dhDomainCards) ? ch.dhDomainCards : [];

  const showStats = activeCharSubView === "all" || activeCharSubView === "stats";
  const showGear = activeCharSubView === "all" || activeCharSubView === "gear";
  const showStory = activeCharSubView === "all" || activeCharSubView === "story";

  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-6">
      <!-- Top Header -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border-b border-slate-800 pb-4">
        <div class="md:col-span-5">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Character Name</label>
          <input type="text" data-char-field="characterName" value="${escapeHtml(ch.characterName || "")}"
            placeholder="e.g., Vespera Thorn"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div class="md:col-span-3">
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Pronouns &amp; Player</label>
          <input type="text" data-char-field="dhPronouns" value="${escapeHtml(ch.dhPronouns || "")}"
            placeholder="e.g., she/her • Alex"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Level (${tierLabel})</label>
          <select data-char-field="dhLevel" class="dh-live-select w-full px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-amber-300">
            ${Array.from({ length: 10 }, (_, i) => i + 1)
              .map((lvl) => `<option value="${lvl}" ${String(ch.dhLevel || "1") === String(lvl) ? "selected" : ""}>Level ${lvl}</option>`)
              .join("")}
          </select>
        </div>
        <div class="md:col-span-2 flex justify-end">
          <button type="button" id="delete-char-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-2 rounded-lg border border-slate-800 hover:border-rose-800/60 transition w-full">
            Remove
          </button>
        </div>
      </div>

      ${renderCharSubtabBar(true)}

      <!-- Collapsible Portrait URL & Preview -->
      <div class="space-y-2">
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Character Portrait URL (Optional)</label>
        <input type="url" data-char-field="imageUrl" value="${escapeHtml(ch.imageUrl || "")}"
          placeholder="https://... (Paste a character illustration or token link)"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        <div id="char-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
          ${
            ch.imageUrl
              ? `<img src="${escapeHtml(ch.imageUrl)}" alt="Character Portrait" class="max-h-64 mx-auto rounded-lg border border-slate-700 object-contain" />`
              : `<p class="text-xs text-slate-500 py-3">Paste an image URL above to preview the character portrait here.</p>`
          }
        </div>
      </div>

      <!-- Class, Subclass & Heritage -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Class (${escapeHtml(classDomainsText)})</label>
          <select data-char-field="dhClass" class="dh-live-select w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white">
            <option value="">Select Class...</option>
            ${DAGGERHEART_CLASSES.map(
              (c) => `<option value="${c.name}" ${ch.dhClass === c.name ? "selected" : ""}>${c.name} (${c.domains.join("/")})</option>`
            ).join("")}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Subclass</label>
          <input type="text" data-char-field="dhSubclass" value="${escapeHtml(ch.dhSubclass || "")}"
            placeholder="e.g., Warden of the Elements"
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Community (Heritage)</label>
          <select data-char-field="dhCommunity" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
            <option value="">Select Community...</option>
            ${DAGGERHEART_COMMUNITIES.map(
              (comm) => `<option value="${comm}" ${ch.dhCommunity === comm ? "selected" : ""}>${comm}</option>`
            ).join("")}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Ancestry (Heritage)</label>
          <select data-char-field="dhAncestry" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
            <option value="">Select Ancestry...</option>
            ${DAGGERHEART_ANCESTRIES.map(
              (anc) => `<option value="${anc}" ${ch.dhAncestry === anc ? "selected" : ""}>${anc}</option>`
            ).join("")}
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-semibold text-slate-400 mb-1">Multiclass (Lvl 5+)</label>
          <input type="text" data-char-field="dhMulticlass" value="${escapeHtml(ch.dhMulticlass || "")}"
            placeholder="Optional multiclass..."
            class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
        </div>
      </div>

      ${
        showStats
          ? `
            <!-- 6 Daggerheart Character Traits -->
            <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Daggerheart Character Traits</span>
                <span class="text-[10px] text-slate-400">Standard Starting Array: +2, +1, +1, +0, +0, -1</span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                ${DAGGERHEART_TRAITS.map(
                  (tr) => `
                  <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2 text-center">
                    <label class="block text-xs font-bold uppercase tracking-wider text-amber-300">${tr.label}</label>
                    <input type="text" data-dh-trait="${tr.key}" value="${escapeHtml(traits[tr.key] || "+0")}"
                      placeholder="+0"
                      class="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-sm font-bold text-center text-white" />
                    <div class="text-[9px] text-slate-400 mt-1 leading-tight">${tr.verbs}</div>
                  </div>
                `
                ).join("")}
              </div>
            </div>

            <!-- Defenses, Damage Thresholds, Hit Points, Stress, Hope & Armor Slots -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div class="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-sky-400">Defenses &amp; Damage Thresholds</h4>
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Evasion</label>
                    <input type="text" data-char-field="dhEvasion" value="${escapeHtml(ch.dhEvasion || "10")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Armor Score</label>
                    <input type="text" data-char-field="dhArmorScore" value="${escapeHtml(ch.dhArmorScore || "0")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Proficiency</label>
                    <input type="text" data-char-field="dhProficiency" value="${escapeHtml(ch.dhProficiency || "1")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-white" />
                  </div>
                </div>

                <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2.5 space-y-2">
                  <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
                    Damage Thresholds (Add Current Level)
                  </div>
                  <div class="grid grid-cols-3 gap-1.5 items-center text-center text-xs">
                    <div class="p-1.5 rounded bg-slate-900 border border-slate-800">
                      <div class="font-bold text-slate-200">Minor</div>
                      <div class="text-[10px] text-emerald-400">Mark 1 HP</div>
                    </div>
                    <div class="p-1.5 rounded bg-slate-900 border border-amber-500/40">
                      <div class="text-[10px] uppercase text-amber-300 font-bold">Major ≥</div>
                      <input type="text" data-char-field="dhThresholdMajor" value="${escapeHtml(ch.dhThresholdMajor || "5")}"
                        class="w-full mt-0.5 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white" />
                      <div class="text-[10px] text-amber-300 mt-0.5">Mark 2 HP</div>
                    </div>
                    <div class="p-1.5 rounded bg-slate-900 border border-rose-500/40">
                      <div class="text-[10px] uppercase text-rose-300 font-bold">Severe ≥</div>
                      <input type="text" data-char-field="dhThresholdSevere" value="${escapeHtml(ch.dhThresholdSevere || "10")}"
                        class="w-full mt-0.5 px-1 py-0.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-white" />
                      <div class="text-[10px] text-rose-300 mt-0.5">Mark 3 HP</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Hit Points, Stress, Armor Slots &amp; Hope</h4>

                <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-rose-400">Hit Points</span>
                    <select data-char-field="dhHpTotal" class="dh-live-select px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-white">
                      ${Array.from({ length: 10 }, (_, i) => i + 1)
                        .map((n) => `<option value="${n}" ${hpTotal === n ? "selected" : ""}>Max ${n}</option>`)
                        .join("")}
                    </select>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${Array.from({ length: hpTotal }, (_, idx) => `
                      <input type="checkbox" data-dh-hp-slot="${idx}" ${hpMarked[idx] ? "checked" : ""} title="Marked HP Slot ${idx + 1}"
                        class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-rose-500" />
                    `).join("")}
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-purple-400">Stress</span>
                    <select data-char-field="dhStressTotal" class="dh-live-select px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-white">
                      ${Array.from({ length: 8 }, (_, i) => i + 1)
                        .map((n) => `<option value="${n}" ${stressTotal === n ? "selected" : ""}>Max ${n}</option>`)
                        .join("")}
                    </select>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${Array.from({ length: stressTotal }, (_, idx) => `
                      <input type="checkbox" data-dh-stress-slot="${idx}" ${stressMarked[idx] ? "checked" : ""} title="Marked Stress Slot ${idx + 1}"
                        class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-purple-500" />
                    `).join("")}
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold text-sky-400">Armor Slots</span>
                    <select data-char-field="dhArmorSlotsTotal" class="dh-live-select px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] text-white">
                      ${[0, 1, 2, 3, 4, 5, 6]
                        .map((n) => `<option value="${n}" ${armorSlotsTotal === n ? "selected" : ""}>${n} Slots</option>`)
                        .join("")}
                    </select>
                  </div>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    ${
                      armorSlotsTotal === 0
                        ? `<span class="text-[11px] text-slate-500">Unarmored</span>`
                        : Array.from({ length: armorSlotsTotal }, (_, idx) => `
                            <input type="checkbox" data-dh-armor-slot="${idx}" ${armorSlotsMarked[idx] ? "checked" : ""} title="Marked Armor Slot ${idx + 1}"
                              class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-sky-500" />
                          `).join("")
                    }
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 border border-amber-500/40 rounded-lg px-3 py-2">
                  <div>
                    <span class="text-xs font-bold text-amber-300">Hope (${hopeCount} / 6)</span>
                    <span class="text-[10px] text-slate-400 ml-1.5">Spend 1 Hope for Experience or Help an Ally</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    ${Array.from({ length: 6 }, (_, idx) => {
                      const filled = idx < hopeCount;
                      return `
                        <button type="button" data-dh-set-hope="${filled && idx + 1 === hopeCount ? idx : idx + 1}"
                          class="dh-hope-pip-btn w-6 h-6 rounded-full text-xs font-bold border transition ${
                            filled
                              ? "bg-amber-500 border-amber-300 text-slate-950"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }" title="Set Hope to ${filled && idx + 1 === hopeCount ? idx : idx + 1}">
                          ◆
                        </button>
                      `;
                    }).join("")}
                  </div>
                </div>
              </div>
            </div>

            <!-- Experiences & Gold -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div class="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Experiences (Spend 1 Hope to Add)</h4>
                  <button type="button" id="add-dh-exp-btn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded border border-slate-700">
                    + Add Experience
                  </button>
                </div>
                <div class="space-y-1.5">
                  ${experiences
                    .map(
                      (exp, eIdx) => `
                    <div class="flex items-center gap-2">
                      <input type="text" data-dh-exp-idx="${eIdx}" data-dh-exp-field="name" value="${escapeHtml(exp.name || "")}"
                        placeholder="e.g., Former Harbor Smuggler, Raised by Storm Druids..."
                        class="flex-1 px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                      <input type="text" data-dh-exp-idx="${eIdx}" data-dh-exp-field="modifier" value="${escapeHtml(exp.modifier || "+2")}"
                        placeholder="+2"
                        class="w-14 px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-amber-300" />
                      <button type="button" data-del-dh-exp="${eIdx}" class="del-dh-exp-btn text-slate-500 hover:text-rose-400 p-1">
                        <i data-lucide="x" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <div class="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Gold (Daggerheart Currency)</h4>
                <div class="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Handfuls (0–10)</label>
                    <input type="text" data-char-field="dhGoldHandfuls" value="${escapeHtml(ch.dhGoldHandfuls || "0")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Bags (10 Handfuls)</label>
                    <input type="text" data-char-field="dhGoldBags" value="${escapeHtml(ch.dhGoldBags || "0")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Chests (10 Bags)</label>
                    <input type="text" data-char-field="dhGoldChests" value="${escapeHtml(ch.dhGoldChests || "0")}"
                      class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
                  </div>
                </div>
                <p class="text-[10px] text-slate-400">10 Handfuls = 1 Bag • 10 Bags = 1 Chest</p>
              </div>
            </div>
          `
          : ""
      }

      ${
        showGear
          ? `
            <!-- Primary Weapon, Secondary Weapon & Active Armor -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">Primary Weapon</h4>
                <input type="text" data-dh-sub="dhPrimaryWeapon" data-dh-sub-field="name" value="${escapeHtml(priWpn.name || "")}"
                  placeholder="Weapon Name (e.g., Broadsword)"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                <div class="grid grid-cols-2 gap-2">
                  <input type="text" data-dh-sub="dhPrimaryWeapon" data-dh-sub-field="traitRange" value="${escapeHtml(priWpn.traitRange || "")}"
                    placeholder="Trait & Range (Agility • Melee)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-white" />
                  <input type="text" data-dh-sub="dhPrimaryWeapon" data-dh-sub-field="damageDice" value="${escapeHtml(priWpn.damageDice || "")}"
                    placeholder="Damage (d8 phy)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-rose-300 font-semibold" />
                </div>
                <input type="text" data-dh-sub="dhPrimaryWeapon" data-dh-sub-field="feature" value="${escapeHtml(priWpn.feature || "")}"
                  placeholder="Weapon Feature (e.g., Reliable: +1 to attack rolls)"
                  class="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200" />
              </div>

              <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">Secondary Weapon</h4>
                <input type="text" data-dh-sub="dhSecondaryWeapon" data-dh-sub-field="name" value="${escapeHtml(secWpn.name || "")}"
                  placeholder="Secondary / Off-Hand Weapon"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                <div class="grid grid-cols-2 gap-2">
                  <input type="text" data-dh-sub="dhSecondaryWeapon" data-dh-sub-field="traitRange" value="${escapeHtml(secWpn.traitRange || "")}"
                    placeholder="Trait & Range (Finesse • Melee)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-white" />
                  <input type="text" data-dh-sub="dhSecondaryWeapon" data-dh-sub-field="damageDice" value="${escapeHtml(secWpn.damageDice || "")}"
                    placeholder="Damage (d6 phy)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-rose-300 font-semibold" />
                </div>
                <input type="text" data-dh-sub="dhSecondaryWeapon" data-dh-sub-field="feature" value="${escapeHtml(secWpn.feature || "")}"
                  placeholder="Feature (e.g., Paired: +2 damage to primary)"
                  class="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200" />
              </div>

              <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-sky-400">Active Armor</h4>
                <input type="text" data-dh-sub="dhActiveArmor" data-dh-sub-field="name" value="${escapeHtml(actArm.name || "")}"
                  placeholder="Armor Name (e.g., Gambeson / Chainmail)"
                  class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                <div class="grid grid-cols-2 gap-2">
                  <input type="text" data-dh-sub="dhActiveArmor" data-dh-sub-field="baseThresholds" value="${escapeHtml(actArm.baseThresholds || "")}"
                    placeholder="Base Thresholds (5 / 11)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-white" />
                  <input type="text" data-dh-sub="dhActiveArmor" data-dh-sub-field="baseScore" value="${escapeHtml(actArm.baseScore || "")}"
                    placeholder="Base Score (3)"
                    class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-sky-300 font-semibold" />
                </div>
                <input type="text" data-dh-sub="dhActiveArmor" data-dh-sub-field="feature" value="${escapeHtml(actArm.feature || "")}"
                  placeholder="Armor Feature (e.g., Flexible: +1 to Evasion)"
                  class="w-full px-2.5 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200" />
              </div>
            </div>

            <!-- Domain Cards -->
            <div class="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <h4 class="text-xs font-bold uppercase tracking-wider text-purple-400">Domain Cards (Loadout &amp; Vault)</h4>
                  <p class="text-[11px] text-slate-400">Track active Loadout cards (up to 5) and stored Vault cards with Recall Stress cost.</p>
                </div>
                <button type="button" id="add-dh-domain-card-btn" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold shrink-0">
                  + Add Domain Card
                </button>
              </div>

              ${
                domainCards.length === 0
                  ? `<p class="text-xs text-slate-400">No Domain Cards added yet. Click "+ Add Domain Card" to add abilities, spells, or grimoires.</p>`
                  : `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      ${domainCards
                        .map(
                          (card, cIdx) => `
                        <div class="bg-slate-950/85 border border-slate-800 rounded-xl p-3 space-y-2">
                          <div class="flex items-center justify-between gap-2">
                            <input type="text" data-dh-card-idx="${cIdx}" data-dh-card-field="name" value="${escapeHtml(card.name || "")}"
                              placeholder="Domain Card Name..."
                              class="flex-1 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs font-bold text-white" />
                            <button type="button" data-del-dh-card="${cIdx}" class="del-dh-card-btn text-slate-500 hover:text-rose-400 p-1">
                              <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            </button>
                          </div>
                          <div class="grid grid-cols-4 gap-1.5">
                            <select data-dh-card-idx="${cIdx}" data-dh-card-field="domain"
                              class="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-white">
                              ${DAGGERHEART_DOMAINS.map(
                                (dom) => `<option value="${dom}" ${(card.domain || "Arcana") === dom ? "selected" : ""}>${dom}</option>`
                              ).join("")}
                            </select>
                            <input type="text" data-dh-card-idx="${cIdx}" data-dh-card-field="level" value="${escapeHtml(card.level || "Lvl 1")}"
                              placeholder="Lvl 1"
                              class="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-center text-white" />
                            <input type="text" data-dh-card-idx="${cIdx}" data-dh-card-field="recallCost" value="${escapeHtml(card.recallCost || "0")}"
                              placeholder="Recall" title="Recall Cost (Stress)"
                              class="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-center text-purple-300" />
                            <select data-dh-card-idx="${cIdx}" data-dh-card-field="zone"
                              class="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-[11px] text-amber-300 font-semibold">
                              <option value="Loadout" ${(card.zone || "Loadout") === "Loadout" ? "selected" : ""}>Loadout</option>
                              <option value="Vault" ${card.zone === "Vault" ? "selected" : ""}>Vault</option>
                            </select>
                          </div>
                          <textarea data-dh-card-idx="${cIdx}" data-dh-card-field="effect" rows="3"
                            placeholder="Card ability, spell, or grimoire rules..."
                            class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200">${escapeHtml(card.effect || "")}</textarea>
                        </div>
                      `
                        )
                        .join("")}
                    </div>`
              }
            </div>
          `
          : ""
      }

      ${
        showStory
          ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Class Feature &amp; Hope Feature</label>
                <textarea data-char-field="dhClassHopeFeature" rows="4"
                  placeholder="Record your Class Feature, Subclass Foundation/Specialization/Mastery, and 3-Hope Feature..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100">${escapeHtml(ch.dhClassHopeFeature || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Community &amp; Ancestry Features</label>
                <textarea data-char-field="dhHeritageFeatures" rows="4"
                  placeholder="Record your Community feature and Ancestry features..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100">${escapeHtml(ch.dhHeritageFeatures || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Party Connections &amp; Background Questions</label>
                <textarea data-char-field="dhConnectionsNotes" rows="4"
                  placeholder="How is your character connected to the other PCs, and what answers did you give during Session Zero?"
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100">${escapeHtml(ch.dhConnectionsNotes || "")}</textarea>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Inventory, Potions &amp; Class Items</label>
                <textarea data-char-field="equipment" rows="4"
                  placeholder="Class starter items, Minor/Major Health & Stamina potions, inventory weapons, relics..."
                  class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs sm:text-sm text-slate-100">${escapeHtml(ch.equipment || "")}</textarea>
              </div>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function wireCharacterControls(paneContainer, state, existingDoc, data, dndMode, dhMode) {
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

  paneContainer.querySelectorAll(".char-subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectCharactersForm(paneContainer, data);
      activeCharSubView = btn.getAttribute("data-char-subtab") || "all";
      rerenderWithLocalData();
    });
  });

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

  if (dhMode) {
    paneContainer.querySelectorAll(".dh-live-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        collectCharactersForm(paneContainer, data);
        const ch = data.characters[selectedCharacterIndex];
        if (ch && sel.getAttribute("data-char-field") === "dhClass") {
          const clsObj = DAGGERHEART_CLASSES.find((c) => c.name === ch.dhClass);
          if (clsObj) {
            ch.dhEvasion = String(clsObj.evasion);
            ch.dhHpTotal = String(clsObj.hp);
          }
        }
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelectorAll(".dh-hope-pip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectCharactersForm(paneContainer, data);
        const ch = data.characters[selectedCharacterIndex];
        if (ch) {
          ch.dhHopeCount = Number(btn.getAttribute("data-dh-set-hope")) || 0;
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelector("#add-dh-exp-btn")?.addEventListener("click", () => {
      collectCharactersForm(paneContainer, data);
      const ch = data.characters[selectedCharacterIndex];
      if (ch) {
        if (!Array.isArray(ch.dhExperiences)) ch.dhExperiences = [];
        ch.dhExperiences.push({ name: "", modifier: "+2" });
        rerenderWithLocalData();
      }
    });

    paneContainer.querySelectorAll(".del-dh-exp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-del-dh-exp"));
        collectCharactersForm(paneContainer, data);
        const ch = data.characters[selectedCharacterIndex];
        if (ch && Array.isArray(ch.dhExperiences)) {
          ch.dhExperiences.splice(idx, 1);
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelector("#add-dh-domain-card-btn")?.addEventListener("click", () => {
      collectCharactersForm(paneContainer, data);
      const ch = data.characters[selectedCharacterIndex];
      if (ch) {
        if (!Array.isArray(ch.dhDomainCards)) ch.dhDomainCards = [];
        const clsObj = DAGGERHEART_CLASSES.find((c) => c.name === ch.dhClass);
        ch.dhDomainCards.push({
          name: "",
          domain: clsObj ? clsObj.domains[0] : "Arcana",
          level: "Lvl 1",
          recallCost: "0",
          zone: "Loadout",
          effect: ""
        });
        rerenderWithLocalData();
      }
    });

    paneContainer.querySelectorAll(".del-dh-card-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-del-dh-card"));
        collectCharactersForm(paneContainer, data);
        const ch = data.characters[selectedCharacterIndex];
        if (ch && Array.isArray(ch.dhDomainCards)) {
          ch.dhDomainCards.splice(idx, 1);
          rerenderWithLocalData();
        }
      });
    });
  }

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

  const imgInput = paneContainer.querySelector('[data-char-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#char-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (imgPreview) {
      if (val) {
        imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Character Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
      } else {
        imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-3">Paste an image URL above to preview the character portrait here.</p>`;
      }
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

    if (!ch.dhTraits) ch.dhTraits = {};
    container.querySelectorAll("[data-dh-trait]").forEach((el) => {
      ch.dhTraits[el.getAttribute("data-dh-trait")] = el.value;
    });

    if (!Array.isArray(ch.dhHpMarked)) ch.dhHpMarked = [];
    container.querySelectorAll("[data-dh-hp-slot]").forEach((el) => {
      ch.dhHpMarked[Number(el.getAttribute("data-dh-hp-slot"))] = el.checked;
    });

    if (!Array.isArray(ch.dhStressMarked)) ch.dhStressMarked = [];
    container.querySelectorAll("[data-dh-stress-slot]").forEach((el) => {
      ch.dhStressMarked[Number(el.getAttribute("data-dh-stress-slot"))] = el.checked;
    });

    if (!Array.isArray(ch.dhArmorSlotsMarked)) ch.dhArmorSlotsMarked = [];
    container.querySelectorAll("[data-dh-armor-slot]").forEach((el) => {
      ch.dhArmorSlotsMarked[Number(el.getAttribute("data-dh-armor-slot"))] = el.checked;
    });

    container.querySelectorAll("[data-dh-exp-idx]").forEach((el) => {
      const idx = Number(el.getAttribute("data-dh-exp-idx"));
      const field = el.getAttribute("data-dh-exp-field");
      if (Array.isArray(ch.dhExperiences) && ch.dhExperiences[idx]) {
        ch.dhExperiences[idx][field] = el.value;
      }
    });

    container.querySelectorAll("[data-dh-sub]").forEach((el) => {
      const objKey = el.getAttribute("data-dh-sub");
      const field = el.getAttribute("data-dh-sub-field");
      if (!ch[objKey]) ch[objKey] = {};
      ch[objKey][field] = el.value;
    });

    container.querySelectorAll("[data-dh-card-idx]").forEach((el) => {
      const idx = Number(el.getAttribute("data-dh-card-idx"));
      const field = el.getAttribute("data-dh-card-field");
      if (Array.isArray(ch.dhDomainCards) && ch.dhDomainCards[idx]) {
        ch.dhDomainCards[idx][field] = el.value;
      }
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
