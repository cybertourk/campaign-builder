// chapter-items.js
// Dedicated interactive workbook for Chapter 8: Item List (Pages 201–207).
// Includes Items, Armor List, Weapon List, Spell List (all with Image URL & preview), and Misc Notes.

import { createEntity, updateEntity } from "./firebase-manager.js";

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
    // Page 201: Items (Name, Description, Image)
    items: [],

    // Page 203: Armor List (Name/Level, Description, AC, Cost, Image)
    armor: [],

    // Page 205: Weapon List (Name/Level, Description, Damage, Image)
    weapons: [],

    // Page 207: Spell List (Name/Level, Description, Damage, Image)
    spells: [],

    // Chapter 8 Misc Notes
    miscNotes: ""
  };
}

export function renderItemsChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeItemsTab = options.activeSectionId;
  }

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
              Chapter 8: Item List
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Catalog custom items, armor, weapons, and spells with stats, descriptions, and artwork previews.
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
      ${renderItemsTabContent(activeItemsTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
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
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  // Wire add/remove/image-preview controls for the active list tab
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

function renderItemsTabContent(tabId, data) {
  switch (tabId) {
    case "general-items":
      return renderGeneralItemsSection(data.items);
    case "armor-list":
      return renderArmorSection(data.armor);
    case "weapon-list":
      return renderWeaponsSection(data.weapons);
    case "spell-list":
      return renderSpellsSection(data.spells);
    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Item List — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Jot down crafting recipes, attunement rules, currency conversion notes, or treasure parcel ideas.</p>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Gear, Loot & Magic Notes</label>
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

/**
 * Page 201: ITEMS (Name, Description, Image)
 */
function renderGeneralItemsSection(items) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Items & Relics</h3>
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
                    ${renderInlineImageControl("items", idx, item.imageUrl)}
                  </div>

                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-list-key="items" data-row-idx="${idx}" data-row-field="description" rows="5"
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

/**
 * Page 203: ARMOR LIST (Name/Level, Description, AC, Cost, Image)
 */
function renderArmorSection(armorList) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Armor List</h3>
        <p class="text-xs text-slate-400">Track armor pieces, shields, tier/level requirements, AC bonuses, cost, and artwork.</p>
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
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Name / Level</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(arm.nameLevel || "")}"
                      placeholder="e.g., Mithral Breastplate (Tier 2)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">AC / Defense</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="ac" value="${escapeHtml(arm.ac || "")}"
                      placeholder="e.g., 14 + Dex (max 2)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-emerald-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-3">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Cost</label>
                    <input type="text" data-list-key="armor" data-row-idx="${idx}" data-row-field="cost" value="${escapeHtml(arm.cost || "")}"
                      placeholder="e.g., 400 gp"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-amber-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-4">
                    ${renderInlineImageControl("armor", idx, arm.imageUrl)}
                  </div>
                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-list-key="armor" data-row-idx="${idx}" data-row-field="description" rows="4"
                      placeholder="Stealth penalties, resistances, weight, special enchantments..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(arm.description || "")}</textarea>
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

/**
 * Page 205: WEAPON LIST (Name/Level, Description, Damage, Image)
 */
function renderWeaponsSection(weaponList) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Weapon List</h3>
        <p class="text-xs text-slate-400">Catalog melee, ranged, and enchanted weapons with level/tier, damage, properties, and artwork.</p>
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
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Name / Level</label>
                    <input type="text" data-list-key="weapons" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(wpn.nameLevel || "")}"
                      placeholder="e.g., Sunforged Longsword +1 (Level 5)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-4">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Damage</label>
                    <input type="text" data-list-key="weapons" data-row-idx="${idx}" data-row-field="damage" value="${escapeHtml(wpn.damage || "")}"
                      placeholder="e.g., 1d8 + 1 slashing + 1d4 fire"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-rose-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-4">
                    ${renderInlineImageControl("weapons", idx, wpn.imageUrl)}
                  </div>
                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-list-key="weapons" data-row-idx="${idx}" data-row-field="description" rows="4"
                      placeholder="Range, traits (Finesse, Heavy, Versatile), special abilities, cost..."
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(wpn.description || "")}</textarea>
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

/**
 * Page 207: SPELL LIST (Name/Level, Description, Damage, Image)
 */
function renderSpellsSection(spellList) {
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Spell List</h3>
        <p class="text-xs text-slate-400">Record custom spells, rituals, domain powers, spell levels, damage/effects, and artwork.</p>
      </div>
      <button type="button" id="add-entry-row-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Spell
      </button>
    </div>

    ${
      spellList.length === 0
        ? renderEmptyState("wand-2", "No Spells Added Yet", 'Click "Add Spell" to document custom magic, rituals, and cantrips.')
        : `
          <div class="space-y-4">
            ${spellList
              .map(
                (spl, idx) => `
              <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span class="text-xs font-bold uppercase tracking-wider text-indigo-400">Spell #${idx + 1}</span>
                  <button type="button" data-del-row="${idx}" class="del-entry-row-btn text-xs text-slate-400 hover:text-rose-400 transition">Remove</button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div class="sm:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Name / Level</label>
                    <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="nameLevel" value="${escapeHtml(spl.nameLevel || "")}"
                      placeholder="e.g., Astral Lance (3rd-Level Evocation)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-semibold text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div class="sm:col-span-4">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Damage / Effect</label>
                    <input type="text" data-list-key="spells" data-row-idx="${idx}" data-row-field="damage" value="${escapeHtml(spl.damage || "")}"
                      placeholder="e.g., 4d6 force (Dex save half)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-purple-300 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  <div class="md:col-span-4">
                    ${renderInlineImageControl("spells", idx, spl.imageUrl)}
                  </div>
                  <div class="md:col-span-8">
                    <label class="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                    <textarea data-list-key="spells" data-row-idx="${idx}" data-row-field="description" rows="4"
                      placeholder="Casting time, range, components, duration, and full spell rules..."
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

/**
 * Shared inline Image URL input + live thumbnail preview for Items, Armor, Weapons, and Spells.
 */
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
      data.items.push({ name: "", description: "", imageUrl: "" });
    } else if (listKey === "armor") {
      data.armor.push({ nameLevel: "", description: "", ac: "", cost: "", imageUrl: "" });
    } else if (listKey === "weapons") {
      data.weapons.push({ nameLevel: "", description: "", damage: "", imageUrl: "" });
    } else if (listKey === "spells") {
      data.spells.push({ nameLevel: "", description: "", damage: "", imageUrl: "" });
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

  // Live image URL preview updates
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

  container.querySelectorAll("[data-list-key]").forEach((el) => {
    const listKey = el.getAttribute("data-list-key");
    const idx = Number(el.getAttribute("data-row-idx"));
    const field = el.getAttribute("data-row-field");
    if (Array.isArray(data[listKey]) && data[listKey][idx]) {
      data[listKey][idx][field] = el.value;
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
