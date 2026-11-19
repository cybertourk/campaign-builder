// firebase-manager.js
// Handles Firebase Authentication and Firestore CRUD operations for:
// users/{uid}/systems/{systemId}/campaigns/{campaignId}/entities/{entityId}

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { appState, setState, setLoading } from "./state.js";

// ============================================================================
// 1. AUTHENTICATION
// ============================================================================

/**
 * Initializes the persistent Firebase Auth listener.
 * Automatically loads the user's Game Systems upon login.
 */
export function initAuthListener() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      // Ensure user profile doc exists in Firestore
      await ensureUserDocument(user);

      setState({
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email.split("@")[0]
        },
        isAuthReady: true,
        currentView: "systems",
        errorMessage: null
      });

      await loadUserSystems();
    } else {
      setState({
        user: null,
        isAuthReady: true,
        currentView: "auth",
        systems: [],
        activeSystem: null,
        campaigns: [],
        activeCampaign: null,
        entities: [],
        activeEntity: null
      });
    }
  });
}

/**
 * Creates or updates the root user document in Firestore.
 */
async function ensureUserDocument(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(
      userRef,
      {
        email: user.email,
        displayName: user.displayName || user.email.split("@")[0],
        lastLoginAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Failed to sync user document:", error);
  }
}

export async function registerWithEmail(email, password, displayName) {
  setLoading(true);
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    setLoading(false);
  } catch (error) {
    setLoading(false, formatAuthError(error));
    throw error;
  }
}

export async function loginWithEmail(email, password) {
  setLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email, password);
    setLoading(false);
  } catch (error) {
    setLoading(false, formatAuthError(error));
    throw error;
  }
}

export async function loginWithGoogle() {
  setLoading(true);
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    setLoading(false);
  } catch (error) {
    setLoading(false, formatAuthError(error));
    throw error;
  }
}

export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
  }
}

function formatAuthError(error) {
  const code = error?.code || "";
  if (code.includes("invalid-credential") || code.includes("wrong-password")) {
    return "Invalid email or password.";
  }
  if (code.includes("email-already-in-use")) {
    return "An account with this email already exists.";
  }
  if (code.includes("weak-password")) {
    return "Password must be at least 6 characters.";
  }
  return error.message || "Authentication error occurred.";
}

// ============================================================================
// 2. GAME SYSTEMS (Level 1: users/{uid}/systems)
// ============================================================================

