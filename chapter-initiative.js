// chapter-initiative.js
// Dedicated interactive workbook for Chapter 11: Initiative Tracker.
// Supports Universal Core, D&D 5e Combat Upgrades, and Daggerheart Spotlight & Fear
// Combat Tracker (GM Fear Pool 0–12, Battle Points Budget vs. Spent, Spotlight passing
// without initiative rolls, HP/Stress/Thresholds tracking, and Hidden/Restrained/Vulnerable pills).

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  isDaggerheart,
  DND5E_CONDITIONS,
  parseEnemyXp,
  parseLevelFromClass,
  calculate5eEncounterDifficulty,
  DAGGERHEART_CONDITIONS,
  getDaggerheartBattlePointCost,
  calculateDaggerheartBattlePoints
} from "./system-rulesets.js";

export const INITIATIVE_TABS = [
  { id: "combat-tracker", label: "Live Encounter Board", icon: "swords" },
  { id: "misc-notes", label: "Battlefield Notes", icon: "sticky-note" }
];

let activeInitiativeTab = "combat-tracker";
let activeTurnIndex = 0;
let showImporterDrawer = false;

function createBlankCombatant(role = "pc") {
  return {
    initiative: "",
    name: "",
    passive: "",
    ac: "",
    hp: "",
    xp: "",
    conditions: [],
    statusTracking: "",
    role
  };
}

function getDefaultInitiativeData(campaignTitle = "") {
  return {
    date: "",
    campaignName: campaignTitle,
    session: "",
    partyLevelsInput: "",
    dhPcCount: 4,
    dhGmFear: 2,
    dhSpotlightName: "",
    currentRound: 1,
    completedRounds: [],
    battleMapUrl: "",
    pcNpcs: [
      createBlankCombatant("pc"),
      createBlankCombatant("pc"),
      createBlankCombatant("pc"),
      createBlankCombatant("pc")
    ],
    enemies: [
      createBlankCombatant("enemy"),
      createBlankCombatant("enemy"),
      createBlankCombatant("enemy"),
      createBlankCombatant("enemy")
    ],
    miscNotes: ""
  };
}

function getSortedCombatants(data) {
  const pcs = (data.pcNpcs || [])
    .filter((p) => p.name && p.name.trim())
    .map((p) => ({ ...p, role: "pc", initNum: parseFloat(p.initiative) || 0 }));
  const foes = (data.enemies || [])
    .filter((e) => e.name && e.name.trim())
    .map((e) => ({ ...e, role: "enemy", initNum: parseFloat(e.initiative) || 0 }));
  return [...pcs, ...foes].sort((a, b) => b.initNum - a.initNum);
}

function difficultyBadgeStyle(diff) {
  switch (diff) {
    case "Deadly":
      return "bg-rose-950/90 text-rose-200 border-rose-700/70";
    case "Hard":
      return "bg-amber-950/90 text-amber-200 border-amber-700/70";
    case "Medium":
      return "bg-indigo-950/90 text-indigo-200 border-indigo-700/70";
    case "Easy":
    case "Trivial":
      return "bg-emerald-950/90 text-emerald-200 border-emerald-700/70";
    default:
      return "bg-slate-900 text-slate-300 border-slate-700";
  }
}

