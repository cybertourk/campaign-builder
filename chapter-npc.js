// chapter-npc.js
// Dedicated interactive workbook for Chapter 7: NPC (Pages 136–169+).
// Organized with clean pill sub-tabs (All Sections, Traits & Stats, Identity & Gear,
// Story & Backstory) and a spacious 2-column desktop layout for wide PC monitors.

import { createEntity, updateEntity } from "./firebase-manager.js";
import {
  isDaggerheart,
  DAGGERHEART_TRAITS,
  DAGGERHEART_COMMUNITIES,
  DAGGERHEART_ANCESTRIES
} from "./system-rulesets.js";

export const NPC_TABS = [
  { id: "npc-overview", label: "NPC Planning Prompts", icon: "users" },
  { id: "key-npcs", label: "Key NPCs & Backstory", icon: "star" },
  { id: "minor-npcs", label: "Town & Minor NPCs", icon: "user" },
  { id: "misc-notes", label: "Misc Notes", icon: "sticky-note" }
];

let activeNpcTab = "npc-overview";
let activeNpcSubView = "all"; // 'all' | 'stats' | 'identity' | 'story'
let selectedKeyNpcIndex = 0;
let selectedMinorNpcIndex = 0;

function getDefaultNpcData() {
  return {
    mainPlotNpcsNeeded: "",
    townNpcsNeeded: "",
    importantVsMinorNpcs: "",
    keyNpcs: [],
    minorNpcs: [],
    miscNotes: ""
  };
}

export function renderNpcChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeNpcTab = options.activeSectionId;
  }

  const dhMode = isDaggerheart(state);
  const existingDoc = state.entities.find((e) => e.type === "npc");
  const data = {
    ...getDefaultNpcData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.keyNpcs)) data.keyNpcs = [];
  if (!Array.isArray(data.minorNpcs)) data.minorNpcs = [];

  if (selectedKeyNpcIndex >= data.keyNpcs.length) {
    selectedKeyNpcIndex = Math.max(0, data.keyNpcs.length - 1);
  }
  if (selectedMinorNpcIndex >= data.minorNpcs.length) {
    selectedMinorNpcIndex = Math.max(0, data.minorNpcs.length - 1);
  }

  const currentSection =
    NPC_TABS.find((t) => t.id === activeNpcTab) || NPC_TABS[0];

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
              Chapter 7: NPC${dhMode ? " • Daggerheart" : ""}
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            ${
              dhMode
                ? "Cast your Daggerheart world with Key & Minor NPCs featuring Traits, Community & Ancestry heritage, Experiences, and Difficulty/Threshold quick-stats."
                : "Cast your world with major plot-driving NPCs (with backstories) and memorable town or minor characters."
            }
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="npc-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-npc-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save NPCs
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderNpcTabContent(activeNpcTab, data, dhMode)}
    </div>
  `;

  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="npc"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectNpcForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  const statusEl = paneContainer.querySelector("#npc-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    el.addEventListener("input", () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeNpcTab === "key-npcs") {
    wireNpcListControls(paneContainer, state, existingDoc, data, "key");
  } else if (activeNpcTab === "minor-npcs") {
    wireNpcListControls(paneContainer, state, existingDoc, data, "minor");
  }

  paneContainer.querySelector("#save-npc-btn").addEventListener("click", async () => {
    collectNpcForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary = [
      data.keyNpcs.length > 0 && `Key NPCs: ${data.keyNpcs.map((n) => n.name || "Unnamed").join(", ")}`,
      data.minorNpcs.length > 0 && `Minor NPCs: ${data.minorNpcs.map((n) => n.name || "Unnamed").join(", ")}`
    ]
      .filter(Boolean)
      .join(" | ");

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "NPCs",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "npc",
          title: "NPCs",
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

function renderNpcTabContent(tabId, data, dhMode = false) {
  switch (tabId) {
    case "npc-overview":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
            ${renderField(
              "mainPlotNpcsNeeded",
              "What Types of NPCs Are Needed When Thinking About Main Plot?",
              "List key patrons, rivals, informants, and power brokers required for your central storyline...",
              data.mainPlotNpcsNeeded,
              4
            )}

            ${renderField(
              "townNpcsNeeded",
              "What Types of NPCs Are Needed When Thinking About Towns?",
              "e.g., Blacksmiths, tavern keepers, harbor masters, local guards, herbalists, priests...",
              data.townNpcsNeeded,
              4
            )}
          </div>

          ${renderField(
            "importantVsMinorNpcs",
            "What NPCs Will Be Most Important, and Which Will Be Minor?",
            "Map out which characters anchor recurring scenes and which minor NPCs might unexpectedly rise to prominence...",
            data.importantVsMinorNpcs,
            5
          )}
        </div>
      `;

    case "key-npcs":
      return renderNpcSheetEditor(data.keyNpcs, selectedKeyNpcIndex, "key", true, dhMode);

    case "minor-npcs":
      return renderNpcSheetEditor(data.minorNpcs, selectedMinorNpcIndex, "minor", false, dhMode);

    case "misc-notes":
      return `
        <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-3">
          <h3 class="text-sm font-bold text-white flex items-center gap-2">
            <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> NPCs — Misc Notes
          </h3>
          <p class="text-xs text-slate-400">Keep a quick name bank, voice/mannerism ideas, or improvised NPCs met during sessions.</p>
          ${renderField(
            "miscNotes",
            "Miscellaneous NPC Notes & Name Bank",
            "Write extra NPC names, quirks, voices, or relationship webs here...",
            data.miscNotes,
            12
          )}
        </div>
      `;

    default:
      return "";
  }
}