export async function loadUserSystems() {
  const uid = appState.user?.uid;
  if (!uid) return;

  setLoading(true);
  try {
    const systemsRef = collection(db, "users", uid, "systems");
    const q = query(systemsRef, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const systems = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    setState({ systems, isLoading: false, errorMessage: null });
  } catch (error) {
    console.error("Error loading game systems:", error);
    setLoading(false, "Could not load your Game Systems.");
  }
}

/**
 * Creates a new Game System folder.
 * Includes `templateType` (defaulting to 'generic') so future D&D, Vampire, or
 * Daggerheart modules can hook into systems with matching templateTypes.
 */
export async function createGameSystem({ name, description = "", templateType = "generic", accentColor = "indigo" }) {
  const uid = appState.user?.uid;
  if (!uid) return;

  setLoading(true);
  try {
    const systemsRef = collection(db, "users", uid, "systems");
    const newSystem = {
      name: name.trim(),
      description: description.trim(),
      templateType, // 'generic' now; ready for 'dnd5e', 'vtm5e', 'daggerheart' later
      accentColor,
      systemMeta: {}, // Reserved for system-wide custom rules or terminology
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(systemsRef, newSystem);
    const created = { id: docRef.id, ...newSystem };

    setState({
      systems: [created, ...appState.systems],
      isLoading: false
    });

    return created;
  } catch (error) {
    console.error("Error creating game system:", error);
    setLoading(false, "Failed to create Game System.");
    throw error;
  }
}

export async function deleteGameSystem(systemId) {
  const uid = appState.user?.uid;
  if (!uid) return;

  try {
    await deleteDoc(doc(db, "users", uid, "systems", systemId));
    const updated = appState.systems.filter((s) => s.id !== systemId);
    setState({
      systems: updated,
      activeSystem: appState.activeSystem?.id === systemId ? null : appState.activeSystem
    });
  } catch (error) {
    console.error("Error deleting system:", error);
    setLoading(false, "Failed to delete Game System.");
  }
}

/**
 * Selects a Game System and loads all Campaigns nested inside it.
 */
export async function selectGameSystem(system) {
  setState({
    activeSystem: system,
    activeCampaign: null,
    campaigns: [],
    entities: [],
    currentView: "campaigns"
  });
  await loadCampaigns(system.id);
}

// ============================================================================
// 3. CAMPAIGNS (Level 2: users/{uid}/systems/{systemId}/campaigns)
// ============================================================================

export async function loadCampaigns(systemId) {
  const uid = appState.user?.uid;
  if (!uid || !systemId) return;

  setLoading(true);
  try {
    const campaignsRef = collection(db, "users", uid, "systems", systemId, "campaigns");
    const q = query(campaignsRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    const campaigns = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    setState({ campaigns, isLoading: false, errorMessage: null });
  } catch (error) {
    console.error("Error loading campaigns:", error);
    setLoading(false, "Could not load campaigns for this system.");
  }
}

export async function createCampaign({ title, summary = "", status = "Active" }) {
  const uid = appState.user?.uid;
  const systemId = appState.activeSystem?.id;
  if (!uid || !systemId) return;

  setLoading(true);
  try {
    const campaignsRef = collection(db, "users", uid, "systems", systemId, "campaigns");
    const newCampaign = {
      title: title.trim(),
      summary: summary.trim(),
      status, // 'Active' | 'Planning' | 'Completed' | 'On Hold'
      systemId,
      campaignMeta: {}, // Extensible per-campaign settings
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(campaignsRef, newCampaign);
    const created = { id: docRef.id, ...newCampaign };

    setState({
      campaigns: [created, ...appState.campaigns],
      isLoading: false
    });

    return created;
  } catch (error) {
    console.error("Error creating campaign:", error);
    setLoading(false, "Failed to create campaign.");
    throw error;
  }
}

export async function deleteCampaign(campaignId) {
  const uid = appState.user?.uid;
  const systemId = appState.activeSystem?.id;
  if (!uid || !systemId) return;

  try {
    await deleteDoc(doc(db, "users", uid, "systems", systemId, "campaigns", campaignId));
    setState({
      campaigns: appState.campaigns.filter((c) => c.id !== campaignId),
      activeCampaign: appState.activeCampaign?.id === campaignId ? null : appState.activeCampaign
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
  }
}

/**
 * Opens a Campaign workspace and loads its entities (NPCs, Locations, Sessions, Lore).
 */
export async function selectCampaign(campaign) {
  setState({
    activeCampaign: campaign,
    activeEntity: null,
    entities: [],
    currentView: "workspace"
  });
  await loadEntities(appState.activeSystem.id, campaign.id);
}

// ============================================================================
// 4. CAMPAIGN ENTITIES (Level 3: .../campaigns/{campaignId}/entities)
// ============================================================================

export async function loadEntities(systemId, campaignId) {
  const uid = appState.user?.uid;
  if (!uid || !systemId || !campaignId) return;

  setLoading(true);
  try {
    const entitiesRef = collection(
      db,
      "users",
      uid,
      "systems",
      systemId,
      "campaigns",
      campaignId,
      "entities"
    );
    const q = query(entitiesRef, orderBy("updatedAt", "desc"));
    const snapshot = await getDocs(q);

    const entities = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));

    setState({
      entities,
      activeEntity: entities.length > 0 ? entities[0] : null,
      isLoading: false
    });
  } catch (error) {
    console.error("Error loading campaign entities:", error);
    setLoading(false, "Could not load campaign notes.");
  }
}

export async function createEntity({ type = "Session", title, content = "", tags = [], systemData = {} }) {
  const uid = appState.user?.uid;
  const systemId = appState.activeSystem?.id;
  const campaignId = appState.activeCampaign?.id;
  if (!uid || !systemId || !campaignId) return;

  try {
    const entitiesRef = collection(
      db,
      "users",
      uid,
      "systems",
      systemId,
      "campaigns",
      campaignId,
      "entities"
    );

    const newEntity = {
      type, // 'Session' | 'NPC' | 'Location' | 'Faction' | 'Lore'
      title: title.trim(),
      content,
      tags,
      systemData, // Modular payload for D&D statblocks, Vampire Disciplines, Daggerheart Fear/Hope, etc.
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(entitiesRef, newEntity);
    const created = { id: docRef.id, ...newEntity };

    setState({
      entities: [created, ...appState.entities],
      activeEntity: created
    });

    return created;
  } catch (error) {
    console.error("Error creating entity:", error);
    throw error;
  }
}

export async function updateEntity(entityId, updates) {
  const uid = appState.user?.uid;
  const systemId = appState.activeSystem?.id;
  const campaignId = appState.activeCampaign?.id;
  if (!uid || !systemId || !campaignId || !entityId) return;

  try {
    const entityRef = doc(
      db,
      "users",
      uid,
      "systems",
      systemId,
      "campaigns",
      campaignId,
      "entities",
      entityId
    );

    const payload = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    await updateDoc(entityRef, payload);

    const updatedList = appState.entities.map((ent) =>
      ent.id === entityId ? { ...ent, ...updates } : ent
    );
    const updatedActive =
      appState.activeEntity?.id === entityId
        ? { ...appState.activeEntity, ...updates }
        : appState.activeEntity;

    setState({
      entities: updatedList,
      activeEntity: updatedActive
    });
  } catch (error) {
    console.error("Error updating entity:", error);
    throw error;
  }
}

export async function deleteEntity(entityId) {
  const uid = appState.user?.uid;
  const systemId = appState.activeSystem?.id;
  const campaignId = appState.activeCampaign?.id;
  if (!uid || !systemId || !campaignId) return;

  try {
    await deleteDoc(
      doc(db, "users", uid, "systems", systemId, "campaigns", campaignId, "entities", entityId)
    );
    const remaining = appState.entities.filter((e) => e.id !== entityId);
    setState({
      entities: remaining,
      activeEntity:
        appState.activeEntity?.id === entityId ? remaining[0] || null : appState.activeEntity
    });
  } catch (error) {
    console.error("Error deleting entity:", error);
  }
}
