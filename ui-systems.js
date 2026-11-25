// ui-systems.js
// Handles Level 1 (Game Systems directory) and Level 2 (Campaigns inside a Game System)
// with ruleset selection & retroactive ruleset switching (System-Agnostic, D&D 5e, etc.).

import {
  createGameSystem,
  updateGameSystem,
  selectGameSystem,
  deleteGameSystem,
  createCampaign,
  selectCampaign,
  deleteCampaign
} from "./firebase-manager.js";
import { setState } from "./state.js";
import { RULESET_DEFINITIONS, getRulesetLabel } from "./system-rulesets.js";
import { applyThemeToImages } from "./theme-manager.js";

/**
 * LEVEL 1: Renders all Game Systems belonging to the logged-in user.
 */
export function renderSystemsView(container, state) {
  container.innerHTML = `
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-slate-300 mb-6">
      <span class="rpg-slot-long px-3 py-1 rounded-full text-amber-200 font-medium flex items-center gap-2 text-xs">
        <img src="./GUI_Fantasy_RPG_Kit/chest-icon.png" alt="" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
        Game Systems
      </span>
    </nav>

    <!-- Page Header -->
    <div class="rpg-panel rounded-2xl p-4 sm:p-5 mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="rpg-slot-big w-14 h-14 p-1.5 shrink-0">
            <img src="./GUI_Fantasy_RPG_Kit/chest-icon.png" alt="Systems" class="w-8 h-8 object-contain" onerror="this.style.display='none'" />
          </div>
          <div class="min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold text-amber-100">Your Game Systems</h1>
            <p class="text-slate-300 text-xs sm:text-sm mt-1">Select a ruleset vault to view or create campaigns inside it.</p>
          </div>
        </div>
        <button id="open-new-system-modal" class="rpg-btn-primary inline-flex items-center gap-2 text-xs sm:text-sm font-semibold shrink-0">
          <i data-lucide="plus" class="w-4 h-4 text-amber-300"></i>
          New Game System
        </button>
      </div>
      <div class="rpg-divider mt-4"></div>
    </div>

    <!-- Systems Grid -->
    ${
      state.isLoading && state.systems.length === 0
        ? `<div class="text-center py-16 text-slate-400 text-sm">Loading your game systems...</div>`
        : state.systems.length === 0
        ? `
          <div class="rpg-panel-ornate rounded-2xl p-12 text-center">
            <div class="rpg-slot-big w-16 h-16 mx-auto mb-3 p-2">
              <img src="./GUI_Fantasy_RPG_Kit/chest-icon.png" alt="" class="w-10 h-10 object-contain" onerror="this.style.display='none'" />
            </div>
            <h3 class="font-rpg-display text-lg font-bold text-amber-100">No Game Systems Yet</h3>
            <p class="text-slate-300 text-sm max-w-md mx-auto mt-1 mb-5">
              Create your first Game System container (e.g., "D&D 5e", "Daggerheart", or "Homebrew") to start organizing your campaigns.
            </p>
            <button id="empty-new-system-btn" class="rpg-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold">
              <i data-lucide="plus" class="w-4 h-4 text-amber-300"></i> Create First Game System
            </button>
          </div>
        `
        : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${state.systems
              .map(
                (sys) => `
              <div data-system-id="${sys.id}" class="system-card rpg-card group rounded-xl p-5 flex flex-col justify-between cursor-pointer">
                <div>
                  <div class="${sys.templateType === "dnd5e" ? "rpg-bar-hp" : "rpg-bar-mana"} w-full mb-3.5 opacity-85"></div>
                  <div class="flex items-center justify-between gap-2 mb-3">
                    <span class="rpg-slot-long inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200 px-2.5 py-1 rounded">
                      <img src="./GUI_Fantasy_RPG_Kit/settings-btn.png" alt="" class="w-3.5 h-3.5 object-contain" onerror="this.style.display='none'" />
                      ${escapeHtml(getRulesetLabel(sys.templateType))}
                    </span>
                    <div class="flex items-center gap-1">
                      <button data-edit-system="${sys.id}" title="Edit System & Ruleset"
                        class="edit-system-btn opacity-85 sm:opacity-0 sm:group-hover:opacity-100 text-slate-300 hover:text-amber-300 p-1.5 rounded transition">
                        <i data-lucide="sliders-horizontal" class="w-4 h-4"></i>
                      </button>
                      <button data-delete-system="${sys.id}" title="Delete Game System"
                        class="delete-system-btn opacity-85 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1.5 rounded transition">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>
                  <h3 class="font-rpg-display font-bold text-lg text-amber-50 group-hover:text-amber-300 transition">${escapeHtml(sys.name)}</h3>
                  <p class="text-slate-300 text-xs sm:text-sm mt-2 line-clamp-2">
                    ${escapeHtml(sys.description || RULESET_DEFINITIONS[sys.templateType]?.description || "System-agnostic campaign collection.")}
                  </p>
                </div>
                <div class="mt-5">
                  <div class="rpg-divider mb-2.5"></div>
                  <div class="flex items-center justify-between text-xs text-amber-200/90 font-medium">
                    <span class="flex items-center gap-1.5">
                      <img src="./GUI_Fantasy_RPG_Kit/papyrus-icon.png" alt="" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
                      Open Campaigns
                    </span>
                    <i data-lucide="arrow-right" class="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
    }

    <!-- New / Edit Game System Modal -->
    <div id="system-form-modal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div class="rpg-panel-ornate rounded-2xl max-w-md w-full p-5 sm:p-6 max-h-[88vh] flex flex-col">
        <div class="shrink-0">
          <div class="flex items-center justify-between mb-2">
            <h2 id="system-modal-title" class="text-lg font-bold text-amber-100">Create Game System</h2>
            <button id="close-system-modal" class="rpg-icon-btn w-7 h-7" title="Close">
              <img src="./GUI_Fantasy_RPG_Kit/close-btn.png" alt="Close" class="w-7 h-7 object-contain" onerror="this.outerHTML='<span class=\\'text-slate-400 hover:text-white\\'>✕</span>'" />
            </button>
          </div>
          <div class="rpg-divider mb-4"></div>
        </div>

        <form id="system-editor-form" class="rpg-modal-body overflow-y-auto flex-1 min-h-0 space-y-4 pr-1">
          <input type="hidden" id="edit-sys-id" value="" />
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">System Name *</label>
            <input type="text" id="sys-name" required placeholder="e.g. Dungeons & Dragons 5e, Daggerheart, Homebrew"
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Ruleset Module</label>
            <select id="sys-template" class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none">
              <option value="dnd5e">D&amp;D 5e (5th Edition Ruleset)</option>
              <option value="generic">System-Agnostic (Universal Core)</option>
              <option value="daggerheart" disabled>Daggerheart (Module Coming Soon)</option>
              <option value="vtm5e" disabled>Vampire: The Masquerade 5e (Module Coming Soon)</option>
            </select>
            <p id="sys-template-hint" class="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
              ${escapeHtml(RULESET_DEFINITIONS.dnd5e.description)}
            </p>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Description</label>
            <textarea id="sys-desc" rows="2" placeholder="Optional notes about house rules, edition, or setting style..."
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-system-modal" class="rpg-btn-secondary px-4 py-2 text-xs font-medium rounded-lg">Cancel</button>
            <button type="submit" id="submit-system-modal-btn" class="rpg-btn-primary px-4 py-2 text-xs font-semibold rounded-lg">Create System</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const modal = container.querySelector("#system-form-modal");
  const modalTitle = container.querySelector("#system-modal-title");
  const submitBtn = container.querySelector("#submit-system-modal-btn");
  const editIdInput = container.querySelector("#edit-sys-id");
  const nameInput = container.querySelector("#sys-name");
  const templateSelect = container.querySelector("#sys-template");
  const templateHint = container.querySelector("#sys-template-hint");
  const descInput = container.querySelector("#sys-desc");

  const updateTemplateHint = () => {
    const def = RULESET_DEFINITIONS[templateSelect.value] || RULESET_DEFINITIONS.generic;
    templateHint.textContent = def.description;
  };
  templateSelect?.addEventListener("change", updateTemplateHint);

  const openCreateModal = () => {
    editIdInput.value = "";
    modalTitle.textContent = "Create Game System";
    submitBtn.textContent = "Create System";
    nameInput.value = "";
    templateSelect.value = "dnd5e";
    descInput.value = "";
    updateTemplateHint();
    modal.classList.remove("hidden");
    applyThemeToImages(modal);
  };

  const openEditModal = (sys) => {
    editIdInput.value = sys.id;
    modalTitle.textContent = `Edit System: ${sys.name}`;
    submitBtn.textContent = "Save Changes";
    nameInput.value = sys.name || "";
    templateSelect.value = sys.templateType || "generic";
    descInput.value = sys.description || "";
    updateTemplateHint();
    modal.classList.remove("hidden");
    applyThemeToImages(modal);
  };

  const closeModal = () => modal.classList.add("hidden");

  container.querySelector("#open-new-system-modal")?.addEventListener("click", openCreateModal);
  container.querySelector("#empty-new-system-btn")?.addEventListener("click", openCreateModal);
  container.querySelector("#close-system-modal")?.addEventListener("click", closeModal);
  container.querySelector("#cancel-system-modal")?.addEventListener("click", closeModal);

  container.querySelector("#system-editor-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = editIdInput.value;
    const name = nameInput.value;
    const description = descInput.value;
    const templateType = templateSelect.value;
    closeModal();

    if (editId) {
      await updateGameSystem(editId, { name, description, templateType });
    } else {
      await createGameSystem({ name, description, templateType });
    }
  });

  // Card click -> open System's Campaigns
  container.querySelectorAll(".system-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".delete-system-btn") || e.target.closest(".edit-system-btn")) return;
      const sysId = card.getAttribute("data-system-id");
      const system = state.systems.find((s) => s.id === sysId);
      if (system) selectGameSystem(system);
    });
  });

  // Edit System & Ruleset button
  container.querySelectorAll(".edit-system-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const sysId = btn.getAttribute("data-edit-system");
      const system = state.systems.find((s) => s.id === sysId);
      if (system) openEditModal(system);
    });
  });

  // Delete System button
  container.querySelectorAll(".delete-system-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const sysId = btn.getAttribute("data-delete-system");
      if (btn.dataset.armed !== "true") {
        btn.dataset.armed = "true";
        btn.innerHTML = `<span class="text-[11px] font-semibold text-rose-300 px-1.5 py-0.5 bg-rose-950 rounded border border-rose-700">Confirm?</span>`;
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
    <nav class="flex items-center gap-2.5 text-sm text-slate-300 mb-6 flex-wrap">
      <button id="back-to-systems" class="rpg-btn-secondary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
        <img src="./GUI_Fantasy_RPG_Kit/back-btn.png" alt="Back" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
        <span>Game Systems</span>
      </button>
      <i data-lucide="chevron-right" class="w-4 h-4 text-slate-500"></i>
      <span class="rpg-slot-long px-3 py-1 rounded-full text-amber-200 font-medium text-xs">
        ${escapeHtml(sys.name)}
      </span>
    </nav>

    <!-- Page Header -->
    <div class="rpg-panel rounded-2xl p-4 sm:p-5 mb-8">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="rpg-slot-big w-14 h-14 p-1.5 shrink-0">
            <img src="./GUI_Fantasy_RPG_Kit/papyrus-icon.png" alt="Campaigns" class="w-8 h-8 object-contain" onerror="this.style.display='none'" />
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2.5 flex-wrap">
              <h1 class="text-xl sm:text-2xl font-bold text-amber-100">${escapeHtml(sys.name)} Campaigns</h1>
              <span class="rpg-slot-long text-xs text-amber-200">
                ${escapeHtml(getRulesetLabel(sys.templateType))}
              </span>
              ${
                sys.templateType !== "dnd5e"
                  ? `<button type="button" id="quick-switch-dnd5e-btn" class="rpg-btn-secondary text-[11px] px-2.5 py-1 rounded-lg">
                      Switch to D&amp;D 5e Ruleset
                    </button>`
                  : ""
              }
            </div>
            <p class="text-slate-300 text-xs sm:text-sm mt-1">${escapeHtml(sys.description || RULESET_DEFINITIONS[sys.templateType]?.description || "Manage all campaigns, chronicles, and worlds built under this system.")}</p>
          </div>
        </div>
        <button id="open-new-campaign-modal" class="rpg-btn-primary inline-flex items-center gap-2 text-xs sm:text-sm font-semibold shrink-0">
          <i data-lucide="plus" class="w-4 h-4 text-amber-300"></i>
          New Campaign
        </button>
      </div>
      <div class="rpg-divider mt-4"></div>
    </div>

    <!-- Campaigns Grid -->
    ${
      state.isLoading && state.campaigns.length === 0
        ? `<div class="text-center py-16 text-slate-400 text-sm">Loading campaigns...</div>`
        : state.campaigns.length === 0
        ? `
          <div class="rpg-panel-ornate rounded-2xl p-12 text-center">
            <div class="rpg-slot-big w-16 h-16 mx-auto mb-3 p-2">
              <img src="./GUI_Fantasy_RPG_Kit/papyrus-icon.png" alt="" class="w-10 h-10 object-contain" onerror="this.style.display='none'" />
            </div>
            <h3 class="font-rpg-display text-lg font-bold text-amber-100">No Campaigns in ${escapeHtml(sys.name)}</h3>
            <p class="text-slate-300 text-sm max-w-md mx-auto mt-1 mb-5">
              Start a new campaign or chronicle to organize your world setting, plot, NPCs, encounters, and session logs.
            </p>
            <button id="empty-new-campaign-btn" class="rpg-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold">
              <i data-lucide="plus" class="w-4 h-4 text-amber-300"></i> Create First Campaign
            </button>
          </div>
        `
        : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            ${state.campaigns
              .map(
                (camp) => `
              <div data-campaign-id="${camp.id}" class="campaign-card rpg-card group rounded-xl p-5 flex flex-col justify-between cursor-pointer">
                <div>
                  <div class="${statusBarClass(camp.status)} w-full mb-3.5 opacity-90"></div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusBadgeClass(camp.status)}">
                      ${escapeHtml(camp.status || "Active")}
                    </span>
                    <button data-delete-campaign="${camp.id}" title="Delete Campaign" class="delete-campaign-btn opacity-80 sm:opacity-0 sm:group-hover:opacity-100 text-slate-400 hover:text-rose-400 p-1.5 rounded transition">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                  <h3 class="font-rpg-display font-bold text-lg text-amber-50 group-hover:text-amber-300 transition">${escapeHtml(camp.title)}</h3>
                  <p class="text-slate-300 text-xs sm:text-sm mt-2 line-clamp-3">
                    ${escapeHtml(camp.summary || "No campaign pitch or summary added yet.")}
                  </p>
                </div>
                <div class="mt-5">
                  <div class="rpg-divider mb-2.5"></div>
                  <div class="flex items-center justify-between text-xs text-amber-200/90 font-medium">
                    <span class="flex items-center gap-1.5">
                      <img src="./GUI_Fantasy_RPG_Kit/sword-icon.png" alt="" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
                      Enter Campaign Planner
                    </span>
                    <i data-lucide="arrow-right" class="w-4 h-4 text-amber-300 group-hover:translate-x-1 transition-transform"></i>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
    }

    <!-- New Campaign Modal -->
    <div id="new-campaign-modal" class="hidden fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div class="rpg-panel-ornate rounded-2xl max-w-md w-full p-5 sm:p-6 max-h-[88vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-bold text-amber-100">New Campaign in ${escapeHtml(sys.name)}</h2>
          <button id="close-campaign-modal" class="rpg-icon-btn w-7 h-7" title="Close">
            <img src="./GUI_Fantasy_RPG_Kit/close-btn.png" alt="Close" class="w-7 h-7 object-contain" onerror="this.outerHTML='<span class=\\'text-slate-400 hover:text-white\\'>✕</span>'" />
          </button>
        </div>
        <div class="rpg-divider mb-4"></div>
        <form id="create-campaign-form" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Campaign Title *</label>
            <input type="text" id="camp-title" required placeholder="e.g. Shadows of Oakhaven"
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Status</label>
            <select id="camp-status" class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none">
              <option value="Active">Active</option>
              <option value="Planning">Planning / Prep</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Premise / Summary</label>
            <textarea id="camp-summary" rows="3" placeholder="Core themes, starting location, or player hook..."
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none"></textarea>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-campaign-modal" class="rpg-btn-secondary px-4 py-2 text-xs font-medium rounded-lg">Cancel</button>
            <button type="submit" class="rpg-btn-primary px-4 py-2 text-xs font-semibold rounded-lg">Create Campaign</button>
          </div>
        </form>
      </div>
    </div>
  `;

  container.querySelector("#back-to-systems").addEventListener("click", () => {
    setState({ activeSystem: null, activeCampaign: null, currentView: "systems" });
  });

  container.querySelector("#quick-switch-dnd5e-btn")?.addEventListener("click", async () => {
    await updateGameSystem(sys.id, { templateType: "dnd5e" });
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
        btn.innerHTML = `<span class="text-[11px] font-semibold text-rose-300 px-1.5 py-0.5 bg-rose-950 rounded border border-rose-700">Confirm?</span>`;
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

function statusBarClass(status) {
  switch (status) {
    case "Active":
      return "rpg-bar-hp";
    case "Planning":
      return "rpg-bar-stamina";
    case "Completed":
      return "rpg-bar-mana";
    default:
      return "rpg-bar-stamina";
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case "Active":
      return "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60";
    case "Planning":
      return "bg-amber-950/80 text-amber-300 border border-amber-700/60";
    case "Completed":
      return "bg-purple-950/80 text-purple-300 border border-purple-700/60";
    default:
      return "bg-slate-850 text-slate-300 border border-slate-700";
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