export function renderInitiativeChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeInitiativeTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "initiative-tracker");
  const defaults = getDefaultInitiativeData(state.activeCampaign?.title || "");
  const data = {
    ...defaults,
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.completedRounds)) data.completedRounds = [];
  if (!Array.isArray(data.pcNpcs)) data.pcNpcs = defaults.pcNpcs;
  if (!Array.isArray(data.enemies)) data.enemies = defaults.enemies;

  // Auto-seed partyLevelsInput from Chapter 9 characters if blank in D&D 5e mode
  if (dndMode && !data.partyLevelsInput) {
    const savedChars = state.entities.find((e) => e.type === "character-sheets")?.systemData?.characters || [];
    const derivedLevels = savedChars
      .map((c) => parseLevelFromClass(c.classAndLevel))
      .filter((lvl) => lvl > 0);
    if (derivedLevels.length > 0) {
      data.partyLevelsInput = derivedLevels.join(", ");
    }
  }

  const currentSection =
    INITIATIVE_TABS.find((t) => t.id === activeInitiativeTab) || INITIATIVE_TABS[0];

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
              Phase IV • ${dhMode ? "Encounter & Spotlight Board • Daggerheart" : `Encounter & Spotlight Board${dndMode ? " • D&D 5e" : ""}`}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Manage the GM Fear Pool (0–12), pass the Spotlight dynamically, track HP/Stress/Thresholds, and balance encounters with Battle Points."
                : dndMode
                ? "Import saved Party PCs & Monsters, apply quick HP damage/healing, toggle 5e conditions, and gauge Encounter XP difficulty."
                : "Track combat rounds (1–20), 30–1 initiative order, PC/NPC and Enemy AC, HP, passive scores, conditions, and battle maps."
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="init-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-init-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Tracker
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderInitiativeTabContent(activeInitiativeTab, data, state, dndMode, dhMode)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="initiative-tracker"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectInitiativeForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#init-save-status");
  paneContainer.querySelectorAll("input, textarea, select").forEach((el) => {
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeInitiativeTab === "combat-tracker") {
    wireInitiativeControls(paneContainer, state, existingDoc, data, dndMode, dhMode);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-init-btn").addEventListener("click", async () => {
    collectInitiativeForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.session && `Session: ${data.session}`,
      dhMode ? `GM Fear: ${data.dhGmFear || 0}/12` : `Round ${data.currentRound || 1}`,
      `${data.pcNpcs.filter((p) => p.name).length} PC/NPCs, ${data.enemies.filter((e) => e.name).length} Enemies`
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Initiative Tracker",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "initiative-tracker",
          title: "Initiative Tracker",
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

function renderInitiativeTabContent(tabId, data, state, dndMode, dhMode) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Initiative Tracker — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Record lair action initiative counts, environmental hazards, or ongoing spell/countdown durations.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Combat &amp; Condition Notes</label>
          <textarea data-init-misc="miscNotes" rows="12"
            placeholder="Track concentration spells, countdown clocks, lair actions, reinforcements, etc..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
        </div>
      </div>
    `;
  }

  if (dhMode) {
    return renderDaggerheartSpotlightTracker(data, state);
  }

  const sortedCombatants = getSortedCombatants(data);
  if (activeTurnIndex >= sortedCombatants.length) {
    activeTurnIndex = 0;
  }

  const savedChars = state.entities.find((e) => e.type === "character-sheets")?.systemData?.characters || [];
  const savedEnemies = state.entities.find((e) => e.type === "enemies")?.systemData?.enemies || [];

  const partyLevels = String(data.partyLevelsInput || "")
    .split(/[,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => !isNaN(n) && n > 0);
  const activeEnemyXps = (data.enemies || [])
    .filter((e) => e.name && e.name.trim())
    .map((e) => parseEnemyXp(e.xp));
  const encCalc = dndMode ? calculate5eEncounterDifficulty(partyLevels, activeEnemyXps) : null;

  return `
    <!-- Top Metadata: DATE, CAMPAIGN NAME, SESSION -->
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div class="sm:col-span-3">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Date</label>
        <input type="text" data-init-field="date" value="${escapeHtml(data.date || "")}"
          placeholder="e.g., Nov 22, 2026"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
      </div>
      <div class="sm:col-span-6">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Campaign Name</label>
        <input type="text" data-init-field="campaignName" value="${escapeHtml(data.campaignName || "")}"
          placeholder="Campaign title"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
      </div>
      <div class="sm:col-span-3">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Session</label>
        <input type="text" data-init-field="session" value="${escapeHtml(data.session || "")}"
          placeholder="e.g., Session 12"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
      </div>
    </div>

    ${
      dndMode
        ? `
          <!-- D&D 5e Combat Toolbar: Importer + Encounter XP / Difficulty Meter -->
          <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div class="flex items-center gap-2.5 flex-wrap">
                <button type="button" id="toggle-5e-importer-btn"
                  class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold transition inline-flex items-center gap-1.5">
                  <i data-lucide="download" class="w-3.5 h-3.5"></i>
                  <span>${showImporterDrawer ? "Hide Roster Importer" : "Import Party & Monsters"}</span>
                </button>
                <div class="flex items-center gap-1.5">
                  <label class="text-[11px] font-semibold text-slate-400">Party Levels:</label>
                  <input type="text" data-init-field="partyLevelsInput" value="${escapeHtml(data.partyLevelsInput || "")}"
                    placeholder="e.g., 5, 5, 5, 5"
                    class="w-28 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                </div>
              </div>

              <!-- 5e Encounter XP & Difficulty Summary -->
              <div class="flex items-center gap-2.5 flex-wrap text-xs">
                <span class="text-slate-400">Raw XP: <strong class="text-white">${encCalc.rawXp.toLocaleString()}</strong></span>
                <span class="text-slate-400">Adjusted (×${encCalc.multiplier}): <strong class="text-amber-300">${encCalc.adjustedXp.toLocaleString()}</strong></span>
                <span class="px-2.5 py-0.5 rounded-full font-bold border ${difficultyBadgeStyle(encCalc.difficulty)}">
                  ${escapeHtml(encCalc.difficulty)}
                </span>
              </div>
            </div>

            ${
              showImporterDrawer
                ? `
                  <div class="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-emerald-400">Saved Party PCs (Chapter 9)</span>
                        ${
                          savedChars.length > 0
                            ? `<button type="button" id="import-all-pcs-btn" class="text-[11px] bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2 py-0.5 rounded border border-slate-700">
                                + Import All (${savedChars.length})
                              </button>`
                            : ""
                        }
                      </div>
                      ${
                        savedChars.length === 0
                          ? `<p class="text-[11px] text-slate-400">No characters saved in Chapter 9 yet.</p>`
                          : `<div class="space-y-1">
                              ${savedChars
                                .map(
                                  (c, idx) => `
                                <div class="flex items-center justify-between text-xs bg-slate-950/70 border border-slate-800 rounded px-2.5 py-1.5">
                                  <span class="truncate text-white font-medium">
                                    ${escapeHtml(c.characterName || "Unnamed")}
                                    <span class="text-[10px] text-slate-400">(AC ${escapeHtml(c.armorClass || "—")}, HP ${escapeHtml(c.hpCurrent || c.hpMax || "—")})</span>
                                  </span>
                                  <button type="button" data-import-pc-idx="${idx}"
                                    class="import-one-pc-btn text-[11px] text-emerald-300 hover:underline font-semibold shrink-0 ml-2">
                                    + Add
                                  </button>
                                </div>
                              `
                                )
                                .join("")}
                            </div>`
                      }
                    </div>

                    <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3 space-y-2">
                      <span class="text-xs font-bold text-rose-400 block">Saved Bestiary Enemies (Chapter 4)</span>
                      ${
                        savedEnemies.length === 0
                          ? `<p class="text-[11px] text-slate-400">No enemies saved in Chapter 4 yet.</p>`
                          : `<div class="space-y-1">
                              ${savedEnemies
                                .map(
                                  (en, idx) => `
                                <div class="flex items-center justify-between text-xs bg-slate-950/70 border border-slate-800 rounded px-2.5 py-1.5">
                                  <span class="truncate text-white font-medium">
                                    ${escapeHtml(en.name || "Unnamed")}
                                    <span class="text-[10px] text-slate-400">(AC ${escapeHtml(en.armorClass || "—")}, HP ${escapeHtml(en.hitPoints || "—")}, ${escapeHtml(en.challenge || "0 XP")})</span>
                                  </span>
                                  <button type="button" data-import-enemy-idx="${idx}"
                                    class="import-one-enemy-btn text-[11px] text-rose-300 hover:underline font-semibold shrink-0 ml-2">
                                    + Add
                                  </button>
                                </div>
                              `
                                )
                                .join("")}
                            </div>`
                      }
                    </div>
                  </div>
                `
                : ""
            }
          </div>
        `
        : ""
    }

    <!-- ROUNDS (20 Clickable Round Circles) -->
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Rounds</span>
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold">
            Current Round: ${data.currentRound || 1}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" id="next-round-btn" class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md font-medium transition">
            Next Round →
          </button>
          <button type="button" id="reset-rounds-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700 transition">
            Reset Rounds
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 flex-wrap">
        ${Array.from({ length: 20 }, (_, i) => {
          const roundNum = i + 1;
          const isCompleted = data.completedRounds.includes(roundNum);
          const isCurrent = Number(data.currentRound) === roundNum;
          return `
            <button type="button" data-round-num="${roundNum}"
              class="round-bubble-btn w-7 h-7 rounded-full text-xs font-bold border transition flex items-center justify-center ${
                isCurrent
                  ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                  : isCompleted
                  ? "bg-emerald-950/80 border-emerald-600/60 text-emerald-300"
                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white"
              }" title="Round ${roundNum}">
              ${roundNum}
            </button>
          `;
        }).join("")}
      </div>
    </div>

    <!-- Live Sorted Turn Order Bar -->
    <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <i data-lucide="list-ordered" class="w-4 h-4 text-amber-400"></i>
          <span class="text-xs font-bold uppercase tracking-wider text-white">Active Initiative Order (Highest → Lowest)</span>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" id="prev-turn-btn" ${sortedCombatants.length === 0 ? "disabled" : ""}
            class="text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition">
            ← Prev Turn
          </button>
          <button type="button" id="next-turn-btn" ${sortedCombatants.length === 0 ? "disabled" : ""}
            class="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-2.5 py-1 rounded font-medium transition">
            Next Turn →
          </button>
        </div>
      </div>

      ${
        sortedCombatants.length === 0
          ? `<p class="text-xs text-slate-400">Enter names and initiative numbers in the PC/NPC or Enemy tables below to track turn order automatically.</p>`
          : `<div class="flex items-center gap-2 flex-wrap">
              ${sortedCombatants
                .map((c, idx) => {
                  const isActive = idx === activeTurnIndex;
                  return `
                    <button type="button" data-turn-idx="${idx}"
                      class="select-turn-btn px-3 py-1 rounded-lg text-xs border transition flex items-center gap-1.5 ${
                        isActive
                          ? "bg-amber-500/25 border-amber-400 text-white font-bold"
                          : c.role === "enemy"
                          ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                          : "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                      }">
                      <span class="font-mono font-bold">${escapeHtml(c.initiative || "0")}</span>
                      <span>${escapeHtml(c.name)}</span>
                    </button>
                  `;
                })
                .join("")}
            </div>`
      }
    </div>

    <!-- Two-Column Combatant Rosters: PC / NPCs & Enemies -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400">PCs &amp; Allied NPCs</h3>
          <button type="button" id="add-pc-row-btn" class="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">+ Add Row</button>
        </div>
        ${renderStandardCombatantList(data.pcNpcs, "pcNpcs", false, dndMode)}
      </div>

      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400">Enemies &amp; Monsters</h3>
          <div class="flex items-center gap-2">
            <button type="button" id="clear-enemies-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded border border-slate-800">Clear</button>
            <button type="button" id="add-enemy-row-btn" class="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">+ Add Enemy</button>
          </div>
        </div>
        ${renderStandardCombatantList(data.enemies, "enemies", true, dndMode)}
      </div>
    </div>

    <!-- Encounter Battle Map Preview -->
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Encounter Battle Map URL (Optional)</label>
      <input type="url" data-init-field="battleMapUrl" value="${escapeHtml(data.battleMapUrl || "")}"
        placeholder="https://... (Paste a battle map image URL)"
        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
      <div id="init-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
        ${
          data.battleMapUrl
            ? `<img src="${escapeHtml(data.battleMapUrl)}" alt="Encounter Battle Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" />`
            : `<p class="text-xs text-slate-500 py-4">Paste a battle map URL above to display it here during combat.</p>`
        }
      </div>
    </div>
  `;
}

function renderStandardCombatantList(list, listKey, isEnemy, dndMode) {
  return `
    <div class="space-y-2.5">
      ${list
        .map((row, idx) => {
          const activeConds = Array.isArray(row.conditions) ? row.conditions : [];
          return `
            <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
              <div class="grid grid-cols-12 gap-1.5 items-center">
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="initiative"
                  value="${escapeHtml(row.initiative || "")}" placeholder="Init" title="Initiative Roll"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-center text-amber-300" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="name"
                  value="${escapeHtml(row.name || "")}" placeholder="${isEnemy ? "Monster / Enemy" : "PC / Ally Name"}"
                  class="col-span-4 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="ac"
                  value="${escapeHtml(row.ac || "")}" placeholder="AC" title="Armor Class"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-sky-300 font-semibold" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="hp"
                  value="${escapeHtml(row.hp || "")}" placeholder="HP" title="Current HP"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-rose-300 font-semibold" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="${isEnemy && dndMode ? "xp" : "passive"}"
                  value="${escapeHtml((isEnemy && dndMode ? row.xp : row.passive) || "")}"
                  placeholder="${isEnemy && dndMode ? "CR/XP" : "Pass"}"
                  class="col-span-1 px-1 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-center text-slate-300" />
                <button type="button" data-del-comb-list="${listKey}" data-del-comb-idx="${idx}"
                  class="del-comb-row-btn col-span-1 text-slate-500 hover:text-rose-400 flex justify-center">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>

              ${
                dndMode
                  ? `
                    <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
                      <div class="flex items-center gap-1">
                        <input type="number" id="hp-delta-${listKey}-${idx}" placeholder="Amt"
                          class="w-14 px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-center text-white" />
                        <button type="button" data-hp-op="dmg" data-hp-list="${listKey}" data-hp-idx="${idx}"
                          class="quick-hp-btn text-[10px] font-bold px-2 py-0.5 rounded bg-rose-950/80 text-rose-200 border border-rose-800/60">
                          -Dmg
                        </button>
                        <button type="button" data-hp-op="heal" data-hp-list="${listKey}" data-hp-idx="${idx}"
                          class="quick-hp-btn text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-200 border border-emerald-800/60">
                          +Heal
                        </button>
                      </div>

                      <select data-add-cond-list="${listKey}" data-add-cond-idx="${idx}"
                        class="add-5e-cond-select px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300">
                        <option value="">+ Condition...</option>
                        ${DND5E_CONDITIONS.map((c) => `<option value="${c}">${c}</option>`).join("")}
                      </select>
                    </div>

                    ${
                      activeConds.length > 0
                        ? `<div class="flex items-center gap-1 flex-wrap">
                            ${activeConds
                              .map(
                                (cond) => `
                              <button type="button" data-toggle-cond="${escapeHtml(cond)}" data-cond-list="${listKey}" data-cond-idx="${idx}"
                                class="toggle-5e-cond-btn text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-200 border border-amber-700/60">
                                ${escapeHtml(cond)} ×
                              </button>
                            `
                              )
                              .join("")}
                          </div>`
                        : ""
                    }
                  `
                  : `
                    <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="statusTracking"
                      value="${escapeHtml(row.statusTracking || "")}" placeholder="Conditions, concentration, spell slots, notes..."
                      class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200" />
                  `
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

/**
 * Renders the Daggerheart Combat Spotlight & GM Fear Tracker (no initiative rolls;
 * features GM Fear Pool 0–12, Battle Points Budget Calculator, Spotlight selector,
 * and PC/Adversary HP, Stress & Condition tracking).
 */
function renderDaggerheartSpotlightTracker(data, state) {
  const gmFear = Math.max(0, Math.min(12, Number(data.dhGmFear) ?? 2));
  const savedChars = state.entities.find((e) => e.type === "character-sheets")?.systemData?.characters || [];
  const savedAdversaries = state.entities.find((e) => e.type === "enemies")?.systemData?.enemies || [];
  const bpCalc = calculateDaggerheartBattlePoints(data.dhPcCount || 4, data.enemies || []);

  const allRoster = [
    ...(data.pcNpcs || []).filter((p) => p.name && p.name.trim()).map((p) => ({ ...p, role: "pc" })),
    ...(data.enemies || []).filter((e) => e.name && e.name.trim()).map((e) => ({ ...e, role: "enemy" }))
  ];

  return `
    <!-- Top Metadata: DATE, CAMPAIGN NAME, SCENE / SESSION -->
    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div class="sm:col-span-3">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Date</label>
        <input type="text" data-init-field="date" value="${escapeHtml(data.date || "")}"
          placeholder="e.g., Nov 24, 2026"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
      </div>
      <div class="sm:col-span-6">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Campaign / Scene</label>
        <input type="text" data-init-field="campaignName" value="${escapeHtml(data.campaignName || "")}"
          placeholder="Campaign or Encounter Scene"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white" />
      </div>
      <div class="sm:col-span-3">
        <label class="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Session</label>
        <input type="text" data-init-field="session" value="${escapeHtml(data.session || "")}"
          placeholder="e.g., Session 4"
          class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
      </div>
    </div>

    <!-- GM Fear Pool (0–12) & Battle Points Encounter Budget -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div class="lg:col-span-7 bg-slate-950/70 border border-purple-500/40 rounded-xl p-4 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-purple-300">GM Fear Pool (${gmFear} / 12)</span>
            <p class="text-[11px] text-slate-400">Gain 1 Fear when a PC rolls with Fear; spend Fear to spotlight Adversaries or trigger Fear Moves.</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="dh-fear-minus-btn" class="text-xs px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">-1 Fear</button>
            <button type="button" id="dh-fear-plus-btn" class="text-xs px-2.5 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-semibold">+1 Fear</button>
          </div>
        </div>
        <div class="flex items-center gap-1.5 flex-wrap">
          ${Array.from({ length: 12 }, (_, idx) => {
            const active = idx < gmFear;
            return `
              <button type="button" data-dh-set-fear="${active && idx + 1 === gmFear ? idx : idx + 1}"
                class="dh-fear-pip-btn w-7 h-7 rounded-full text-xs font-bold border transition ${
                  active
                    ? "bg-purple-600 border-purple-300 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-500"
                }">
                💀
              </button>
            `;
          }).join("")}
        </div>
      </div>

      <div class="lg:col-span-5 bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2.5">
        <div class="flex items-center justify-between gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-amber-300">Battle Points Budget</span>
          <div class="flex items-center gap-1.5">
            <label class="text-[11px] text-slate-400">PCs:</label>
            <input type="number" min="1" max="10" data-init-field="dhPcCount" value="${escapeHtml(String(data.dhPcCount || 4))}"
              class="dh-pc-count-input w-12 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-xs font-bold text-center text-white" />
          </div>
        </div>
        <div class="flex items-center justify-between text-xs bg-slate-900/80 border border-slate-800 rounded-lg px-3 py-2">
          <span>Spent: <strong class="text-white">${bpCalc.spent}</strong> / <strong class="text-amber-300">${bpCalc.budget} BP</strong></span>
          <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/50">
            ${escapeHtml(bpCalc.rating)}
          </span>
        </div>
        <p class="text-[10px] text-slate-400">Formula: (3 × PCs) + 2 • Minion/Social/Support: 1 • Standard/Horde/Skulk/Ranged: 2 • Leader: 3 • Bruiser: 4 • Solo: 5</p>
      </div>
    </div>

    <!-- Roster Importer & Active Spotlight Bar -->
    <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <i data-lucide="sparkles" class="w-4 h-4 text-amber-400"></i>
          <span class="text-xs font-bold uppercase tracking-wider text-white">
            Current Spotlight: <strong class="text-amber-300">${escapeHtml(data.dhSpotlightName || "Click any PC or Adversary below")}</strong>
          </span>
        </div>
        <button type="button" id="toggle-5e-importer-btn"
          class="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto">
          <i data-lucide="download" class="w-3.5 h-3.5"></i>
          <span>${showImporterDrawer ? "Hide Importer" : "Import PCs & Adversaries"}</span>
        </button>
      </div>

      ${
        allRoster.length > 0
          ? `<div class="flex items-center gap-2 flex-wrap">
              ${allRoster
                .map((c) => {
                  const isSpot = data.dhSpotlightName === c.name;
                  return `
                    <button type="button" data-dh-spotlight="${escapeHtml(c.name)}"
                      class="dh-spotlight-btn px-3 py-1 rounded-lg text-xs border transition ${
                        isSpot
                          ? "bg-amber-500/25 border-amber-400 text-white font-bold"
                          : c.role === "enemy"
                          ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
                          : "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                      }">
                      ${isSpot ? "★ " : ""}${escapeHtml(c.name)}
                    </button>
                  `;
                })
                .join("")}
            </div>`
          : ""
      }

      ${
        showImporterDrawer
          ? `<div class="pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-emerald-400">Saved Daggerheart PCs (Ch. 9)</span>
                  ${
                    savedChars.length > 0
                      ? `<button type="button" id="import-all-pcs-btn" class="text-[11px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded border border-slate-700">+ Import All (${savedChars.length})</button>`
                      : ""
                  }
                </div>
                ${savedChars
                  .map(
                    (c, idx) => `
                  <div class="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="truncate text-white">${escapeHtml(c.characterName || "PC")} (Evasion ${escapeHtml(c.dhEvasion || "10")}, HP ${escapeHtml(c.dhHpTotal || "6")})</span>
                    <button type="button" data-import-pc-idx="${idx}" class="import-one-pc-btn text-[11px] text-emerald-300 font-semibold ml-2">+ Add</button>
                  </div>
                `
                  )
                  .join("")}
              </div>
              <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
                <span class="text-xs font-bold text-rose-400 block">Saved Adversaries (Ch. 4)</span>
                ${savedAdversaries
                  .map(
                    (en, idx) => `
                  <div class="flex items-center justify-between text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5">
                    <span class="truncate text-white">${escapeHtml(en.name || "Adversary")} (Diff ${escapeHtml(en.difficulty || "12")}, HP ${escapeHtml(en.hitPoints || "5")}, ${escapeHtml(en.battlePoints || "2")} BP)</span>
                    <button type="button" data-import-enemy-idx="${idx}" class="import-one-enemy-btn text-[11px] text-rose-300 font-semibold ml-2">+ Add</button>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>`
          : ""
      }
    </div>

    <!-- PC & Adversary Combatant Trackers -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Party PCs &amp; Allies</h3>
          <button type="button" id="add-pc-row-btn" class="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">+ Add PC</button>
        </div>
        ${renderDaggerheartCombatantList(data.pcNpcs, "pcNpcs", false)}
      </div>

      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400">Adversaries</h3>
          <div class="flex items-center gap-2">
            <button type="button" id="clear-enemies-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded border border-slate-800">Clear</button>
            <button type="button" id="add-enemy-row-btn" class="text-xs bg-slate-800 text-slate-200 px-2.5 py-1 rounded border border-slate-700">+ Add Adversary</button>
          </div>
        </div>
        ${renderDaggerheartCombatantList(data.enemies, "enemies", true)}
      </div>
    </div>

    <!-- Encounter Battle Map Preview -->
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">Scene / Environment Map URL (Optional)</label>
      <input type="url" data-init-field="battleMapUrl" value="${escapeHtml(data.battleMapUrl || "")}"
        placeholder="https://... (Paste a scene or encounter map image URL)"
        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
      <div id="init-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
        ${
          data.battleMapUrl
            ? `<img src="${escapeHtml(data.battleMapUrl)}" alt="Scene Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" />`
            : `<p class="text-xs text-slate-500 py-4">Paste a scene or map URL above to display it here during combat.</p>`
        }
      </div>
    </div>
  `;
}

function renderDaggerheartCombatantList(list, listKey, isAdversary) {
  return `
    <div class="space-y-2.5">
      ${list
        .map((row, idx) => {
          const activeConds = Array.isArray(row.conditions) ? row.conditions : [];
          return `
            <div class="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 space-y-2">
              <div class="grid grid-cols-12 gap-1.5 items-center">
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="name"
                  value="${escapeHtml(row.name || "")}" placeholder="${isAdversary ? "Adversary Name" : "PC Name"}"
                  class="col-span-5 px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="ac"
                  value="${escapeHtml(row.ac || "")}" placeholder="${isAdversary ? "Diff" : "Evas"}" title="${isAdversary ? "Difficulty" : "Evasion"}"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-sky-300 font-semibold" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="hp"
                  value="${escapeHtml(row.hp || "")}" placeholder="HP" title="Marked / Max HP"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-rose-300 font-semibold" />
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="passive"
                  value="${escapeHtml(row.passive || "")}" placeholder="Stress" title="Marked / Max Stress"
                  class="col-span-2 px-1.5 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-center text-purple-300 font-semibold" />
                <button type="button" data-del-comb-list="${listKey}" data-del-comb-idx="${idx}"
                  class="del-comb-row-btn col-span-1 text-slate-500 hover:text-rose-400 flex justify-center">
                  <i data-lucide="x" class="w-3.5 h-3.5"></i>
                </button>
              </div>
              <div class="flex items-center justify-between gap-2 flex-wrap">
                <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="statusTracking"
                  value="${escapeHtml(row.statusTracking || "")}" placeholder="${isAdversary ? "Thresholds (Major/Severe), BP & notes..." : "Thresholds (Major/Severe), Armor Slots..."}"
                  class="flex-1 min-w-[140px] px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-200" />
                <div class="flex items-center gap-1 flex-wrap">
                  ${DAGGERHEART_CONDITIONS.map((cond) => {
                    const hasCond = activeConds.includes(cond);
                    return `
                      <button type="button" data-dh-cond="${cond}" data-cond-list="${listKey}" data-cond-idx="${idx}"
                        class="dh-cond-toggle-btn text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                          hasCond
                            ? "bg-rose-950/90 text-rose-200 border-rose-700/60"
                            : "bg-slate-950 text-slate-400 border-slate-800"
                        }">
                        ${cond}
                      </button>
                    `;
                  }).join("")}
                </div>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function wireInitiativeControls(paneContainer, state, existingDoc, data, dndMode, dhMode) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "initiative-tracker", title: "Initiative Tracker", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "initiative-tracker");
    renderInitiativeChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  // Daggerheart GM Fear, Spotlight, Conditions & Importer Controls
  if (dhMode) {
    paneContainer.querySelector("#dh-fear-plus-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      data.dhGmFear = Math.min(12, (Number(data.dhGmFear) || 0) + 1);
      rerenderWithLocalData();
    });

    paneContainer.querySelector("#dh-fear-minus-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      data.dhGmFear = Math.max(0, (Number(data.dhGmFear) || 0) - 1);
      rerenderWithLocalData();
    });

    paneContainer.querySelectorAll(".dh-fear-pip-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        data.dhGmFear = Number(btn.getAttribute("data-dh-set-fear")) || 0;
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelector(".dh-pc-count-input")?.addEventListener("change", () => {
      collectInitiativeForm(paneContainer, data);
      rerenderWithLocalData();
    });

    paneContainer.querySelectorAll(".dh-spotlight-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        data.dhSpotlightName = btn.getAttribute("data-dh-spotlight") || "";
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelectorAll(".dh-cond-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const cond = btn.getAttribute("data-dh-cond");
        const listKey = btn.getAttribute("data-cond-list");
        const idx = Number(btn.getAttribute("data-cond-idx"));
        const row = data[listKey]?.[idx];
        if (row) {
          if (!Array.isArray(row.conditions)) row.conditions = [];
          if (row.conditions.includes(cond)) {
            row.conditions = row.conditions.filter((c) => c !== cond);
          } else {
            row.conditions.push(cond);
          }
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelector("#toggle-5e-importer-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      showImporterDrawer = !showImporterDrawer;
      rerenderWithLocalData();
    });

    const savedChars = state.entities.find((e) => e.type === "character-sheets")?.systemData?.characters || [];
    const savedAdversaries = state.entities.find((e) => e.type === "enemies")?.systemData?.enemies || [];

    const appendDhPc = (ch) => {
      const emptyIdx = data.pcNpcs.findIndex((r) => !r.name);
      const row = {
        initiative: "",
        name: ch.characterName || "PC",
        passive: `0/${ch.dhStressTotal || 6}`,
        ac: ch.dhEvasion || "10",
        hp: `0/${ch.dhHpTotal || 6}`,
        xp: "",
        conditions: [],
        statusTracking: `Thresholds: ${ch.dhThresholdMajor || 5}/${ch.dhThresholdSevere || 10} • Armor: ${ch.dhArmorScore || 0}`,
        role: "pc"
      };
      if (emptyIdx >= 0) data.pcNpcs[emptyIdx] = row;
      else data.pcNpcs.push(row);
    };

    paneContainer.querySelector("#import-all-pcs-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      savedChars.forEach(appendDhPc);
      rerenderWithLocalData();
    });

    paneContainer.querySelectorAll(".import-one-pc-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const idx = Number(btn.getAttribute("data-import-pc-idx"));
        if (savedChars[idx]) {
          appendDhPc(savedChars[idx]);
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelectorAll(".import-one-enemy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const idx = Number(btn.getAttribute("data-import-enemy-idx"));
        const en = savedAdversaries[idx];
        if (!en) return;
        const bp = en.battlePoints || String(getDaggerheartBattlePointCost(en.adversaryType));
        const emptyIdx = data.enemies.findIndex((r) => !r.name);
        const row = {
          initiative: "",
          name: en.name || "Adversary",
          passive: `0/${en.stress || 3}`,
          ac: en.difficulty || "12",
          hp: `0/${en.hitPoints || 5}`,
          battlePoints: bp,
          adversaryType: en.adversaryType || "Standard",
          conditions: [],
          statusTracking: `Thresh ${en.thresholdMajor || 6}/${en.thresholdSevere || 12} • ${bp} BP`,
          role: "enemy"
        };
        if (emptyIdx >= 0) data.enemies[emptyIdx] = row;
        else data.enemies.push(row);
        rerenderWithLocalData();
      });
    });
  }

  // D&D 5e Roster Importer & Quick HP/Condition Controls
  if (dndMode) {
    paneContainer.querySelector("#toggle-5e-importer-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      showImporterDrawer = !showImporterDrawer;
      rerenderWithLocalData();
    });

    const savedChars = state.entities.find((e) => e.type === "character-sheets")?.systemData?.characters || [];
    const savedEnemies = state.entities.find((e) => e.type === "enemies")?.systemData?.enemies || [];

    const appendPcFromSheet = (ch) => {
      const emptyIdx = data.pcNpcs.findIndex((r) => !r.name && !r.initiative);
      const row = {
        initiative: "",
        name: ch.characterName || "PC",
        passive: ch.passiveWisdom || "",
        ac: ch.armorClass || "",
        hp: ch.hpCurrent || ch.hpMax || "",
        xp: "",
        conditions: [],
        statusTracking: "",
        role: "pc"
      };
      if (emptyIdx >= 0) {
        data.pcNpcs[emptyIdx] = row;
      } else {
        data.pcNpcs.push(row);
      }
    };

    paneContainer.querySelector("#import-all-pcs-btn")?.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      savedChars.forEach(appendPcFromSheet);
      rerenderWithLocalData();
    });

    paneContainer.querySelectorAll(".import-one-pc-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const idx = Number(btn.getAttribute("data-import-pc-idx"));
        if (savedChars[idx]) {
          appendPcFromSheet(savedChars[idx]);
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelectorAll(".import-one-enemy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const idx = Number(btn.getAttribute("data-import-enemy-idx"));
        const en = savedEnemies[idx];
        if (!en) return;
        const hpFirstNum = String(en.hitPoints || "").match(/\d+/);
        const emptyIdx = data.enemies.findIndex((r) => !r.name && !r.initiative);
        const row = {
          initiative: "",
          name: en.name || "Monster",
          passive: "",
          ac: String(en.armorClass || "").match(/\d+/)?.[0] || en.armorClass || "",
          hp: hpFirstNum ? hpFirstNum[0] : en.hitPoints || "",
          xp: en.challenge || "",
          conditions: [],
          statusTracking: "",
          role: "enemy"
        };
        if (emptyIdx >= 0) {
          data.enemies[emptyIdx] = row;
        } else {
          data.enemies.push(row);
        }
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelectorAll(".quick-hp-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const op = btn.getAttribute("data-hp-op");
        const listKey = btn.getAttribute("data-hp-list");
        const idx = Number(btn.getAttribute("data-hp-idx"));
        const deltaInput = paneContainer.querySelector(`#hp-delta-${listKey}-${idx}`);
        const amount = parseInt(deltaInput?.value, 10);
        if (isNaN(amount) || amount <= 0) return;

        const row = data[listKey]?.[idx];
        if (!row) return;
        const currentHp = parseInt(String(row.hp || "0").match(/-?\d+/)?.[0] || "0", 10);
        const nextHp = op === "dmg" ? Math.max(0, currentHp - amount) : currentHp + amount;
        row.hp = String(nextHp);
        rerenderWithLocalData();
      });
    });

    paneContainer.querySelectorAll(".add-5e-cond-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const cond = sel.value;
        if (!cond) return;
        collectInitiativeForm(paneContainer, data);
        const listKey = sel.getAttribute("data-add-cond-list");
        const idx = Number(sel.getAttribute("data-add-cond-idx"));
        const row = data[listKey]?.[idx];
        if (row) {
          if (!Array.isArray(row.conditions)) row.conditions = [];
          if (!row.conditions.includes(cond)) row.conditions.push(cond);
          rerenderWithLocalData();
        }
      });
    });

    paneContainer.querySelectorAll(".toggle-5e-cond-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        collectInitiativeForm(paneContainer, data);
        const cond = btn.getAttribute("data-toggle-cond");
        const listKey = btn.getAttribute("data-cond-list");
        const idx = Number(btn.getAttribute("data-cond-idx"));
        const row = data[listKey]?.[idx];
        if (row && Array.isArray(row.conditions)) {
          row.conditions = row.conditions.filter((c) => c !== cond);
          rerenderWithLocalData();
        }
      });
    });
  }

  // Round bubble clicks
  paneContainer.querySelectorAll(".round-bubble-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      const rNum = Number(btn.getAttribute("data-round-num"));
      data.currentRound = rNum;
      if (!data.completedRounds.includes(rNum)) {
        data.completedRounds.push(rNum);
      } else {
        data.completedRounds = data.completedRounds.filter((n) => n !== rNum);
      }
      rerenderWithLocalData();
    });
  });

  paneContainer.querySelector("#next-round-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    const cur = Number(data.currentRound) || 1;
    if (!data.completedRounds.includes(cur)) {
      data.completedRounds.push(cur);
    }
    data.currentRound = cur < 20 ? cur + 1 : 1;
    activeTurnIndex = 0;
    rerenderWithLocalData();
  });

  paneContainer.querySelector("#reset-rounds-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    data.currentRound = 1;
    data.completedRounds = [];
    activeTurnIndex = 0;
    rerenderWithLocalData();
  });

  // Turn stepper
  paneContainer.querySelector("#next-turn-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    const total = getSortedCombatants(data).length;
    if (total === 0) return;
    activeTurnIndex += 1;
    if (activeTurnIndex >= total) {
      activeTurnIndex = 0;
      const cur = Number(data.currentRound) || 1;
      if (!data.completedRounds.includes(cur)) data.completedRounds.push(cur);
      data.currentRound = cur < 20 ? cur + 1 : 1;
    }
    rerenderWithLocalData();
  });

  paneContainer.querySelector("#prev-turn-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    const total = getSortedCombatants(data).length;
    if (total === 0) return;
    activeTurnIndex = (activeTurnIndex - 1 + total) % total;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-turn-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectInitiativeForm(paneContainer, data);
      activeTurnIndex = Number(btn.getAttribute("data-turn-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  // Add / Delete PC/NPC & Enemy rows
  paneContainer.querySelector("#add-pc-row-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    data.pcNpcs.push(createBlankCombatant("pc"));
    rerenderWithLocalData();
  });

  paneContainer.querySelector("#add-enemy-row-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    data.enemies.push(createBlankCombatant("enemy"));
    rerenderWithLocalData();
  });

  paneContainer.querySelector("#clear-enemies-btn")?.addEventListener("click", () => {
    collectInitiativeForm(paneContainer, data);
    data.enemies = [createBlankCombatant("enemy"), createBlankCombatant("enemy")];
    activeTurnIndex = 0;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".del-comb-row-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const listKey = btn.getAttribute("data-del-comb-list");
      const idx = Number(btn.getAttribute("data-del-comb-idx"));
      collectInitiativeForm(paneContainer, data);
      if (Array.isArray(data[listKey])) {
        data[listKey].splice(idx, 1);
        rerenderWithLocalData();
      }
    });
  });

  // Live Battle Map preview
  const mapInput = paneContainer.querySelector('[data-init-field="battleMapUrl"]');
  const mapPreview = paneContainer.querySelector("#init-map-preview");
  mapInput?.addEventListener("input", () => {
    const val = mapInput.value.trim();
    if (mapPreview) {
      if (val) {
        mapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Encounter Battle Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
      } else {
        mapPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste a battle map URL above to display it here during combat.</p>`;
      }
    }
  });
}

function collectInitiativeForm(container, data) {
  container.querySelectorAll("[data-init-misc]").forEach((el) => {
    data[el.getAttribute("data-init-misc")] = el.value;
  });

  container.querySelectorAll("[data-init-field]").forEach((el) => {
    data[el.getAttribute("data-init-field")] = el.value;
  });

  container.querySelectorAll("[data-comb-list]").forEach((el) => {
    const listKey = el.getAttribute("data-comb-list");
    const idx = Number(el.getAttribute("data-comb-idx"));
    const field = el.getAttribute("data-comb-field");
    if (Array.isArray(data[listKey]) && data[listKey][idx]) {
      data[listKey][idx][field] = el.value;
    }
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
