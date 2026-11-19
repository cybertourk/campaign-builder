// ui-campaign.js
// Level 3: System-agnostic Campaign Builder workspace with category filtering,
// entity creation (Sessions, NPCs, Locations, Factions, Lore), and cloud auto-save.

import {
  createEntity,
  updateEntity,
  deleteEntity
} from "./firebase-manager.js";
import { setState } from "./state.js";

const ENTITY_TYPES = [
  { id: "ALL", label: "All Entries", icon: "layers" },
  { id: "Session", label: "Sessions", icon: "calendar" },
  { id: "NPC", label: "NPCs", icon: "users" },
  { id: "Location", label: "Locations", icon: "map-pin" },
  { id: "Faction", label: "Factions", icon: "flag" },
  { id: "Lore", label: "Lore & Rules", icon: "book-open" }
];

let activeFilter = "ALL";
let searchQuery = "";

export function renderCampaignWorkspace(container, state) {
  const sys = state.activeSystem;
  const camp = state.activeCampaign;
  if (!sys || !camp) return;

  const filteredEntities = state.entities.filter((ent) => {
    const matchesType = activeFilter === "ALL" || ent.type === activeFilter;
    const matchesSearch =
      !searchQuery ||
      ent.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ent.content || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const active = state.activeEntity;

  container.innerHTML = `
    <!-- Breadcrumb Hierarchy: Game Systems > System > Campaign -->
    <nav class="flex items-center gap-2 text-sm text-slate-400 mb-5 flex-wrap">
      <button id="ws-nav-systems" class="hover:text-white flex items-center gap-1.5 transition">
        <i data-lucide="layers" class="w-4 h-4"></i> Game Systems
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <button id="ws-nav-campaigns" class="hover:text-white transition">
        ${escapeHtml(sys.name)}
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <span class="text-indigo-400 font-medium">${escapeHtml(camp.title)}</span>
    </nav>

    <!-- Workspace Split Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      <!-- Left Sidebar: Categories & Entries List -->
      <aside class="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div class="p-4 border-b border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="font-bold text-white text-base truncate">${escapeHtml(camp.title)}</h2>
            <button id="new-entity-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> New Entry
            </button>
          </div>

          <!-- Search Input -->
          <div class="relative">
            <i data-lucide="search" class="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5"></i>
            <input type="text" id="entity-search" value="${escapeHtml(searchQuery)}" placeholder="Filter notes, NPCs, places..."
              class="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <!-- Category Pills -->
          <div class="flex flex-wrap gap-1.5 pt-1">
            ${ENTITY_TYPES.map(
              (t) => `
              <button data-filter="${t.id}" class="filter-pill px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeFilter === t.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
              }">
                ${t.label}
              </button>
            `
            ).join("")}
          </div>
        </div>

        <!-- Entries List -->
        <div class="divide-y divide-slate-800/70 max-h-[62vh] overflow-y-auto">
          ${
            filteredEntities.length === 0
              ? `<div class="p-8 text-center text-xs text-slate-500">
                  No entries found. Click <strong>New Entry</strong> to add a Session, NPC, Location, or Lore note.
                </div>`
              : filteredEntities
                  .map(
                    (ent) => `
                <div data-entity-id="${ent.id}" class="entity-item p-3.5 cursor-pointer transition flex items-start justify-between gap-2 ${
                      active?.id === ent.id
                        ? "bg-indigo-950/40 border-l-2 border-indigo-500"
                        : "hover:bg-slate-850"
                    }">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                        ${escapeHtml(ent.type)}
                      </span>
                      <span class="font-medium text-sm text-white truncate">${escapeHtml(ent.title)}</span>
                    </div>
                    <p class="text-xs text-slate-400 truncate">
                      ${escapeHtml((ent.content || "").replace(/\n/g, " ") || "Empty note...")}
                    </p>
                  </div>
                </div>
              `
                  )
                  .join("")
          }
        </div>
      </aside>

      <!-- Right Main Pane: Active Entry Editor -->
      <section class="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 min-h-[65vh] flex flex-col">
        ${
          !active
            ? `
              <div class="flex-1 flex flex-col items-center justify-center text-center py-16">
                <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
                  <i data-lucide="feather" class="w-6 h-6 text-indigo-400"></i>
                </div>
                <h3 class="text-lg font-semibold text-white">Your Campaign Ledger is Ready</h3>
                <p class="text-slate-400 text-sm max-w-md mt-1 mb-5">
                  Create an entry on the left to start building your world—track session logs, key NPCs, factions, or locations.
                </p>
                <button id="empty-create-entity" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                  <i data-lucide="plus" class="w-4 h-4"></i> Create First Entry
                </button>
              </div>
            `
            : `
              <!-- Editor Header -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
                <div class="flex items-center gap-2.5 flex-1">
                  <select id="edit-entity-type" class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-300 focus:outline-none focus:border-indigo-500">
                    ${ENTITY_TYPES.filter((t) => t.id !== "ALL")
                      .map(
                        (t) =>
                          `<option value="${t.id}" ${active.type === t.id ? "selected" : ""}>${t.id}</option>`
                      )
                      .join("")}
                  </select>
                  <input type="text" id="edit-entity-title" value="${escapeHtml(active.title)}"
                    class="flex-1 bg-transparent text-lg font-bold text-white focus:outline-none border-b border-transparent focus:border-indigo-500 px-1" />
                </div>

                <div class="flex items-center gap-2">
                  <span id="save-indicator" class="text-xs text-slate-500">Saved</span>
                  <button id="save-entity-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition">
                    <i data-lucide="save" class="w-3.5 h-3.5"></i> Save
                  </button>
                  <button id="delete-entity-btn" title="Delete Entry" class="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                  </button>
                </div>
              </div>

              <!-- Placeholder Hook for Future Game-Specific Modules (D&D, Vampire, Daggerheart) -->
              <div id="system-module-slot" class="mb-4 px-3 py-2 rounded-lg bg-slate-950/80 border border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span class="flex items-center gap-2">
                  <i data-lucide="cpu" class="w-3.5 h-3.5 text-indigo-400"></i>
                  <span>System-Agnostic Sheet • Ready for future <strong>${escapeHtml(sys.name)}</strong> custom fields</span>
                </span>
              </div>

              <!-- Notes / Content Textarea -->
              <textarea id="edit-entity-content" placeholder="Write your session notes, NPC motivations, location secrets, or lore here..."
                class="flex-1 w-full bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500 resize-none font-mono">${escapeHtml(active.content || "")}</textarea>
            `
        }
      </section>
    </div>

    <!-- New Entry Modal -->
    <div id="new-entity-modal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white">New Campaign Entry</h2>
          <button id="close-entity-modal" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="create-entity-form" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Category</label>
            <select id="new-ent-type" class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="Session">Session Log</option>
              <option value="NPC">NPC / Character</option>
              <option value="Location">Location</option>
              <option value="Faction">Faction / Organization</option>
              <option value="Lore">Lore / Worldbuilding</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Title *</label>
            <input type="text" id="new-ent-title" required placeholder="e.g. Session 01: The Shattered Gate"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-entity-modal" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">Create Entry</button>
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

  // Search & Category Filters
  container.querySelector("#entity-search").addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderCampaignWorkspace(container, state);
    if (window.lucide) window.lucide.createIcons();
    const input = container.querySelector("#entity-search");
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  });

  container.querySelectorAll(".filter-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      activeFilter = pill.getAttribute("data-filter");
      renderCampaignWorkspace(container, state);
      if (window.lucide) window.lucide.createIcons();
    });
  });

  // New Entry Modal
  const modal = container.querySelector("#new-entity-modal");
  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  container.querySelector("#new-entity-btn")?.addEventListener("click", openModal);
  container.querySelector("#empty-create-entity")?.addEventListener("click", openModal);
  container.querySelector("#close-entity-modal")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-entity-modal")?.addEventListener("click", closeModal);

  container.querySelector("#create-entity-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = container.querySelector("#new-ent-type").value;
    const title = container.querySelector("#new-ent-title").value;
    closeModal();
    await createEntity({ type, title, content: "" });
  });

  // Select Entity from Sidebar
  container.querySelectorAll(".entity-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-entity-id");
      const found = state.entities.find((ent) => ent.id === id);
      if (found) setState({ activeEntity: found });
    });
  });

  // Save & Delete Active Entity
  if (active) {
    const saveBtn = container.querySelector("#save-entity-btn");
    const saveIndicator = container.querySelector("#save-indicator");
    const titleInput = container.querySelector("#edit-entity-title");
    const typeSelect = container.querySelector("#edit-entity-type");
    const contentArea = container.querySelector("#edit-entity-content");

    const triggerSave = async () => {
      saveIndicator.textContent = "Saving...";
      saveIndicator.className = "text-xs text-amber-400";
      await updateEntity(active.id, {
        title: titleInput.value.trim() || "Untitled Entry",
        type: typeSelect.value,
        content: contentArea.value
      });
      saveIndicator.textContent = "Saved";
      saveIndicator.className = "text-xs text-emerald-400";
    };

    saveBtn.addEventListener("click", triggerSave);

    // Mark unsaved on typing
    [titleInput, typeSelect, contentArea].forEach((el) => {
      el.addEventListener("input", () => {
        saveIndicator.textContent = "Unsaved changes";
        saveIndicator.className = "text-xs text-amber-400";
      });
    });

    // Delete with two-click safety
    const delBtn = container.querySelector("#delete-entity-btn");
    delBtn.addEventListener("click", async () => {
      if (delBtn.dataset.armed !== "true") {
        delBtn.dataset.armed = "true";
        delBtn.innerHTML = `<span class="text-xs font-semibold text-rose-400">Confirm Delete?</span>`;
        setTimeout(() => {
          if (delBtn) {
            delBtn.dataset.armed = "false";
            delBtn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }, 3000);
        return;
      }
      await deleteEntity(active.id);
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
