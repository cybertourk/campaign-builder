// chapter-enemies.js
// Dedicated interactive workbook for Chapter 4: Enemies (Pages 103–104+).
// Renders the active section selected from the vertical nested sidebar in ui-campaign.js.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const ENEMIES_TABS = [
  { id: "bbg-hierarchy", label: "Main Villain & Hierarchy", icon: "crown" },
  { id: "bestiary", label: "Enemy Statblocks", icon: "skull" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeEnemiesTab = "bbg-hierarchy";
let selectedEnemyIndex = 0;

function getDefaultEnemiesData() {
  return {
    // Page 103: Enemies Overview Prompts
    mainVillain: "",
    villainMotivation: "",
    enemyHierarchy: "",
    alliedEnemiesList: "",

    // Page 104+: Repeatable Enemy Statblock Cards
    enemies: [],

    // Chapter 4 Misc Notes
    miscNotes: ""
  };
}

export function renderEnemiesChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeEnemiesTab = options.activeSectionId;
  }

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
              Chapter 4: Enemies
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Detail your Big Bad Guy (BBG), enemy hierarchy, allied monster groups, and full enemy statblocks.
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
      ${renderEnemiesTabContent(activeEnemiesTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
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
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
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

function renderEnemiesTabContent(tabId, data) {
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
      return renderBestiaryTab(data);

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

function renderBestiaryTab(data) {
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
                ${escapeHtml(en.name || `Enemy #${i + 1}`)}
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

                  <!-- Combat Vitals: Armor Class, Hit Points, Speed, Challenge -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Armor Class</label>
                      <input type="text" data-enemy-field="armorClass" value="${escapeHtml(activeEnemy.armorClass || "")}"
                        placeholder="e.g., 15 (Chain)"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Hit Points</label>
                      <input type="text" data-enemy-field="hitPoints" value="${escapeHtml(activeEnemy.hitPoints || "")}"
                        placeholder="e.g., 68 (8d10+24)"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Speed</label>
                      <input type="text" data-enemy-field="speed" value="${escapeHtml(activeEnemy.speed || "")}"
                        placeholder="e.g., 30 ft., fly 60 ft."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Challenge / Threat</label>
                      <input type="text" data-enemy-field="challenge" value="${escapeHtml(activeEnemy.challenge || "")}"
                        placeholder="e.g., CR 4 (1,100 XP)"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <!-- 6 Core Ability Scores (STR, DEX, CON, INT, WIS, CHA) -->
                  <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-xl p-3">
                    ${[
                      ["strength", "Strength"],
                      ["dexterity", "Dexterity"],
                      ["constitution", "Constitution"],
                      ["intelligence", "Intelligence"],
                      ["wisdom", "Wisdom"],
                      ["charisma", "Charisma"]
                    ]
                      .map(
                        ([key, label]) => `
                      <div class="text-center">
                        <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">${label}</label>
                        <input type="text" data-enemy-field="${key}" value="${escapeHtml(activeEnemy[key] || "")}"
                          placeholder="10 (+0)"
                          class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm font-semibold text-center text-white focus:outline-none focus:border-indigo-500" />
                      </div>
                    `
                      )
                      .join("")}
                  </div>

                  <!-- Traits/Description + Dropped Loot -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Traits / Description & Actions</label>
                      <textarea data-enemy-field="traitsDescription" rows="5"
                        placeholder="Appearance, passive traits, attacks, special abilities, tactics..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeEnemy.traitsDescription || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Dropped Loot</label>
                      <textarea data-enemy-field="droppedLoot" rows="5"
                        placeholder="Coins, weapons, harvesting components, quest clues..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeEnemy.droppedLoot || "")}</textarea>
                    </div>
                  </div>

                  <!-- Skills, Senses, Languages -->
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Skills</label>
                      <textarea data-enemy-field="skills" rows="3"
                        placeholder="e.g., Perception +5, Stealth +6..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeEnemy.skills || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Senses</label>
                      <textarea data-enemy-field="senses" rows="3"
                        placeholder="e.g., Darkvision 60 ft., Passive Perception 15..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeEnemy.senses || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Languages</label>
                      <textarea data-enemy-field="languages" rows="3"
                        placeholder="e.g., Common, Abyssal, Telepathy 60 ft..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeEnemy.languages || "")}</textarea>
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
      strength: "",
      dexterity: "",
      constitution: "",
      intelligence: "",
      wisdom: "",
      charisma: "",
      armorClass: "",
      hitPoints: "",
      speed: "",
      traitsDescription: "",
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
