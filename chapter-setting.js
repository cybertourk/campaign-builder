// chapter-setting.js
// Dedicated interactive workbook for Chapter 1: Campaign Setting (Pages 1–13 of the Campaign Planner).
// Organizes the book's guided prompts, World Profile, Ecology/Magic/Society pages, World Map,
// and repeatable 2-page Kingdom Sheets into a clean tabbed workspace backed by Firestore.

import { createEntity, updateEntity } from "./firebase-manager.js";

// Sub-tabs mirroring the flow of Pages 1–13 in the book
const SETTING_TABS = [
  { id: "overview", label: "1. Core Concept & Prompts", icon: "compass" },
  { id: "world-profile", label: "2. World Profile", icon: "globe" },
  { id: "world-details", label: "3. Nature, Magic & Society", icon: "sparkles" },
  { id: "world-map", label: "4. World Map", icon: "map" },
  { id: "kingdoms", label: "5. Kingdoms & Regions", icon: "castle" }
];

let activeSettingTab = "overview";
let selectedKingdomIndex = 0;

/**
 * Returns a clean default structure matching every field in Chapter 1.
 */
function getDefaultSettingData() {
  return {
    // Page 1: Campaign Setting Prompts
    timePeriod: "",
    terrain: "",
    governmentSystem: "",
    languageAndNaming: "",
    generalCulture: "",
    worldbuildingPrompts: "",

    // Page 2: World Overview
    worldName: "",
    worldCharacteristics: "",
    kingdomsSummary: "",
    currentEvents: "",

    // Page 3: Environment & Nature
    environmentalBuffs: "",
    naturalDisasters: "",
    animalLife: "",
    plantLife: "",
    natureNotes: "",

    // Page 4: Arcana, Tech & Peoples
    diseasesIllnesses: "",
    magicSystem: "",
    technologicalLevel: "",
    races: "",
    arcanaNotes: "",

    // Page 5: Politics, Trade & Economy
    politicalFactions: "",
    languages: "",
    importsExports: "",
    currencyEconomy: "",
    economyNotes: "",

    // Page 6: Faith, Underworld & Social Status
    deities: "",
    religionsCults: "",
    gangsCrime: "",
    socialStatus: "",
    societyNotes: "",

    // Page 7: World Map
    worldMapUrl: "",
    worldMapNotes: "",

    // Pages 8–10: Kingdoms in the World (Repeatable 2-page Kingdom Sheets)
    kingdoms: []
  };
}

/**
 * Renders the complete Chapter 1: Campaign Setting workbook inside the main workspace pane.
 */
