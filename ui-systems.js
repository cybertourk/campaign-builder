// ui-systems.js
// Handles Level 1 (Game Systems directory) and Level 2 (Campaigns inside a Game System).

import {
  createGameSystem,
  selectGameSystem,
  deleteGameSystem,
  createCampaign,
  selectCampaign,
  deleteCampaign
} from "./firebase-manager.js";
import { setState } from "./state.js";

/**
 * LEVEL 1: Renders all Game Systems belonging to the logged-in user.
 */
export function renderSystemsView(container, state) {
  container.innerHTML = `
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-slate-400 mb-6">
      <span class="text-indigo-400 font-medium flex items-center gap-1.5">
        <i data-lucide="layers" class="w-4 h-4"></i> Game Systems
      </span>
    </nav>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Your Game Systems</h1>
        <p class="text-slate-400 text-sm mt-1">Select a ruleset folder to view or create campaigns inside it.</p>
      </div>
      <button id="open-new-system-modal" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20">
        <i data-lucide="plus" class="w-4 h-4"></i>
        New Game System
      </button>
    </div>

    <!-- Systems Grid -->
    ${
      state.isLoading && state.systems.length === 0
        ? `<div class="text-center py-16 text-slate-400 text-sm">Loading your game systems...</div>`
        : state.systems.length === 0
        ? `
          <div class="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="library" class="w-6 h-6 text-indigo-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white">No Game Systems Yet</h3>
            <p class="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-5">
              Create your first Game System container (e.g., "D&D 5e", "Vampire: The Masquerade", "Daggerheart", or "Homebrew") to start organizing your campaigns.
            </p>
            <button id="empty-new-system-btn" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              <i data-lucide="plus" class="w-4 h-4"></i> Create First Game System
            </button>
          </div>
        `
        : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${state.systems
              .map(
                (sys) => `
              <div data-system-id="${sys.id}" class="system-card group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col justify-between cursor-pointer transition">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/70 border border-indigo-800/40 px-2.5 py-0.5 rounded">
                      ${escapeHtml(formatTemplateLabel(sys.templateType))}
                    </span>
                    <button data-delete-system="${sys.id}" title="Delete Game System" class="delete-system-btn opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                  <h3 class="font-bold text-lg text-white group-hover:text-indigo-300 transition">${escapeHtml(sys.name)}</h3>
                  <p class="text-slate-400 text-sm mt-2 line-clamp-2">
                    ${escapeHtml(sys.description || "System-agnostic campaign collection.")}
                  </p>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span class="flex items-center gap-1.5">
                    <i data-lucide="folder-open" class="w-3.5 h-3.5 text-indigo-400"></i> Open Campaigns
                  </span>
                  <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
    }

    <!-- New Game System Modal -->
    <div id="new-system-modal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white">Create Game System</h2>
          <button id="close-system-modal" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="create-system-form" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">System Name *</label>
            <input type="text" id="sys-name" required placeholder="e.g. Daggerheart, Vampire 5e, D&D 5e, Sci-Fi Homebrew"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Ruleset Module</label>
            <select id="sys-template" class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="generic">System-Agnostic (Universal Core)</option>
              <option value="dnd5e" disabled>D&D 5e (Module Coming Soon)</option>
              <option value="vtm5e" disabled>Vampire: The Masquerade (Module Coming Soon)</option>
              <option value="daggerheart" disabled>Daggerheart (Module Coming Soon)</option>
            </select>
            <p class="text-[11px] text-slate-500 mt-1">All systems currently use the universal campaign builder and will automatically unlock game-specific tools as modules are added.</p>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea id="sys-desc" rows="2" placeholder="Optional notes about house rules, edition, or setting style..."
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-system-modal" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">Create System</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector("#new-system-modal");
  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  container.querySelector("#open-new-system-modal")?.addEventListener("click", openModal);
  container.querySelector("#empty-new-system-btn")?.addEventListener("click", openModal);
  container.querySelector("#close-system-modal")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-system-modal")?.addEventListener("click", closeModal);

  container.querySelector("#create-system-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = container.querySelector("#sys-name").value;
    const description = container.querySelector("#sys-desc").value;
    const templateType = container.querySelector("#sys-template").value;
    closeModal();
    await createGameSystem({ name, description, templateType });
  });

  // Card click -> open System's Campaigns
  container.querySelectorAll(".system-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".delete-system-btn")) return;
      const sysId = card.getAttribute("data-system-id");
      const system = state.systems.find((s) => s.id === sysId);
      if (system) selectGameSystem(system);
    });
  });

  // Delete System button (inline two-step confirmation without window.confirm)
  container.querySelectorAll(".delete-system-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const sysId = btn.getAttribute("data-delete-system");
      if (btn.dataset.armed !== "true") {
        btn.dataset.armed = "true";
        btn.innerHTML = `<span class="text-[11px] font-semibold text-rose-400 px-1.5 py-0.5 bg-rose-950 rounded border border-rose-800">Confirm?</span>`;
        setTimeout(() => {
          if (btn) {
            btn.dataset.armed = "false";
            btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }, 3000);
        return;
      }
      await deleteGameSystem(sysId);
    });
  });
}

