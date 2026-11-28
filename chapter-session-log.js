// chapter-session-log.js
// Dedicated interactive workbook for Chapter 10: Session Log (Page 225).
// Includes Date, Time, Length, checkable Session Events blocks, Notes, scene image previews, and Misc Notes.

import { createEntity, updateEntity } from "./firebase-manager.js";

export const SESSION_LOG_TABS = [
  { id: "session-entries", label: "Session Chronicles", icon: "scroll-text" },
  { id: "misc-notes", label: "Timeline & Notes", icon: "sticky-note" }
];

let activeSessionTab = "session-entries";
let selectedSessionIndex = 0;

function getDefaultSessionLogData() {
  return {
    sessions: [],
    miscNotes: ""
  };
}

function createBlankSession(index) {
  return {
    sessionTitle: `Session ${index}`,
    date: "",
    time: "",
    length: "",
    imageUrl: "",
    events: [
      { completed: false, text: "" },
      { completed: false, text: "" },
      { completed: false, text: "" },
      { completed: false, text: "" }
    ],
    notes: ""
  };
}

export function renderSessionLogChapter(paneContainer, state, options = {}) {
  if (options.activeSectionId) {
    activeSessionTab = options.activeSectionId;
  }

  const existingDoc = state.entities.find((e) => e.type === "session-log");
  const data = {
    ...getDefaultSessionLogData(),
    ...(existingDoc?.systemData || {})
  };
  if (!Array.isArray(data.sessions)) data.sessions = [];

  if (selectedSessionIndex >= data.sessions.length) {
    selectedSessionIndex = Math.max(0, data.sessions.length - 1);
  }

  const currentSection =
    SESSION_LOG_TABS.find((t) => t.id === activeSessionTab) || SESSION_LOG_TABS[0];

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
              Phase IV • Chronicle & Recaps
            </span>
          </div>
          <p class="text-slate-400 text-xs sm:text-sm mt-1">
            Record session dates, duration, checkable story beats, scene handouts, and cliffhangers for next session.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 shrink-0">
        <span id="session-save-status" class="text-xs text-slate-400">
          ${existingDoc ? "All changes saved" : "Not saved yet"}
        </span>
        <button id="save-session-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition shadow-lg shadow-indigo-600/20">
          <i data-lucide="save" class="w-4 h-4"></i> Save Session Log
        </button>
      </div>
    </div>

    <!-- Active Section Content -->
    <div class="space-y-6 flex-1">
      ${renderSessionLogTabContent(activeSessionTab, data)}
    </div>
  `;

  // Preserve unsaved edits in memory when switching vertical sections in the sidebar
  const sidebarSectionBtns = document.querySelectorAll('.chapter-section-btn[data-chapter-id="session-log"]');
  sidebarSectionBtns.forEach((btn) => {
    btn.addEventListener(
      "click",
      () => {
        collectSessionLogForm(paneContainer, data);
        if (existingDoc) {
          existingDoc.systemData = data;
        }
      },
      { capture: true }
    );
  });

  // Unsaved indicator
  const statusEl = paneContainer.querySelector("#session-save-status");
  paneContainer.querySelectorAll("input, textarea").forEach((el) => {
    const eventName = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, () => {
      statusEl.textContent = "Unsaved changes";
      statusEl.className = "text-xs text-amber-400";
    });
  });

  if (activeSessionTab === "session-entries") {
    wireSessionControls(paneContainer, state, existingDoc, data);
  }

  // Save to Firestore
  paneContainer.querySelector("#save-session-btn").addEventListener("click", async () => {
    collectSessionLogForm(paneContainer, data);
    statusEl.textContent = "Saving...";
    statusEl.className = "text-xs text-amber-400";

    const summary =
      data.sessions.length > 0
        ? `Sessions logged: ${data.sessions.map((s) => s.sessionTitle || "Session").join(", ")}`
        : "Session Log";

    try {
      if (existingDoc && existingDoc.id) {
        await updateEntity(existingDoc.id, {
          title: "Session Log",
          content: summary,
          systemData: data
        });
      } else {
        await createEntity({
          type: "session-log",
          title: "Session Log",
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

function renderSessionLogTabContent(tabId, data) {
  if (tabId === "misc-notes") {
    return `
      <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-3">
        <h3 class="text-sm font-bold text-white flex items-center gap-2">
          <i data-lucide="sticky-note" class="w-4 h-4 text-amber-400"></i> Session Log — Misc Notes
        </h3>
        <p class="text-xs text-slate-400">Track scheduling notes, player attendance, XP totals, or overarching timeline dates.</p>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1.5">Miscellaneous Campaign Timeline & Session Notes</label>
          <textarea data-session-misc="miscNotes" rows="12"
            placeholder="Write in-world calendar tracking, downtime summaries, or next-session reminders here..."
            class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(data.miscNotes)}</textarea>
        </div>
      </div>
    `;
  }

  const sessions = data.sessions || [];
  const activeSession = sessions[selectedSessionIndex] || null;

  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
      <div>
        <h3 class="text-sm font-bold text-white">Campaign Session Logs</h3>
        <p class="text-xs text-slate-400">Log each session's date, time, length, key session events (✓), scene artwork, and notes.</p>
      </div>
      <button type="button" id="add-session-btn" class="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition shrink-0">
        <i data-lucide="plus" class="w-4 h-4"></i> Add Session Log
      </button>
    </div>

    ${
      sessions.length === 0
        ? `
          <div class="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
            <i data-lucide="scroll-text" class="w-8 h-8 text-slate-600 mx-auto mb-2"></i>
            <p class="text-sm font-medium text-slate-300">No Session Logs Yet</p>
            <p class="text-xs text-slate-500 mt-1">Click "Add Session Log" to create your first session recap sheet.</p>
          </div>
        `
        : `
          <!-- Session Selector Pills -->
          <div class="flex items-center gap-2 flex-wrap">
            ${sessions
              .map(
                (s, i) => `
              <button type="button" data-session-idx="${i}" class="select-session-btn px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === selectedSessionIndex
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }">
                ${escapeHtml(s.sessionTitle || `Session #${i + 1}`)}
              </button>
            `
              )
              .join("")}
          </div>

          ${activeSession ? renderSessionSheet(activeSession) : ""}
        `
    }
  `;
}

function renderSessionSheet(sess) {
  const events = Array.isArray(sess.events) ? sess.events : [];

  return `
    <div class="bg-slate-950/60 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-5">
      <!-- Top Title & Remove -->
      <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div class="flex-1">
          <label class="block text-[11px] font-semibold uppercase tracking-wider text-indigo-400 mb-1">Session Title / Number</label>
          <input type="text" data-sess-field="sessionTitle" value="${escapeHtml(sess.sessionTitle || "")}"
            placeholder="e.g., Session 1 — The Ambush on Old King's Road"
            class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-base font-bold text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <button type="button" id="delete-session-btn" class="text-xs text-slate-400 hover:text-rose-400 px-2.5 py-2 rounded border border-slate-800 hover:border-rose-800/60 transition self-end">
          Remove Session
        </button>
      </div>

      <!-- Page 225 Header Metadata: DATE, TIME, LENGTH -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-3.5">
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Date</label>
          <input type="text" data-sess-field="date" value="${escapeHtml(sess.date || "")}"
            placeholder="e.g., Nov 22, 2026 / 14th of Frostfall"
            class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Time</label>
          <input type="text" data-sess-field="time" value="${escapeHtml(sess.time || "")}"
            placeholder="e.g., 7:00 PM EST / Midnight in-game"
            class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Length</label>
          <input type="text" data-sess-field="length" value="${escapeHtml(sess.length || "")}"
            placeholder="e.g., 4 Hours / 2 In-Game Days"
            class="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <!-- Session Scene / Handout Image URL & Preview -->
      <div class="space-y-2.5">
        <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
          Session Scene / Handout Image URL (Optional)
        </label>
        <input type="url" data-sess-field="imageUrl" value="${escapeHtml(sess.imageUrl || "")}"
          placeholder="https://... (Paste a session handout, screenshot, or scene illustration link)"
          class="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
        <div id="session-image-preview" class="border border-dashed border-slate-700 rounded-xl bg-slate-900/60 p-3 text-center">
          ${
            sess.imageUrl
              ? `<img src="${escapeHtml(sess.imageUrl)}" alt="Session Scene" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" />`
              : `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview a session handout or scene illustration here.</p>`
          }
        </div>
      </div>

      <!-- Page 225: SESSION EVENTS ✓ Blocks -->
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Session Events (✓)</h4>
            <p class="text-[11px] text-slate-400">Plan or log major scenes and check them off as they happen during play.</p>
          </div>
          <button type="button" id="add-session-event-btn" class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg border border-slate-700 transition">
            + Add Event Block
          </button>
        </div>

        <div class="space-y-3">
          ${events
            .map(
              (ev, eIdx) => `
            <div class="bg-slate-900/60 border border-slate-800 rounded-xl p-3 space-y-2">
              <div class="flex items-center justify-between">
                <label class="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" data-ev-idx="${eIdx}" data-ev-check="true" ${ev.completed ? "checked" : ""}
                    class="w-4 h-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500" />
                  <span class="text-xs font-bold uppercase tracking-wider ${
                    ev.completed ? "text-emerald-400" : "text-slate-300"
                  }">
                    Session Event #${eIdx + 1} ${ev.completed ? "✓" : ""}
                  </span>
                </label>
                <button type="button" data-del-ev="${eIdx}" class="del-sess-ev-btn text-[11px] text-slate-500 hover:text-rose-400 transition">
                  Remove
                </button>
              </div>
              <textarea data-ev-idx="${eIdx}" data-ev-text="true" rows="3"
                placeholder="Describe what happened, key decisions made, NPCs met, or clues uncovered..."
                class="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(ev.text || "")}</textarea>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Page 225 Bottom: NOTES -->
      <div class="pt-2 border-t border-slate-800/80">
        <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Notes</label>
        <textarea data-sess-field="notes" rows="5"
          placeholder="Loot awarded, XP/milestones, unresolved threads, and prep notes for next session..."
          class="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-100 leading-relaxed focus:outline-none focus:border-indigo-500">${escapeHtml(sess.notes || "")}</textarea>
      </div>
    </div>
  `;
}

function wireSessionControls(paneContainer, state, existingDoc, data) {
  const rerenderWithLocalData = () => {
    const tempEntity = existingDoc
      ? { ...existingDoc, systemData: data }
      : { type: "session-log", title: "Session Log", systemData: data };
    const otherEntities = state.entities.filter((e) => e.type !== "session-log");
    renderSessionLogChapter(paneContainer, {
      ...state,
      entities: [tempEntity, ...otherEntities]
    });
    if (window.lucide) window.lucide.createIcons();
  };

  paneContainer.querySelector("#add-session-btn")?.addEventListener("click", () => {
    collectSessionLogForm(paneContainer, data);
    data.sessions.push(createBlankSession(data.sessions.length + 1));
    selectedSessionIndex = data.sessions.length - 1;
    rerenderWithLocalData();
  });

  paneContainer.querySelectorAll(".select-session-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      collectSessionLogForm(paneContainer, data);
      selectedSessionIndex = Number(btn.getAttribute("data-session-idx")) || 0;
      rerenderWithLocalData();
    });
  });

  const delBtn = paneContainer.querySelector("#delete-session-btn");
  delBtn?.addEventListener("click", () => {
    if (delBtn.dataset.armed !== "true") {
      delBtn.dataset.armed = "true";
      delBtn.textContent = "Click again to confirm";
      delBtn.classList.add("text-rose-400", "border-rose-700");
      return;
    }
    data.sessions.splice(selectedSessionIndex, 1);
    selectedSessionIndex = Math.max(0, selectedSessionIndex - 1);
    rerenderWithLocalData();
  });

  // Add / Remove Session Event blocks
  paneContainer.querySelector("#add-session-event-btn")?.addEventListener("click", () => {
    collectSessionLogForm(paneContainer, data);
    const sess = data.sessions[selectedSessionIndex];
    if (sess) {
      if (!Array.isArray(sess.events)) sess.events = [];
      sess.events.push({ completed: false, text: "" });
      rerenderWithLocalData();
    }
  });

  paneContainer.querySelectorAll(".del-sess-ev-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eIdx = Number(btn.getAttribute("data-del-ev"));
      collectSessionLogForm(paneContainer, data);
      const sess = data.sessions[selectedSessionIndex];
      if (sess && Array.isArray(sess.events)) {
        sess.events.splice(eIdx, 1);
        rerenderWithLocalData();
      }
    });
  });

  // Live Session Scene Image preview
  const imgInput = paneContainer.querySelector('[data-sess-field="imageUrl"]');
  const imgPreview = paneContainer.querySelector("#session-image-preview");
  imgInput?.addEventListener("input", () => {
    const val = imgInput.value.trim();
    if (val) {
      imgPreview.innerHTML = `<img src="${escapeHtml(val)}" alt="Session Scene" class="max-h-72 mx-auto rounded-lg border border-slate-700 object-contain" onerror="this.outerHTML='<p class=\\'text-xs text-rose-400 py-4\\'>Could not load image from that URL.</p>'" />`;
    } else {
      imgPreview.innerHTML = `<p class="text-xs text-slate-500 py-4">Paste an image URL above to preview a session handout or scene illustration here.</p>`;
    }
  });
}

function collectSessionLogForm(container, data) {
  container.querySelectorAll("[data-session-misc]").forEach((el) => {
    data[el.getAttribute("data-session-misc")] = el.value;
  });

  if (activeSessionTab === "session-entries" && data.sessions[selectedSessionIndex]) {
    const sess = data.sessions[selectedSessionIndex];

    container.querySelectorAll("[data-sess-field]").forEach((el) => {
      sess[el.getAttribute("data-sess-field")] = el.value;
    });

    if (!Array.isArray(sess.events)) sess.events = [];
    container.querySelectorAll("[data-ev-check]").forEach((el) => {
      const eIdx = Number(el.getAttribute("data-ev-idx"));
      if (sess.events[eIdx]) {
        sess.events[eIdx].completed = el.checked;
      }
    });
    container.querySelectorAll("[data-ev-text]").forEach((el) => {
      const eIdx = Number(el.getAttribute("data-ev-idx"));
      if (sess.events[eIdx]) {
        sess.events[eIdx].text = el.value;
      }
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
