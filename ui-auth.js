// ui-auth.js
// Renders the Login / Registration screen and the top-bar User Account controls.

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
    <div class="max-w-md mx-auto mt-8 sm:mt-14">
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3">
            <i data-lucide="shield" class="w-6 h-6 text-indigo-400"></i>
          </div>
          <h1 class="text-2xl font-bold text-white">Welcome to RealmForge</h1>
          <p class="text-slate-400 text-sm mt-1">Sign in to manage your RPG systems and campaigns.</p>
        </div>

        ${
          state.errorMessage
            ? `<div class="mb-4 p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <i data-lucide="alert-circle" class="w-4 h-4 shrink-0"></i>
                <span>${escapeHtml(state.errorMessage)}</span>
              </div>`
            : ""
        }

        <!-- Mode Tabs -->
        <div class="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-5">
          <button type="button" id="tab-login" class="py-1.5 text-sm font-medium rounded-md bg-slate-800 text-white transition">
            Sign In
          </button>
          <button type="button" id="tab-register" class="py-1.5 text-sm font-medium rounded-md text-slate-400 hover:text-white transition">
            Create Account
          </button>
        </div>

        <form id="auth-form" class="space-y-4">
          <div id="display-name-group" class="hidden">
            <label class="block text-xs font-medium text-slate-300 mb-1">GM / Player Name</label>
            <input type="text" id="auth-name" placeholder="e.g. Storyteller"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input type="email" id="auth-email" required placeholder="gm@tabletop.com"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <div>
            <label class="block text-xs font-medium text-slate-300 mb-1">Password</label>
            <input type="password" id="auth-password" required minlength="6" placeholder="••••••••"
              class="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" />
          </div>

          <button type="submit" id="auth-submit-btn" ${state.isLoading ? "disabled" : ""}
            class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition shadow-lg shadow-indigo-600/20">
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
    tabLogin.className = "py-1.5 text-sm font-medium rounded-md bg-slate-800 text-white transition";
    tabRegister.className = "py-1.5 text-sm font-medium rounded-md text-slate-400 hover:text-white transition";
    nameGroup.classList.add("hidden");
    submitBtn.textContent = "Sign In";
  });

  tabRegister.addEventListener("click", () => {
    isRegisterMode = true;
    tabRegister.className = "py-1.5 text-sm font-medium rounded-md bg-slate-800 text-white transition";
    tabLogin.className = "py-1.5 text-sm font-medium rounded-md text-slate-400 hover:text-white transition";
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
      <span class="text-xs text-slate-400 flex items-center gap-1.5">
        <i data-lucide="lock" class="w-3.5 h-3.5 text-slate-500"></i> Not Signed In
      </span>
    `;
    return;
  }

  headerContainer.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 border border-slate-700/80 px-3 py-1.5 rounded-full">
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
        <span>${escapeHtml(state.user.displayName)}</span>
      </div>
      <button id="logout-btn" class="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5">
        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
        Sign Out
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