/**
 * LEVEL 2: Renders all Campaigns nested inside the currently active Game System.
 */
export function renderCampaignsView(container, state) {
  const sys = state.activeSystem;
  if (!sys) return;

  container.innerHTML = `
    <!-- Breadcrumb Hierarchy: Game Systems > Active System -->
    <nav class="flex items-center gap-2 text-sm text-slate-400 mb-6 flex-wrap">
      <button id="back-to-systems" class="hover:text-white flex items-center gap-1.5 transition">
        <i data-lucide="layers" class="w-4 h-4"></i> Game Systems
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-600"></i>
      <span class="text-indigo-400 font-medium">${escapeHtml(sys.name)}</span>
    </nav>

    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center gap-2.5">
          <h1 class="text-2xl font-bold text-white">${escapeHtml(sys.name)} Campaigns</h1>
          <span class="text-xs px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            ${escapeHtml(formatTemplateLabel(sys.templateType))}
          </span>
        </div>
        <p class="text-slate-400 text-sm mt-1">${escapeHtml(sys.description || "Manage all campaigns, chronicles, and worlds built under this system.")}</p>
      </div>
      <button id="open-new-campaign-modal" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition shadow-lg shadow-indigo-600/20">
        <i data-lucide="plus" class="w-4 h-4"></i>
        New Campaign
      </button>
    </div>

    <!-- Campaigns Grid -->
    ${
      state.isLoading && state.campaigns.length === 0
        ? `<div class="text-center py-16 text-slate-400 text-sm">Loading campaigns...</div>`
        : state.campaigns.length === 0
        ? `
          <div class="bg-slate-900/60 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
              <i data-lucide="map" class="w-6 h-6 text-indigo-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white">No Campaigns in ${escapeHtml(sys.name)}</h3>
            <p class="text-slate-400 text-sm max-w-md mx-auto mt-1 mb-5">
              Start a new campaign or chronicle to organize your session notes, NPCs, locations, and lore.
            </p>
            <button id="empty-new-campaign-btn" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
              <i data-lucide="plus" class="w-4 h-4"></i> Create First Campaign
            </button>
          </div>
        `
        : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${state.campaigns
              .map(
                (camp) => `
              <div data-campaign-id="${camp.id}" class="campaign-card group bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-5 flex flex-col justify-between cursor-pointer transition">
                <div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${statusBadgeClass(camp.status)}">
                      ${escapeHtml(camp.status || "Active")}
                    </span>
                    <button data-delete-campaign="${camp.id}" title="Delete Campaign" class="delete-campaign-btn opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                  <h3 class="font-bold text-lg text-white group-hover:text-indigo-300 transition">${escapeHtml(camp.title)}</h3>
                  <p class="text-slate-400 text-sm mt-2 line-clamp-3">
                    ${escapeHtml(camp.summary || "No campaign pitch or summary added yet.")}
                  </p>
                </div>
                <div class="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span class="flex items-center gap-1.5">
                    <i data-lucide="scroll-text" class="w-3.5 h-3.5 text-indigo-400"></i> Enter Workspace
                  </span>
                  <i data-lucide="arrow-right" class="w-4 h-4 group-hover:translate-x-1 transition-transform"></i>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
    }

    <!-- New Campaign Modal -->
    <div id="new-campaign-modal" class="hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-white">New Campaign in ${escapeHtml(sys.name)}</h2>
          <button id="close-campaign-modal" class="text-slate-400 hover:text-white"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <form id="create-campaign-form" class="space-y-4">
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Campaign Title *</label>
            <input type="text" id="camp-title" required placeholder="e.g. Shadows of Oakhaven"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Status</label>
            <select id="camp-status" class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500">
              <option value="Active">Active</option>
              <option value="Planning">Planning / Prep</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Premise / Summary</label>
            <textarea id="camp-summary" rows="3" placeholder="Core themes, starting location, or player hook..."
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-campaign-modal" class="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg">Create Campaign</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.querySelector("#back-to-systems").addEventListener("click", () => {
    setState({ activeSystem: null, activeCampaign: null, currentView: "systems" });
  });

  const modal = container.querySelector("#new-campaign-modal");
  const openModal = () => modal.classList.remove("hidden");
  const closeModal = () => modal.classList.add("hidden");

  container.querySelector("#open-new-campaign-modal")?.addEventListener("click", openModal);
  container.querySelector("#empty-new-campaign-btn")?.addEventListener("click", openModal);
  container.querySelector("#close-campaign-modal")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-campaign-modal")?.addEventListener("click", closeModal);

  container.querySelector("#create-campaign-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = container.querySelector("#camp-title").value;
    const status = container.querySelector("#camp-status").value;
    const summary = container.querySelector("#camp-summary").value;
    closeModal();
    await createCampaign({ title, status, summary });
  });

  container.querySelectorAll(".campaign-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".delete-campaign-btn")) return;
      const campId = card.getAttribute("data-campaign-id");
      const campaign = state.campaigns.find((c) => c.id === campId);
      if (campaign) selectCampaign(campaign);
    });
  });

  container.querySelectorAll(".delete-campaign-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const campId = btn.getAttribute("data-delete-campaign");
      if (btn.dataset.armed !== "true") {
        btn.dataset.armed = "true";
        btn.innerHTML = `<span class="text-[11px] font-semibold text-rose-400 px-1.5 py-0.5 bg-rose-950 rounded border border-rose-800">Confirm?</span>`;
        setTimeout(() => {
          if (btn) {
            btn.dataset.armed = "false";
            btn.innerHTML = `<i data-lucide="trash-2" class="w-4 h-4"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        }, 3000);
        return;
      }
      await deleteCampaign(campId);
    });
  });
}

function formatTemplateLabel(type) {
  const labels = {
    generic: "System-Agnostic",
    dnd5e: "D&D 5e",
    vtm5e: "Vampire 5e",
    daggerheart: "Daggerheart"
  };
  return labels[type] || "System-Agnostic";
}

function statusBadgeClass(status) {
  switch (status) {
    case "Active":
      return "bg-emerald-950/70 text-emerald-400 border border-emerald-800/50";
    case "Planning":
      return "bg-amber-950/70 text-amber-400 border border-amber-800/50";
    case "Completed":
      return "bg-indigo-950/70 text-indigo-400 border border-indigo-800/50";
    default:
      return "bg-slate-800 text-slate-300 border border-slate-700";
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
