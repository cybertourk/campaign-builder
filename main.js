// main.js
// Master application entry point for RealmForge.
// Connects centralized state, Firebase Authentication, theme management (Stone & Parchment),
// and the three-tier hierarchical UI views (Auth -> Game Systems -> Campaigns -> Campaign Workspace).

import { appState, subscribe } from "./state.js";
import { initAuthListener } from "./firebase-manager.js";
import { renderAuthView, renderHeaderAuth } from "./ui-auth.js";
import { renderSystemsView, renderCampaignsView } from "./ui-systems.js";
import { renderCampaignWorkspace } from "./ui-campaign.js";
import { initTheme, renderThemeToggle, applyThemeToImages } from "./theme-manager.js";

const mainContainer = document.getElementById("app-main");
const headerAuthContainer = document.getElementById("auth-status");
const themeToggleContainer = document.getElementById("theme-toggle-slot");

/**
 * Master render router triggered automatically whenever `appState` updates.
 * @param {Object} state - Current centralized application state.
 */
function renderApp(state) {
  // Always keep the top-bar theme toggle and user account controls in sync
  renderThemeToggle(themeToggleContainer);
  renderHeaderAuth(headerAuthContainer, state);

  if (!mainContainer) return;

  // Show loading indicator before Firebase confirms the initial auth session
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
    applyThemeToImages(document.body);
    return;
  }

  // Route to the appropriate view based on authentication and navigation hierarchy
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

  // Refresh Lucide vector icons and active theme image assets after DOM injection
  if (window.lucide) {
    window.lucide.createIcons();
  }
  applyThemeToImages(document.body);
}

// Initialize theme, subscribe UI to state updates, perform initial render, and start Auth listener
initTheme();
subscribe(renderApp);
renderApp(appState);
initAuthListener();
