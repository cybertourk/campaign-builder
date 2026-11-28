// chapter-setting.js
// Dedicated interactive workbook for Chapter 1: Campaign Setting.
// Organized with collapsible section cards, generous textarea heights for unclipped
// placeholders, and widescreen 2-column desktop layouts for Kingdoms & Towns.

import { createEntity, updateEntity } from "./firebase-manager.js";
import { isDaggerheart } from "./system-rulesets.js";

export const SETTING_TABS = [
  { id: "overview", label: "World Pitch & Tone", icon: "compass" },
  { id: "world-profile", label: "Realm Identity", icon: "globe" },
  { id: "world-details", label: "Magic, Nature & Culture", icon: "sparkles" },
  { id: "world-map", label: "Realm Atlas Map", icon: "map" },
  { id: "kingdoms", label: "Realms & Provinces", icon: "castle" },
  { id: "towns", label: "Settlements & Hubs", icon: "building-2" },
  { id: "markets", label: "Taverns & Bazaars", icon: "store" },
  { id: "misc-notes", label: "Lore Scratchpad", icon: "sticky-note" }
];

let activeSettingTab = "overview";
let selectedKingdomIndex = 0;
let selectedTownIndex = 0;

// Track collapsible section states so busy forms stay clean & focused
const collapsedSettingCards = {
  dhFrame: false,
  worldFoundations: false,
  guidedQuestions: true,
  detailNature: false,
  detailArcana: false,
  detailEconomy: true,
  detailSociety: true
};

function getDefaultSettingData() {
  return {
    timePeriod: "",
    terrain: "",
    governmentSystem: "",
    languageAndNaming: "",
    generalCulture: "",
    worldbuildingPrompts: "",
    dhFramePitch: "",
    dhFrameToneFeel: "",
    dhFrameThemes: "",
    dhFrameTouchstones: "",
    dhFrameDistinctions: "",
    dhFrameIncitingIncident: "",
    dhFrameMechanics: "",
    dhFrameSessionZero: "",
    worldName: "",
    worldCharacteristics: "",
    kingdomsSummary: "",
    currentEvents: "",
    environmentalBuffs: "",
    naturalDisasters: "",
    animalLife: "",
    plantLife: "",
    natureNotes: "",
    diseasesIllnesses: "",
    magicSystem: "",
    technologicalLevel: "",
    races: "",
    arcanaNotes: "",
    politicalFactions: "",
    languages: "",
    importsExports: "",
    currencyEconomy: "",
    economyNotes: "",
    deities: "",
    religionsCults: "",
    gangsCrime: "",
    socialStatus: "",
    societyNotes: "",
    worldMapUrl: "",
    worldMapNotes: "",
    kingdoms: [],
    towns: [],
    markets: [],
    miscNotes: ""
  };
}

