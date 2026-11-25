// chapter-items.js
// Dedicated interactive workbook for Chapter 8: Item List.
// Includes Items, Armor List, Weapon List, Spell / Domain Card List, and ruleset-aware
// metadata for both D&D 5e and Daggerheart (Tiers 1–4, Range Bands, Thresholds, Domain Cards).

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDnd5e,
  isDaggerheart,
  DND5E_RARITIES,
  DND5E_SPELL_SCHOOLS,
  DND5E_SPELL_LEVELS,
  DAGGERHEART_TIERS,
  DAGGERHEART_RANGE_BANDS,
  DAGGERHEART_DOMAINS,
  DAGGERHEART_TRAITS
} from "./system-rulesets.js";

export const ITEMS_TABS = [
  { id: "general-items", label: "Items", icon: "package" },
  { id: "armor-list", label: "Armor List", icon: "shield" },
  { id: "weapon-list", label: "Weapon List", icon: "sword" },
  { id: "spell-list", label: "Spell List", icon: "wand-2" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeItemsTab = "general-items";

function getDefaultItemsData() {
  return {
    items: [],
    armor: [],
    weapons: [],
    spells: [],
    miscNotes: ""
  };
}

export function renderItemsChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeItemsTab = options.activeSectionId;
  }

  const dndMode = isDnd5e(state);
  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "item-list");
  const data = {
    ...getDefaultItemsData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.items)) data.items = [];
  if (!Array.isArray(data.armor)) data.armor = [];
  if (!Array.isArray(data.weapons)) data.weapons = [];
  if (!Array.isArray(data.spells)) data.spells = [];

  const currentSection =
    ITEMS_TABS.find((t) => t.id === activeItemsTab) || ITEMS_TABS[0];

  const sectionDisplayLabel =
    dhMode && currentSection.id === "spell-list"
      ? "Domain Cards & Grimoires"
      : currentSection.label;

  paneContainer.innerHTML = `
    <!-- Chapter & Active Section Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0 mt-0.5">
          <i data-lucide="${currentSection.icon}" class="w-5 h-5 text-indigo-400"></i>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-xl font-bold text-white">${escapeHtml(sectionDisplayLabel)}</h1>
            <span class="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/50">
              Chapter 8: Item List${dhMode ? " • Daggerheart" : dndMode ? " • D&D 5e" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Catalog Daggerheart gear, Tier 1–4 armor with Base Thresholds, Trait & Range Band weapons, and Domain Cards."
                : `Catalog custom items, armor, weapons, and spells with ${dndMode ? "5e rarity, attunement, spell schools/components, and" : "stats, descriptions, and"} artwork previews.`
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="items-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-items-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Items
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderItemsTabContent(activeItemsTab, data, dndMode, dhMode)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="item-list"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectItemsForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#items-save-status");
  paneContainer.querySelectorAll("input, textarea, select").forEach((el) => {
    const ev = el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeItemsTab !== "misc-notes") {
    wireItemListControls(paneContainer, state, existingDoc, data, activeItemsTab);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-items-btn").addEventListener("click", async () => {
    collectItemsForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.items.length > 0 && `${data.items.length} item(s)`,
      data.armor.length > 0 && `${data.armor.length} armor`,
      data.weapons.length > 0 && `${data.weapons.length} weapon(s)`,
      data.spells.length > 0 && `${data.spells.length} spell(s)`
    ]
      .filter(Boolean)
      .join(" | ") || "Item Compendium";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Item List",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "item-list",
          title: "Item List",
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

function renderItemsTabContent(tabId, data, dndMode, dhMode) {
  switch (tabId) {
    case "general-items":
      return renderGeneralItemsSection(data.items, dndMode);
    case "armor-list":
      return renderArmorSection(data.armor, dndMode, dhMode);
    case "weapon-list":
      return renderWeaponsSection(data.weapons, dndMode, dhMode);
    case "spell-list":
      return renderSpellsSection(data.spells, dndMode, dhMode);
    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Item List — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Jot down crafting recipes, attunement rules, currency conversion notes, or treasure parcel ideas.</p>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Gear, Loot &amp; Magic Notes</label>
            <textarea data-items-misc="miscNotes" rows="12"
              placeholder="Write extra relic lore, potion tables, or homebrew item rules here..."
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
          </div>
        </div>
      `;
    default:
      return "";
  }
}

