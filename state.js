// state.js
// Centralized state store with a lightweight pub/sub pattern so UI modules
// automatically stay in sync when authentication, systems, or campaigns change.

const listeners = new Set();

export const appState = {
  // Authentication state
  user: null,
  isAuthReady: false,

  // Navigation & UI state ('auth' | 'systems' | 'campaigns' | 'workspace')
  currentView: 'auth',
  isLoading: false,
  errorMessage: null,

  // Data hierarchy: User -> Systems -> Campaigns -> Entities (NPCs, Locations, Sessions, Lore)
  systems: [],
  activeSystem: null,

  campaigns: [],
  activeCampaign: null,

  entities: [],
  activeEntity: null
};

/**
 * Subscribe a UI render function to state changes.
 * @param {Function} callback - Function called whenever state updates.
 * @returns {Function} Unsubscribe function.
 */
export function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Update one or more properties on appState and notify all subscribed UI modules.
 * @param {Object} partialState - Key-value pairs to merge into appState.
 */
export function setState(partialState) {
  Object.assign(appState, partialState);
  listeners.forEach((callback) => {
    try {
      callback(appState);
    } catch (err) {
      console.error("Error in state subscriber:", err);
    }
  });
}

/**
 * Helper to clear error messages or set loading indicators cleanly.
 */
export function setLoading(isLoading, errorMessage = null) {
  setState({ isLoading, errorMessage });
}