function renderNpcSheetEditor(npcList, selectedIdx, kind, includeBackstory, dhMode = false) {
  const activeNpc = npcList[selectedIdx] || null;
  const labelSingular = kind === "key" ? "Key NPC" : "NPC";
  const labelPlural = kind === "key" ? "Key NPCs (Main Plot & Major Figures)" : "Town & Minor NPCs";
  const dhTraits = activeNpc?.dhTraits || {
    agility: "+0",
    strength: "+0",
    finesse: "+0",
    instinct: "+0",
    presence: "+0",
    knowledge: "+0"
  };

  const showStats = activeNpcSubView === "all" || activeNpcSubView === "stats";
  const showIdentity = activeNpcSubView === "all" || activeNpcSubView === "identity";
  const showStory = activeNpcSubView === "all" || activeNpcSubView === "story";
  const isTwoColDesktop = activeNpcSubView === "all";

  const statsBlockHtml = dhMode
    ? `
      <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-400">Daggerheart NPC Traits</span>
          <span class="text-[10px] text-slate-400">Reaction / Action Modifiers</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          ${DAGGERHEART_TRAITS.map(
            (tr) => `
            <div class="bg-slate-950/90 border border-slate-800 rounded-lg p-2 text-center">
              <label class="block text-xs font-bold uppercase tracking-wider text-amber-300">${tr.label}</label>
              <input type="text" data-npc-dh-trait="${tr.key}" value="${escapeHtml(dhTraits[tr.key] || "+0")}"
                placeholder="+0"
                class="w-full mt-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-sm font-bold text-center text-white" />
              <div class="text-[9px] text-slate-400 mt-1 leading-tight">${tr.verbs}</div>
            </div>
          `
          ).join("")}
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Difficulty</label>
          <input type="text" data-npc-field="dhDifficulty" value="${escapeHtml(activeNpc?.dhDifficulty || "")}"
            placeholder="12"
            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-sky-300" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Major Thresh.</label>
          <input type="text" data-npc-field="dhThresholdMajor" value="${escapeHtml(activeNpc?.dhThresholdMajor || "")}"
            placeholder="6"
            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-amber-300" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Severe Thresh.</label>
          <input type="text" data-npc-field="dhThresholdSevere" value="${escapeHtml(activeNpc?.dhThresholdSevere || "")}"
            placeholder="12"
            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-rose-300" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Hit Points</label>
          <input type="text" data-npc-field="dhHp" value="${escapeHtml(activeNpc?.dhHp || "")}"
            placeholder="5"
            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-emerald-300" />
        </div>
        <div>
          <label class="block text-[10px] font-bold uppercase text-slate-400 mb-1">Stress</label>
          <input type="text" data-npc-field="dhStress" value="${escapeHtml(activeNpc?.dhStress || "")}"
            placeholder="3"
            class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded text-sm font-bold text-center text-purple-300" />
        </div>
      </div>
    `
    : `
      <div class="grid grid-cols-3 sm:grid-cols-6 gap-2.5 bg-slate-900/70 border border-slate-800 rounded-xl p-3.5">
        ${[
          ["strength", "Strength"],
          ["dexterity", "Dexterity"],
          ["constitution", "Constitution"],
          ["intelligence", "Intelligence"],
          ["wisdom", "Wisdom"],
          ["charisma", "Charisma"]
        ]
          .map(
            ([key, label]) => `
          <div class="text-center">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">${label}</label>
            <input type="text" data-npc-field="${key}" value="${escapeHtml(activeNpc?.[key] || "")}"
              placeholder="10 (+0)"
              class="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs sm:text-sm font-semibold text-center text-white" />
          </div>
        `
          )
          .join("")}
      </div>
    `;

  const identityBlockHtml = dhMode
    ? `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Age</label>
          <input type="text" data-npc-field="age" value="${escapeHtml(activeNpc?.age || "")}"
            placeholder="e.g., 42"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Pronouns / Gender</label>
          <input type="text" data-npc-field="gender" value="${escapeHtml(activeNpc?.gender || "")}"
            placeholder="e.g., she/her, they/them"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Community (Heritage)</label>
          <input type="text" list="dh-npc-communities" data-npc-field="dhCommunity" value="${escapeHtml(activeNpc?.dhCommunity || "")}"
            placeholder="e.g., Highborne, Slyborne"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
          <datalist id="dh-npc-communities">
            ${DAGGERHEART_COMMUNITIES.map((c) => `<option value="${c}"></option>`).join("")}
          </datalist>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Ancestry (Heritage)</label>
          <input type="text" list="dh-npc-ancestries" data-npc-field="dhAncestry" value="${escapeHtml(activeNpc?.dhAncestry || activeNpc?.race || "")}"
            placeholder="e.g., Ribbet, Fungril, Elf"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
          <datalist id="dh-npc-ancestries">
            ${DAGGERHEART_ANCESTRIES.map((a) => `<option value="${a}"></option>`).join("")}
          </datalist>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Profession / Role</label>
          <input type="text" data-npc-field="profession" value="${escapeHtml(activeNpc?.profession || "")}"
            placeholder="e.g., Harbor Master"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Location</label>
          <input type="text" data-npc-field="location" value="${escapeHtml(activeNpc?.location || "")}"
            placeholder="e.g., Oakhaven — Crown Ward"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Equipment / Items</label>
          <textarea data-npc-field="equipmentItems" rows="3"
            placeholder="Notable weapons, signet rings, keys, spellbooks, valuables..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.equipmentItems || "")}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Appearance</label>
          <textarea data-npc-field="appearance" rows="3"
            placeholder="Build, clothing, scars, distinguishing features, posture..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.appearance || "")}</textarea>
        </div>
      </div>
    `
    : `
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Age</label>
          <input type="text" data-npc-field="age" value="${escapeHtml(activeNpc?.age || "")}"
            placeholder="e.g., 42"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Gender</label>
          <input type="text" data-npc-field="gender" value="${escapeHtml(activeNpc?.gender || "")}"
            placeholder="e.g., Female, Male"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Race / Ancestry</label>
          <input type="text" data-npc-field="race" value="${escapeHtml(activeNpc?.race || "")}"
            placeholder="e.g., Human, Elf, Tiefling"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Alignment</label>
          <input type="text" data-npc-field="alignment" value="${escapeHtml(activeNpc?.alignment || "")}"
            placeholder="e.g., Neutral Good"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Profession / Role</label>
          <input type="text" data-npc-field="profession" value="${escapeHtml(activeNpc?.profession || "")}"
            placeholder="e.g., Harbor Master"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Location</label>
          <input type="text" data-npc-field="location" value="${escapeHtml(activeNpc?.location || "")}"
            placeholder="e.g., Oakhaven — Crown Ward"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Equipment / Items</label>
          <textarea data-npc-field="equipmentItems" rows="3"
            placeholder="Notable weapons, signet rings, keys, spellbooks, valuables..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.equipmentItems || "")}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Appearance</label>
          <textarea data-npc-field="appearance" rows="3"
            placeholder="Build, clothing, scars, distinguishing features, posture..."
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.appearance || "")}</textarea>
        </div>
      </div>
    `;

  const storyBlockHtml = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${
        dhMode
          ? `
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">NPC Experiences &amp; Tactics</label>
              <textarea data-npc-field="dhExperiences" rows="3"
                placeholder="e.g., Royal Archivist +3, Hears Every Rumor +2; calls for city watch if cornered..."
                class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-amber-200">${escapeHtml(activeNpc?.dhExperiences || "")}</textarea>
            </div>
          `
          : `
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1">Languages</label>
              <textarea data-npc-field="languages" rows="3"
                placeholder="e.g., Common, Elvish, Thieves' Cant..."
                class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.languages || "")}</textarea>
            </div>
          `
      }
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Motivation</label>
        <textarea data-npc-field="motivation" rows="3"
          placeholder="What do they want most? What are they afraid of losing?"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.motivation || "")}</textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Plot Hook</label>
        <textarea data-npc-field="plotHook" rows="3"
          placeholder="Quests they offer, secrets they hold, favors they need..."
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.plotHook || "")}</textarea>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-300 mb-1">Personality</label>
        <textarea data-npc-field="personality" rows="3"
          placeholder="Mannerisms, speech cadence, ideals, bonds, flaws..."
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100">${escapeHtml(activeNpc?.personality || "")}</textarea>
      </div>
    </div>

    ${
      includeBackstory
        ? `
          <div class="pt-2">
            <label class="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-1.5">
              Key NPC Backstory
            </label>
            <textarea data-npc-field="backstory" rows="5"
              placeholder="Write this Key NPC's history, turning points, hidden loyalties, and connection to the main plot..."
              class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed">${escapeHtml(activeNpc?.backstory || "")}</textarea>
          </div>
        `
        : ""
    }
  `;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">${labelPlural}</h3>
        <p class="text-xs text-slate-400">
          ${
            includeBackstory
              ? "Full character sheet with stats, traits, equipment, plot hook, and dedicated backstory."
              : "Quick-reference NPC sheet with stats, profession, location, personality, and plot hooks."
          }
        </p>
      </div>
      <button type="button" id="add-npc-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add ${labelSingular}
      </button>
    </div>

    ${
      npcList.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="users" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No ${labelPlural} Added Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add ${labelSingular}" to create a character sheet.</p>
          </div>
        `
        : `
          <!-- NPC Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${npcList
              .map(
                (n, i) => `
              <button type="button" data-npc-idx="${i}" class="select-npc-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedIdx
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(n.name || `${labelSingular} #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${
            activeNpc
              ? `
                <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">
                  <!-- Top Header: NPC Name + Remove -->
                  <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div class="flex-1">
                      <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">${labelSingular} Name</label>
                      <input type="text" data-npc-field="name" value="${escapeHtml(activeNpc.name || "")}"
                        placeholder="e.g., Lord Cassian Vance, Marta the Innkeeper"
                        class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
                    </div>
                    <button type="button" id="delete-npc-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-1.5 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
                      Remove ${labelSingular}
                    </button>
                  </div>

                  <!-- Inner Sheet Pill Sub-Tabs -->
                  <div class="rpg-subtab-bar">
                    ${[
                      ["all", "layout-grid", "All Sections"],
                      ["stats", "shield", "Traits & Stats"],
                      ["identity", "user", "Identity & Gear"],
                      ["story", "book-open", includeBackstory ? "Story & Backstory" : "Story & Hooks"]
                    ]
                      .map(
                        ([subId, icon, label]) => `
                      <button type="button" data-npc-subtab="${subId}"
                        class="npc-subtab-btn rpg-subtab-btn ${activeNpcSubView === subId ? "is-active" : ""}">
                        <i data-lucide="${icon}" class="w-3.5 h-3.5"></i>
                        <span>${label}</span>
                      </button>
                    `
                      )
                      .join("")}
                  </div>

                  <!-- Collapsible Portrait URL & Preview -->
                  <div class="space-y-2.5">
                    <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      ${labelSingular} Portrait Image URL (Optional)
                    </label>
                    <input type="url" data-npc-field="imageUrl" value="${escapeHtml(activeNpc.imageUrl || "")}"
                      placeholder="https://... (Paste a character portrait or token image link)"
                      class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
                    <div id="npc-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
                      ${
                        activeNpc.imageUrl
                          ? `<img src="${escapeHtml(activeNpc.imageUrl)}" alt="${labelSingular} Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" />`
                          : `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the character portrait here.</p>`
                      }
                    </div>
                  </div>

                  ${
                    isTwoColDesktop
                      ? `
                        <!-- Widescreen 2-Column Desktop Layout -->
                        <div class="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                          <div class="xl:col-span-6 space-y-5">
                            ${statsBlockHtml}
                            ${identityBlockHtml}
                          </div>
                          <div class="xl:col-span-6 space-y-5">
                            ${storyBlockHtml}
                          </div>
                        </div>
                      `
                      : `
                        <div class="space-y-5">
                          ${showStats ? statsBlockHtml : ""}
                          ${showIdentity ? identityBlockHtml : ""}
                          ${showStory ? storyBlockHtml : ""}
                        </div>
                      `
                  }
                </div>
              `
              : ""
          }
        `
    }
  `;
}

function wireNpcListControls(paneContainer, state, existingDoc, data, kind) {
  const listKey = kind === "key" ? "keyNpcs" : "minorNpcs";

  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "npc", title: "NPCs", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "npc");
    renderNpcChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelectorAll(".npc-subtab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectNpcForm(paneContainer, data);
      activeNpcSubView = btn.getAttribute("data-npc-subtab") || "all";
      rerenderWithLocalData();
    });
  });

  paneContainer.querySelector("#add-npc-btn")?.addEventListener("click", () => {
    collectNpcForm(paneContainer, data);
    const newEntry = {
      name: `${kind === "key" ? "Key NPC" : "NPC"} ${data[listKey].length + 1}`,
      imageUrl: "",
      strength: "",
      dexterity: "",
      constitution: "",
      intelligence: "",
      wisdom: "",
      charisma: "",
      dhTraits: {
        agility: "+0",
        strength: "+0",
        finesse: "+0",
        instinct: "+0",
        presence: "+0",
        knowledge: "+0"
      },
      dhDifficulty: "",
      dhThresholdMajor: "",
      dhThresholdSevere: "",
      dhHp: "",
      dhStress: "",
      dhCommunity: "",
      dhAncestry: "",
      dhExperiences: "",
      age: "",
      gender: "",
      race: "",
      alignment: "",
      profession: "",
      location: "",
      equipmentItems: "",
      appearance: "",
      languages: "",
      motivation: "",
      plotHook: "",
      personality: ""
    };
    if (kind === "key") {
      newEntry.backstory = "";
    }
    data[listKey].push(newEntry);

    if (kind === "key") {
      selectedKeyNpcIndex = data.keyNpcs.length - 1;
    } else {
      selectedMinorNpcIndex = data.minorNpcs.length - 1;
    }
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-npc-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectNpcForm(paneContainer, data);
      const idx = Number(btn.getAttribute("data-npc-idx")) || 0;
      if (kind === "key") {
        selectedKeyNpcIndex = idx;
      } else {
        selectedMinorNpcIndex = idx;
      }
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-npc-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    if (kind === "key") {
      data.keyNpcs.splice(selectedKeyNpcIndex, 1);
      selectedKeyNpcIndex = Math.max(0, selectedKeyNpcIndex - 1);
    } else {
      data.minorNpcs.splice(selectedMinorNpcIndex, 1);
      selectedMinorNpcIndex = Math.max(0, selectedMinorNpcIndex - 1);
    }
    rerenderWithLocalData();
  });

  const imgInput = paneContainer.querySelector('[data-npc-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#npc-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (val) {
      imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="NPC Portrait" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview the character portrait here.</p>`;
    }
  });
}

