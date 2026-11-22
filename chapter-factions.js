// chapter-factions.js
// Dedicated interactive workbook for Chapter 6: Faction (Pages 127–128+).
// Renders the active section selected from the vertical nested sidebar in ui-campaign.js.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const FACTIONS_TABS = [
  { id: "factions-overview", label: "Factions Overview", icon: "flag" },
  { id: "faction-profiles", label: "Faction Sheets", icon: "shield" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeFactionsTab = "factions-overview";
let selectedFactionIndex = 0;

function getDefaultFactionsData() {
  return {
    // Page 127: Factions Overview Prompts
    opposingFactionsCount: "",
    playersAlliedOrAgainst: "",
    factionsHierarchy: "",
    factionsSummaryList: "",
    mainQuestInteraction: "",

    // Page 128+: Repeatable Faction Sheets
    factions: [],

    // Chapter 6 Misc Notes
    miscNotes: ""
  };
}

export function renderFactionsChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeFactionsTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "faction");
  const data = {
    ...getDefaultFactionsData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.factions)) data.factions = [];

  if (selectedFactionIndex >= data.factions.length) {
    selectedFactionIndex = Math.max(0, data.factions.length - 1);
  }

  const currentSection =
    FACTIONS_TABS.find((t) => t.id === activeFactionsTab) || FACTIONS_TABS[0];

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
              Chapter 6: Faction
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Map out guilds, orders, syndicates, political alliances, rivalries, and key faction members.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="factions-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-factions-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Factions
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderFactionsTabContent(activeFactionsTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="faction"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectFactionsForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#factions-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeFactionsTab === "faction-profiles") {
    wireFactionControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-factions-btn").addEventListener("click", async () => {
    collectFactionsForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary =
      data.factions.length > 0
        ? `Factions: ${data.factions.map((f) => f.factionName || "Unnamed").join(", ")}`
        : data.factionsSummaryList || "Factions Overview";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Factions",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "faction",
          title: "Factions",
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

function renderFactionsTabContent(tabId, data) {
  switch (tabId) {
    case "factions-overview":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField(
              "opposingFactionsCount",
              "How Many Different Opposing Factions Exist? (Knights of Justice, Assassins, Thieves Guild, etc.)",
              "List the number and broad types of competing organizations in your campaign...",
              data.opposingFactionsCount,
              3
            )}
            ${renderField(
              "playersAlliedOrAgainst",
              "Will Your Characters Need to Be Allied or Against One?",
              "Can players join multiple factions, pick a side, or remain independent mercenaries?",
              data.playersAlliedOrAgainst,
              3
            )}
          </div>

          ${renderField(
            "factionsHierarchy",
            "What is the Hierarchy of the Factions?",
            "Which factions hold supreme authority, which operate in the shadows, and who answers to whom?",
            data.factionsHierarchy,
            3
          )}

          ${renderField(
            "factionsSummaryList",
            "Name the Factions and Their Characteristics",
            "Quick summary of each faction and its defining traits (build full individual Faction Sheets in Faction Sheets)...",
            data.factionsSummaryList,
            4
          )}

          ${renderField(
            "mainQuestInteraction",
            "How Do the Different Factions Interact with the Main Quest? (Are they all against each other in an apocalyptic war to conquer the world? Is one of them the evil one and another an ally and another a neutral bystander?)",
            "Describe each faction's stance toward the central plot and how their agendas collide...",
            data.mainQuestInteraction,
            4
          )}
        </div>
      `;

    case "faction-profiles":
      return renderFactionProfilesTab(data);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Factions — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Track party reputation scores, secret handshakes, faction ranks, or initiation trials.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous Faction Notes",
            "Write extra faction lore, reputation rewards, or political intrigue notes here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderFactionProfilesTab(data) {
  const factions = data.factions || [];
  const activeFaction = factions[selectedFactionIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Faction Profile Sheets</h3>
        <p class="text-xs text-slate-400">Create detailed sheets for guilds, orders, syndicates, and noble houses.</p>
      </div>
      <button type="button" id="add-faction-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Faction
      </button>
    </div>

    ${
      factions.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="shield" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Factions Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Faction" to fill out a Faction Profile sheet.</p>
          </div>
        `
        : `
          <!-- Faction Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${factions
              .map(
                (f, i) => `
              <button type="button" data-faction-idx="${i}" class="select-faction-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedFactionIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(f.factionName || `Faction #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeFaction
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
                  <!-- Top Header: Faction Name + Delete -->
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Faction Name</label>
                      <input type="text" data-faction-field="factionName" value="${escapeHtml(activeFaction.factionName || "")}"
                        placeholder="e.g., The Iron Vanguard, Shadowveil Syndicate"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-faction-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove Faction
                    </button>
                  </div>

                  <!-- Two-Column Layout matching Page 128 -->
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <!-- Left Column: Enemies, Allies, Characteristics -->
                    <div class="md:col-span-5 space-y-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Enemies</label>
                        <textarea data-faction-field="enemies" rows="3"
                          placeholder="Rival factions, hunted targets, sworn foes..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.enemies || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Allies</label>
                        <textarea data-faction-field="allies" rows="3"
                          placeholder="Friendly guilds, noble patrons, trade partners..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.allies || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Characteristics</label>
                        <textarea data-faction-field="characteristics" rows="5"
                          placeholder="Crest/emblem, uniforms, customs, secret signs, resources..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.characteristics || "")}</textarea>
                      </div>
                    </div>

                    <!-- Right Column: Leader, Location, Alignment, Motivation/Goal, Description, Key Members/Roles -->
                    <div class="md:col-span-7 space-y-4">
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Leader</label>
                          <input type="text" data-faction-field="leader" value="${escapeHtml(activeFaction.leader || "")}"
                            placeholder="Grandmaster / Boss..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Location / HQ</label>
                          <input type="text" data-faction-field="location" value="${escapeHtml(activeFaction.location || "")}"
                            placeholder="Citadel, city, hideout..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Alignment / Ethos</label>
                          <input type="text" data-faction-field="alignment" value="${escapeHtml(activeFaction.alignment || "")}"
                            placeholder="e.g., Lawful Neutral"
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                        </div>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Motivation / Goal</label>
                        <textarea data-faction-field="motivationGoal" rows="2"
                          placeholder="What is this faction actively working to achieve?"
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.motivationGoal || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                        <textarea data-faction-field="description" rows="4"
                          placeholder="History, public reputation vs. hidden agenda, methods of operation..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.description || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Key Members / Roles</label>
                        <textarea data-faction-field="keyMembersRoles" rows="3"
                          placeholder="Notable officers, contacts, enforcers, spies, and their ranks..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeFaction.keyMembersRoles || "")}</textarea>
                      </div>
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

function wireFactionControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "faction", title: "Factions", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "faction");
    renderFactionsChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-faction-btn")?.addEventListener("click", () => {
    collectFactionsForm(paneContainer, data);
    data.factions.push({
      factionName: `Faction ${data.factions.length + 1}`,
      leader: "",
      location: "",
      alignment: "",
      motivationGoal: "",
      enemies: "",
      allies: "",
      characteristics: "",
      description: "",
      keyMembersRoles: ""
    });
    selectedFactionIndex = data.factions.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-faction-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFactionsForm(paneContainer, data);
      selectedFactionIndex = Number(btn.getAttribute("data-faction-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-faction-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.factions.splice(selectedFactionIndex, 1);
    selectedFactionIndex = Math.max(0, selectedFactionIndex - 1);
    rerenderWithLocalData();
  });
}

function collectFactionsForm(container, data) {
  container.querySelectorAll("[data-factions-field]").forEach((el) => {
    data[el.getAttribute("data-factions-field")] = el.value;
  });

  if (activeFactionsTab === "faction-profiles" && data.factions[selectedFactionIndex]) {
    container.querySelectorAll("[data-faction-field]").forEach((el) => {
      const fField = el.getAttribute("data-faction-field");
      data.factions[selectedFactionIndex][fField] = el.value;
    });
  }
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-factions-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
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