export function renderCampaignSettingChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeSettingTab = options.activeSectionId;
  }

  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "campaign-setting");
  const data = {
    ...getDefaultSettingData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.kingdoms)) data.kingdoms = [];
  if (!Array.isArray(data.towns)) data.towns = [];
  if (!Array.isArray(data.markets)) data.markets = [];

  if (selectedKingdomIndex >= data.kingdoms.length) {
    selectedKingdomIndex = Math.max(0, data.kingdoms.length - 1);
  }
  if (selectedTownIndex >= data.towns.length) {
    selectedTownIndex = Math.max(0, data.towns.length - 1);
  }

  const currentSection =
    SETTING_TABS.find((t) => t.id === activeSettingTab) || SETTING_TABS[0];

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
              Phase III • Atlas & Realms${dhMode ? " • Daggerheart" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Expand your world only as you need it: Campaign Frame pitch, realm truths, provinces, settlements, and markets."
                : "Expand your world at your own pace—start with your opening town and build out regions, cultures, and maps over time."
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="setting-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-setting-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Setting
        </button>
      </div>
    </div>

    <!-- Active Section Form Content -->
    <div id="setting-tab-body" class="space-y-5 flex-1">
      ${renderActiveTabContent(activeSettingTab, data, dhMode)}
    </div>
  `;

  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="campaign-setting"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectFormIntoData(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Collapsible card headers
  paneContainer.querySelectorAll("[data-collapse-key]").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFormIntoData(paneContainer, data);
      const key = btn.getAttribute("data-collapse-key");
      collapsedSettingCards[key] = !collapsedSettingCards[key];
      const tempEntity = existingDoc
        ? { ...existingDoc, systemData: data }
        : { type: "campaign-setting", title: data.worldName || "Campaign Setting", systemData: data };
      const otherEntities = state.entities.filter((e) => e.type !== "campaign-setting");
      renderCampaignSettingChapter(paneContainer, {
        ...state,
        entities: [tempEntity, ...otherEntities]
      });
      if (window.lucide) window.lucide.createIcons();
    });
  });

  const statusEl = paneContainer.querySelector("#setting-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeSettingTab === "kingdoms") {
    wireKingdomControls(paneContainer, state, existingDoc, data);
  }
  if (activeSettingTab === "towns") {
    wireTownControls(paneContainer, state, existingDoc, data);
  }
  if (activeSettingTab === "markets") {
    wireMarketControls(paneContainer, state, existingDoc, data);
  }

  if (activeSettingTab === "world-map") {
    const urlInput = paneContainer.querySelector('[data-field="worldMapUrl"]');
    const previewWrap = paneContainer.querySelector("#world-map-preview");
    urlInput?.addEventListener("input", () => {
      const val = urlInput.value.trim();
      if (val) {
        previewWrap.innerHTML = `<img src="${escapeHtml(val)}" alt="World Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-6\\'>Could not load image from that URL.</p>'" />`;
      } else {
        previewWrap.innerHTML = `<p class="text-xs text-slate-500 py-8">Paste an image URL above to preview your world map here.</p>`;
      }
    });
  }

  paneContainer.querySelector("#save-setting-btn").addEventListener("click", async () => {
    collectFormIntoData(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const title = data.worldName?.trim() || "Campaign Setting";
    const summaryContent = buildSearchableSummary(data);

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title,
          content: summaryContent,
          systemData: data
        });
      } else {
        await createEntity({
          type: "campaign-setting",
          title,
          content: summaryContent,
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

function renderCollapsibleCard(key, icon, title, subtitle, innerHtml) {
  const isCollapsed = Boolean(collapsedSettingCards[key]);
  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6">
      <button type="button" data-collapse-key="${key}" class="rpg-collapse-toggle ${isCollapsed ? "" : "pb-3 mb-4 border-b border-slate-800"}">
        <div class="flex items-center gap-2.5 min-w-0">
          <i data-lucide="${icon}" class="w-4 h-4 text-amber-400 shrink-0"></i>
          <h3 class="text-sm sm:text-base font-bold text-white truncate">${escapeHtml(title)}</h3>
          ${subtitle ? `<span class="hidden md:inline text-xs text-slate-400 truncate">— ${escapeHtml(subtitle)}</span>` : ""}
        </div>
        <span class="text-xs text-slate-400 inline-flex items-center gap-1 shrink-0">
          <span>${isCollapsed ? "Expand" : "Collapse"}</span>
          <i data-lucide="${isCollapsed ? "chevron-down" : "chevron-up"}" class="w-4 h-4"></i>
        </span>
      </button>
      ${isCollapsed ? "" : `<div class="space-y-5">${innerHtml}</div>`}
    </div>
  `;
}