export function renderCampaignSettingChapter(paneContainer, state) {
  // Find existing 'campaign-setting' document or prepare defaults
  const existingDoc = state.entities.find((e) => e.type === "campaign-setting");
  const data = {
    ...getDefaultSettingData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.kingdoms)) data.kingdoms = [];
  if (selectedKingdomIndex >= data.kingdoms.length) {
    selectedKingdomIndex = Math.max(0, data.kingdoms.length - 1);
  }

  paneContainer.innerHTML = `
    <!-- Chapter Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="globe" class="w-5 h-5 text-indigo-400"></i>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl font-bold text-white">Chapter 1: Campaign Setting</h1>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/70 text-emerald-300 border border-emerald-800/50">
              Workbook Active
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Flesh out your world's era, geography, cultures, magic, map, and individual kingdoms.
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

    <!-- Book Section Sub-Tabs -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-slate-800/80">
      ${SETTING_TABS.map((tab) => {
        const isActive = tab.id === activeSettingTab;
        const badge =
          tab.id === "kingdoms" && data.kingdoms.length > 0
            ? `<span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                isActive ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400"
              }">${data.kingdoms.length}</span>`
            : "";
        return `
          <button type="button" data-setting-tab="${tab.id}" class="setting-tab-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${
            isActive
              ? "bg-slate-800 text-white border border-slate-700"
              : "text-slate-400 hover:text-white hover:bg-slate-850"
          }">
            <i data-lucide="${tab.icon}" class="w-3.5 h-3.5 ${isActive ? "text-indigo-400" : ""}"></i>
            ${tab.label}${badge}
          </button>
        `;
      }).join("")}
    </div>

    <!-- Active Sub-Tab Form Content -->
    <div id="setting-tab-body" class="space-y-6 flex-1">
      ${renderActiveTabContent(activeSettingTab, data)}
    </div>
  `;

  // Wire sub-tab switching (preserves unsaved edits in memory while switching tabs)
  paneContainer.querySelectorAll(".setting-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectFormIntoData(paneContainer, data);
      activeSettingTab = btn.getAttribute("data-setting-tab");
      // Temporarily cache in state so tab switches don't lose typed text before Firestore save
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

  // Mark unsaved on any input change
  const statusEl = paneContainer.querySelector("#setting-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((field) => {
    field.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  // Wire Kingdom repeater buttons if on the Kingdoms tab
  if (activeSettingTab === "kingdoms") {
    wireKingdomControls(paneContainer, state, existingDoc, data);
  }

  // Wire World Map live preview if on the Map tab
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

  // Save to Firestore
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

/**
 * Generates the HTML for whichever sub-tab of Chapter 1 is currently active.
 */
function renderActiveTabContent(tabId, data) {
  switch (tabId) {
    case "overview":
      return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
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

        <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
          <div class="flex items-start gap-2.5">
            <i data-lucide="lightbulb" class="w-4 h-4 text-amber-400 shrink-0 mt-0.5"></i>
            <div class="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p class="font-semibold text-white">Guided Worldbuilding Questions (from Planner):</p>
              <ul class="list-disc list-inside text-slate-400 space-y-1">
                <li>Will different regions be led by opposing rulers? Will different climates be inhabited by distinct races or creatures?</li>
                <li>Is there an ongoing war and where did it start? What regions are the opposing forces located in?</li>
                <li>Where is the rarest mineral, animal, plant, or magical artifact located—and who or what is protecting it?</li>
                <li>Think about trade routes and towns/cities/hamlets near rivers, lakes, and coastlines: will players travel for long periods and what happens along the way?</li>
              </ul>
            </div>
          </div>
          <textarea data-field="worldbuildingPrompts" rows="5"
            placeholder="Brainstorm your answers to the worldbuilding prompts above..."
            class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(data.worldbuildingPrompts)}</textarea>
        </div>
      `;

    case "world-profile":
      return `
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div class="md:col-span-7 space-y-5">
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

          <div class="md:col-span-5">
            ${renderField(
              "kingdomsSummary",
              "Kingdoms / Counties Overview",
              "List the major realms, provinces, or territories at a glance (you can build full 2-page sheets for each in Tab 5)...",
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
        <!-- Page 3: Environment & Nature -->
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i data-lucide="trees" class="w-4 h-4 text-emerald-400"></i> Environment, Flora & Fauna
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField("environmentalBuffs", "Environmental Buffs / Phenomena", "Leylines, blessings, seasonal boons, restorative springs...", data.environmentalBuffs, 3)}
            ${renderField("naturalDisasters", "Natural Disasters or Events", "Ash storms, magical tempests, eclipses, quakes, tide surges...", data.naturalDisasters, 3)}
            ${renderField("animalLife", "Animal Life", "Notable beasts, mounts, apex predators, mythical fauna...", data.animalLife, 3)}
            ${renderField("plantLife", "Plant Life", "Rare herbs, alchemical flora, giant forests, hazardous plants...", data.plantLife, 3)}
          </div>
          ${renderField("natureNotes", "Environment Notes", "Additional ecological details...", data.natureNotes, 2)}
        </div>

        <!-- Page 4: Arcana, Tech & Peoples -->
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i data-lucide="wand-2" class="w-4 h-4 text-purple-400"></i> Magic, Technology & Peoples
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField("diseasesIllnesses", "Diseases / Illnesses", "Plagues, curses, planar sicknesses, notable remedies...", data.diseasesIllnesses, 3)}
            ${renderField("magicSystem", "Magic System", "How magic is sourced, regulated, feared, or integrated into daily life...", data.magicSystem, 3)}
            ${renderField("technologicalLevel", "Technological Level", "Weapons, transport, communication, industry, lost ancient tech...", data.technologicalLevel, 3)}
            ${renderField("races", "Races / Ancestries", "Major peoples, origins, homelands, and cultural relations...", data.races, 3)}
          </div>
          ${renderField("arcanaNotes", "Magic & Peoples Notes", "Additional notes...", data.arcanaNotes, 2)}
        </div>

        <!-- Page 5: Politics, Trade & Economy -->
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i data-lucide="coins" class="w-4 h-4 text-amber-400"></i> Politics, Languages & Economy
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField("politicalFactions", "Political Factions", "Major alliances, noble houses, councils, rebel movements...", data.politicalFactions, 3)}
            ${renderField("languages", "Languages", "Spoken tongues, dead scripts, regional dialects, secret cant...", data.languages, 3)}
            ${renderField("importsExports", "Imports / Exports", "Key trade commodities, scarce resources, major trade arteries...", data.importsExports, 3)}
            ${renderField("currencyEconomy", "Currency and Economy", "Coinage, barter standards, banking guilds, trade tariffs...", data.currencyEconomy, 3)}
          </div>
          ${renderField("economyNotes", "Economy & Politics Notes", "Additional notes...", data.economyNotes, 2)}
        </div>

        <!-- Page 6: Faith, Underworld & Social Status -->
        <div class="bg-slate-950/50 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
          <h3 class="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2.5">
            <i data-lucide="scale" class="w-4 h-4 text-rose-400"></i> Faith, Underworld & Social Structure
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${renderField("deities", "Deities", "Overview of the pantheon, creator myths, or cosmic powers...", data.deities, 3)}
            ${renderField("religionsCults", "Religions / Cults", "Organized churches, heresies, secret cults, temples...", data.religionsCults, 3)}
            ${renderField("gangsCrime", "Gangs / Crime", "Thieves' guilds, smugglers, syndicates, black markets...", data.gangsCrime, 3)}
            ${renderField("socialStatus", "Social Status (Wealth / Poverty)", "Class hierarchy, nobility vs. peasantry, social mobility...", data.socialStatus, 3)}
          </div>
          ${renderField("societyNotes", "Society & Faith Notes", "Additional notes...", data.societyNotes, 2)}
        </div>
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
          </div>

          <div id="world-map-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-950/60 p-4 text-center">
            ${
              data.worldMapUrl
                ? `<img src="${escapeHtml(data.worldMapUrl)}" alt="World Map" class="max-h-96 mx-auto rounded-lg border border-slate-700 object-contain" />`
                : `<p class="text-xs text-slate-500 py-8">Paste an image URL above to preview your world map here, or use the geography notes below.</p>`
            }
          </div>

          ${renderField(
            "worldMapNotes",
            "Geography, Landmarks & Travel Scale Notes",
            "Hex/mile scale, major mountain ranges, seas, borders, and key map coordinates...",
            data.worldMapNotes,
            5
          )}
        </div>
      `;

    case "kingdoms":
      return renderKingdomsTab(data);

    default:
      return "";
  }
}

