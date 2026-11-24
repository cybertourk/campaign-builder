// ui-campaign.js
// Level 3: Campaign Builder workspace organized into the 12 Campaign Planner chapters,
// styled with the carved stone frames, PNG chapter emblems, dividers, and RPG buttons.

import {
  createEntity,
  updateEntity,
  deleteEntity
} from "./firebase-manager.js";
import { setState } from "./state.js";
import { renderCampaignSettingChapter, SETTING_TABS } from "./chapter-setting.js";
import { renderPlotChapter, PLOT_TABS } from "./chapter-plot.js";
import { renderEncountersChapter, ENCOUNTERS_TABS } from "./chapter-encounters.js";
import { renderEnemiesChapter, ENEMIES_TABS } from "./chapter-enemies.js";
import { renderDeitiesChapter, DEITIES_TABS } from "./chapter-deities.js";
import { renderFactionsChapter, FACTIONS_TABS } from "./chapter-factions.js";
import { renderNpcChapter, NPC_TABS } from "./chapter-npc.js";
import { renderItemsChapter, ITEMS_TABS } from "./chapter-items.js";
import { renderCharactersChapter, CHARACTERS_TABS } from "./chapter-characters.js";
import { renderSessionLogChapter, SESSION_LOG_TABS } from "./chapter-session-log.js";
import { renderInitiativeChapter, INITIATIVE_TABS } from "./chapter-initiative.js";
import { renderTravelChapter, TRAVEL_TABS } from "./chapter-travel.js";

export const CAMPAIGN_CHAPTERS = [
  {
    id: "campaign-setting",
    label: "Campaign Setting",
    icon: "globe",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/chest-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/102-rolled-treasure-map-with-a-dotted-route-and-small-crimson-X-blank-margins.png",
    mode: "single",
    description: "World overview, tone, geography, major regions, and foundational truths.",
    sections: SETTING_TABS
  },
  {
    id: "plot-adventures",
    label: "Plot and Adventures",
    icon: "compass",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/papyrus-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/101-circular-compass-rose-with-eight-ivory-points-and-teal-north-tip.png",
    mode: "collection",
    description: "Main story arcs, adventure hooks, milestones, and branching plotlines.",
    sections: PLOT_TABS
  },
  {
    id: "random-encounters",
    label: "Random Encounters",
    icon: "dices",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/bar-bottle.png",
    parchmentIcon: "./Parchwood_UI_Kit/351-trail-sense.png",
    mode: "collection",
    description: "Environment-based encounter tables, twists, and quick-roll triggers.",
    sections: ENCOUNTERS_TABS
  },
  {
    id: "enemies",
    label: "Enemies",
    icon: "skull",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/heart-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/115-crimson-boss-encounter-crest-with-a-horned-skull.png",
    mode: "collection",
    description: "Monsters, villains, stat blocks, tactics, and threat profiles.",
    sections: ENEMIES_TABS
  },
  {
    id: "deities",
    label: "Deities",
    icon: "sun",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/star-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/341-sun-ray.png",
    mode: "collection",
    description: "Pantheons, domains, alignments, tenets, symbols, and divine boons.",
    sections: DEITIES_TABS
  },
  {
    id: "faction",
    label: "Faction",
    icon: "flag",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/shield-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/338-protective-ward.png",
    mode: "collection",
    description: "Guilds, kingdoms, cults, leadership, goals, and inter-faction standings.",
    sections: FACTIONS_TABS
  },
  {
    id: "npc",
    label: "NPC",
    icon: "users",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/key-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/171-parchment-experience-medallion-with-ochre-open-book-silhouette.png",
    mode: "collection",
    description: "Non-player characters, appearances, motivations, secrets, and relationships.",
    sections: NPC_TABS
  },
  {
    id: "item-list",
    label: "Item List",
    icon: "sword",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/sack-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/112-parchment-reward-pouch-card-with-a-drawstring-pouch-illustration-and-blank-lower-field.png",
    mode: "collection",
    description: "Magic items, relics, custom gear, economy items, and loot tables.",
    sections: ITEMS_TABS
  },
  {
    id: "character-sheets",
    label: "Character Sheets",
    icon: "user-check",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/potion-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/332-healing-bloom.png",
    mode: "collection",
    description: "Party roster, player character stats, backstories, and personal quests.",
    sections: CHARACTERS_TABS
  },
  {
    id: "session-log",
    label: "Session Log",
    icon: "scroll-text",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/papyrus-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/396-scribing.png",
    mode: "collection",
    description: "Chronological session recaps, MVP moments, XP/milestones, and next-session prep.",
    sections: SESSION_LOG_TABS
  },
  {
    id: "initiative-tracker",
    label: "Initiative Tracker",
    icon: "swords",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/sword-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/301-power-slash.png",
    mode: "tool",
    description: "Live combat turn order, HP/condition tracking, and round counter.",
    sections: INITIATIVE_TABS
  },
  {
    id: "overland-travel",
    label: "Overland Travel Tables",
    icon: "map",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/coins-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/129-ochre-coin-stack-emblem-with-dark-engraved-diamond-symbols.png",
    mode: "tool",
    description: "Travel pace, navigation checks, weather tables, and hex/region terrain hazards.",
    sections: TRAVEL_TABS
  }
];

