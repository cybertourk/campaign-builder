// chapter-initiative.js
// Dedicated interactive workbook for Chapter 11: Initiative Tracker (Page 258).
// Includes Date, Campaign Name, Session, 20 Round bubbles, 30–1 Initiative Ladder,
// PC/NPC & Enemy combatant trackers (Passive, AC, HP, HP/Status Tracking),
// live Sorted Turn Order, Encounter Battle Map image preview, and Misc Notes.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const INITIATIVE_TABS = [
  { id: "combat-tracker", label: "Initiative & Combat Tracker", icon: "swords" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeInitiativeTab = "combat-tracker";
let activeTurnIndex = 0;

function createBlankCombatant(role = "pc") {
  return {
    initiative: "",
    name: "",
    passive: "",
    ac: "",
    hp: "",
    statusTracking: "",
    role
  };
}

function getDefaultInitiativeData(campaignTitle = "") {
  return {
    date: "",
    campaignName: campaignTitle,
    session: "",
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

export function renderInitiativeChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeInitiativeTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "initiative-tracker");
  const defaults = getDefaultInitiativeData(state.activeCampaign?.title || "");
  const data = {
    ...defaults,
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.completedRounds)) data.completedRounds = [];
  if (!Array.isArray(data.pcNpcs)) data.pcNpcs = defaults.pcNpcs;
  if (!Array.isArray(data.enemies)) data.enemies = defaults.enemies;

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
              Chapter 11: Initiative Tracker
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Track combat rounds (1–20), 30–1 initiative order, PC/NPC and Enemy AC, HP, passive scores, conditions, and battle maps.
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
      ${renderInitiativeTabContent(activeInitiativeTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
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
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeInitiativeTab === "combat-tracker") {
    wireInitiativeControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-init-btn").addEventListener("click", async () => {
    collectInitiativeForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.session && `Session: ${data.session}`,
      `Round ${data.currentRound || 1}`,
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

function renderInitiativeTabContent(tabId, data) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Initiative Tracker — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Record lair action initiative counts (e.g., Initiative 20), environmental hazards, or ongoing spell durations.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Combat & Condition Notes</label>
          <textarea data-init-misc="miscNotes" rows="12"
            placeholder="Track concentration spells, lair actions, reinforcements arriving on Round 3, etc..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
        </div>
      </div>
    `;
  }

  const sortedCombatants = getSortedCombatants(data);
  if (activeTurnIndex >= sortedCombatants.length) {
    activeTurnIndex = 0;
  }

  return `
    <!-- Page 258 Top Metadata: DATE, CAMPAIGN NAME, SESSION -->
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

    <!-- Page 258: ROUNDS (20 Clickable Round Circles) -->
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
              }" title="Round ${roundNum} (Click to set active / toggle)">
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
          ? `<p class="text-xs text-slate-500">Enter names and initiative rolls in the PC/NPC or Enemy rows below to populate the live turn order.</p>`
          : `
            <div class="flex items-center gap-2 flex-wrap">
              ${sortedCombatants
                .map((c, idx) => {
                  const isTurn = idx === activeTurnIndex;
                  const roleBadge =
                    c.role === "enemy"
                      ? "border-rose-800/60 bg-rose-950/40 text-rose-200"
                      : "border-emerald-800/60 bg-emerald-950/40 text-emerald-200";
                  return `
                    <button type="button" data-turn-idx="${idx}"
                      class="select-turn-btn px-2.5 py-1 rounded-lg text-xs border transition flex items-center gap-1.5 ${
                        isTurn
                          ? "bg-amber-500/20 border-amber-400 text-white font-bold ring-1 ring-amber-400/50"
                          : roleBadge
                      }">
                      <span class="font-mono font-bold text-amber-300">${escapeHtml(c.initiative || "—")}</span>
                      <span>${escapeHtml(c.name)}</span>
                      ${c.ac ? `<span class="text-[10px] opacity-75">(AC ${escapeHtml(c.ac)})</span>` : ""}
                    </button>
                  `;
                })
                .join("")}
            </div>
          `
      }
    </div>

    <!-- Main 12-Column Combat Grid: 30–1 Initiative Ladder (Left) + PC/NPC & Enemy Tables (Right) -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <!-- Page 258 Left: INITIATIVE 30 down to 1 Reference Ladder -->
      <div class="lg:col-span-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3">
        <div class="text-xs font-bold uppercase tracking-wider text-indigo-400 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
          <span>Initiative (30–1)</span>
          <span class="text-[10px] font-normal text-slate-500">Auto-slotted</span>
        </div>
        <div class="space-y-1 max-h-[640px] overflow-y-auto pr-1">
          ${Array.from({ length: 30 }, (_, i) => {
            const score = 30 - i;
            const occupants = sortedCombatants.filter(
              (c) => parseInt(c.initiative, 10) === score
            );
            return `
              <div class="flex items-center gap-2 text-xs py-0.5 border-b border-slate-900">
                <span class="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold ${
                  occupants.length > 0
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-900 text-slate-500 border border-slate-800"
                }">${score}</span>
                <div class="flex-1 truncate text-[11px] ${
                  occupants.length > 0 ? "text-white font-semibold" : "text-slate-600"
                }">
                  ${
                    occupants.length > 0
                      ? occupants.map((o) => escapeHtml(o.name)).join(", ")
                      : "—————————"
                  }
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <!-- Page 258 Right: PC/NPC Section + Dotted Divider + ENEMY Section -->
      <div class="lg:col-span-9 space-y-5">
        <!-- PC / NPC Combatants -->
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <i data-lucide="shield" class="w-4 h-4"></i> PC / NPC Roster
            </h3>
            <button type="button" id="add-pc-row-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition">
              + Add PC / NPC
            </button>
          </div>

          ${renderCombatantRows(data.pcNpcs, "pcNpcs", "PC / NPC Name")}
        </div>

        <!-- Dotted Divider matching Page 258 -->
        <div class="border-t-2 border-dotted border-slate-700 my-1"></div>

        <!-- ENEMY Combatants -->
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <i data-lucide="skull" class="w-4 h-4"></i> Enemies
            </h3>
            <div class="flex items-center gap-2">
              <button type="button" id="clear-enemies-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded border border-slate-800 transition">
                Clear Enemies
              </button>
              <button type="button" id="add-enemy-row-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded border border-slate-700 transition">
                + Add Enemy
              </button>
            </div>
          </div>

          ${renderCombatantRows(data.enemies, "enemies", "Enemy Name")}
        </div>
      </div>
    </div>

    <!-- Encounter Battle Map Image URL & Preview -->
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
        Active Encounter Battle Map Image URL (Optional)
      </label>
      <input type="url" data-init-field="battleMapUrl" value="${escapeHtml(data.battleMapUrl || "")}"
        placeholder="https://... (Paste an encounter battle map link to reference during combat)"
        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
      <div id="init-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
        ${
          data.battleMapUrl
            ? `<img src="${escapeHtml(data.battleMapUrl)}" alt="Encounter Battle Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" />`
            : `<p class="text-xs text-slate-500 py-4">Paste a battle map URL above to display it here during combat.</p>`
        }
      </div>
    </div>
  `;
}

function renderCombatantRows(list, listKey, namePlaceholder) {
  return `
    <div class="space-y-2">
      <!-- Column Headers matching Page 258 -->
      <div class="hidden sm:grid sm:grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
        <div class="col-span-1 text-center">Init</div>
        <div class="col-span-3">${listKey === "pcNpcs" ? "PC / NPC" : "Enemy"}</div>
        <div class="col-span-1 text-center">Passive</div>
        <div class="col-span-1 text-center">AC</div>
        <div class="col-span-2 text-center">HP</div>
        <div class="col-span-3">HP / Status Tracking</div>
        <div class="col-span-1"></div>
      </div>

      ${list
        .map(
          (row, idx) => `
        <div class="grid grid-cols-2 sm:grid-cols-12 gap-2 items-center bg-slate-900/60 sm:bg-transparent p-2 sm:p-0 rounded-lg border border-slate-800/80 sm:border-0">
          <div class="col-span-1">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="initiative"
              value="${escapeHtml(row.initiative || "")}" placeholder="Init"
              class="init-roll-input w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-bold text-center text-amber-300 focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-1 sm:col-span-3">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="name"
              value="${escapeHtml(row.name || "")}" placeholder="${namePlaceholder}"
              class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-1">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="passive"
              value="${escapeHtml(row.passive || "")}" placeholder="PP"
              class="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-center text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-1">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="ac"
              value="${escapeHtml(row.ac || "")}" placeholder="AC"
              class="w-full px-1.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-center text-sky-300 focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-1 sm:col-span-2">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="hp"
              value="${escapeHtml(row.hp || "")}" placeholder="HP"
              class="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs font-semibold text-center text-emerald-300 focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-1 sm:col-span-3">
            <input type="text" data-comb-list="${listKey}" data-comb-idx="${idx}" data-comb-field="statusTracking"
              value="${escapeHtml(row.statusTracking || "")}" placeholder="-12, Poisoned, Conc..."
              class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="col-span-2 sm:col-span-1 flex justify-end sm:justify-center">
            <button type="button" data-del-comb-list="${listKey}" data-del-comb-idx="${idx}"
              class="del-comb-row-btn text-slate-500 hover:text-rose-400 p-1 transition" title="Remove Row">
              <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function getSortedCombatants(data) {
  const all = [
    ...(data.pcNpcs || []).map((c) => ({ ...c, role: "pc" })),
    ...(data.enemies || []).map((c) => ({ ...c, role: "enemy" }))
  ].filter((c) => (c.name && c.name.trim()) || (c.initiative && c.initiative.trim()));

  return all.sort((a, b) => {
    const numA = parseFloat(a.initiative);
    const numB = parseFloat(b.initiative);
    if (isNaN(numA) && isNaN(numB)) return 0;
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    return numB - numA;
  });
}

function wireInitiativeControls(paneContainer, state, existingDoc, data) {
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
    if (val) {
      mapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Encounter Battle Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      mapPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste a battle map URL above to display it here during combat.</p>`;
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
