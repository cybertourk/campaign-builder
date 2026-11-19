// chapter-plot.js
// Dedicated interactive workbook for Chapter 2: Plot and Adventures.
// Renders the active section selected from the vertical nested sidebar in ui-campaign.js.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const PLOT_TABS = [
  { id: "central-tension", label: "Central Tension", icon: "flame" },
  { id: "synopsis", label: "Central Tension Synopsis", icon: "file-text" },
  { id: "adventures", label: "Adventures & Battle Maps", icon: "swords" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activePlotTab = "central-tension";
let selectedAdventureIndex = 0;

function getDefaultPlotData() {
  return {
    // Page 45: Central Tension of the World
    apocalypticEvent: "",
    eventCause: "",
    eventMotivation: "",
    howToStop: "",
    escalationPlotPoints: "",

    // Page 46: Central Tension Synopsis
    centralTensionSynopsis: "",

    // Pages 47–49: Repeatable Adventure Sheets + Dungeon Battle Maps
    adventures: [],

    // Chapter 2 Misc Notes
    miscNotes: ""
  };
}

export function renderPlotChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activePlotTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "plot-adventures");
  const data = {
    ...getDefaultPlotData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.adventures)) data.adventures = [];

  if (selectedAdventureIndex >= data.adventures.length) {
    selectedAdventureIndex = Math.max(0, data.adventures.length - 1);
  }

  const currentSection =
    PLOT_TABS.find((t) => t.id === activePlotTab) || PLOT_TABS[0];

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
              Chapter 2: Plot & Adventures
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Define the overarching central tension, escalation milestones, individual adventures, and dungeon battle maps.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="plot-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-plot-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Plot
        </button>
      </div>
    </div>

    <!-- Active Section Body -->
    <div id="plot-tab-body" class="space-y-6 flex-1">
      ${renderPlotTabContent(activePlotTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="plot-adventures"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectPlotForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#plot-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activePlotTab === "adventures") {
    wireAdventureControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-plot-btn").addEventListener("click", async () => {
    collectPlotForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.apocalypticEvent && `Central Tension: ${data.apocalypticEvent}`,
      data.adventures.length > 0 && `Adventures: ${data.adventures.map((a) => a.title || "Untitled").join(", ")}`
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Plot and Adventures",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "plot-adventures",
          title: "Plot and Adventures",
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

function renderPlotTabContent(tabId, data) {
  switch (tabId) {
    case "central-tension":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div class="border-b border-slate-800 pb-3">
            <h3 class="text-sm font-bold text-white">Central Tension of the World</h3>
            <p class="text-xs text-slate-400 mt-0.5">Define the main overarching threat or dramatic conflict driving your campaign.</p>
          </div>

          ${renderField(
            "apocalypticEvent",
            "What Apocalyptic, World-Changing Event is Occurring?",
            "e.g., Invasion, genocide, pandemic, planar convergence, natural disaster, succession crisis...",
            data.apocalypticEvent,
            3
          )}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField(
              "eventCause",
              "Who or What is Causing This Event?",
              "Villain, faction, ancient curse, celestial cycle, corrupt empire...",
              data.eventCause,
              3
            )}
            ${renderField(
              "eventMotivation",
              "What Do They Have to Gain? Why is it Happening?",
              "Motives, grievances, ideological goals, hunger for power or survival...",
              data.eventMotivation,
              3
            )}
          </div>

          ${renderField(
            "howToStop",
            "How Can the Event Be Stopped?",
            "Required artifacts, alliances, rituals, weak points, or sacrifices...",
            data.howToStop,
            3
          )}

          <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <label class="block text-xs font-semibold text-white">
              What Events Happen in Order for the Main Event to Occur?
            </label>
            <p class="text-[11px] text-slate-400">
              Every major event is a further plot point leading to the eventual main event (Ex: Artifacts collected → Artifacts taken to sacred place → Ritual → Ancient Evil Awakened).
            </p>
            <textarea data-plot-field="escalationPlotPoints" rows="6"
              placeholder="1. First sign / catalyst...&#10;2. Escalation milestone...&#10;3. Point of no return...&#10;4. Climax / Main Event..."
              class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.escalationPlotPoints)}</textarea>
          </div>
        </div>
      `;

    case "synopsis":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white">Central Tension Synopsis</h3>
          <p class="text-xs text-slate-400">Write out the full narrative overview of the main campaign plot, act structure, and major twists.</p>
          ${renderField(
            "centralTensionSynopsis",
            "Full Plot Synopsis",
            "Summarize the overarching story from Act I through the finale...",
            data.centralTensionSynopsis,
            16
          )}
        </div>
      `;

    case "adventures":
      return renderAdventuresTab(data);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Plot & Adventures — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Store side-quest ideas, unused plot hooks, pacing reminders, or campaign clues.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous Plot Notes",
            "Write any extra plot ideas, rumors, or adventure brainstorms here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderAdventuresTab(data) {
  const adventures = data.adventures || [];
  const activeAdv = adventures[selectedAdventureIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Adventures & Dungeon Battle Maps</h3>
        <p class="text-xs text-slate-400">Plan individual quests, dungeons, encounters, loot, and attach battle maps.</p>
      </div>
      <button type="button" id="add-adventure-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Adventure
      </button>
    </div>

    ${
      adventures.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="swords" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Adventures Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Adventure" to build an adventure sheet and dungeon battle map.</p>
          </div>
        `
        : `
          <!-- Adventure Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${adventures
              .map(
                (adv, i) => `
              <button type="button" data-adv-idx="${i}" class="select-adv-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedAdventureIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(adv.title || `Adventure #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeAdv
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Adventure Title</label>
                      <input type="text" data-adv-field="title" value="${escapeHtml(activeAdv.title || "")}"
                        placeholder="e.g., The Sunken Vault of Vael"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-adventure-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove Adventure
                    </button>
                  </div>

                  <!-- Top Metadata Row: Start Location, Player Level, Experience Pts -->
                  <div class="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div class="sm:col-span-6">
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Start Location</label>
                      <input type="text" data-adv-field="startLocation" value="${escapeHtml(activeAdv.startLocation || "")}"
                        placeholder="Town, tavern, crossroads, or region..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Player Level / Tier</label>
                      <input type="text" data-adv-field="playerLevel" value="${escapeHtml(activeAdv.playerLevel || "")}"
                        placeholder="e.g., Levels 3–5"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div class="sm:col-span-3">
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Experience Pts / Milestone</label>
                      <input type="text" data-adv-field="experiencePts" value="${escapeHtml(activeAdv.experiencePts || "")}"
                        placeholder="e.g., 2,500 XP / +1 Level"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <!-- Middle Grid: Key NPCs + Plot Hook -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Key NPCs</label>
                      <textarea data-adv-field="keyNpcs" rows="4"
                        placeholder="Quest givers, patrons, rivals, prisoners..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeAdv.keyNpcs || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Plot Hook</label>
                      <textarea data-adv-field="plotHook" rows="4"
                        placeholder="How the party gets pulled into this adventure..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeAdv.plotHook || "")}</textarea>
                    </div>
                  </div>

                  <!-- Combat & Rewards Grid: Battles (Enemies / Experience Points) + Loot -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Battles — Enemies / Experience Points</label>
                      <textarea data-adv-field="battlesEnemiesXp" rows="5"
                        placeholder="Encounter 1: 4x Cultists, 1x Acolyte (450 XP)&#10;Boss: Bone Naga (1,100 XP)..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeAdv.battlesEnemiesXp || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Loot</label>
                      <textarea data-adv-field="loot" rows="5"
                        placeholder="Gold, magic items, quest clues, deeds, boons..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeAdv.loot || "")}</textarea>
                    </div>
                  </div>

                  <!-- Description -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-adv-field="description" rows="6"
                      placeholder="Scene-by-scene walkthrough, dungeon rooms, traps, puzzles, and possible endings..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeAdv.description || "")}</textarea>
                  </div>

                  <!-- Page 49: Dungeon Battle Map -->
                  <div class="pt-3 border-t border-slate-800/80 space-y-3">
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Dungeon Battle Map Image URL (Optional)
                    </label>
                    <input type="url" data-adv-field="battleMapUrl" value="${escapeHtml(activeAdv.battleMapUrl || "")}"
                      placeholder="https://... (Paste a DungeonDraft, Inkarnate, or battle map image link)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    <div id="adventure-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
                      ${
                        activeAdv.battleMapUrl
                          ? `<img src="${escapeHtml(activeAdv.battleMapUrl)}" alt="Dungeon Battle Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" />`
                          : `<p class="text-xs text-slate-500 py-5">Paste a dungeon or encounter battle map URL above to preview it here.</p>`
                      }
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

function wireAdventureControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "plot-adventures", title: "Plot and Adventures", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "plot-adventures");
    renderPlotChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-adventure-btn")?.addEventListener("click", () => {
    collectPlotForm(paneContainer, data);
    data.adventures.push({
      title: `Adventure ${data.adventures.length + 1}`,
      startLocation: "",
      playerLevel: "",
      experiencePts: "",
      keyNpcs: "",
      plotHook: "",
      battlesEnemiesXp: "",
      loot: "",
      description: "",
      battleMapUrl: ""
    });
    selectedAdventureIndex = data.adventures.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-adv-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectPlotForm(paneContainer, data);
      selectedAdventureIndex = Number(btn.getAttribute("data-adv-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-adventure-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.adventures.splice(selectedAdventureIndex, 1);
    selectedAdventureIndex = Math.max(0, selectedAdventureIndex - 1);
    rerenderWithLocalData();
  });

  const mapInput = paneContainer.querySelector('[data-adv-field="battleMapUrl"]');
  const mapPreview = paneContainer.querySelector("#adventure-map-preview");
  mapInput?.addEventListener("input", () => {
    const val = mapInput.value.trim();
    if (val) {
      mapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Dungeon Battle Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      mapPreview.innerHTML = `<p class="text-xs text-slate-500 py-5">Paste a dungeon or encounter battle map URL above to preview it here.</p>`;
    }
  });
}

function collectPlotForm(container, data) {
  container.querySelectorAll("[data-plot-field]").forEach((el) => {
    const key = el.getAttribute("data-plot-field");
    data[key] = el.value;
  });

  if (activePlotTab === "adventures" && data.adventures[selectedAdventureIndex]) {
    container.querySelectorAll("[data-adv-field]").forEach((el) => {
      const aField = el.getAttribute("data-adv-field");
      data.adventures[selectedAdventureIndex][aField] = el.value;
    });
  }
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-plot-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
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
