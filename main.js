// main.js
// Connects state changes to the active UI view and boots the Firebase Auth listener.

import { subscribe, appState } from "./state.js";
import { initAuthListener } from "./firebase-manager.js";
import { renderAuthView, renderHeaderAuth } from "./ui-auth.js";
import { renderSystemsView, renderCampaignsView } from "./ui-systems.js";
import { renderCampaignWorkspace } from "./ui-campaign.js";

const mainContainer = document.getElementById("app-main");
const headerAuthContainer = document.getElementById("auth-status");

/**
 * Master render router triggered automatically whenever `appState` updates.
 */
function renderApp(state) {
  // Always update the top-right account bar
  renderHeaderAuth(headerAuthContainer, state);

  // Show loading spinner before Firebase confirms initial auth session
  if (!state.isAuthReady) {
    mainContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <div class="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm">Initializing RealmForge...</span>
      </div>
    `;
    return;
  }

  // Route based on currentView
  switch (state.currentView) {
    case "auth":
      renderAuthView(mainContainer, state);
      break;
    case "systems":
      renderSystemsView(mainContainer, state);
      break;
    case "campaigns":
      renderCampaignsView(mainContainer, state);
      break;
    case "workspace":
      renderCampaignWorkspace(mainContainer, state);
      break;
    default:
      renderSystemsView(mainContainer, state);
  }

  // Refresh Lucide icons after DOM injection
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Subscribe UI to state updates and start Firebase Auth listener
subscribe(renderApp);
renderApp(appState);
initAuthListener();