function renderRarityAttuneRow(listKey, idx, entry) {
  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      <div>
        <label class="block text-[11px] font-semibold text-slate-400 mb-1">D&amp;D 5e Rarity</label>
        <select data-list-key="${listKey}" data-row-idx="${idx}" data-row-field="rarity"
          class="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500">
          ${DND5E_RARITIES.map(
            (r) => `<option value="${r}" ${(entry.rarity || "Common") === r ? "selected" : ""}>${r}</option>`
          ).join("")}
        </select>
      </div>
      <div class="flex items-end pb-1.5">
        <label class="inline-flex items-center gap-2 text-xs text-slate-200 cursor-pointer select-none">
          <input type="checkbox" data-list-key="${listKey}" data-row-idx="${idx}" data-row-check="requiresAttunement"
            ${entry.requiresAttunement ? "checked" : ""}
            class="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500" />
          <span>Requires Attunement</span>
        </label>
      </div>
    </div>
  `;
}

function renderGeneralItemsSection(items, dndMode) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Items &amp; Relics</h3>
        <p class="text-xs text-slate-400">Record wondrous items, consumables, quest relics, and adventuring gear with optional artwork.</p>
      </div>
      <button type="button" id="add-entry-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Item
      </button>
    </div>

    ${
      items.length === 0
        ? renderEmptyState("package", "No Items Added Yet", 'Click "Add Item" to start logging gear, potions, and relics.')
        : `
          <div class="space-y-4">
            ${items
              .map(
                (item, idx) => `
              <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Item #${idx + 1}</span>
                  <button type="button" data-del-row="${idx}" class="del-entry-row-btn text-xs text-slate-400 hover:text-rose-400 transition">Remove</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-4 space-y-3">
                    <div>
                      <label class="block text-xs font-semibold text-slate-300 mb-1">Name</label>
                      <input type="text" data-list-key="items" data-row-idx="${idx}" data-row-field="name" value="${escapeHtml(item.name || "")}"
                        placeholder="e.g., Lantern of Revealing"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    ${dndMode ? renderRarityAttuneRow("items", idx, item) : ""}
                    ${renderInlineImageControl("items", idx, item.imageUrl)}
                  </div>

                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-list-key="items" data-row-idx="${idx}" data-row-field="description" rows="6"
                      placeholder="Properties, charges, activation trigger, lore, and value..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(item.description || "")}</textarea>
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

function renderArmorSection(armorList, dndMode, dhMode) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Armor List</h3>
        <p class="text-xs text-slate-400">${dhMode ? "Track Daggerheart armor Base Thresholds (Major / Severe), Base Armor Score, Tier, and Features." : "Track armor pieces, shields, AC bonuses, cost, and artwork."}</p>
      </div>
      <button type="button" id="add-entry-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Armor
      </button>
    </div>

    ${
      armorList.length === 0
        ? renderEmptyState("shield", "No Armor Added Yet", 'Click "Add Armor" to log light, medium, heavy, or magical armor.')
        : `
          <div class="space-y-4">
            ${armorList
              .map(
                (arm, idx) => `
              <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Armor #${idx + 1}</span>
                  <button type="button" data-del-row="${idx}" class="del-entry-row-btn text-xs text-slate-400 hover:text-rose-400 transition">Remove</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div class="sm:col-span-6">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Armor Name & Tier" : "Name / Type"}</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(arm.nameLevel || "")}"
                      placeholder="${dhMode ? "e.g., Runed Chainmail (Tier 2)" : "e.g., Mithral Breastplate (Medium)"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Base Armor Score" : "AC / Defense"}</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="ac" value="${escapeHtml(arm.ac || "")}"
                      placeholder="${dhMode ? "e.g., 4" : "e.g., 14 + Dex (max 2)"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-emerald-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Base Thresholds (Major/Severe)" : "Cost"}</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="cost" value="${escapeHtml(arm.cost || "")}"
                      placeholder="${dhMode ? "e.g., 7 / 15" : "e.g., 400 gp"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-amber-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                ${dndMode ? renderRarityAttuneRow("armor", idx, arm) : ""}
function renderWeaponsSection(weaponList, dndMode, dhMode) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Weapon List</h3>
        <p class="text-xs text-slate-400">${dhMode ? "Catalog Primary & Secondary weapons with Trait, Range Band (Melee–Very Far), Damage Dice & Type (phy/mag), and Features." : "Catalog melee, ranged, and enchanted weapons with damage, properties, and artwork."}</p>
      </div>
      <button type="button" id="add-entry-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Weapon
      </button>
    </div>

    ${
      weaponList.length === 0
        ? renderEmptyState("sword", "No Weapons Added Yet", 'Click "Add Weapon" to build your campaign armory.')
        : `
          <div class="space-y-4">
            ${weaponList
              .map(
                (wpn, idx) => `
              <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Weapon #${idx + 1}</span>
                  <button type="button" data-del-row="${idx}" class="del-entry-row-btn text-xs text-slate-400 hover:text-rose-400 transition">Remove</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div class="sm:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Weapon Name & Tier" : "Name / Category"}</label>
                    <input type="text" data-list-key="weapons" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(wpn.nameLevel || "")}"
                      placeholder="${dhMode ? "e.g., Gilded Longbow (Tier 2 Primary)" : "e.g., Sunforged Longsword +1 (Martial Melee)"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-4">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Damage Dice & Type" : "Damage"}</label>
                    <input type="text" data-list-key="weapons" data-row-idx="${idx}" data-row-field="damage" value="${escapeHtml(wpn.damage || "")}"
                      placeholder="${dhMode ? "e.g., d8+3 phy / d10 mag" : "e.g., 1d8 + 1 slashing + 1d4 fire"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-rose-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                ${
                  dhMode
                    ? `
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl p-2.5">
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Trait</label>
                          <select data-list-key="weapons" data-row-idx="${idx}" data-row-field="dhTrait"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DAGGERHEART_TRAITS.map(
                              (t) => `<option value="${t.label}" ${(wpn.dhTrait || "Agility") === t.label ? "selected" : ""}>${t.label}</option>`
                            ).join("")}
                          </select>
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Range Band</label>
                          <select data-list-key="weapons" data-row-idx="${idx}" data-row-field="dhRange"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DAGGERHEART_RANGE_BANDS.map(
                              (rb) => `<option value="${rb}" ${(wpn.dhRange || "Melee") === rb ? "selected" : ""}>${rb}</option>`
                            ).join("")}
                          </select>
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Tier</label>
                          <select data-list-key="weapons" data-row-idx="${idx}" data-row-field="dhTier"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DAGGERHEART_TIERS.map(
                              (tr) => `<option value="${tr}" ${(wpn.dhTier || "Tier 1 (Lvl 1)") === tr ? "selected" : ""}>${tr}</option>`
                            ).join("")}
                          </select>
                        </div>
                      </div>
                    `
                    : ""
                }

                ${dndMode ? renderRarityAttuneRow("weapons", idx, wpn) : ""}
function renderSpellsSection(spellList, dndMode, dhMode) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">${dhMode ? "Domain Cards & Grimoires" : "Spell List"}</h3>
        <p class="text-xs text-slate-400">${dhMode ? "Catalog custom Domain Cards (Abilities, Spells & Grimoires) across Arcana, Blade, Bone, Codex, Grace, Midnight, Sage, Splendor & Valor." : "Record custom spells, rituals, domain powers, spell levels, damage/effects, and artwork."}</p>
      </div>
      <button type="button" id="add-entry-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> ${dhMode ? "Add Domain Card" : "Add Spell"}
      </button>
    </div>

    ${
      spellList.length === 0
        ? renderEmptyState("wand-2", dhMode ? "No Domain Cards Added Yet" : "No Spells Added Yet", dhMode ? 'Click "Add Domain Card" to document custom abilities, spells, and grimoires.' : 'Click "Add Spell" to document custom magic, rituals, and cantrips.')
        : `
          <div class="space-y-4">
            ${spellList
              .map(
                (spl, idx) => `
              <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">${dhMode ? `Domain Card #${idx + 1}` : `Spell #${idx + 1}`}</span>
                  <button type="button" data-del-row="${idx}" class="del-entry-row-btn text-xs text-slate-400 hover:text-rose-400 transition">Remove</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div class="sm:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Card Name" : "Spell Name"}</label>
                    <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(spl.nameLevel || "")}"
                      placeholder="${dhMode ? "e.g., Rune Ward / Whirlwind" : "e.g., Astral Lance"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-4">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">${dhMode ? "Recall Cost (Stress)" : "Damage / Effect"}</label>
                    <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="damage" value="${escapeHtml(spl.damage || "")}"
                      placeholder="${dhMode ? "e.g., 1 Stress" : "e.g., 4d6 force (Dex save half)"}"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-purple-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                ${
                  dhMode
                    ? `
                      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl p-2.5">
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Domain</label>
                          <select data-list-key="spells" data-row-idx="${idx}" data-row-field="dhDomain"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DAGGERHEART_DOMAINS.map(
                              (dom) => `<option value="${dom}" ${(spl.dhDomain || "Arcana") === dom ? "selected" : ""}>${dom}</option>`
                            ).join("")}
                          </select>
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Card Level (1–10)</label>
                          <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="spellLevel" value="${escapeHtml(spl.spellLevel || "Level 1")}"
                            placeholder="Level 1"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Card Type</label>
                          <select data-list-key="spells" data-row-idx="${idx}" data-row-field="dhCardType"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${["Ability", "Spell", "Grimoire"]
                              .map((ct) => `<option value="${ct}" ${(spl.dhCardType || "Spell") === ct ? "selected" : ""}>${ct}</option>`)
                              .join("")}
                          </select>
                        </div>
                      </div>
                    `
                    : ""
                }

                ${
                  dndMode
                    ? `
                      <!-- D&D 5e Full Spell Metadata -->
                      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Level</label>
                          <select data-list-key="spells" data-row-idx="${idx}" data-row-field="spellLevel"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DND5E_SPELL_LEVELS.map(
                              (lvl) => `<option value="${lvl}" ${(spl.spellLevel || "1st Level") === lvl ? "selected" : ""}>${lvl}</option>`
                            ).join("")}
                          </select>
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">School</label>
                          <select data-list-key="spells" data-row-idx="${idx}" data-row-field="school"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white">
                            ${DND5E_SPELL_SCHOOLS.map(
                              (sch) => `<option value="${sch}" ${(spl.school || "Evocation") === sch ? "selected" : ""}>${sch}</option>`
                            ).join("")}
                          </select>
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Casting Time</label>
                          <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="castingTime" value="${escapeHtml(spl.castingTime || "")}"
                            placeholder="1 Action"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Range</label>
                          <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="range" value="${escapeHtml(spl.range || "")}"
                            placeholder="60 feet"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Components</label>
                          <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="components" value="${escapeHtml(spl.components || "")}"
                            placeholder="V, S, M"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                        </div>
                        <div>
                          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Duration</label>
                          <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="duration" value="${escapeHtml(spl.duration || "")}"
                            placeholder="Conc, 1 min"
                            class="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-xs text-white" />
                        </div>
                      </div>
                    `
                    : ""
                }

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-4">
                    ${renderInlineImageControl("spells", idx, spl.imageUrl)}
                  </div>
                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description &amp; At Higher Levels</label>
                    <textarea data-list-key="spells" data-row-idx="${idx}" data-row-field="description" rows="4"
                      placeholder="Full spell rules, saving throw effects, and At Higher Levels scaling..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(spl.description || "")}</textarea>
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

function renderInlineImageControl(listKey, idx, imageUrl) {
  return `
    <div class="space-y-2">
      <label class="block text-xs font-semibold text-slate-300">Image URL (Optional)</label>
      <input type="url" data-list-key="${listKey}" data-row-idx="${idx}" data-row-field="imageUrl" value="${escapeHtml(imageUrl || "")}"
        placeholder="https://... (Item or spell icon/art)"
        class="item-img-url-input w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500" />
      <div id="item-img-preview-${listKey}-${idx}" class="border border-dashed border-slate-700 rounded-lg bg-slate-900/60 p-2 text-center min-h-[76px] flex items-center justify-center">
        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="Preview" class="max-h-32 mx-auto rounded border border-slate-700 object-contain" />`
            : `<span class="text-[11px] text-slate-500">Paste URL above to preview image</span>`
        }
      </div>
    </div>
  `;
}

function renderEmptyState(icon, heading, subtext) {
  return `
    <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
      <i data-lucide="${icon}" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
      <p class="text-sm font-medium text-slate-300">${escapeHtml(heading)}</p>
      <p class="text-xs text-slate-500 mt-1">${escapeHtml(subtext)}</p>
    </div>
  `;
}

function wireItemListControls(paneContainer, state, existingDoc, data, tabId) {
  const tabToKey = {
    "general-items": "items",
    "armor-list": "armor",
    "weapon-list": "weapons",
    "spell-list": "spells"
  };
  const listKey = tabToKey[tabId];
  if (!listKey) return;

  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "item-list", title: "Item List", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "item-list");
    renderItemsChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-entry-row-btn")?.addEventListener("click", () => {
    collectItemsForm(paneContainer, data);
    if (listKey === "items") {
      data.items.push({ name: "", description: "", rarity: "Common", requiresAttunement: false, imageUrl: "" });
    } else if (listKey === "armor") {
      data.armor.push({ nameLevel: "", description: "", ac: "", cost: "", rarity: "Common", requiresAttunement: false, imageUrl: "" });
    } else if (listKey === "weapons") {
      data.weapons.push({ nameLevel: "", description: "", damage: "", rarity: "Common", requiresAttunement: false, imageUrl: "" });
    } else if (listKey === "spells") {
      data.spells.push({
        nameLevel: "",
        spellLevel: "1st Level",
        school: "Evocation",
        castingTime: "1 Action",
        range: "60 feet",
        components: "V, S",
        duration: "Instantaneous",
        description: "",
        damage: "",
        imageUrl: ""
      });
    }
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".del-entry-row-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = Number(btn.getAttribute("data-del-row"));
      if (btn.dataset.armed !== "true") {
        btn.dataset.armed = "true";
        btn.textContent = "Confirm?";
        btn.classList.add("text-rose-400");
        return;
      }
      collectItemsForm(paneContainer, data);
      data[listKey].splice(idx, 1);
      rerenderWithLocalData();
    });
  });

  paneContainer.querySelectorAll(".item-img-url-input").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.getAttribute("data-list-key");
      const idx = input.getAttribute("data-row-idx");
      const previewBox = paneContainer.querySelector(`#item-img-preview-${key}-${idx}`);
      if (!previewBox) return;
      const val = input.value.trim();
      if (val) {
        previewBox.innerHTML = `<img src="${escapeHtml(val)}" alt="Preview" class="max-h-32 mx-auto rounded border border-slate-700 object-contain" onerror="this.outerHTML='<span class=\\'text-[11px] text-rose-400\\'>Could not load image URL</span>'" />`;
      } else {
        previewBox.innerHTML = `<span class="text-[11px] text-slate-500">Paste URL above to preview image</span>`;
      }
    });
  });
}

function collectItemsForm(container, data) {
  container.querySelectorAll("[data-items-misc]").forEach((el) => {
    data[el.getAttribute("data-items-misc")] = el.value;
  });

  container.querySelectorAll("[data-list-key][data-row-field]").forEach((el) => {
    const listKey = el.getAttribute("data-list-key");
    const idx = Number(el.getAttribute("data-row-idx"));
    const field = el.getAttribute("data-row-field");
    if (Array.isArray(data[listKey]) && data[listKey][idx]) {
      data[listKey][idx][field] = el.value;
    }
  });

  container.querySelectorAll("[data-list-key][data-row-check]").forEach((el) => {
    const listKey = el.getAttribute("data-list-key");
    const idx = Number(el.getAttribute("data-row-idx"));
    const field = el.getAttribute("data-row-check");
    if (Array.isArray(data[listKey]) && data[listKey][idx]) {
      data[listKey][idx][field] = el.checked;
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
