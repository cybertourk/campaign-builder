// theme-manager.js
// Manages switching between "stone" (Dark) and "parchment" (Light) UI themes,
// persists preference in localStorage, renders the header toggle button,
// injects late-cascade Parchment light-mode surface overrides after Tailwind CDN,
// and swaps GUI_Fantasy_RPG_Kit icons to Parchwood_UI_Kit icons automatically.

const THEME_STORAGE_KEY = "realmforge_ui_theme";
const DYNAMIC_STYLE_ID = "realmforge-parchment-cascade-guard";

// Default mapping from Stone kit filenames to Parchwood_UI_Kit filenames
const STONE_TO_PARCHMENT_MAP = {
  "papyrus-icon.png": "171-parchment-experience-medallion-with-ochre-open-book-silhouette.png",
  "chest-icon.png": "102-rolled-treasure-map-with-a-dotted-route-and-small-crimson-X-blank-margins.png",
  "key-icon.png": "100-small-wooden-padlock-badge.png",
  "star-icon.png": "341-sun-ray.png",
  "settings-btn.png": "042-square-parchment-gear-button.png",
  "close-btn.png": "038-round-crimson-close-button-with-cream-X.png",
  "back-btn.png": "040-round-parchment-back-arrow-button.png",
  "bar-bottle.png": "351-trail-sense.png",
  "heart-icon.png": "115-crimson-boss-encounter-crest-with-a-horned-skull.png",
  "shield-icon.png": "338-protective-ward.png",
  "sack-icon.png": "112-parchment-reward-pouch-card-with-a-drawstring-pouch-illustration-and-blank-lower-field.png",
  "potion-icon.png": "332-healing-bloom.png",
  "sword-icon.png": "301-power-slash.png",
  "coins-icon.png": "129-ochre-coin-stack-emblem-with-dark-engraved-diamond-symbols.png"
};

let currentTheme = "stone";
let observerStarted = false;

/**
 * Appends a high-priority <style> block at the very end of <head> so that
 * Tailwind Play CDN's dynamically injected utility classes never override
 * warm parchment surfaces with dark slate backgrounds.
 */
function ensureParchmentCascadeGuard() {
  if (typeof document === "undefined" || !document.head) return;

  let styleEl = document.getElementById(DYNAMIC_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = DYNAMIC_STYLE_ID;
    styleEl.textContent = `
      html[data-theme="parchment"] .rpg-panel [class*="bg-slate-9"],
      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-slate-9"],
      html[data-theme="parchment"] .rpg-workspace-pane [class*="bg-slate-9"] {
        background-color: #f3e4c6 !important;
        border-color: rgba(133, 88, 46, 0.36) !important;
      }

      html[data-theme="parchment"] .rpg-panel [class*="bg-slate-8"],
      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-slate-8"],
      html[data-theme="parchment"] .rpg-workspace-pane [class*="bg-slate-8"] {
        background-color: #ead5ae !important;
        border-color: rgba(133, 88, 46, 0.42) !important;
        color: #231409 !important;
      }

      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-slate-9"] [class*="bg-slate-9"] {
        background-color: #faf0dc !important;
      }

      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-indigo-9"],
      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-amber-9"],
      html[data-theme="parchment"] .rpg-panel-ornate .bg-indigo-600\\/20,
      html[data-theme="parchment"] .rpg-panel-ornate .bg-amber-500\\/20 {
        background-color: #f6e2b6 !important;
        border-color: rgba(139, 38, 29, 0.38) !important;
        color: #231409 !important;
      }

      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-emerald-9"] {
        background-color: #d7f2e3 !important;
        border-color: rgba(22, 101, 52, 0.38) !important;
        color: #14532d !important;
      }

      html[data-theme="parchment"] .rpg-panel-ornate [class*="bg-rose-9"] {
        background-color: #fadbd8 !important;
        border-color: rgba(153, 27, 27, 0.38) !important;
        color: #7f1d1d !important;
      }

      html[data-theme="parchment"] .rpg-panel input,
      html[data-theme="parchment"] .rpg-panel textarea,
      html[data-theme="parchment"] .rpg-panel select,
      html[data-theme="parchment"] .rpg-panel-ornate input:not([type="checkbox"]),
      html[data-theme="parchment"] .rpg-panel-ornate textarea,
      html[data-theme="parchment"] .rpg-panel-ornate select {
        background-color: #fffdf8 !important;
        border-color: rgba(133, 88, 46, 0.45) !important;
        color: #231409 !important;
      }
    `;
  }

  // Keep it as the last child of <head> so it always wins after Tailwind CDN updates
  if (document.head.lastElementChild !== styleEl) {
    document.head.appendChild(styleEl);
  }
}

