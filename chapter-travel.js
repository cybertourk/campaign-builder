// chapter-travel.js
// Dedicated interactive workbook for Chapter 12: Overland Travel Tables.
// Includes Examples & Reference, D&D 5e Travel Pace & Exhaustion quick-reference tables,
// Daggerheart Duality Dice, Range Bands, Conditions & Downtime Rest quick-reference tables,
// Weather & Time of Day, Terrain & Travel Map, D12 Success/Failure Tables, and Misc Notes.

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  isDaggerheart,
  DND5E_TRAVEL_PACE,
  DND5E_EXHAUSTION_LEVELS,
  DAGGERHEART_DUALITY_OUTCOMES,
  DAGGERHEART_DOWNTIME_MOVES,
  DAGGERHEART_CONDITIONS
} from "./system-rulesets.js";

export const TRAVEL_TABS = [
  { id: "examples", label: "Examples & Reference", icon: "book-open" },
  { id: "weather", label: "Weather & Time", icon: "cloud-sun" },
  { id: "terrain", label: "Terrain & Travel Map", icon: "mountain" },
  { id: "hunting", label: "Hunting (D12)", icon: "crosshair" },
  { id: "discovery", label: "Discovery (D12)", icon: "compass" },
  { id: "camping", label: "Camping (D12)", icon: "flame" },
  { id: "exploration", label: "Exploration (D12)", icon: "map-pin" },
  { id: "travel-npc", label: "NPC Encounters (D12)", icon: "users" },
  { id: "bard-performance", label: "Bard Performance (D12)", icon: "music" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeTravelTab = "examples";

function createRows(count, schema = "weather") {
  return Array.from({ length: count }, (_, i) => {
    if (schema === "d12") {
      return { roll: i + 1, check: "", event: "", result: "" };
    }
    return { roll: i + 1, condition: "", check: "", result: "" };
  });
}

function getDefaultTravelData() {
  return {
    timeOfDay: [
      { roll: 1, label: "Dawn" },
      { roll: 2, label: "Morning" },
      { roll: 3, label: "Midday" },
      { roll: 4, label: "Noon" },
      { roll: 5, label: "Mid-Afternoon" },
      { roll: 6, label: "Dusk" },
      { roll: 7, label: "Night" },
      { roll: 8, label: "Midnight" }
    ],
    weatherSpringDay: createRows(6),
    weatherSpringNight: createRows(6),
    weatherWinterDay: createRows(6),
    weatherWinterNight: createRows(6),
    terrainForestPlains: createRows(6),
    terrainMountains: createRows(6),
    terrainUnderground: createRows(6),
    terrainTundraSnow: createRows(6),
    travelMapUrl: "",
    huntingSuccess: createRows(12, "d12"),
    huntingFailure: createRows(12, "d12"),
    discoverySuccess: createRows(12, "d12"),
    discoveryFailure: createRows(12, "d12"),
    campingSuccess: createRows(12, "d12"),
    campingFailure: createRows(12, "d12"),
    explorationSuccess: createRows(12, "d12"),
    explorationFailure: createRows(12, "d12"),
    npcSuccess: createRows(12, "d12"),
    npcFailure: createRows(12, "d12"),
    bardSuccess: createRows(12, "d12"),
    bardFailure: createRows(12, "d12"),
    miscNotes: ""
  };
}

export function renderTravelChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeTravelTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "overland-travel");
  const defaults = getDefaultTravelData();
  const data = {
    ...defaults,
    ...(existingDoc?.systemData || {})
  };

  Object.keys(defaults).forEach((key) => {
    if (Array.isArray(defaults[key]) && !Array.isArray(data[key])) {
      data[key] = defaults[key];
    }
  });

  const currentSection =
    TRAVEL_TABS.find((t) => t.id === activeTravelTab) || TRAVEL_TABS[0];

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
              Chapter 12: Overland Travel Tables${dhMode ? " • Daggerheart" : dndMode ? " • D&D 5e" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Customize and roll on your D8 Time, D6 Weather &amp; Terrain, and D12 Hunting, Discovery, Camping, Exploration, NPC &amp; Bard tables.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="travel-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-travel-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Tables
        </button>
      </div>
    </div>

    <!-- Live Table Roll Result Banner -->
    <div id="travel-roll-banner" class="hidden mb-5 p-3.5 rounded-xl bg-indigo-950/80 border border-indigo-500/50 text-xs text-indigo-100 flex items-center justify-between gap-3 shadow-lg">
      <div id="travel-roll-result" class="leading-relaxed"></div>
      <button type="button" id="close-travel-roll-btn" class="text-indigo-300 hover:text-white shrink-0">
        <i data-lucide="x" class="w-4 h-4"></i>
      </button>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderTravelTabContent(activeTravelTab, data, dndMode, dhMode)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="overland-travel"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectTravelForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  const statusEl = paneContainer.querySelector("#travel-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  wireTravelControls(paneContainer, state, existingDoc, data);

  // Save to Firestore
  paneContainer.querySelector("#save-travel-btn").addEventListener("click", async () => {
    collectTravelForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Overland Travel Tables",
          content: "Weather, Terrain, Hunting, Discovery, Camping, Exploration, NPC & Bard Tables",
          systemData: data
        });
      } else {
        await createEntity({
          type: "overland-travel",
          title: "Overland Travel Tables",
          content: "Weather, Terrain, Hunting, Discovery, Camping, Exploration, NPC & Bard Tables",
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

function renderTravelTabContent(tabId, data, dndMode, dhMode) {
  switch (tabId) {
    case "examples":
      return renderExamplesReferenceTab(dndMode, dhMode);

    case "weather":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-bold text-white">Time of Day (D8)</h3>
              <p class="text-xs text-slate-400">Roll 1d8 to determine what time an overland travel event or weather shift occurs.</p>
            </div>
            <button type="button" data-roll-table="timeOfDay" data-die="8" data-table-title="D8 Time of Day"
              class="roll-travel-table-btn inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
              <i data-lucide="dices" class="w-3.5 h-3.5"></i> Roll 1d8
            </button>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            ${data.timeOfDay
              .map(
                (t, idx) => `
              <div class="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5">
                <span class="text-xs font-bold text-indigo-400 w-4">${idx + 1}</span>
                <input type="text" data-time-idx="${idx}" value="${escapeHtml(t.label || "")}"
                  class="w-full bg-transparent text-xs text-white focus:outline-none" />
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        ${renderD6TableCard("weatherSpringDay", "Spring / Summer / Fall — Day (D6)", "Day Weather", data.weatherSpringDay)}
        ${renderD6TableCard("weatherSpringNight", "Spring / Summer / Fall — Night (D6)", "Night Weather", data.weatherSpringNight)}
        ${renderD6TableCard("weatherWinterDay", "Winter — Day (D6)", "Day Weather", data.weatherWinterDay)}
        ${renderD6TableCard("weatherWinterNight", "Winter — Night (D6)", "Night Weather", data.weatherWinterNight)}
      `;

    case "terrain":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Overland Travel / Hex Crawl Map Image URL (Optional)
          </label>
          <input type="url" data-travel-field="travelMapUrl" value="${escapeHtml(data.travelMapUrl || "")}"
            placeholder="https://... (Paste a regional hex map or travel route map image link)"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          <div id="travel-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
            ${
              data.travelMapUrl
                ? `<img src="${escapeHtml(data.travelMapUrl)}" alt="Overland Travel Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" />`
                : `<p class="text-xs text-slate-500 py-4">Paste a regional or hex map URL above to preview your travel routes here.</p>`
            }
          </div>
function renderExamplesReferenceTab(dndMode, dhMode) {
  return `
    ${
      dhMode
        ? `
          <!-- Daggerheart Core Rules Reference: Duality Dice Outcomes, Range Bands, Conditions & Downtime Rests -->
          <div class="space-y-4">
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div class="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-300">Daggerheart 2d12 Duality Dice Outcomes</h4>
                <div class="divide-y divide-slate-800/70 text-xs">
                  ${DAGGERHEART_DUALITY_OUTCOMES.map(
                    (row) => `
                    <div class="py-2 space-y-0.5">
                      <div class="font-bold text-white">${escapeHtml(row.outcome)}</div>
                      <div class="text-slate-300">${escapeHtml(row.effect)}</div>
                    </div>
                  `
                  ).join("")}
                </div>
              </div>

              <div class="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Range Bands &amp; Core Conditions</h4>
                <div class="space-y-1.5 text-xs text-slate-200">
                  <div><strong class="text-white">Melee:</strong> Within arm's reach (~5 ft)</div>
                  <div><strong class="text-white">Very Close:</strong> 5–10 ft (step &amp; strike)</div>
                  <div><strong class="text-white">Close:</strong> 10–30 ft (short dash / thrown)</div>
                  <div><strong class="text-white">Far:</strong> 30–100 ft (bows / distant spell)</div>
                  <div><strong class="text-white">Very Far:</strong> 100–300 ft (longbow / sniper)</div>
                </div>
                <div class="pt-2 border-t border-slate-800 space-y-1 text-xs">
                  <div class="font-bold text-rose-400 uppercase text-[10px]">Core Conditions (${DAGGERHEART_CONDITIONS.join(", ")})</div>
                  <div class="text-slate-300"><strong class="text-white">Hidden:</strong> Out of sight; rolls against you have disadvantage.</div>
                  <div class="text-slate-300"><strong class="text-white">Restrained:</strong> Cannot move, but can still act from your spot.</div>
                  <div class="text-slate-300"><strong class="text-white">Vulnerable:</strong> All rolls targeting you have advantage.</div>
                </div>
              </div>
            </div>

            <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 overflow-x-auto">
              <h4 class="text-xs font-bold uppercase tracking-wider text-emerald-400">Daggerheart Rest &amp; Downtime Moves (Choose 2 per Rest)</h4>
              <table class="w-full text-left text-xs border-collapse min-w-[480px]">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th class="py-1.5 px-2">Downtime Move</th>
                    <th class="py-1.5 px-2">Short Rest</th>
                    <th class="py-1.5 px-2">Long Rest</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/70 text-slate-200">
                  ${DAGGERHEART_DOWNTIME_MOVES.map(
                    (dm) => `
                    <tr>
                      <td class="py-1.5 px-2 font-bold text-white">${escapeHtml(dm.move)}</td>
                      <td class="py-1.5 px-2">${escapeHtml(dm.shortRest)}</td>
                      <td class="py-1.5 px-2 text-emerald-300">${escapeHtml(dm.longRest)}</td>
                    </tr>
                  `
                  ).join("")}
                </tbody>
              </table>
            </div>
          </div>
        `
        : ""
    }

    ${
      dndMode
        ? `
          <!-- D&D 5e Travel Pace & Exhaustion Quick-Reference -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div class="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5 overflow-x-auto">
              <h4 class="text-xs font-bold uppercase tracking-wider text-amber-300">D&amp;D 5e Overland Travel Pace</h4>
              <table class="w-full text-left text-xs border-collapse min-w-[420px]">
                <thead>
                  <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th class="py-1.5 px-2">Pace</th>
                    <th class="py-1.5 px-2">Minute</th>
                    <th class="py-1.5 px-2">Hour</th>
                    <th class="py-1.5 px-2">Day</th>
                    <th class="py-1.5 px-2">Effect</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/70 text-slate-200">
                  ${DND5E_TRAVEL_PACE.map(
                    (row) => `
                    <tr>
                      <td class="py-1.5 px-2 font-bold text-white">${row.pace}</td>
                      <td class="py-1.5 px-2">${row.minute}</td>
                      <td class="py-1.5 px-2">${row.hour}</td>
                      <td class="py-1.5 px-2 font-semibold text-amber-300">${row.day}</td>
                      <td class="py-1.5 px-2">${row.effect}</td>
                    </tr>
                  `
                  ).join("")}
                </tbody>
              </table>
            </div>

            <div class="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
              <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">D&amp;D 5e Exhaustion Levels (1–6)</h4>
              <div class="divide-y divide-slate-800/70 text-xs">
                ${DND5E_EXHAUSTION_LEVELS.map(
                  (ex) => `
                  <div class="py-1.5 flex items-center justify-between gap-2">
                    <span class="font-bold text-amber-300 shrink-0">Level ${ex.level}</span>
                    <span class="text-slate-200 text-right">${ex.effect}</span>
                  </div>
                `
                ).join("")}
              </div>
            </div>
          </div>
        `
        : ""
    }

    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Planner Examples &amp; Quick Reference</h3>
        <p class="text-xs text-slate-400">Use these examples as inspiration or copy the sample Spring/Summer/Fall weather into your editable Weather table.</p>
      </div>
      <button type="button" id="populate-weather-examples-btn"
        class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="copy-plus" class="w-4 h-4"></i> Copy Sample Weather to My Tables
      </button>
    </div>

    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3 overflow-x-auto">
      <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Example: Spring / Summer / Fall Weather (D6)</h4>
      <table class="w-full text-left text-xs border-collapse min-w-[600px]">
        <thead>
          <tr class="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
            <th class="py-2 px-2.5 w-12">D6</th>
            <th class="py-2 px-2.5">Day Weather</th>
            <th class="py-2 px-2.5 w-36">Ability / Save Check</th>
            <th class="py-2 px-2.5">Result</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/70 text-slate-200">
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">1</td>
            <td class="py-2 px-2.5">Scattered showers, intermittent sun</td>
            <td class="py-2 px-2.5 text-amber-300">15 Dexterity</td>
            <td class="py-2 px-2.5">1–5: Drop weapon in mud (-1d6 damage 1 day); 6–10: Drop and spend day chasing it; 10+: Nothing happens</td>
          </tr>
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">2</td>
            <td class="py-2 px-2.5">Gusting winds, overcast</td>
            <td class="py-2 px-2.5 text-amber-300">11 Strength</td>
            <td class="py-2 px-2.5">1–5: Lose item; 6–10: Drop and spend day chasing it</td>
          </tr>
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">3</td>
            <td class="py-2 px-2.5">Scorching heat, blistering sun</td>
            <td class="py-2 px-2.5 text-amber-300">8 Constitution</td>
            <td class="py-2 px-2.5">1–5: Heatstroke (1d4 damage); 6–10: Party overheated, has to rest and loses half a day</td>
          </tr>
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">4</td>
            <td class="py-2 px-2.5">High humidity, cloudy sky</td>
            <td class="py-2 px-2.5 text-amber-300">12 Constitution</td>
            <td class="py-2 px-2.5">1–5: Chafing blistered feet (1d6 damage); 6–10: Party has to rest and loses half a day</td>
          </tr>
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">5</td>
            <td class="py-2 px-2.5">Lightning, thunder and heavy rains</td>
            <td class="py-2 px-2.5 text-amber-300">10 Agility / Dex</td>
            <td class="py-2 px-2.5">1–5: Lightning strikes nearby (1d8 damage); 6–10: Party has to rest and loses half a day</td>
          </tr>
          <tr>
            <td class="py-2 px-2.5 font-bold text-indigo-400">6</td>
            <td class="py-2 px-2.5">Light breezes and clear skies</td>
            <td class="py-2 px-2.5 text-amber-300">8 Constitution</td>
            <td class="py-2 px-2.5">1–5: Party wastes half a day enjoying the pleasant surroundings; 6+: Nothing happens</td>
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderD6TableCard(tableKey, title, colLabel, rows) {
  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold text-white">${escapeHtml(title)}</h3>
        <button type="button" data-roll-table="${tableKey}" data-die="6" data-table-title="${escapeHtml(title)}"
          class="roll-travel-table-btn inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
          <i data-lucide="dices" class="w-3.5 h-3.5"></i> Roll 1d6
        </button>
      </div>

      <div class="border border-slate-800 rounded-lg overflow-hidden">
        <div class="hidden md:grid md:grid-cols-12 bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <div class="md:col-span-1 px-2 py-2 text-center">D6</div>
          <div class="md:col-span-4 px-3 py-2">${escapeHtml(colLabel)}</div>
          <div class="md:col-span-3 px-3 py-2">AB / SV / Skill Check</div>
          <div class="md:col-span-4 px-3 py-2">Result</div>
        </div>
        <div class="divide-y divide-slate-800/80">
          ${rows
            .map(
              (r, idx) => `
            <div class="grid grid-cols-1 md:grid-cols-12 items-center p-2 md:p-0 gap-2 md:gap-0">
              <div class="md:col-span-1 text-center font-bold text-xs text-indigo-400 md:py-2">${idx + 1}</div>
              <div class="md:col-span-4 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="condition"
                  value="${escapeHtml(r.condition || "")}" placeholder="${escapeHtml(colLabel)}..."
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="md:col-span-3 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="check"
                  value="${escapeHtml(r.check || "")}" placeholder="e.g., DC 12 Con"
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-amber-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="md:col-span-4 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="result"
                  value="${escapeHtml(r.result || "")}" placeholder="Outcome / effect..."
                  class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderD12TableCard(tableKey, title, rows, tone = "emerald") {
  const badgeColor = tone === "rose" ? "text-rose-400" : "text-emerald-400";

  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-bold ${badgeColor}">${escapeHtml(title)}</h3>
        <button type="button" data-roll-table="${tableKey}" data-die="12" data-table-title="${escapeHtml(title)}"
          class="roll-travel-table-btn inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium transition">
          <i data-lucide="dices" class="w-3.5 h-3.5"></i> Roll 1d12
        </button>
      </div>

      <div class="border border-slate-800 rounded-lg overflow-hidden">
        <div class="hidden md:grid md:grid-cols-12 bg-slate-900 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <div class="md:col-span-1 px-2 py-2 text-center">D12</div>
          <div class="md:col-span-3 px-3 py-2">DC / SV / Check</div>
          <div class="md:col-span-4 px-3 py-2">Event</div>
          <div class="md:col-span-4 px-3 py-2">Result</div>
        </div>
        <div class="divide-y divide-slate-800/80">
          ${rows
            .map(
              (r, idx) => `
            <div class="grid grid-cols-1 md:grid-cols-12 items-center p-2 md:p-0 gap-2 md:gap-0">
              <div class="md:col-span-1 text-center font-bold text-xs text-indigo-400 md:py-1.5">${idx + 1}</div>
              <div class="md:col-span-3 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="check"
                  value="${escapeHtml(r.check || "")}" placeholder="DC / Check..."
                  class="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-amber-200 focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="md:col-span-4 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="event"
                  value="${escapeHtml(r.event || "")}" placeholder="Event..."
                  class="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-white focus:outline-none focus:border-indigo-500" />
              </div>
              <div class="md:col-span-4 md:p-1.5">
                <input type="text" data-table-key="${tableKey}" data-row-idx="${idx}" data-row-field="result"
                  value="${escapeHtml(r.result || "")}" placeholder="Result..."
                  class="w-full px-2.5 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500" />
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function wireTravelControls(paneContainer, state, existingDoc, data) {
  const banner = paneContainer.querySelector("#travel-roll-banner");
  const resultEl = paneContainer.querySelector("#travel-roll-result");

  paneContainer.querySelector("#close-travel-roll-btn")?.addEventListener("click", () => {
    banner?.classList.add("hidden");
  });

  paneContainer.querySelectorAll(".roll-travel-table-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectTravelForm(paneContainer, data);
      const tableKey = btn.getAttribute("data-roll-table");
      const die = Number(btn.getAttribute("data-die")) || 6;
      const title = btn.getAttribute("data-table-title") || tableKey;
      const rollIdx = Math.floor(Math.random() * die);
      const row = Array.isArray(data[tableKey]) ? data[tableKey][rollIdx] : null;

      if (!row) return;
      if (tableKey === "timeOfDay") {
        resultEl.innerHTML = `<span class="font-bold text-amber-300">Rolled ${rollIdx + 1} on ${escapeHtml(title)}:</span> <span class="text-white font-semibold ml-1">${escapeHtml(row.label || "(Empty)")}</span>`;
      } else {
        const primaryText = row.condition || row.event || "(Empty entry)";
        const checkText = row.check ? ` • <span class="text-amber-200">Check: ${escapeHtml(row.check)}</span>` : "";
        const resText = row.result ? ` → <span class="text-emerald-200">${escapeHtml(row.result)}</span>` : "";
        resultEl.innerHTML = `<span class="font-bold text-amber-300">Rolled ${rollIdx + 1} on ${escapeHtml(title)}:</span> <span class="text-white font-semibold ml-1">${escapeHtml(primaryText)}</span>${checkText}${resText}`;
      }
      banner?.classList.remove("hidden");
    });
  });

  paneContainer.querySelector("#populate-weather-examples-btn")?.addEventListener("click", () => {
    data.weatherSpringDay = [
      { roll: 1, condition: "Scattered showers, intermittent sun", check: "15 Dexterity", result: "1-5: Drop weapon in mud (-1d6 dmg 1 day); 6-10: Drop & chase all day; 10+: Nothing" },
      { roll: 2, condition: "Gusting winds, overcast", check: "11 Strength", result: "1-5: Lose item; 6-10: Drop and spend day chasing it" },
      { roll: 3, condition: "Scorching heat, blistering sun", check: "8 Constitution", result: "1-5: Heatstroke 1d4 dmg; 6-10: Overheated, rest & lose half a day" },
      { roll: 4, condition: "High humidity, cloudy sky", check: "12 Constitution", result: "1-5: Chafing blistered feet 1d6 dmg; 6-10: Rest & lose half a day" },
      { roll: 5, condition: "Lightning, thunder and heavy rains", check: "10 Agility / Dex", result: "1-5: Lightning strikes nearby 1d8 dmg; 6-10: Rest & lose half a day" },
      { roll: 6, condition: "Light breezes and clear skies", check: "8 Constitution", result: "1-5: Party wastes half a day enjoying scenery; 6+: Nothing happens" }
    ];
    activeTravelTab = "weather";
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "overland-travel", title: "Overland Travel Tables", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "overland-travel");
    renderTravelChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  });

  const mapInput = paneContainer.querySelector('[data-travel-field="travelMapUrl"]');
  const mapPreview = paneContainer.querySelector("#travel-map-preview");
  mapInput?.addEventListener("input", () => {
    const val = mapInput.value.trim();
    if (val) {
      mapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Overland Travel Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      mapPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste a regional or hex map URL above to preview your travel routes here.</p>`;
    }
  });
}

function collectTravelForm(container, data) {
  container.querySelectorAll("[data-travel-misc]").forEach((el) => {
    data[el.getAttribute("data-travel-misc")] = el.value;
  });

  container.querySelectorAll("[data-travel-field]").forEach((el) => {
    data[el.getAttribute("data-travel-field")] = el.value;
  });

  container.querySelectorAll("[data-time-idx]").forEach((el) => {
    const idx = Number(el.getAttribute("data-time-idx"));
    if (data.timeOfDay[idx]) {
      data.timeOfDay[idx].label = el.value;
    }
  });

  container.querySelectorAll("[data-table-key]").forEach((el) => {
    const tableKey = el.getAttribute("data-table-key");
    const idx = Number(el.getAttribute("data-row-idx"));
    const field = el.getAttribute("data-row-field");
    if (Array.isArray(data[tableKey]) && data[tableKey][idx]) {
      data[tableKey][idx][field] = el.value;
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