function renderActiveTabContent(tabId, data, dhMode = false) {
  switch (tabId) {
    case "overview":
      return `
        ${
          dhMode
            ? renderCollapsibleCard(
                "dhFrame",
                "sparkles",
                "Daggerheart Campaign Frame",
                "Pitch, Tone, Themes, Touchstones & Inciting Incident",
                `
                  ${renderField(
                    "dhFramePitch",
                    "Campaign Pitch (Player Hook)",
                    "A punchy 2–3 sentence pitch that tells your players what the campaign is about and why their heroes are drawn into it...",
                    data.dhFramePitch,
                    3
                  )}

                  <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    ${renderField(
                      "dhFrameToneFeel",
                      "Tone & Feel",
                      "e.g., Hopeful, Swashbuckling, Mythic, Grim, Cozy, Whimsical...",
                      data.dhFrameToneFeel,
                      3
                    )}
                    ${renderField(
                      "dhFrameThemes",
                      "Core Themes",
                      "e.g., Found family, restoring forgotten magic, survival against the wilds...",
                      data.dhFrameThemes,
                      3
                    )}
                    ${renderField(
                      "dhFrameTouchstones",
                      "Touchstones (Media Inspiration)",
                      "e.g., Princess Mononoke, The Witcher, Critical Role, Shadow of the Colossus...",
                      data.dhFrameTouchstones,
                      3
                    )}
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    ${renderField(
                      "dhFrameDistinctions",
                      "World Distinctions (Communities, Ancestries & Truths)",
                      "What makes this realm unique? How do Daggerheart Communities, Ancestries, and the Forgotten/New Gods fit in?",
                      data.dhFrameDistinctions,
                      4
                    )}
                    ${renderField(
                      "dhFrameIncitingIncident",
                      "The Inciting Incident",
                      "What dramatic event launches Session 1 and binds the party together right out of the gate?",
                      data.dhFrameIncitingIncident,
                      4
                    )}
                  </div>

                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    ${renderField(
                      "dhFrameMechanics",
                      "Campaign Frame Mechanics (Optional Custom Rules)",
                      "Any special frame mechanics—such as Corruption tracks, Blight clocks, Colossus weak points, or crafting rules...",
                      data.dhFrameMechanics,
                      3
                    )}
                    ${renderField(
                      "dhFrameSessionZero",
                      "Session Zero Questions & Safety Tools",
                      "Questions to ask players during character creation to weave their backstories and connections into the world...",
                      data.dhFrameSessionZero,
                      3
                    )}
                  </div>
                `
              )
            : ""
        }

        ${renderCollapsibleCard(
          "worldFoundations",
          "globe",
          "World Era, Terrain, Governance & Culture",
          "Core pillars of daily life across your setting",
          `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              ${renderField(
                "timePeriod",
                "What Time Period or Setting?",
                "e.g., Wild West, Medieval, Steampunk, Sci-Fi, High Fantasy (LOTR), Space Opera...",
                data.timePeriod,
                3
              )}
              ${renderField(
                "terrain",
                "Describe Terrain",
                "e.g., Dense ancient forests, arid glass deserts, shattered archipelagos, volcanic peaks...",
                data.terrain,
                3
              )}
              ${renderField(
                "governmentSystem",
                "What Type of Government or Political System is in Place?",
                "e.g., Feudal monarchy, merchant oligarchy, fractured city-states, theocratic empire...",
                data.governmentSystem,
                3
              )}
              ${renderField(
                "languageAndNaming",
                "Language & Naming: How is Language Expressed, Names Given?",
                "e.g., Common trade tongue vs. High Imperial; lineage surnames, earned titles, clan prefixes...",
                data.languageAndNaming,
                3
              )}
            </div>

            ${renderField(
              "generalCulture",
              "Describe the General World Culture",
              "Religious, lawless, trade-heavy, technology, magic, isolated cities, small villages, economy, caste system, nobility, slaves, poverty, etc...",
              data.generalCulture,
              4
            )}
          `
        )}

        ${renderCollapsibleCard(
          "guidedQuestions",
          "lightbulb",
          "Worldbuilding Spark Questions (Optional Brainstorm)",
          "Click to expand quick prompts if you want inspiration",
          `
            <div class="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <ul class="list-disc list-inside text-slate-400 space-y-1">
                <li>Which neighboring regions or rulers have an uneasy truce or active rivalry?</li>
                <li>What rare resource, ancient ruin, or magical phenomenon makes this region famous?</li>
                <li>How do travelers move between settlements—safe royal roads, river barges, or perilous wild trails?</li>
                <li>What everyday detail (food, festivals, architecture, weather) immediately tells players they are in this world?</li>
              </ul>
            </div>
            <textarea data-field="worldbuildingPrompts" rows="5"
              placeholder="Jot down quick answers to whichever prompts spark an idea..."
              class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(data.worldbuildingPrompts)}</textarea>
          `
        )}
      `;

    case "world-profile":
      return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-7 space-y-5">
            <div>
              <label class="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">World Name</label>
              <input type="text" data-field="worldName" value="${escapeHtml(data.worldName)}"
                placeholder="Enter the name of your world or realm..."
                class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
            </div>

            ${renderField(
              "worldCharacteristics",
              "Characteristics",
              "Defining traits of the world—moons, seasons, planar quirks, overarching atmosphere...",
              data.worldCharacteristics,
              6
            )}
          </div>

          <div class="lg:col-span-5">
            ${renderField(
              "kingdomsSummary",
              "Kingdoms / Counties Overview",
              "List the major realms, provinces, or territories at a glance (you can build full 2-page sheets for each in Kingdoms & Regions)...",
              data.kingdomsSummary,
              10
            )}
          </div>
        </div>

        ${renderField(
          "currentEvents",
          "Current Events",
          "What major headlines, crises, festivals, or turning points are happening right as the campaign begins?",
          data.currentEvents,
          5
        )}
      `;

    case "world-details":
      return `
        ${renderCollapsibleCard(
          "detailNature",
          "trees",
          "Environment, Flora & Fauna",
          "Leylines, natural disasters, beasts, and alchemical plants",
          `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              ${renderField("environmentalBuffs", "Environmental Buffs / Phenomena", "Leylines, blessings, seasonal boons, restorative springs...", data.environmentalBuffs, 3)}
              ${renderField("naturalDisasters", "Natural Disasters or Events", "Ash storms, magical tempests, eclipses, quakes, tide surges...", data.naturalDisasters, 3)}
              ${renderField("animalLife", "Animal Life", "Notable beasts, mounts, apex predators, mythical fauna...", data.animalLife, 3)}
              ${renderField("plantLife", "Plant Life", "Rare herbs, alchemical flora, giant forests, hazardous plants...", data.plantLife, 3)}
            </div>
            ${renderField("natureNotes", "Environment Notes", "Additional ecological details...", data.natureNotes, 3)}
          `
        )}

        ${renderCollapsibleCard(
          "detailArcana",
          "wand-2",
          "Magic, Technology & Peoples",
          "Magic rules, tech era, ancestries, and maladies",
          `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              ${renderField("diseasesIllnesses", "Diseases / Illnesses", "Plagues, curses, planar sicknesses, notable remedies...", data.diseasesIllnesses, 3)}
              ${renderField("magicSystem", "Magic System", "How magic is sourced, regulated, feared, or integrated into daily life...", data.magicSystem, 3)}
              ${renderField("technologicalLevel", "Technological Level", "Weapons, transport, communication, industry, lost ancient tech...", data.technologicalLevel, 3)}
              ${renderField("races", "Races / Ancestries", "Major peoples, origins, homelands, and cultural relations...", data.races, 3)}
            </div>
            ${renderField("arcanaNotes", "Magic & Peoples Notes", "Additional notes...", data.arcanaNotes, 3)}
          `
        )}

        ${renderCollapsibleCard(
          "detailEconomy",
          "coins",
          "Politics, Languages & Economy",
          "Trade goods, coinage, factions, and spoken tongues",
          `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              ${renderField("politicalFactions", "Political Factions", "Major alliances, noble houses, councils, rebel movements...", data.politicalFactions, 3)}
              ${renderField("languages", "Languages", "Spoken tongues, dead scripts, regional dialects, secret cant...", data.languages, 3)}
              ${renderField("importsExports", "Imports / Exports", "Key trade commodities, scarce resources, major trade arteries...", data.importsExports, 3)}
              ${renderField("currencyEconomy", "Currency and Economy", "Coinage, barter standards, banking guilds, trade tariffs...", data.currencyEconomy, 3)}
            </div>
            ${renderField("economyNotes", "Economy & Politics Notes", "Additional notes...", data.economyNotes, 3)}
          `
        )}

        ${renderCollapsibleCard(
          "detailSociety",
          "scale",
          "Faith, Underworld & Social Structure",
          "Pantheons, cults, crime syndicates, and social hierarchy",
          `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
              ${renderField("deities", "Deities", "Overview of the pantheon, creator myths, or cosmic powers...", data.deities, 3)}
              ${renderField("religionsCults", "Religions / Cults", "Organized churches, heresies, secret cults, temples...", data.religionsCults, 3)}
              ${renderField("gangsCrime", "Gangs / Crime", "Thieves' guilds, smugglers, syndicates, black markets...", data.gangsCrime, 3)}
              ${renderField("socialStatus", "Social Status (Wealth / Poverty)", "Class hierarchy, nobility vs. peasantry, social mobility...", data.socialStatus, 3)}
            </div>
            ${renderField("societyNotes", "Society & Faith Notes", "Additional notes...", data.societyNotes, 3)}
          `
        )}
      `;

    case "world-map":
      return `
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              World Map Image URL (Optional)
            </label>
            <input type="url" data-field="worldMapUrl" value="${escapeHtml(data.worldMapUrl)}"
              placeholder="https://... (Paste an Inkarnate, Wonderdraft, Imgur, or GitHub image link)"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
            <div id="world-map-preview" class="mt-2.5 border border-dashed border-slate-700 rounded-xl bg-slate-950/60 p-4 text-center">
              ${
                data.worldMapUrl
                  ? `<img src="${escapeHtml(data.worldMapUrl)}" alt="World Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" />`
                  : `<p class="text-xs text-slate-500 py-6">Paste an image URL above to preview your world map here.</p>`
              }
            </div>
          </div>

          ${renderField(
            "worldMapNotes",
            "Geography, Landmarks & Travel Scale Notes",
            "Hex/mile scale, major mountain ranges, seas, borders, and key map coordinates...",
            data.worldMapNotes,
            6
          )}
        </div>
      `;

    case "kingdoms":
      return renderKingdomsTab(data);

    case "towns":
      return renderTownsTab(data);

    case "markets":
      return renderMarketsTab(data);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Campaign Setting — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Jot down uncategorized setting ideas, brainstorms, inspiration sources, or leftover worldbuilding notes.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous Setting Notes",
            "Write any extra worldbuilding notes, table rules, or loose ideas here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderKingdomsTab(data) {
  const kingdoms = data.kingdoms || [];
  const activeKingdom = kingdoms[selectedKingdomIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Kingdoms & Regions in the World</h3>
        <p class="text-xs text-slate-400">Create a detailed 2-page profile for each kingdom, nation, or major region.</p>
      </div>
      <button type="button" id="add-kingdom-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Kingdom
      </button>
    </div>

    ${
      kingdoms.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="castle" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Kingdoms Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Kingdom" to fill out a Kingdom Profile sheet.</p>
          </div>
        `
        : `
          <div class="flex items-center gap-2 flex-wrap">
            ${kingdoms
              .map(
                (k, i) => `
              <button type="button" data-kingdom-idx="${i}" class="select-kingdom-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedKingdomIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(k.name || `Kingdom #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeKingdom
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Kingdom / Region Name</label>
                      <input type="text" data-kingdom-field="name" value="${escapeHtml(activeKingdom.name || "")}"
                        placeholder="e.g., The Duchy of Valenwood"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-kingdom-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove Kingdom
                    </button>
                  </div>

                  <!-- Widescreen 2-Column Layout -->
                  <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div class="xl:col-span-6 space-y-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">
                          Characteristics <span class="font-normal text-slate-500">(capital, industries, size, wealth, trade)</span>
                        </label>
                        <textarea data-kingdom-field="characteristics" rows="3"
                          placeholder="Capital city, primary industries (farming/fishing/mining), size, demographics, wealth & trade..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.characteristics || "")}</textarea>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Government and Leadership</label>
                          <textarea data-kingdom-field="government" rows="3"
                            placeholder="Who holds power, succession rules, local magistrates..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.government || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Laws</label>
                          <textarea data-kingdom-field="laws" rows="3"
                            placeholder="Strict edicts, banned magic/weapons, punishments, taxes..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.laws || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Social / Economic Factors</label>
                          <textarea data-kingdom-field="socialEconomic" rows="3"
                            placeholder="Prosperity, poverty, guild influence, class tensions..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.socialEconomic || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Races and Languages</label>
                          <textarea data-kingdom-field="racesLanguages" rows="3"
                            placeholder="Dominant populations, minorities, regional dialects..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.racesLanguages || "")}</textarea>
                        </div>
                      </div>
                    </div>

                    <div class="xl:col-span-6 space-y-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Key NPCs</label>
                          <textarea data-kingdom-field="keyNpcs" rows="3"
                            placeholder="Rulers, advisors, guildmasters, notable figures..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.keyNpcs || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">States / Cities / Towns</label>
                          <textarea data-kingdom-field="settlements" rows="3"
                            placeholder="Major provinces, walled cities, port towns, border forts..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.settlements || "")}</textarea>
                        </div>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">History</label>
                        <textarea data-kingdom-field="history" rows="3"
                          placeholder="Founding myths, past wars, treaties, turning points..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.history || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Rumors</label>
                        <textarea data-kingdom-field="rumors" rows="3"
                          placeholder="Tavern whispers, conspiracies, adventure hooks tied to this kingdom..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.rumors || "")}</textarea>
                      </div>

                      <div class="space-y-2">
                        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Kingdom Map Image URL (Optional)
                        </label>
                        <input type="url" data-kingdom-field="kingdomMapUrl" value="${escapeHtml(activeKingdom.kingdomMapUrl || "")}"
                          placeholder="https://... (Paste a kingdom or regional map image link)"
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                        <div id="kingdom-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
                          ${
                            activeKingdom.kingdomMapUrl
                              ? `<img src="${escapeHtml(activeKingdom.kingdomMapUrl)}" alt="Kingdom Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" />`
                              : `<p class="text-xs text-slate-500 py-5">Paste a kingdom map URL above to preview it here.</p>`
                          }
                        </div>
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

function wireKingdomControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "campaign-setting", title: data.worldName || "Campaign Setting", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "campaign-setting");
    renderCampaignSettingChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-kingdom-btn")?.addEventListener("click", () => {
    collectFormIntoData(paneContainer, data);
    data.kingdoms.push({
      name: `Kingdom ${data.kingdoms.length + 1}`,
      characteristics: "",
      keyNpcs: "",
      settlements: "",
      history: "",
      government: "",
      laws: "",
      socialEconomic: "",
      racesLanguages: "",
      rumors: "",
      kingdomMapUrl: ""
    });
    selectedKingdomIndex = data.kingdoms.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-kingdom-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFormIntoData(paneContainer, data);
      selectedKingdomIndex = Number(btn.getAttribute("data-kingdom-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-kingdom-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.kingdoms.splice(selectedKingdomIndex, 1);
    selectedKingdomIndex = Math.max(0, selectedKingdomIndex - 1);
    rerenderWithLocalData();
  });

  const kMapInput = paneContainer.querySelector('[data-kingdom-field="kingdomMapUrl"]');
  const kMapPreview = paneContainer.querySelector("#kingdom-map-preview");
  kMapInput?.addEventListener("input", () => {
    const val = kMapInput.value.trim();
    if (val) {
      kMapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Kingdom Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      kMapPreview.innerHTML = `<p class="text-xs text-slate-500 py-5">Paste a kingdom map URL above to preview it here.</p>`;
    }
  });
}