function collectNpcForm(container, data) {
  container.querySelectorAll("[data-npc-overview-field]").forEach((el) => {
    data[el.getAttribute("data-npc-overview-field")] = el.value;
  });

  const targetNpc =
    activeNpcTab === "key-npcs"
      ? data.keyNpcs[selectedKeyNpcIndex]
      : activeNpcTab === "minor-npcs"
      ? data.minorNpcs[selectedMinorNpcIndex]
      : null;

  if (targetNpc) {
    container.querySelectorAll("[data-npc-field]").forEach((el) => {
      const nField = el.getAttribute("data-npc-field");
      targetNpc[nField] = el.value;
    });

    if (!targetNpc.dhTraits) targetNpc.dhTraits = {};
    container.querySelectorAll("[data-npc-dh-trait]").forEach((el) => {
      const trKey = el.getAttribute("data-npc-dh-trait");
      targetNpc.dhTraits[trKey] = el.value;
    });
  }
}

function renderField(fieldName, label, placeholder, value, rows = 3) {
  return `
    <div>
      <label class="block text-xs font-semibold text-slate-300 mb-1.5">${escapeHtml(label)}</label>
      <textarea data-npc-overview-field="${fieldName}" rows="${rows}" placeholder="${escapeHtml(placeholder)}"
        class="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(value)}</textarea>
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
