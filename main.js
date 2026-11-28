// main.js
// Master application entry point for RealmForge.
// Connects centralized state, Firebase Authentication, theme management (Stone & Parchment),
// the Campaign Muse guide settings, global form ergonomics (auto-grow textareas & collapsible
// empty portrait/map previews), and the three-tier hierarchical UI views.

import { appState, subscribe } from "./state.js";
import { initAuthListener } from "./firebase-manager.js";
import { renderAuthView, renderHeaderAuth } from "./ui-auth.js";
import { renderSystemsView, renderCampaignsView } from "./ui-systems.js";
import { renderCampaignWorkspace } from "./ui-campaign.js";
import { initTheme, renderThemeToggle, applyThemeToImages } from "./theme-manager.js";
import { initGuideSettings, renderHeaderSettingsButton } from "./prompt-guide.js";

const mainContainer = document.getElementById("app-main");
const headerAuthContainer = document.getElementById("auth-status");
const themeToggleContainer = document.getElementById("theme-toggle-slot");
const settingsBtnContainer = document.getElementById("settings-btn-slot");

/**
 * Auto-sizes a textarea smoothly to fit its content without clipping multi-line text.
 */
function autoResizeTextarea(ta) {
  if (!ta) return;
  ta.style.height = "auto";
  if (ta.scrollHeight > 0) {
    ta.style.height = `${ta.scrollHeight + 4}px`;
  }
}

/**
 * Enhances workspace forms across all chapters:
 * 1. Auto-grows textareas as the DM types so text never clips or scrolls awkwardly.
 * 2. Collapses empty portrait/map image URL preview blocks into a sleek "+ Add Image / Map URL"
 *    toggle until clicked or until an image URL is populated.
 */
export function enhanceWorkspaceForms(root = document.body) {
  if (!root) return;

  // 1. Auto-grow textareas
  root.querySelectorAll("textarea").forEach((ta) => {
    if (!ta.dataset.autoGrowWired) {
      ta.dataset.autoGrowWired = "true";
      ta.addEventListener("input", () => autoResizeTextarea(ta));
    }
    if (ta.value && ta.value.trim().length > 0) {
      autoResizeTextarea(ta);
    }
  });

  // 2. Collapse empty image/map preview drawers until clicked or populated
  const previewSelectors = [
    "#npc-image-preview",
    "#char-image-preview",
    "#enemy-image-preview",
    "#deity-image-preview",
    "#faction-image-preview",
    "#world-map-preview",
    "#kingdom-map-preview",
    "#town-map-preview",
    "#adventure-map-preview",
    "#session-image-preview",
    "#init-map-preview",
    "#travel-map-preview",
    '[id^="item-img-preview-"]'
  ];

  root.querySelectorAll(previewSelectors.join(",")).forEach((previewBox) => {
    const parentBlock = previewBox.parentElement;
    if (!parentBlock || parentBlock.dataset.mediaCollapseWired === "true") return;

    const urlInput = parentBlock.querySelector('input[type="url"]');
    if (!urlInput) return;

    parentBlock.dataset.mediaCollapseWired = "true";
    const labelEl = parentBlock.querySelector("label");
    const rawLabel = labelEl ? labelEl.textContent.replace(/\(Optional\)/i, "").trim() : "Artwork / Map URL";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className =
      "rpg-btn-secondary text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5";
    toggleBtn.innerHTML = `<i data-lucide="image-plus" class="w-3.5 h-3.5"></i><span>+ Add ${rawLabel}</span>`;

    const setExpanded = (expanded) => {
      if (expanded) {
        toggleBtn.classList.add("hidden");
        if (labelEl) labelEl.classList.remove("hidden");
        urlInput.classList.remove("hidden");
        previewBox.classList.remove("hidden");
      } else {
        toggleBtn.classList.remove("hidden");
        if (labelEl) labelEl.classList.add("hidden");
        urlInput.classList.add("hidden");
        previewBox.classList.add("hidden");
      }
    };

    parentBlock.insertBefore(toggleBtn, parentBlock.firstChild);

    toggleBtn.addEventListener("click", () => {
      setExpanded(true);
      urlInput.focus();
    });

    // Keep expanded whenever a URL exists; collapse when empty
    const hasUrl = Boolean(urlInput.value && urlInput.value.trim().length > 0);
    setExpanded(hasUrl);
  });
}

/**
 * Master render router triggered automatically whenever `appState` updates.
 * @param {Object} state - Current centralized application state.
 */
function renderApp(state) {
  renderHeaderSettingsButton(settingsBtnContainer);
  renderThemeToggle(themeToggleContainer);
  renderHeaderAuth(headerAuthContainer, state);

  if (!mainContainer) return;

  if (!state.isAuthReady) {
    mainContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 text-center">
        <div class="rpg-slot-big w-16 h-16 mb-4 p-2 animate-pulse">
          <img src="./GUI_Fantasy_RPG_Kit/papyrus-icon.png"
               data-parchment-src="./Parchwood_UI_Kit/102-rolled-treasure-map-with-a-dotted-route-and-small-crimson-X-blank-margins.png"
               alt="Loading" class="w-10 h-10 object-contain" onerror="this.style.display='none'" />
        </div>
        <p class="font-rpg-display text-sm font-semibold tracking-wider uppercase text-amber-200">
          Opening Campaign Vault...
        </p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    applyThemeToImages(document.body);
    return;
  }

  if (!state.user || state.currentView === "auth") {
    renderAuthView(mainContainer, state);
  } else if (state.currentView === "campaigns" && state.activeSystem) {
    renderCampaignsView(mainContainer, state);
  } else if (
    state.currentView === "workspace" &&
    state.activeSystem &&
    state.activeCampaign
  ) {
    renderCampaignWorkspace(mainContainer, state);
  } else {
    renderSystemsView(mainContainer, state);
  }

  enhanceWorkspaceForms(mainContainer);

  if (window.lucide) {
    window.lucide.createIcons();
  }
  applyThemeToImages(document.body);
}

// Keep dynamically re-rendered chapter sub-tabs enhanced automatically
if (typeof MutationObserver !== "undefined" && mainContainer) {
  const formObserver = new MutationObserver(() => {
    enhanceWorkspaceForms(mainContainer);
    if (window.lucide) window.lucide.createIcons();
  });
  formObserver.observe(mainContainer, { childList: true, subtree: true });
}

initTheme();
initGuideSettings();
subscribe(renderApp);
renderApp(appState);
initAuthListener();