/**
 * Renders Pages 8–10: Directory of Kingdoms + Full 2-Page Kingdom Sheet editor.
 */
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
          <!-- Kingdom Selector Pills -->
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

          <!-- Active 2-Page Kingdom Sheet -->
          ${
            activeKingdom
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
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

                  <!-- Page 10 Directory Summary Row -->
                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">
                      Characteristics <span class="font-normal text-slate-500">(farming, fishing, capital, size, racial makeup, wealth, trade)</span>
                    </label>
                    <textarea data-kingdom-field="characteristics" rows="2"
                      placeholder="Capital city, primary industries (farming/fishing/mining), size, demographics, wealth & trade..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.characteristics || "")}</textarea>
                  </div>

                  <!-- Page 12 Grid: Key NPCs, States/Cities/Towns, History -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Key NPCs</label>
                      <textarea data-kingdom-field="keyNpcs" rows="4"
                        placeholder="Rulers, advisors, guildmasters, notable figures..."
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.keyNpcs || "")}</textarea>
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">States / Cities / Towns</label>
                      <textarea data-kingdom-field="settlements" rows="4"
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

                  <!-- Page 13 Grid: Government, Laws, Social/Economic, Races & Languages, Rumors -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
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

                  <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Rumors</label>
                    <textarea data-kingdom-field="rumors" rows="3"
                      placeholder="Tavern whispers, conspiracies, adventure hooks tied to this kingdom..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500">${escapeHtml(activeKingdom.rumors || "")}</textarea>
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
      rumors: ""
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
}

/**
 * Reads all visible inputs on the active tab and merges them into `data`.
 */
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
        class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(value)}</textarea>
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