let activeChapterId = "campaign-setting";
let isMobileNavOpen = false;
let activeSectionMap = {
  "campaign-setting": "overview",
  "plot-adventures": "central-tension",
  "random-encounters": "encounter-tables",
  "enemies": "bbg-hierarchy",
  "deities": "religion-overview",
  "faction": "factions-overview",
  "npc": "npc-overview",
  "item-list": "general-items",
  "character-sheets": "party-roster",
  "session-log": "session-entries",
  "initiative-tracker": "combat-tracker",
  "overland-travel": "examples"
};

export function renderCampaignWorkspace(container, state) {
  const sys = state.activeSystem;
  const camp = state.activeCampaign;
  if (!sys || !camp) return;

  const currentChapter =
    CAMPAIGN_CHAPTERS.find((c) => c.id === activeChapterId) || CAMPAIGN_CHAPTERS[0];

  const currentChapterIndex = CAMPAIGN_CHAPTERS.findIndex((c) => c.id === currentChapter.id);
  const currentSecList = currentChapter.sections || [];
  const currentSecId = activeSectionMap[currentChapter.id] || currentSecList[0]?.id;
  const currentSecObj = currentSecList.find((s) => s.id === currentSecId) || currentSecList[0] || null;

  const chapterEntries = state.entities.filter(
    (e) => e.type === currentChapter.id || e.type === currentChapter.label
  );

  const activeEntry =
    chapterEntries.find((e) => e.id === state.activeEntity?.id) || chapterEntries[0] || null;

  container.innerHTML = `
    <!-- Breadcrumb Hierarchy: Game Systems > Active System > Active Campaign -->
    <nav class="flex items-center gap-1.5 sm:gap-2.5 text-sm text-slate-300 mb-4 sm:mb-5 flex-wrap">
      <button id="ws-nav-systems" class="rpg-btn-secondary px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
        <img src="./GUI_Fantasy_RPG_Kit/back-btn.png" alt="Systems" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
        <span>Game Systems</span>
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
      <button id="ws-nav-campaigns" class="rpg-btn-secondary px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium max-w-[140px] sm:max-w-none truncate">
        ${escapeHtml(sys.name)}
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
      <span class="rpg-slot-long px-2.5 sm:px-3 py-1 rounded-full text-amber-200 font-semibold text-xs flex items-center gap-1.5 max-w-[180px] sm:max-w-none truncate">
        <img src="./GUI_Fantasy_RPG_Kit/star-icon.png" alt="" class="w-3.5 h-3.5 object-contain shrink-0" onerror="this.style.display='none'" />
        <span class="truncate">${escapeHtml(camp.title)}</span>
      </span>
    </nav>

    <!-- Main 2-Column Layout: 12-Chapter Sidebar + Active Chapter Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">

      <!-- Left Sidebar: Campaign Header & 12-Chapter Nested Vertical Navigation (Collapsible on Mobile) -->
      <aside class="lg:col-span-3 rpg-panel rounded-xl overflow-hidden">
        <div class="p-3 sm:p-3.5 border-b border-slate-800/80">
          <div class="rpg-bar-stamina w-full mb-2 sm:mb-2.5 opacity-90"></div>
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0">
              <div class="text-[10px] font-bold uppercase tracking-widest text-amber-300/90 mb-0.5">
                Campaign Tome
              </div>
              <h2 class="font-rpg-display font-bold text-amber-100 text-sm sm:text-base truncate" title="${escapeHtml(camp.title)}">
                ${escapeHtml(camp.title)}
              </h2>
            </div>

            <!-- Mobile-Only Chapter Drawer Toggle -->
            <button type="button" id="mobile-tome-toggle-btn"
              class="lg:hidden rpg-btn-secondary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0">
              <i data-lucide="book-open" class="w-3.5 h-3.5"></i>
              <span>${isMobileNavOpen ? "Hide Chapters" : "Chapters"}</span>
              <i data-lucide="${isMobileNavOpen ? "chevron-up" : "chevron-down"}" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Mobile Active Chapter/Section Summary Pill when Drawer is Collapsed -->
          <div class="lg:hidden mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
            <span class="font-semibold text-amber-200 truncate">
              ${currentChapterIndex + 1}. ${escapeHtml(currentChapter.label)}${currentSecObj ? ` › ${escapeHtml(currentSecObj.label)}` : ""}
            </span>
          </div>

          <div class="rpg-divider mt-2 hidden lg:block"></div>
        </div>

        <nav id="campaign-tome-nav" class="${isMobileNavOpen ? "block" : "hidden"} lg:block p-2.5 space-y-1.5 max-h-[65vh] lg:max-h-[75vh] overflow-y-auto">
          ${CAMPAIGN_CHAPTERS.map((chap, idx) => {
            const isSelected = chap.id === currentChapter.id;
            const sections = chap.sections || [];
            const activeSecId = activeSectionMap[chap.id] || sections[0]?.id;
            const count = state.entities.filter(
              (e) => e.type === chap.id || e.type === chap.label
            ).length;

            // Compute item counts for nested sections
            const settingDoc = state.entities.find((e) => e.type === "campaign-setting")?.systemData || {};
            const plotDoc = state.entities.find((e) => e.type === "plot-adventures")?.systemData || {};
            const encountersDoc = state.entities.find((e) => e.type === "random-encounters")?.systemData || {};
            const enemiesDoc = state.entities.find((e) => e.type === "enemies")?.systemData || {};
            const deitiesDoc = state.entities.find((e) => e.type === "deities")?.systemData || {};
            const factionsDoc = state.entities.find((e) => e.type === "faction")?.systemData || {};
            const npcDoc = state.entities.find((e) => e.type === "npc")?.systemData || {};
            const itemsDoc = state.entities.find((e) => e.type === "item-list")?.systemData || {};
            const charsDoc = state.entities.find((e) => e.type === "character-sheets")?.systemData || {};
            const sessionsDoc = state.entities.find((e) => e.type === "session-log")?.systemData || {};

            return `
              <div class="rpg-sidebar-group rounded-lg ${isSelected ? "bg-slate-950/75 border border-amber-500/30 pb-1.5 shadow-inner" : ""}">
                <button data-chapter-id="${chap.id}" class="chapter-nav-btn w-full flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-lg text-left text-xs font-medium transition ${
                  isSelected
                    ? "rpg-btn-primary text-amber-100 font-semibold"
                    : "text-slate-300 hover:bg-slate-900/80 hover:text-amber-100"
                }">
                  <span class="flex items-center gap-2 min-w-0">
                    <span class="rpg-slot-small w-6 h-6 p-0.5 shrink-0">
                      <img src="${chap.rpgIcon}" data-parchment-src="${chap.parchmentIcon}" alt="" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
                    </span>
                    <span class="truncate">${idx + 1}. ${escapeHtml(chap.label)}</span>
                  </span>
                  <span class="flex items-center gap-1 shrink-0">
                    ${
                      count > 0 && sections.length === 0
                        ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                              : "bg-slate-800 text-slate-400"
                          }">${count}</span>`
                        : ""
                    }
                    ${
                      sections.length > 0
                        ? `<i data-lucide="${isSelected ? "chevron-down" : "chevron-right"}" class="w-3.5 h-3.5 opacity-85"></i>`
                        : ""
                    }
                  </span>
                </button>

                ${
                  isSelected && sections.length > 0
                    ? `
                      <div class="mt-1.5 mx-1.5 pl-2 border-l border-amber-500/30 space-y-1">
                        ${sections
                          .map((sec) => {
                            const isSecActive = sec.id === activeSecId;
                            let secCount = 0;
                            if (sec.id === "kingdoms") secCount = (settingDoc.kingdoms || []).length;
                            if (sec.id === "towns") secCount = (settingDoc.towns || []).length;
                            if (sec.id === "markets") secCount = (settingDoc.markets || []).length;
                            if (sec.id === "adventures") secCount = (plotDoc.adventures || []).length;
                            if (sec.id === "encounter-tables") secCount = (encountersDoc.rows || []).length;
                            if (sec.id === "bestiary") secCount = (enemiesDoc.enemies || []).length;
                            if (sec.id === "deity-profiles") secCount = (deitiesDoc.deities || []).length;
                            if (sec.id === "faction-profiles") secCount = (factionsDoc.factions || []).length;
                            if (sec.id === "key-npcs") secCount = (npcDoc.keyNpcs || []).length;
                            if (sec.id === "minor-npcs") secCount = (npcDoc.minorNpcs || []).length;
                            if (sec.id === "general-items") secCount = (itemsDoc.items || []).length;
                            if (sec.id === "armor-list") secCount = (itemsDoc.armor || []).length;
                            if (sec.id === "weapon-list") secCount = (itemsDoc.weapons || []).length;
                            if (sec.id === "spell-list") secCount = (itemsDoc.spells || []).length;
                            if (sec.id === "party-roster") secCount = (charsDoc.characters || []).length;
                            if (sec.id === "session-entries") secCount = (sessionsDoc.sessions || []).length;

                            return `
                              <button type="button" data-chapter-id="${chap.id}" data-section-id="${sec.id}"
                                class="chapter-section-btn w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-md text-left text-[11px] transition ${
                                  isSecActive
                                    ? "rpg-slot-long text-amber-200 font-semibold"
                                    : "text-slate-400 hover:text-amber-100 hover:bg-slate-900/70"
                                }">
                                <span class="flex items-center gap-1.5 min-w-0">
                                  <i data-lucide="${sec.icon}" class="w-3.5 h-3.5 shrink-0 ${
                                    isSecActive ? "text-amber-300" : "text-slate-500"
                                  }"></i>
                                  <span class="truncate">${escapeHtml(sec.label)}</span>
                                </span>
                                ${
                                  secCount > 0
                                    ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/90 text-amber-200/90 border border-amber-500/30 shrink-0">${secCount}</span>`
                                    : ""
                                }
                              </button>
                            `;
                          })
                          .join("")}
                      </div>
                    `
                    : ""
                }
              </div>
            `;
          }).join("")}
        </nav>
      </aside>

      <!-- Right Main Pane: Active Chapter View -->
      <section id="chapter-main-pane" class="rpg-workspace-pane lg:col-span-9 rpg-panel-ornate rounded-xl p-3.5 sm:p-6 min-h-[65vh] sm:min-h-[70vh] flex flex-col">
        
        <!-- Fallback Chapter Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
          <div class="flex items-start gap-3">
            <div class="rpg-slot-medium w-11 h-11 p-1.5 shrink-0">
              <img src="${currentChapter.rpgIcon}" data-parchment-src="${currentChapter.parchmentIcon}" alt="" class="w-7 h-7 object-contain" onerror="this.style.display='none'" />
            </div>
            <div>
              <h1 class="text-xl font-bold text-amber-100">${escapeHtml(currentChapter.label)}</h1>
              <p class="text-slate-300 text-xs sm:text-sm mt-1">${escapeHtml(currentChapter.description)}</p>
            </div>
          </div>

          <button id="chapter-new-entry-btn" class="rpg-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0">
            <i data-lucide="plus" class="w-4 h-4 text-amber-300"></i> Add ${escapeHtml(currentChapter.label)} Entry
          </button>
        </div>

        <!-- Chapter Entries & Quick Editor -->
        ${
          chapterEntries.length === 0
            ? `
              <div class="flex-1 flex flex-col items-center justify-center text-center py-12 border border-slate-800/60 rounded-xl bg-slate-950/40">
                <i data-lucide="${currentChapter.icon}" class="w-8 h-8 text-slate-600 mb-2"></i>
                <p class="text-sm font-medium text-slate-300">No entries in ${escapeHtml(currentChapter.label)} yet</p>
              </div>
            `
            : `
              <div class="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                <div class="md:col-span-4 border border-slate-800 rounded-xl bg-slate-950/50 divide-y divide-slate-800/70 max-h-[50vh] overflow-y-auto">
                  ${chapterEntries
                    .map(
                      (ent) => `
                    <div data-entity-id="${ent.id}" class="entity-item p-3 cursor-pointer transition ${
                        activeEntry?.id === ent.id
                          ? "bg-amber-950/40 border-l-2 border-amber-400"
                          : "hover:bg-slate-850"
                      }">
                      <div class="font-medium text-xs text-white truncate">${escapeHtml(ent.title)}</div>
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <div class="md:col-span-8 flex flex-col border border-slate-800 rounded-xl bg-slate-950/50 p-4">
                  ${
                    activeEntry
                      ? `
                        <div class="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
                          <input type="text" id="edit-entity-title" value="${escapeHtml(activeEntry.title)}"
                            class="flex-1 bg-transparent text-base font-bold text-white focus:outline-none border-b border-transparent focus:border-amber-400" />
                          <div class="flex items-center gap-2">
                            <span id="save-indicator" class="text-xs text-slate-400">Saved</span>
                            <button id="save-entity-btn" class="rpg-btn-primary inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold">
                              <i data-lucide="save" class="w-3.5 h-3.5"></i> Save
                            </button>
                            <button id="delete-entity-btn" title="Delete Entry" class="p-1 text-slate-400 hover:text-rose-400 rounded transition">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          </div>
                        </div>
                        <textarea id="edit-entity-content" placeholder="Notes for ${escapeHtml(currentChapter.label)}..."
                          class="flex-1 min-h-[260px] w-full rounded-lg p-3 text-xs sm:text-sm leading-relaxed focus:outline-none resize-none font-mono">${escapeHtml(activeEntry.content || "")}</textarea>
                      `
                      : ""
                  }
                </div>
              </div>
            `
        }

        <!-- Chapter Misc Notes -->
        <div class="mt-6 pt-5 border-t border-slate-800">
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <i data-lucide="sticky-note" class="w-3.5 h-3.5 text-amber-400"></i> ${escapeHtml(currentChapter.label)} — Misc Notes
            </label>
            <div class="flex items-center gap-2">
              <span id="misc-notes-status" class="text-[11px] text-slate-500"></span>
              <button type="button" id="save-misc-notes-btn" class="rpg-btn-secondary inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium">
                <i data-lucide="save" class="w-3 h-3"></i> Save Notes
              </button>
            </div>
          </div>
          <textarea id="chapter-misc-notes-input" rows="4"
            placeholder="Jot down general notes, ideas, or reminders for ${escapeHtml(currentChapter.label)}..."
            class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none">${escapeHtml(
              state.entities.find((e) => e.type === `${currentChapter.id}-misc`)?.content || ""
            )}</textarea>
        </div>

      </section>
    </div>

    <!-- New Entry Modal -->
    <div id="new-entity-modal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div class="rpg-panel-ornate rounded-2xl max-w-md w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold text-amber-100">New ${escapeHtml(currentChapter.label)} Entry</h2>
          <button id="close-entity-modal" class="rpg-icon-btn w-7 h-7" title="Close">
            <img src="./GUI_Fantasy_RPG_Kit/close-btn.png" alt="Close" class="w-7 h-7 object-contain" onerror="this.outerHTML='<span class=\\'text-slate-400 hover:text-white\\'>✕</span>'" />
          </button>
        </div>
        <div class="rpg-divider mb-4"></div>
        <form id="create-entity-form" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Entry Title *</label>
            <input type="text" id="new-ent-title" required placeholder="e.g. Session 1, Lord Vance, Tavern Rumors..."
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-entity-modal" class="rpg-btn-secondary px-4 py-2 text-xs font-medium rounded-lg">Cancel</button>
            <button type="submit" class="rpg-btn-primary px-4 py-2 text-xs font-semibold rounded-lg">Create Entry</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Render active chapter workbook inside #chapter-main-pane
  const mainPane = container.querySelector("#chapter-main-pane");
  if (currentChapter.id === "campaign-setting") {
    renderCampaignSettingChapter(mainPane, state, {
      activeSectionId: activeSectionMap["campaign-setting"],
      onSectionChange: (secId) => {
        activeSectionMap["campaign-setting"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "plot-adventures") {
    renderPlotChapter(mainPane, state, {
      activeSectionId: activeSectionMap["plot-adventures"],
      onSectionChange: (secId) => {
        activeSectionMap["plot-adventures"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "random-encounters") {
    renderEncountersChapter(mainPane, state, {
      activeSectionId: activeSectionMap["random-encounters"],
      onSectionChange: (secId) => {
        activeSectionMap["random-encounters"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "enemies") {
    renderEnemiesChapter(mainPane, state, {
      activeSectionId: activeSectionMap["enemies"],
      onSectionChange: (secId) => {
        activeSectionMap["enemies"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "deities") {
    renderDeitiesChapter(mainPane, state, {
      activeSectionId: activeSectionMap["deities"],
      onSectionChange: (secId) => {
        activeSectionMap["deities"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "faction") {
    renderFactionsChapter(mainPane, state, {
      activeSectionId: activeSectionMap["faction"],
      onSectionChange: (secId) => {
        activeSectionMap["faction"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "npc") {
    renderNpcChapter(mainPane, state, {
      activeSectionId: activeSectionMap["npc"],
      onSectionChange: (secId) => {
        activeSectionMap["npc"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "item-list") {
    renderItemsChapter(mainPane, state, {
      activeSectionId: activeSectionMap["item-list"],
      onSectionChange: (secId) => {
        activeSectionMap["item-list"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "character-sheets") {
    renderCharactersChapter(mainPane, state, {
      activeSectionId: activeSectionMap["character-sheets"],
      onSectionChange: (secId) => {
        activeSectionMap["character-sheets"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "session-log") {
    renderSessionLogChapter(mainPane, state, {
      activeSectionId: activeSectionMap["session-log"],
      onSectionChange: (secId) => {
        activeSectionMap["session-log"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "initiative-tracker") {
    renderInitiativeChapter(mainPane, state, {
      activeSectionId: activeSectionMap["initiative-tracker"],
      onSectionChange: (secId) => {
        activeSectionMap["initiative-tracker"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  } else if (currentChapter.id === "overland-travel") {
    renderTravelChapter(mainPane, state, {
      activeSectionId: activeSectionMap["overland-travel"],
      onSectionChange: (secId) => {
        activeSectionMap["overland-travel"] = secId;
        renderCampaignWorkspace(container, state);
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // Upgrade primary Save buttons inside chapter workbooks to use the carved stone button aesthetic
  mainPane.querySelectorAll('button[id^="save-"]').forEach((btn) => {
    btn.classList.remove("bg-indigo-600", "hover:bg-indigo-500", "shadow-indigo-600/20");
    btn.classList.add("rpg-btn-primary");
  });
  mainPane.querySelectorAll("h1").forEach((h1) => {
    h1.classList.remove("text-white");
    h1.classList.add("text-amber-100");
  });
  mainPane.querySelectorAll(".w-10.h-10.rounded-xl").forEach((iconBox) => {
    iconBox.classList.remove("rounded-xl", "bg-indigo-600/20", "border", "border-indigo-500/30");
    iconBox.classList.add("rpg-slot-small");
    const svg = iconBox.querySelector("svg, i");
    if (svg) {
      svg.classList.remove("text-indigo-400");
      svg.classList.add("text-amber-300");
    }
  });
  mainPane.querySelectorAll("span.rounded-full").forEach((pill) => {
    if (pill.textContent.includes("Chapter ")) {
      pill.classList.remove("bg-indigo-950/80", "text-indigo-300", "border", "border-indigo-800/50");
      pill.classList.add("rpg-slot-long", "text-amber-200");
    }
  });

  // Wire Misc Notes on fallback chapters
  const miscBtn = container.querySelector("#save-misc-notes-btn");
  if (miscBtn) {
    const miscInput = container.querySelector("#chapter-misc-notes-input");
    const miscStatus = container.querySelector("#misc-notes-status");
    const miscType = `${currentChapter.id}-misc`;
    const existingMisc = state.entities.find((e) => e.type === miscType);

    miscInput?.addEventListener("input", () => {
      miscStatus.textContent = "Unsaved";
      miscStatus.className = "text-[11px] text-amber-400";
    });

    miscBtn.addEventListener("click", async () => {
      miscStatus.textContent = "Saving...";
      miscStatus.className = "text-[11px] text-amber-400";
      try {
        if (existingMisc) {
          await updateEntity(existingMisc.id, {
            title: `${currentChapter.label} Misc Notes`,
            content: miscInput.value
          });
        } else {
  // Mobile Chapter Tome Drawer Toggle
  container.querySelector("#mobile-tome-toggle-btn")?.addEventListener("click", () => {
    isMobileNavOpen = !isMobileNavOpen;
    renderCampaignWorkspace(container, state);
    if (window.lucide) window.lucide.createIcons();
  });

  // Switch between the 12 Chapters
  container.querySelectorAll(".chapter-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextChapId = btn.getAttribute("data-chapter-id");
      const nextChapObj = CAMPAIGN_CHAPTERS.find((c) => c.id === nextChapId);
      activeChapterId = nextChapId;
      if (window.innerWidth < 1024 && (!nextChapObj?.sections || nextChapObj.sections.length === 0)) {
        isMobileNavOpen = false;
      } else if (window.innerWidth < 1024) {
        isMobileNavOpen = true;
      }
      const firstMatch = state.entities.find(
        (e) => e.type === activeChapterId || e.type === btn.textContent.trim()
      );
      setState({ activeEntity: firstMatch || null });
      if (!isMobileNavOpen && window.innerWidth < 1024) {
        document.getElementById("chapter-main-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Switch nested vertical sections inside an active chapter
  container.querySelectorAll(".chapter-section-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const chapId = btn.getAttribute("data-chapter-id");
      const secId = btn.getAttribute("data-section-id");
      activeChapterId = chapId;
      activeSectionMap[chapId] = secId;
      if (window.innerWidth < 1024) {
        isMobileNavOpen = false;
      }
      renderCampaignWorkspace(container, state);
      if (window.lucide) window.lucide.createIcons();
      if (window.innerWidth < 1024) {
        document.getElementById("chapter-main-pane")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // New Entry Modal
  const modal = container.querySelector("#new-entity-modal");
  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  container.querySelector("#chapter-new-entry-btn")?.addEventListener("click", openModal);
  container.querySelector("#close-entity-modal")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-entity-modal")?.addEventListener("click", closeModal);

  container.querySelector("#create-entity-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = container.querySelector("#new-ent-title").value;
    closeModal();
    await createEntity({ type: currentChapter.id, title, content: "" });
  });

  // Select Entry
  container.querySelectorAll(".entity-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-entity-id");
      const found = state.entities.find((ent) => ent.id === id);
      if (found) setState({ activeEntity: found });
    });
  });

  // Save & Delete Active Entry
  if (activeEntry) {
    const saveBtn = container.querySelector("#save-entity-btn");
    const saveIndicator = container.querySelector("#save-indicator");
    const titleInput = container.querySelector("#edit-entity-title");
    const contentArea = container.querySelector("#edit-entity-content");

    saveBtn.addEventListener("click", async () => {
      saveIndicator.textContent = "Saving...";
      saveIndicator.className = "text-xs text-amber-400";
      await updateEntity(activeEntry.id, {
        title: titleInput.value.trim() || "Untitled Entry",
        content: contentArea.value
      });
      saveIndicator.textContent = "Saved";
      saveIndicator.className = "text-xs text-emerald-400";
    });

    [titleInput, contentArea].forEach((el) => {
      el.addEventListener("input", () => {
        saveIndicator.textContent = "Unsaved changes";
        saveIndicator.className = "text-xs text-amber-400";
      });
    });

    const delBtn = container.querySelector("#delete-entity-btn");
    delBtn.addEventListener("click", async () => {
      if (delBtn.dataset.armed !== "true") {
        delBtn.dataset.armed = "true";
        delBtn.innerHTML = `<span class="text-xs font-semibold text-rose-400">Confirm?</span>`;
        setTimeout(() => {
          if (delBtn) {
            delBtn.dataset.armed = "false";
            delBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }, 3000);
        return;
      }
      await deleteEntity(activeEntry.id);
    });
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
