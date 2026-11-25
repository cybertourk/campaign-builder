// chapter-enemies.js
// Dedicated interactive workbook for Chapter 4: Enemies.
// Supports Universal Core, full D&D 5e Monster Manual statblocks, and Daggerheart
// Adversaries & Environments (Tier 1–4, Role/Type with Battle Points, Motives & Tactics,
// Difficulty, Major/Severe Thresholds, HP, Stress, Attack Mod/Weapon/Range/Damage, Experiences & Fear Features).

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  isDaggerheart,
  DND5E_CREATURE_SIZES,
  parseAbilityScore,
  DAGGERHEART_TIERS,
  DAGGERHEART_ADVERSARY_TYPES,
  DAGGERHEART_RANGE_BANDS,
  getDaggerheartBattlePointCost
} from "./system-rulesets.js";

export const ENEMIES_TABS = [
  { id: "bbg-hierarchy", label: "Main Villain & Hierarchy", icon: "crown" },
  { id: "bestiary", label: "Enemy Statblocks", icon: "skull" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeEnemiesTab = "bbg-hierarchy";
let selectedEnemyIndex = 0;

function getDefaultEnemiesData() {
  return {
    mainVillain: "",
    villainMotivation: "",
    enemyHierarchy: "",
    alliedEnemiesList: "",
    enemies: [],
    miscNotes: ""
  };
}

export function renderEnemiesChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeEnemiesTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "enemies");
  const data = {
    ...getDefaultEnemiesData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.enemies)) data.enemies = [];

  if (selectedEnemyIndex >= data.enemies.length) {
    selectedEnemyIndex = Math.max(0, data.enemies.length - 1);
  }

  const currentSection =
    ENEMIES_TABS.find((t) => t.id === activeEnemiesTab) || ENEMIES_TABS[0];

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
              Chapter 4: ${dhMode ? "Adversaries" : "Enemies"}${dhMode ? " • Daggerheart" : dndMode ? " • D&D 5e" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Build Daggerheart Adversaries with Tier, Role (Solo, Bruiser, Leader, Minion, etc.), Battle Points, Motives & Tactics, Difficulty, Thresholds, and Fear Features."
                : `Detail your Big Bad Guy (BBG), enemy hierarchy, allied monster groups, and ${dndMode ? "full D&D 5e monster statblocks" : "enemy statblocks"}.`
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="enemies-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-enemies-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Enemies
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderEnemiesTabContent(activeEnemiesTab, data, dndMode, dhMode)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="enemies"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectEnemiesForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#enemies-save-status");
  paneContainer.querySelectorAll("input, textarea, select").forEach((el) => {
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeEnemiesTab === "bestiary") {
    wireEnemyControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-enemies-btn").addEventListener("click", async () => {
    collectEnemiesForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.mainVillain && `BBG: ${data.mainVillain}`,
      data.enemies.length > 0 && `Statblocks: ${data.enemies.map((e) => e.name || "Unnamed").join(", ")}`
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Enemies",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "enemies",
          title: "Enemies",
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

function renderEnemiesTabContent(tabId, data, dndMode, dhMode) {
  switch (tabId) {
    case "bbg-hierarchy":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField(
              "mainVillain",
              "Who is the Main Villain in the Central Plot? (BBG — Big Bad Guy)",
              "Name, title, appearance, and current stronghold of the primary antagonist...",
              data.mainVillain,
              3
            )}
            ${renderField(
              "villainMotivation",
              "What is Their Motivation?",
              "Why are they pursuing their plan? Vengeance, ascension, fanaticism, survival...",
              data.villainMotivation,
              3
            )}
          </div>

          ${renderField(
            "enemyHierarchy",
            "What is the Hierarchy of Enemies? (e.g., Kobolds < Gargoyles < Dragons)",
            "Map the chain of command from low-level minions up to lieutenants and the apex threat...",
            data.enemyHierarchy,
            3
          )}

          ${renderField(
            "alliedEnemiesList",
            "Make a List of Enemies That Would Work Together in Your World",
            "List enemy alliances, mercenary pacts, beast handlers, or symbiotic monster pairings...",
            data.alliedEnemiesList,
            8
          )}
        </div>
      `;

    case "bestiary":
      return dhMode ? renderDaggerheartAdversaryBestiary(data) : renderBestiaryTab(data, dndMode);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Enemies — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Jot down combat tactics, lair actions, morale rules, or monster reskin ideas.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous Enemy Notes",
            "Write extra villain schemes, boss phase ideas, or encounter tactics here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderBestiaryTab(data, dndMode) {
  const enemies = data.enemies || [];
  const activeEnemy = enemies[selectedEnemyIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Enemy Statblocks & Profiles</h3>
        <p class="text-xs text-slate-400">Create custom stat sheets for monsters, villains, and hostile NPCs.</p>
      </div>
      <button type="button" id="add-enemy-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Enemy
      </button>
    </div>

    ${
      enemies.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="skull" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Enemies Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Enemy" to create a statblock sheet.</p>
          </div>
        `
        : `
          <!-- Enemy Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${enemies
              .map(
                (en, i) => `
              <button type="button" data-enemy-idx="${i}" class="select-enemy-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedEnemyIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(en.name || `Enemy #${i + 1}`)}${en.challenge ? ` (${escapeHtml(en.challenge)})` : ""}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeEnemy
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
                  <!-- Top Header: Enemy Name + Delete -->
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Enemy Name</label>
                      <input type="text" data-enemy-field="name" value="${escapeHtml(activeEnemy.name || "")}"
                        placeholder="e.g., Dread Knight, Mire Stalker, Void Cultist"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-enemy-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove Enemy
                    </button>
                  </div>

                  ${
                    dndMode
                      ? `
                        <!-- D&D 5e Creature Size, Type & Alignment Sub-Header -->
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                          <div>
                            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Size</label>
                            <select data-enemy-field="size"
                              class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500">
                              <option value="">Select Size...</option>
                              ${DND5E_CREATURE_SIZES.map(
                                (sz) => `<option value="${sz}" ${activeEnemy.size === sz ? "selected" : ""}>${sz}</option>`
                              ).join("")}
                            </select>
                          </div>
                          <div>
                            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Creature Type</label>
                            <input type="text" data-enemy-field="creatureType" value="${escapeHtml(activeEnemy.creatureType || "")}"
                              placeholder="e.g., Undead, Fiend, Humanoid (Cultist)"
                              class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                          <div>
                            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Alignment</label>
                            <input type="text" data-enemy-field="alignment" value="${escapeHtml(activeEnemy.alignment || "")}"
                              placeholder="e.g., Lawful Evil, Unaligned"
                              class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
                          </div>
                        </div>
                      `
                      : ""
                  }
/**
 * Renders Daggerheart Adversary Statblocks (Tier 1–4, Role/Type & Battle Points, Motives & Tactics,
 * Difficulty, Major/Severe Thresholds, HP, Stress, Attack Mod/Weapon/Range/Damage, Experiences & Features).
 */
function renderDaggerheartAdversaryBestiary(data) {
  const enemies = data.enemies || [];
  const activeAdv = enemies[selectedEnemyIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Daggerheart Adversary &amp; Environment Statblocks</h3>
        <p class="text-xs text-slate-400">Create adversaries with Tier, Role, Battle Points, Motives &amp; Tactics, Difficulty, Thresholds, and Fear Features.</p>
      </div>
      <button type="button" id="add-enemy-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Adversary
      </button>
    </div>

    ${
      enemies.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="skull" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Adversaries Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Adversary" to create a Daggerheart statblock.</p>
          </div>
        `
        : `
          <div class="flex items-center gap-2 flex-wrap">
            ${enemies
              .map((en, i) => {
                const bp = getDaggerheartBattlePointCost(en.adversaryType || "Standard");
                return `
                  <button type="button" data-enemy-idx="${i}" class="select-enemy-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    i === selectedEnemyIndex
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                  }">
                    ${escapeHtml(en.name || `Adversary #${i + 1}`)}${en.adversaryType ? ` • ${escapeHtml(en.adversaryType)} (${bp} BP)` : ""}
                  </button>
                `;
              })
              .join("")}
          </div>

          ${
            activeAdv
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
                  <!-- Top Header: Adversary Name + Remove -->
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Adversary / Environment Name</label>
                      <input type="text" data-enemy-field="name" value="${escapeHtml(activeAdv.name || "")}"
                        placeholder="e.g., Jagged Knife Bandit, Forest Wraith, Blighted Treant"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white" />
                    </div>
                    <button type="button" id="delete-enemy-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 transition self-end">
                      Remove
                    </button>
                  </div>

                  <!-- Tier, Role/Type & Battle Points -->
                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Tier</label>
                      <select data-enemy-field="tier" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                        ${DAGGERHEART_TIERS.map(
                          (t) => `<option value="${t}" ${(activeAdv.tier || "Tier 1 (Lvl 1)") === t ? "selected" : ""}>${t}</option>`
                        ).join("")}
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Adversary Role / Type</label>
                      <select data-enemy-field="adversaryType" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                        ${DAGGERHEART_ADVERSARY_TYPES.map(
                          (at) => `<option value="${at.type}" ${(activeAdv.adversaryType || "Standard") === at.type ? "selected" : ""}>${at.type} (${at.points} Battle Pts)</option>`
                        ).join("")}
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Battle Points Cost</label>
                      <input type="text" data-enemy-field="battlePoints"
                        value="${escapeHtml(activeAdv.battlePoints || String(getDaggerheartBattlePointCost(activeAdv.adversaryType || "Standard")))}"
                        placeholder="2"
                        class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-amber-300 text-center" />
                    </div>
                  </div>

                  <!-- Motives & Tactics -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Motives &amp; Tactics</label>
                    <input type="text" data-enemy-field="motivesTactics" value="${escapeHtml(activeAdv.motivesTactics || "")}"
                      placeholder="e.g., Ambush isolated travelers, steal shiny valuables, flee when reduced to 2 HP"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
                  </div>

                  <!-- Core Adversary Numbers: Difficulty, Major/Severe Thresholds, HP, Stress -->
                  <div class="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Difficulty</label>
                      <input type="text" data-enemy-field="difficulty" value="${escapeHtml(activeAdv.difficulty || "12")}"
                        placeholder="12"
                        class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Major Threshold</label>
                      <input type="text" data-enemy-field="thresholdMajor" value="${escapeHtml(activeAdv.thresholdMajor || "6")}"
                        placeholder="6"
                        class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Severe Threshold</label>
                      <input type="text" data-enemy-field="thresholdSevere" value="${escapeHtml(activeAdv.thresholdSevere || "12")}"
                        placeholder="12"
                        class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-rose-300" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hit Points (HP)</label>
                      <input type="text" data-enemy-field="hitPoints" value="${escapeHtml(activeAdv.hitPoints || "5")}"
                        placeholder="5"
                        class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-emerald-300" />
                    </div>
                    <div>
                      <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Stress</label>
                      <input type="text" data-enemy-field="stress" value="${escapeHtml(activeAdv.stress || "3")}"
                        placeholder="3"
                        class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-purple-300" />
                    </div>
                  </div>

                  <!-- Standard Attack Row: ATK Mod, Weapon/Attack Name, Range Band, Damage Dice & Type -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Attack Modifier</label>
                      <input type="text" data-enemy-field="attackMod" value="${escapeHtml(activeAdv.attackMod || "+1")}"
                        placeholder="+1"
                        class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs font-bold text-white" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Weapon / Attack</label>
                      <input type="text" data-enemy-field="weaponName" value="${escapeHtml(activeAdv.weaponName || "")}"
                        placeholder="e.g., Jagged Dagger / Claws"
                        class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Range Band</label>
                      <select data-enemy-field="rangeBand" class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                        ${DAGGERHEART_RANGE_BANDS.map(
                          (rb) => `<option value="${rb}" ${(activeAdv.rangeBand || "Melee") === rb ? "selected" : ""}>${rb}</option>`
                        ).join("")}
                      </select>
                    </div>
                    <div>
                      <label class="block text-[11px] font-semibold text-slate-400 mb-1">Damage Dice &amp; Type</label>
                      <input type="text" data-enemy-field="damageDice" value="${escapeHtml(activeAdv.damageDice || "")}"
                        placeholder="e.g., 1d8+2 phy / 2d6 mag"
                        class="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-rose-300 font-semibold" />
                    </div>
                  </div>

                  <!-- Experiences & Features (Passives, Actions, Reactions & Spend Fear) -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Adversary Experiences</label>
                    <input type="text" data-enemy-field="experiences" value="${escapeHtml(activeAdv.experiences || "")}"
                      placeholder="e.g., Forest Ambush +2, Keen Scent +3"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-amber-200" />
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Features (Passives, Actions &amp; Spend Fear Moves)</label>
                      <textarea data-enemy-field="traitsDescription" rows="5"
                        placeholder="Pack Tactics (Passive): ...&#10;Shadow Strike (Action - Spend 1 Fear): ...&#10;Relentless (Reaction): ..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeAdv.traitsDescription || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Loot, Salvage &amp; Token Image URL</label>
                      <input type="url" data-enemy-field="imageUrl" value="${escapeHtml(activeAdv.imageUrl || "")}"
                        placeholder="Token Image URL (https://...)"
                        class="w-full px-3 py-1.5 mb-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white" />
                      <textarea data-enemy-field="droppedLoot" rows="3"
                        placeholder="Gold handfuls, consumables, crafting materials..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeAdv.droppedLoot || "")}</textarea>
                    </div>
                  </div>
                </div>
              `
              : ""
          }
        `
    }
  `;
}

function wireEnemyControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "enemies", title: "Enemies", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "enemies");
    renderEnemiesChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-enemy-btn")?.addEventListener("click", () => {
    collectEnemiesForm(paneContainer, data);
    data.enemies.push({
      name: `Enemy ${data.enemies.length + 1}`,
      size: "Medium",
      creatureType: "",
      alignment: "",
      tier: "Tier 1 (Lvl 1)",
      adversaryType: "Standard",
      battlePoints: "2",
      motivesTactics: "",
      difficulty: "12",
      thresholdMajor: "6",
      thresholdSevere: "12",
      stress: "3",
      attackMod: "+1",
      weaponName: "",
      rangeBand: "Melee",
      damageDice: "",
      experiences: "",
      imageUrl: "",
      strength: "",
      dexterity: "",
      constitution: "",
      intelligence: "",
      wisdom: "",
      charisma: "",
      armorClass: "",
      hitPoints: "",
      speed: "",
      savingThrows: "",
      damageVulnerabilities: "",
      damageResistances: "",
      damageImmunities: "",
      conditionImmunities: "",
      traitsDescription: "",
      actions: "",
      bonusReactions: "",
      legendaryActions: "",
      droppedLoot: "",
      skills: "",
      senses: "",
      languages: "",
      challenge: ""
    });
    selectedEnemyIndex = data.enemies.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-enemy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectEnemiesForm(paneContainer, data);
      selectedEnemyIndex = Number(btn.getAttribute("data-enemy-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-enemy-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.enemies.splice(selectedEnemyIndex, 1);
    selectedEnemyIndex = Math.max(0, selectedEnemyIndex - 1);
    rerenderWithLocalData();
  });

  const imgInput = paneContainer.querySelector('[data-enemy-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#enemy-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (val) {
      imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Enemy Artwork" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview enemy artwork or a token here.</p>`;
    }
  });
}

function collectEnemiesForm(container, data) {
  container.querySelectorAll("[data-enemies-field]").forEach((el) => {
    data[el.getAttribute("data-enemies-field")] = el.value;
  });

  if (activeEnemiesTab === "bestiary" && data.enemies[selectedEnemyIndex]) {
    container.querySelectorAll("[data-enemy-field]").forEach((el) => {
      const eField = el.getAttribute("data-enemy-field");
      data.enemies[selectedEnemyIndex][eField] = el.value;
    });
  }
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-enemies-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
        class="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(value)}</textarea>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