function renderTownsTab(data) {
  const towns = data.towns || [];
  const activeTown = towns[selectedTownIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Towns, Cities & Settlements</h3>
        <p class="text-xs text-slate-400">Build detailed settlement sheets with key NPCs, businesses, local laws, rumors, and town maps.</p>
      </div>
      <button type="button" id="add-town-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Town / City
      </button>
    </div>

    ${
      towns.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="building-2" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Towns or Cities Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Town / City" to fill out a settlement profile and attach a town map.</p>
          </div>
        `
        : `
          <div class="flex items-center gap-2 flex-wrap">
            ${towns
              .map(
                (t, i) => `
              <button type="button" data-town-idx="${i}" class="select-town-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedTownIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(t.name || `Town #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeTown
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Town / City Name</label>
                      <input type="text" data-town-field="name" value="${escapeHtml(activeTown.name || "")}"
                        placeholder="e.g., Oakhaven, Port Brass"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-town-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove Town
                    </button>
                  </div>

                  <!-- Widescreen 2-Column Layout -->
                  <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    <div class="xl:col-span-6 space-y-4">
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Key NPCs</label>
                          <textarea data-town-field="keyNpcs" rows="3"
                            placeholder="Mayor, captain of the guard, innkeepers, guild leaders..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.keyNpcs || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Notable Locations &amp; Businesses</label>
                          <textarea data-town-field="notableLocations" rows="3"
                            placeholder="Taverns, blacksmiths, temples, docks, landmarks..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.notableLocations || "")}</textarea>
                        </div>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Local Government &amp; Leadership</label>
                          <textarea data-town-field="localGovernment" rows="3"
                            placeholder="Council, lord, sheriff, guild magistrates..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.localGovernment || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Laws</label>
                          <textarea data-town-field="laws" rows="3"
                            placeholder="Gate taxes, weapon restrictions, curfews, local justice..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.laws || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Social / Economic Factors</label>
                          <textarea data-town-field="socialEconomic" rows="3"
                            placeholder="Primary exports, wealth gap, slums vs. noble quarters..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.socialEconomic || "")}</textarea>
                        </div>
                        <div>
                          <label class="block text-xs font-semibold text-slate-300 mb-1">Races and Languages</label>
                          <textarea data-town-field="racesLanguages" rows="3"
                            placeholder="Local demographics, districts, spoken languages..."
                            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.racesLanguages || "")}</textarea>
                        </div>
                      </div>
                    </div>

                    <div class="xl:col-span-6 space-y-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Local History</label>
                        <textarea data-town-field="localHistory" rows="4"
                          placeholder="How the settlement was founded, past disasters, famous events..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.localHistory || "")}</textarea>
                      </div>

                      <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">Rumors</label>
                        <textarea data-town-field="rumors" rows="4"
                          placeholder="Local gossip, missing persons, haunted cellars, job postings..."
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeTown.rumors || "")}</textarea>
                      </div>

                      <div class="space-y-2">
                        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                          Town Map Image URL (Optional)
                        </label>
                        <input type="url" data-town-field="townMapUrl" value="${escapeHtml(activeTown.townMapUrl || "")}"
                          placeholder="https://... (Paste a Watabou, Inkarnate, or town map image link)"
                          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                        <div id="town-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
                          ${
                            activeTown.townMapUrl
                              ? `<img src="${escapeHtml(activeTown.townMapUrl)}" alt="Town Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" />`
                              : `<p class="text-xs text-slate-500 py-5">Paste a town map URL above to preview it here.</p>`
                          }
                        </div>
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

function wireTownControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "campaign-setting", title: data.worldName || "Campaign Setting", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "campaign-setting");
    renderCampaignSettingChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-town-btn")?.addEventListener("click", () => {
    collectFormIntoData(paneContainer, data);
    data.towns.push({
      name: `Town ${data.towns.length + 1}`,
      keyNpcs: "",
      notableLocations: "",
      localHistory: "",
      localGovernment: "",
      laws: "",
      socialEconomic: "",
      racesLanguages: "",
      rumors: "",
      townMapUrl: ""
    });
    selectedTownIndex = data.towns.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-town-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFormIntoData(paneContainer, data);
      selectedTownIndex = Number(btn.getAttribute("data-town-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-town-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.towns.splice(selectedTownIndex, 1);
    selectedTownIndex = Math.max(0, selectedTownIndex - 1);
    rerenderWithLocalData();
  });

  const tMapInput = paneContainer.querySelector('[data-town-field="townMapUrl"]');
  const tMapPreview = paneContainer.querySelector("#town-map-preview");
  tMapInput?.addEventListener("input", () => {
    const val = tMapInput.value.trim();
    if (val) {
      tMapPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Town Map" class="max-h-80 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      tMapPreview.innerHTML = `<p class="text-xs text-slate-500 py-5">Paste a town map URL above to preview it here.</p>`;
    }
  });
}

