// ui-auth.js
// Renders the Login / Registration screen and the top-bar User Account controls
// styled with the carved stone & arcane RPG asset pack.

import {
  loginWithEmail,
  registerWithEmail,
  logoutUser
} from "./firebase-manager.js";

/**
 * Renders the centered Login / Create Account screen when no user is signed in.
 */
export function renderAuthView(container, state) {
  container.innerHTML = `
    <div class="max-w-md mx-auto mt-6 sm:mt-12">
      <div class="rpg-panel-ornate rounded-2xl p-6 sm:p-8">
        <div class="text-center mb-4">
          <div class="rpg-slot-big w-16 h-16 mx-auto mb-3 p-2">
            <img src="./GUI_Fantasy_RPG_Kit/key-icon.png" alt="Vault Key" class="w-10 h-10 object-contain drop-shadow" onerror="this.style.display='none'" />
          </div>
          <h1 class="text-2xl font-bold text-amber-100">Welcome to RealmForge</h1>
          <p class="text-slate-300 text-xs sm:text-sm mt-1">Unlock your vault of RPG systems, worlds, and campaigns.</p>
        </div>

        <div class="rpg-divider my-4"></div>

        ${
          state.errorMessage
            ? `<div class="mb-4 p-3 rounded-lg bg-rose-950/75 border border-rose-700/70 text-rose-200 text-xs flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 shrink-0 text-rose-400"></i>
                <span>${escapeHtml(state.errorMessage)}</span>
              </div>`
            : ""
        }

        <!-- Mode Tabs -->
        <div class="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/90 rounded-lg border border-slate-800 mb-5">
          <button type="button" id="tab-login" class="rpg-btn-secondary py-1.5 text-xs sm:text-sm font-semibold rounded-md text-amber-200 transition">
            Sign In
          </button>
          <button type="button" id="tab-register" class="py-1.5 text-xs sm:text-sm font-medium rounded-md text-slate-400 hover:text-white transition">
            Create Account
          </button>
        </div>

        <form id="auth-form" class="space-y-4">
          <div id="display-name-group" class="hidden">
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">GM / Player Name</label>
            <input type="text" id="auth-name" placeholder="e.g. Storyteller"
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Email Address</label>
            <input type="email" id="auth-email" required placeholder="gm@tabletop.com"
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">Password</label>
            <input type="password" id="auth-password" required minlength="6" placeholder="••••••••"
              class="w-full px-3.5 py-2 rounded-lg text-sm focus:outline-none" />
          </div>

          <button type="submit" id="auth-submit-btn" ${state.isLoading ? "disabled" : ""}
            class="rpg-btn-primary w-full py-2.5 px-4 font-semibold text-sm rounded-lg disabled:opacity-50">
            ${state.isLoading ? "Connecting..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  `;

  let isRegisterMode = false;
  const tabLogin = container.querySelector("#tab-login");
  const tabRegister = container.querySelector("#tab-register");
  const nameGroup = container.querySelector("#display-name-group");
  const submitBtn = container.querySelector("#auth-submit-btn");
  const form = container.querySelector("#auth-form");

  tabLogin.addEventListener("click", () => {
    isRegisterMode = false;
    tabLogin.className = "rpg-btn-secondary py-1.5 text-xs sm:text-sm font-semibold rounded-md text-amber-200 transition";
    tabRegister.className = "py-1.5 text-xs sm:text-sm font-medium rounded-md text-slate-400 hover:text-white transition";
    nameGroup.classList.add("hidden");
    submitBtn.textContent = "Sign In";
  });

  tabRegister.addEventListener("click", () => {
    isRegisterMode = true;
    tabRegister.className = "rpg-btn-secondary py-1.5 text-xs sm:text-sm font-semibold rounded-md text-amber-200 transition";
    tabLogin.className = "py-1.5 text-xs sm:text-sm font-medium rounded-md text-slate-400 hover:text-white transition";
    nameGroup.classList.remove("hidden");
    submitBtn.textContent = "Create Account";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = container.querySelector("#auth-email").value.trim();
    const password = container.querySelector("#auth-password").value;
    const displayName = container.querySelector("#auth-name").value.trim();

    if (isRegisterMode) {
      await registerWithEmail(email, password, displayName);
    } else {
      await loginWithEmail(email, password);
    }
  });
}

/**
 * Renders the user badge and Sign Out button in the top navigation bar.
 */
export function renderHeaderAuth(headerContainer, state) {
  if (!state.user) {
    headerContainer.innerHTML = `
      <span class="rpg-slot-long text-xs text-slate-300 px-3 py-1.5 rounded-full flex items-center gap-1.5">
        <img src="./GUI_Fantasy_RPG_Kit/key-icon.png" alt="" class="w-3.5 h-3.5 object-contain opacity-80" onerror="this.style.display='none'" />
        <span>Not Signed In</span>
      </span>
    `;
    return;
  }

  headerContainer.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="rpg-slot-long hidden sm:flex items-center gap-2 text-xs text-amber-100 px-3.5 py-1.5 rounded-full">
        <img src="./GUI_Fantasy_RPG_Kit/star-icon.png" alt="" class="w-3.5 h-3.5 object-contain" onerror="this.style.display='none'" />
        <span class="font-medium">${escapeHtml(state.user.displayName)}</span>
      </div>
      <button id="logout-btn" class="rpg-btn-secondary text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
        <i data-lucide="log-out" class="w-3.5 h-3.5 text-amber-300"></i>
        <span>Sign Out</span>
      </button>
    </div>
  `;

  headerContainer.querySelector("#logout-btn").addEventListener("click", () => {
    logoutUser();
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
