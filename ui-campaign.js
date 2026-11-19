// ui-campaign.js
// Level 3: Campaign Builder workspace organized into the 12 Campaign Planner chapters.
// Each chapter currently renders a structured placeholder wired to Firestore, ready to be
// upgraded with custom forms and interactive tools chapter by chapter.

import {
  createEntity,
  updateEntity,
  deleteEntity
} from "./firebase-manager.js";
import { setState } from "./state.js";

export const CAMPAIGN_CHAPTERS = [
  {
    id: "campaign-setting",
    label: "Campaign Setting",
    icon: "globe",
    mode: "single",
    description: "World overview, tone, geography, major regions, and foundational truths."
  },
  {
    id: "plot-adventures",
    label: "Plot and Adventures",
    icon: "compass",
    mode: "collection",
    description: "Main story arcs, adventure hooks, milestones, and branching plotlines."
  },
  {
    id: "random-encounters",
    label: "Random Encounters",
    icon: "dices",
    mode: "collection",
    description: "Environment-based encounter tables, twists, and quick-roll triggers."
  },
  {
    id: "enemies",
    label: "Enemies",
    icon: "skull",
    mode: "collection",
    description: "Monsters, villains, stat blocks, tactics, and threat profiles."
  },
  {
    id: "deities",
    label: "Deities",
    icon: "sun",
    mode: "collection",
    description: "Pantheons, domains, alignments, tenets, symbols, and divine boons."
  },
  {
    id: "faction",
    label: "Faction",
    icon: "flag",
    mode: "collection",
    description: "Guilds, kingdoms, cults, leadership, goals, and inter-faction standings."
  },
  {
    id: "npc",
    label: "NPC",
    icon: "users",
    mode: "collection",
    description: "Non-player characters, appearances, motivations, secrets, and relationships."
  },
  {
    id: "item-list",
    label: "Item List",
    icon: "sword",
    mode: "collection",
    description: "Magic items, relics, custom gear, economy items, and loot tables."
  },
  {
    id: "character-sheets",
    label: "Character Sheets",
    icon: "user-check",
    mode: "collection",
    description: "Party roster, player character stats, backstories, and personal quests."
  },
  {
    id: "session-log",
    label: "Session Log",
    icon: "scroll-text",
    mode: "collection",
    description: "Chronological session recaps, MVP moments, XP/milestones, and next-session prep."
  },
  {
    id: "initiative-tracker",
    label: "Initiative Tracker",
    icon: "swords",
    mode: "tool",
    description: "Live combat turn order, HP/condition tracking, and round counter."
  },
  {
    id: "overland-travel",
    label: "Overland Travel Tables",
    icon: "map",
    mode: "tool",
    description: "Travel pace, navigation checks, weather tables, and hex/region terrain hazards."
  }
];

let activeChapterId = "campaign-setting";