/**
 * Loads the saved theme from localStorage (defaults to "stone") and starts
 * a DOM observer so dynamically rendered icons and styles always match.
 */
export function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "parchment" || saved === "stone") {
      currentTheme = saved;
    }
  } catch (e) {
    currentTheme = "stone";
  }

  document.documentElement.setAttribute("data-theme", currentTheme);
  ensureParchmentCascadeGuard();
  applyThemeToImages(document.body);

  if (!observerStarted && typeof MutationObserver !== "undefined") {
    observerStarted = true;
    let themeSyncScheduled = false;
    const observer = new MutationObserver(() => {
      if (themeSyncScheduled) return;
      themeSyncScheduled = true;
      requestAnimationFrame(() => {
        themeSyncScheduled = false;
        observer.disconnect();
        try {
          ensureParchmentCascadeGuard();
          applyThemeToImages(document.body);
        } finally {
          observer.observe(document.documentElement, { childList: true, subtree: true });
        }
      });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
}

export function getTheme() {
  return currentTheme;
}

/**
 * Applies a theme ("stone" or "parchment"), persists it, and updates the UI.
 */
export function setTheme(theme) {
  currentTheme = theme === "parchment" ? "parchment" : "stone";
  document.documentElement.setAttribute("data-theme", currentTheme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  } catch (e) {
    // Ignore storage errors in restricted contexts
  }

  ensureParchmentCascadeGuard();
  applyThemeToImages(document.body);

  const toggleContainer = document.getElementById("theme-toggle-slot");
  if (toggleContainer) {
    renderThemeToggle(toggleContainer);
  }
}

export function toggleTheme() {
  setTheme(currentTheme === "stone" ? "parchment" : "stone");
}

/**
 * Swaps any GUI_Fantasy_RPG_Kit image inside `root` to its Parchwood_UI_Kit
 * counterpart when "parchment" mode is active, and restores it for "stone".
 */
export function applyThemeToImages(root = document.body) {
  if (!root) return;
  const images = root.querySelectorAll("img");

  images.forEach((img) => {
    const rawSrc = img.getAttribute("src") || "";

    // Capture original Stone source once
    if (!img.dataset.stoneSrc && rawSrc.includes("GUI_Fantasy_RPG_Kit/")) {
      img.dataset.stoneSrc = rawSrc;
    }

    const stoneSrc = img.dataset.stoneSrc;
    if (!stoneSrc) return;

    if (currentTheme === "parchment") {
      let targetParchment = img.getAttribute("data-parchment-src");
      if (!targetParchment) {
        const fileName = stoneSrc.split("/").pop();
        const mapped = STONE_TO_PARCHMENT_MAP[fileName];
        if (mapped) {
          targetParchment = `./Parchwood_UI_Kit/${mapped}`;
        }
      }
      if (targetParchment && img.getAttribute("src") !== targetParchment) {
        img.setAttribute("src", targetParchment);
      }
    } else {
      if (img.getAttribute("src") !== stoneSrc) {
        img.setAttribute("src", stoneSrc);
      }
    }
  });
}

/**
 * Renders the Stone / Parchment switcher button in the top navigation bar.
 */
export function renderThemeToggle(container) {
  if (!container) return;
  const isParchment = currentTheme === "parchment";

  container.innerHTML = `
    <button type="button" id="theme-switch-btn"
      title="Switch between Stone (Dark) and Parchment (Light) themes"
      class="rpg-btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
      <img src="${
        isParchment
          ? "./Parchwood_UI_Kit/102-rolled-treasure-map-with-a-dotted-route-and-small-crimson-X-blank-margins.png"
          : "./GUI_Fantasy_RPG_Kit/settings-btn.png"
      }" alt="" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
      <span>${isParchment ? "Parchment" : "Stone"}</span>
    </button>
  `;

  container.querySelector("#theme-switch-btn")?.addEventListener("click", () => {
    toggleTheme();
  });
}