function renderMarketsTab(data) {
  const markets = data.markets || [];

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Markets, Bazaars & Merchants</h3>
        <p class="text-xs text-slate-400">Track local markets, traders, locations, and specialty goods with prices.</p>
      </div>
      <button type="button" id="add-market-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Market / Shop
      </button>
    </div>

    ${
      markets.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="store" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Markets Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Market / Shop" to log vendors, locations, and inventory prices.</p>
          </div>
        `
        : `
          <div class="space-y-4">
            ${markets
              .map(
                (m, idx) => `
              <div data-market-card="${idx}" class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5">
                <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Market #${idx + 1}</span>
                  <button type="button" data-delete-market="${idx}" class="delete-market-btn text-xs text-slate-400 hover:text-rose-400 transition">
                    Remove
                  </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  <div class="md:col-span-5 space-y-3">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Market Name</label>
                      <input type="text" data-market-idx="${idx}" data-market-field="marketName" value="${escapeHtml(m.marketName || "")}"
                        placeholder="e.g., The Gilded Anvil, Night Bazaar"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Trader Name</label>
                      <input type="text" data-market-idx="${idx}" data-market-field="traderName" value="${escapeHtml(m.traderName || "")}"
                        placeholder="e.g., Mistress Vespera"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Town / Location</label>
                      <input type="text" data-market-idx="${idx}" data-market-field="townLocation" value="${escapeHtml(m.townLocation || "")}"
                        placeholder="e.g., Oakhaven — Dock Ward"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                  </div>

                  <div class="md:col-span-7">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Items and Prices</label>
                    <textarea data-market-idx="${idx}" data-market-field="itemsAndPrices" rows="7"
                      placeholder="List notable wares, services, and prices (e.g., Healing Potion — 50 gp, Silvered Dagger — 105 gp)..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(m.itemsAndPrices || "")}</textarea>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
    }
  `;
}

function wireMarketControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "campaign-setting", title: data.worldName || "Campaign Setting", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "campaign-setting");
    renderCampaignSettingChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-market-btn")?.addEventListener("click", () => {
    collectFormIntoData(paneContainer, data);
    data.markets.push({
      marketName: "",
      traderName: "",
      townLocation: "",
      itemsAndPrices: ""
    });
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".delete-market-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-delete-market"));
      if (btn.dataset.armed !== "true") {
        btn.dataset.armed = "true";
        btn.textContent = "Confirm?";
        btn.classList.add("text-rose-400");
        return;
      }
      collectFormIntoData(paneContainer, data);
      data.markets.splice(idx, 1);
      rerenderWithLocalData();
    });
  });
}