export function renderCampaignWorkspace(container, state) {
  const sys = state.activeSystem;
  const camp = state.activeCampaign;
  if (!sys || !camp) return;

  const currentChapter =
    CAMPAIGN_CHAPTERS.find((c) => c.id === activeChapterId) || CAMPAIGN_CHAPTERS[0];

  // Filter saved Firestore entities belonging to this chapter
  const chapterEntries = state.entities.filter(
    (ent) => ent.type === currentChapter.id || ent.type === currentChapter.label
  );

  // Ensure activeEntity belongs to the currently selected chapter if one exists
  const activeEntry =
    state.activeEntity &&
    (state.activeEntity.type === currentChapter.id ||
      state.activeEntity.type === currentChapter.label)
      ? state.activeEntity
      : chapterEntries[0] || null;

  container.innerHTML = `
    <!-- Breadcrumb Hierarchy: Game Systems > System > Campaign > Chapter -->
    <nav class="flex items-center gap-2 text-sm text-slate-400 mb-5 flex-wrap">
      <button id="ws-nav-systems" class="hover:text-white flex items-center gap-1.5 transition">
        <i data-lucide="layers" class="w-4 h-4"></i> Game Systems
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <button id="ws-nav-campaigns" class="hover:text-white transition">
        ${escapeHtml(sys.name)}
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <span class="text-slate-200 font-medium">${escapeHtml(camp.title)}</span>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <span class="text-indigo-400 font-medium">${escapeHtml(currentChapter.label)}</span>
    </nav>

    <!-- Workspace Split Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Sidebar: 12 Campaign Planner Chapters -->
      <aside class="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div class="p-4 border-b border-slate-800">
          <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Campaign Planner</p>
          <h2 class="font-bold text-white text-base truncate mt-0.5">${escapeHtml(camp.title)}</h2>
        </div>

        <nav class="p-2 space-y-1 max-h-[72vh] overflow-y-auto">
          ${CAMPAIGN_CHAPTERS.map((chap, idx) => {
            const isSelected = chap.id === currentChapter.id;
            const count = state.entities.filter(
              (e) => e.type === chap.id || e.type === chap.label
            ).length;

            return `
              <button data-chapter-id="${chap.id}" class="chapter-nav-btn w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs font-medium transition ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "text-slate-300 hover:bg-slate-850 hover:text-white"
              }">
                <span class="flex items-center gap-2.5 min-w-0">
                  <i data-lucide="${chap.icon}" class="w-4 h-4 shrink-0 ${
                    isSelected ? "text-white" : "text-indigo-400"
                  }"></i>
                  <span class="truncate">${idx + 1}. ${escapeHtml(chap.label)}</span>
                </span>
                ${
                  count > 0
                    ? `<span class="text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-800 text-slate-400"
                      }">${count}</span>`
                    : ""
                }
              </button>
            `;
          }).join("")}
        </nav>
      </aside>

      <!-- Right Main Pane: Active Chapter Placeholder & Scratchpad -->
      <section class="lg:col-span-9 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 min-h-[70vh] flex flex-col">
        
        <!-- Chapter Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-5 border-b border-slate-800">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <i data-lucide="${currentChapter.icon}" class="w-5 h-5 text-indigo-400"></i>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h1 class="text-xl font-bold text-white">${escapeHtml(currentChapter.label)}</h1>
                <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-950/70 text-amber-300 border border-amber-800/50">
                  Chapter Placeholder
                </span>
              </div>
              <p class="text-slate-400 text-xs sm:text-sm mt-1">${escapeHtml(currentChapter.description)}</p>
            </div>
          </div>

          <button id="chapter-new-entry-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
            <i data-lucide="plus" class="w-4 h-4"></i> Add ${escapeHtml(currentChapter.label)} Entry
          </button>
        </div>

        <!-- Chapter Placeholder Notice -->
        <div class="mb-5 p-3.5 rounded-xl bg-slate-950/80 border border-dashed border-slate-700 flex items-center justify-between gap-3 text-xs text-slate-300">
          <div class="flex items-center gap-2.5">
            <i data-lucide="layout-template" class="w-4 h-4 text-indigo-400 shrink-0"></i>
            <span>
              <strong>Placeholder Active:</strong> Custom fields and tables for <strong>${escapeHtml(currentChapter.label)}</strong> will be added here next. You can already save freeform notes below.
            </span>
          </div>
        </div>

        <!-- Chapter Entries & Quick Editor -->
        ${
          chapterEntries.length === 0
            ? `
              <div class="flex-1 flex flex-col items-center justify-center text-center py-12 border border-slate-800/60 rounded-xl bg-slate-950/40">
                <i data-lucide="${currentChapter.icon}" class="w-8 h-8 text-slate-600 mb-2"></i>
                <p class="text-sm font-medium text-slate-300">No entries in ${escapeHtml(currentChapter.label)} yet</p>
                <p class="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                  Click the button above to create a placeholder entry, or share the book's fields for this chapter to build its custom form.
                </p>
              </div>
            `
            : `
              <div class="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                <!-- Entry Selector List -->
                <div class="md:col-span-4 border border-slate-800 rounded-xl bg-slate-950/50 divide-y divide-slate-800/70 max-h-[50vh] overflow-y-auto">
                  ${chapterEntries
                    .map(
                      (ent) => `
                    <div data-entity-id="${ent.id}" class="entity-item p-3 cursor-pointer transition ${
                        activeEntry?.id === ent.id
                          ? "bg-indigo-950/50 border-l-2 border-indigo-500"
                          : "hover:bg-slate-850"
                      }">
                      <div class="font-medium text-xs text-white truncate">${escapeHtml(ent.title)}</div>
                      <div class="text-[11px] text-slate-500 truncate mt-0.5">
                        ${escapeHtml((ent.content || "").replace(/\n/g, " ") || "Empty entry...")}
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>

                <!-- Entry Editor -->
                <div class="md:col-span-8 flex flex-col border border-slate-800 rounded-xl bg-slate-950/50 p-4">
                  ${
                    activeEntry
                      ? `
                        <div class="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
                          <input type="text" id="edit-entity-title" value="${escapeHtml(activeEntry.title)}"
                            class="flex-1 bg-transparent text-base font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500" />
                          <div class="flex items-center gap-2">
                            <span id="save-indicator" class="text-xs text-slate-500">Saved</span>
                            <button id="save-entity-btn" class="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-md text-xs font-medium transition">
                              <i data-lucide="save" class="w-3.5 h-3.5"></i> Save
                            </button>
                            <button id="delete-entity-btn" title="Delete Entry" class="p-1 text-slate-400 hover:text-rose-400 rounded transition">
                              <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                          </div>
                        </div>
                        <textarea id="edit-entity-content" placeholder="Notes for ${escapeHtml(currentChapter.label)}..."
                          class="flex-1 min-h-[260px] w-full bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs sm:text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-mono">${escapeHtml(activeEntry.content || "")}</textarea>
                      `
                      : ""
                  }
                </div>
              </div>
            `
        }
      </section>
    </div>

    <!-- New Chapter Entry Modal -->
    <div id="new-entity-modal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white">New ${escapeHtml(currentChapter.label)} Entry</h2>
          <button id="close-entity-modal" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="create-entity-form" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Entry Title *</label>
            <input type="text" id="new-ent-title" required placeholder="Enter title..."
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-entity-modal" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">Create</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Breadcrumb Navigation
  container.querySelector("#ws-nav-systems").addEventListener("click", () => {
    setState({ activeSystem: null, activeCampaign: null, currentView: "systems" });
  });
  container.querySelector("#ws-nav-campaigns").addEventListener("click", () => {
    setState({ activeCampaign: null, currentView: "campaigns" });
  });

  // Switch between the 12 Chapters
  container.querySelectorAll(".chapter-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeChapterId = btn.getAttribute("data-chapter-id");
      const firstMatch = state.entities.find(
        (e) => e.type === activeChapterId || e.type === btn.textContent.trim()
      );
      setState({ activeEntity: firstMatch || null });
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
