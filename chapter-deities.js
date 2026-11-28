// chapter-deities.js
// Dedicated interactive workbook for Chapter 5: Deities (Pages 118–119+).
// Renders the active section selected from the vertical nested sidebar in ui-campaign.js.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const DEITIES_TABS = [
  { id: "religion-overview", label: "Faith & Cosmology", icon: "sun" },
  { id: "deity-profiles", label: "Deity & Patron Profiles", icon: "sparkles" },
  { id: "misc-notes", label: "Mythos Notes", icon: "sticky-note" }
];

let activeDeitiesTab = "religion-overview";
let selectedDeityIndex = 0;

function getDefaultDeitiesData() {
  return {
    // Page 118: Deities Overview Prompts
    religionEssentialToPlot: "",
    godsCountFocus: "",
    playersNeedFollowers: "",
    godsAndCharacteristicsOverview: "",

    // Page 119+: Repeatable Deity Profile Sheets
    deities: [],

    // Chapter 5 Misc Notes
    miscNotes: ""
  };
}

export function renderDeitiesChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeDeitiesTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "deities");
  const data = {
    ...getDefaultDeitiesData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.deities)) data.deities = [];

  if (selectedDeityIndex >= data.deities.length) {
    selectedDeityIndex = Math.max(0, data.deities.length - 1);
  }

  const currentSection =
    DEITIES_TABS.find((t) => t.id === activeDeitiesTab) || DEITIES_TABS[0];

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
              Phase III • Pantheons & Mythos
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Define the role of faith in your world and build detailed profiles for every god, patron, or cosmic force.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="deities-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-deities-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Deities
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderDeitiesTabContent(activeDeitiesTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="deities"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectDeitiesForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#deities-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeDeitiesTab === "deity-profiles") {
    wireDeityControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-deities-btn").addEventListener("click", async () => {
    collectDeitiesForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary =
      data.deities.length > 0
        ? `Deities: ${data.deities.map((d) => d.name || "Unnamed").join(", ")}`
        : data.godsAndCharacteristicsOverview || "Pantheon & Religion Notes";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Deities",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "deities",
          title: "Deities",
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

function renderDeitiesTabContent(tabId, data) {
  switch (tabId) {
    case "religion-overview":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
          ${renderField(
            "religionEssentialToPlot",
            "Is Religion Essential to the Main Plot?",
            "Explain how divine intervention, religious wars, prophecies, or clerical orders tie into the central story...",
            data.religionEssentialToPlot,
            3
          )}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField(
              "godsCountFocus",
              "How Many Different Gods Will Be Focused On in Your World?",
              "e.g., A tight pantheon of 7 major deities, dualistic creator gods, or dozens of regional spirits...",
              data.godsCountFocus,
              3
            )}
            ${renderField(
              "playersNeedFollowers",
              "Will the Players Need to Be Followers of Any Gods?",
              "e.g., Optional for most characters, required for divine casters, or tied to faction patronage...",
              data.playersNeedFollowers,
              3
            )}
          </div>

          ${renderField(
            "godsAndCharacteristicsOverview",
            "Name the Gods and Their Characteristics",
            "Quick roster of your pantheon and their primary spheres of influence (create full individual Deity Sheets in Deity Profiles)...",
            data.godsAndCharacteristicsOverview,
            8
          )}
        </div>
      `;

    case "deity-profiles":
      return renderDeityProfilesTab(data);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Deities — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Jot down creation myths, holy holidays, divine relics, heresies, or afterlife lore.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous Deity & Religion Notes",
            "Write extra pantheon myths, planar realms, or temple rituals here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderDeityProfilesTab(data) {
  const deities = data.deities || [];
  const activeDeity = deities[selectedDeityIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Deity Profile Sheets</h3>
        <p class="text-xs text-slate-400">Detail each deity's alignment, domains, titles, temples, and sacred symbols.</p>
      </div>
      <button type="button" id="add-deity-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Deity
      </button>
    </div>

    ${
      deities.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="sun" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Deities Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Deity" to fill out a Deity Profile sheet.</p>
          </div>
        `
        : `
          <!-- Deity Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${deities
              .map(
                (d, i) => `
              <button type="button" data-deity-idx="${i}" class="select-deity-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedDeityIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(d.name || `Deity #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeDeity
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
                  <!-- Top Header: Name, Alignment & Delete -->
                  <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-b border-slate-800 pb-4">
                    <div class="md:col-span-6">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Deity Name</label>
                      <input type="text" data-deity-field="name" value="${escapeHtml(activeDeity.name || "")}"
                        placeholder="e.g., Solarius, The Veiled Mother"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div class="md:col-span-4">
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Alignment / Ethos</label>
                      <input type="text" data-deity-field="alignment" value="${escapeHtml(activeDeity.alignment || "")}"
                        placeholder="e.g., Lawful Neutral, Chaotic Good"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div class="md:col-span-2 flex justify-end">
                      <button type="button" id="delete-deity-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-2 rounded border border-slate-800 hover:border-rose-800/60 transition w-full">
                        Remove
                      </button>
                    </div>
                  </div>

                  <!-- Deity Portrait / Symbol Image URL & Preview -->
                  <div class="space-y-2.5">
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Deity Portrait / Symbol Image URL (Optional)
                    </label>
                    <input type="url" data-deity-field="imageUrl" value="${escapeHtml(activeDeity.imageUrl || "")}"
                      placeholder="https://... (Paste an artwork, icon, or symbol image link)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    <div id="deity-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
                      ${
                        activeDeity.imageUrl
                          ? `<img src="${escapeHtml(activeDeity.imageUrl)}" alt="Deity Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" />`
                          : `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the deity's portrait or holy symbol here.</p>`
                      }
                    </div>
                  </div>

                  <!-- Left & Right Columns matching Page 119 -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Domain</label>
                        <textarea data-deity-field="domain" rows="3"
                          placeholder="e.g., Light, Forge, Storms, Death, Trickery, Knowledge..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.domain || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Titles</label>
                        <textarea data-deity-field="titles" rows="3"
                          placeholder="e.g., Keeper of the Ember, Lady of the Silver Tide..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.titles || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Characteristics</label>
                        <textarea data-deity-field="characteristics" rows="4"
                          placeholder="Personality, dogma, commandments, appearance in visions, relationships with other gods..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.characteristics || "")}</textarea>
                      </div>
                    </div>

                    <div class="space-y-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Holy Symbol / Tenets</label>
                        <textarea data-deity-field="symbolTenets" rows="4"
                          placeholder="Describe the deity's holy symbol, sacred oaths, and core tenets..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.symbolTenets || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Temple Location(s)</label>
                        <textarea data-deity-field="templeLocations" rows="3"
                          placeholder="Grand cathedrals, hidden shrines, pilgrimage sites..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.templeLocations || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Aligned Animal / Plant / Gem / Color</label>
                        <textarea data-deity-field="alignedSymbols" rows="3"
                          placeholder="e.g., White Stag / Nightshade / Sunstone / Crimson & Gold"
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeDeity.alignedSymbols || "")}</textarea>
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

function wireDeityControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "deities", title: "Deities", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "deities");
    renderDeitiesChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-deity-btn")?.addEventListener("click", () => {
    collectDeitiesForm(paneContainer, data);
    data.deities.push({
      name: `Deity ${data.deities.length + 1}`,
      alignment: "",
      imageUrl: "",
      domain: "",
      titles: "",
      characteristics: "",
      symbolTenets: "",
      templeLocations: "",
      alignedSymbols: ""
    });
    selectedDeityIndex = data.deities.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-deity-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectDeitiesForm(paneContainer, data);
      selectedDeityIndex = Number(btn.getAttribute("data-deity-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-deity-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Confirm?";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.deities.splice(selectedDeityIndex, 1);
    selectedDeityIndex = Math.max(0, selectedDeityIndex - 1);
    rerenderWithLocalData();
  });

  const imgInput = paneContainer.querySelector('[data-deity-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#deity-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (val) {
      imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Deity Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the deity's portrait or holy symbol here.</p>`;
    }
  });
}

function collectDeitiesForm(container, data) {
  container.querySelectorAll("[data-deities-field]").forEach((el) => {
    data[el.getAttribute("data-deities-field")] = el.value;
  });

  if (activeDeitiesTab === "deity-profiles" && data.deities[selectedDeityIndex]) {
    container.querySelectorAll("[data-deity-field]").forEach((el) => {
      const dField = el.getAttribute("data-deity-field");
      data.deities[selectedDeityIndex][dField] = el.value;
    });
  }
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-deities-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
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