function collectFormIntoData(container, data) {
  container.querySelectorAll("[data-field]").forEach((el) => {
    const key = el.getAttribute("data-field");
    data[key] = el.value;
  });

  if (activeSettingTab === "kingdoms" && data.kingdoms[selectedKingdomIndex]) {
    container.querySelectorAll("[data-kingdom-field]").forEach((el) => {
      const kField = el.getAttribute("data-kingdom-field");
      data.kingdoms[selectedKingdomIndex][kField] = el.value;
    });
  }

  if (activeSettingTab === "towns" && data.towns[selectedTownIndex]) {
    container.querySelectorAll("[data-town-field]").forEach((el) => {
      const tField = el.getAttribute("data-town-field");
      data.towns[selectedTownIndex][tField] = el.value;
    });
  }

  if (activeSettingTab === "markets") {
    container.querySelectorAll("[data-market-field]").forEach((el) => {
      const idx = Number(el.getAttribute("data-market-idx"));
      const mField = el.getAttribute("data-market-field");
      if (data.markets[idx]) {
        data.markets[idx][mField] = el.value;
      }
    });
  }
}

function buildSearchableSummary(data) {
  const parts = [
    data.worldName && `World: ${data.worldName}`,
    data.timePeriod && `Setting: ${data.timePeriod}`,
    data.terrain && `Terrain: ${data.terrain}`,
    data.currentEvents && `Current Events: ${data.currentEvents}`
  ].filter(Boolean);
  return parts.join(" | ");
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
        class="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(value)}</textarea>
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
