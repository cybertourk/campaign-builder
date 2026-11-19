// chapter-encounters.js
// Dedicated interactive workbook for Chapter 3: Random Encounters (Pages 101–102).
// Renders the active section selected from the vertical nested sidebar in ui-campaign.js.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const ENCOUNTERS_TABS = [
  { id: "encounter-tables", label: "Day / Night Encounter Table", icon: "dices" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeEncountersTab = "encounter-tables";

function getDefaultEncountersData() {
  return {
    rows: [],
    miscNotes: ""
  };
}

export function renderEncountersChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeEncountersTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "random-encounters");
  const data = {
    ...getDefaultEncountersData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.rows)) data.rows = [];

  const currentSection =
    ENCOUNTERS_TABS.find((t) => t.id === activeEncountersTab) || ENCOUNTERS_TABS[0];

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
              Chapter 3: Random Encounters
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Plan balanced day and night random encounters by player level so your party is never over- or under-matched.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="encounters-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-encounters-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Encounters
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderEncountersTabContent(activeEncountersTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="random-encounters"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectEncountersForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#encounters-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeEncountersTab === "encounter-tables") {
    wireEncounterTableControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-encounters-btn").addEventListener("click", async () => {
    collectEncountersForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = `${data.rows.length} encounter table row(s)`;

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Random Encounters",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "random-encounters",
          title: "Random Encounters",
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

function renderEncountersTabContent(tabId, data) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Random Encounters — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Jot down encounter triggers, terrain modifiers, non-combat road events, or ambush ideas.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Encounter Notes</label>
          <textarea data-enc-field="miscNotes" rows="12"
            placeholder="Write extra encounter rules, d20 trigger thresholds, or environmental twists here..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
        </div>
      </div>
    `;
  }

  const rows = data.rows || [];

  return `
    <!-- Planner Guidance Prompt Box -->
    <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-start gap-2.5">
      <i data-lucide="lightbulb" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
      <p class="text-xs text-slate-300 leading-relaxed">
        <strong>Planner Guide:</strong> What type of encounters will the players meet at what level and with what enemies? Do certain enemies only come out at night? How many enemies? What level will the characters be when they encounter these enemies? This ensures your players are never over- or under-matched at any level.
      </p>
    </div>

    <!-- Action Bar: Add Row + Roll Random Encounter -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Player Level — Day / Night Encounter Table</h3>
        <p class="text-xs text-slate-400">Add as many encounter rows as needed across levels and regions.</p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button type="button" id="roll-encounter-btn" ${rows.length === 0 ? "disabled" : ""}
          class="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium transition">
          <i data-lucide="dices" class="w-4 h-4"></i> Roll Random Row
        </button>
        <button type="button" id="add-encounter-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition">
          <i data-lucide="plus" class="w-4 h-4"></i> Add Row
        </button>
      </div>
    </div>

    <!-- Roll Result Banner -->
    <div id="encounter-roll-banner" class="hidden p-3.5 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-100 flex items-center justify-between gap-3">
      <div id="encounter-roll-text"></div>
      <button type="button" id="close-roll-banner" class="text-indigo-300 hover:text-white">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

    ${
      rows.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="dices" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Encounter Rows Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Row" to start building your Player Level (Day / Night / Enemies) table.</p>
          </div>
        `
        : `
          <div class="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50">
            <!-- Table Header matching Page 101: PLAYER LEVEL (DAY | NIGHT) | ENEMIES -->
            <div class="hidden md:grid md:grid-cols-12 bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <div class="md:col-span-4 border-r border-slate-800">
                <div class="px-3 py-1.5 text-center text-indigo-400 border-b border-slate-800/80">Player Level / Roll</div>
                <div class="grid grid-cols-2">
                  <div class="px-3 py-1.5 text-center border-r border-slate-800/80 flex items-center justify-center gap-1">
                    <i data-lucide="sun" class="w-3 h-3 text-amber-400"></i> Day
                  </div>
                  <div class="px-3 py-1.5 text-center flex items-center justify-center gap-1">
                    <i data-lucide="moon" class="w-3 h-3 text-indigo-400"></i> Night
                  </div>
                </div>
              </div>
              <div class="md:col-span-7 px-3.5 py-2 flex items-end">Enemies & Encounter Details</div>
              <div class="md:col-span-1 px-2 py-2 flex items-end justify-center"></div>
            </div>

            <div class="divide-y divide-slate-800/80">
              ${rows
                .map(
                  (r, idx) => `
                <div data-enc-row="${idx}" class="grid grid-cols-1 md:grid-cols-12 items-center p-2.5 md:p-0 gap-2 md:gap-0 hover:bg-slate-900/40 transition">
                  <div class="md:col-span-2 md:border-r md:border-slate-800/80 md:p-2">
                    <label class="md:hidden block text-[10px] uppercase text-slate-400 mb-0.5">Day (Level / Roll)</label>
                    <input type="text" data-row-idx="${idx}" data-row-field="day" value="${escapeHtml(r.day || "")}"
                      placeholder="Lvl 1-2 / 01-10"
                      class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-center text-amber-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="md:col-span-2 md:border-r md:border-slate-800/80 md:p-2">
                    <label class="md:hidden block text-[10px] uppercase text-slate-400 mb-0.5">Night (Level / Roll)</label>
                    <input type="text" data-row-idx="${idx}" data-row-field="night" value="${escapeHtml(r.night || "")}"
                      placeholder="Lvl 1-2 / 01-10"
                      class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-center text-indigo-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="md:col-span-7 md:p-2">
                    <label class="md:hidden block text-[10px] uppercase text-slate-400 mb-0.5">Enemies</label>
                    <input type="text" data-row-idx="${idx}" data-row-field="enemies" value="${escapeHtml(r.enemies || "")}"
                      placeholder="e.g., 1d4+1 Dire Wolves (Night: 2 Shadow Mastiffs + 1 Cult Fanatic)"
                      class="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="md:col-span-1 flex justify-end md:justify-center md:p-2">
                    <button type="button" data-del-enc-row="${idx}" title="Remove Row" class="del-enc-row-btn text-slate-500 hover:text-rose-400 p-1 rounded transition">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        `
    }
  `;
}

function wireEncounterTableControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "random-encounters", title: "Random Encounters", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "random-encounters");
    renderEncountersChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-encounter-row-btn")?.addEventListener("click", () => {
    collectEncountersForm(paneContainer, data);
    data.rows.push({ day: "", night: "", enemies: "" });
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".del-enc-row-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del-enc-row"));
      collectEncountersForm(paneContainer, data);
      data.rows.splice(idx, 1);
      rerenderWithLocalData();
    });
  });

  paneContainer.querySelector("#roll-encounter-btn")?.addEventListener("click", () => {
    collectEncountersForm(paneContainer, data);
    if (data.rows.length === 0) return;
    const pickIdx = Math.floor(Math.random() * data.rows.length);
    const picked = data.rows[pickIdx];
    const banner = paneContainer.querySelector("#encounter-roll-banner");
    const textEl = paneContainer.querySelector("#encounter-roll-text");
    textEl.innerHTML = `
      <span class="font-bold text-indigo-300">Rolled Row #${pickIdx + 1}:</span>
      <span class="ml-2 text-amber-300">Day: ${escapeHtml(picked.day || "—")}</span> •
      <span class="text-indigo-300">Night: ${escapeHtml(picked.night || "—")}</span> —
      <span class="font-semibold text-white">${escapeHtml(picked.enemies || "(Empty row)")}</span>
    `;
    banner.classList.remove("hidden");
  });

  paneContainer.querySelector("#close-roll-banner")?.addEventListener("click", () => {
    paneContainer.querySelector("#encounter-roll-banner")?.classList.add("hidden");
  });
}

function collectEncountersForm(container, data) {
  container.querySelectorAll("[data-enc-field]").forEach((el) => {
    data[el.getAttribute("data-enc-field")] = el.value;
  });

  container.querySelectorAll("[data-row-field]").forEach((el) => {
    const idx = Number(el.getAttribute("data-row-idx"));
    const field = el.getAttribute("data-row-field");
    if (data.rows[idx]) {
      data.rows[idx][field] = el.value;
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
