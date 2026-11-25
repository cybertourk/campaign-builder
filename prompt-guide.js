// prompt-guide.js
// Interactive guided worldbuilding prompt system ("Campaign Muse") + Global Settings Menu.
// Interviews the GM one question at a time using selectable guide personalities
// (defaulting to "The Enthusiastic Fan") and auto-saves answers straight into the
// corresponding Campaign Planner chapters in Firestore.

import { appState, setState } from "./state.js";
import { createEntity, updateEntity } from "./firebase-manager.js";
import { getTheme, setTheme, applyThemeToImages } from "./theme-manager.js";

const GUIDE_SETTINGS_KEY = "realmforge_guide_settings";

// ============================================================================
// 1. GUIDE PERSONALITIES & SETTINGS STORAGE
// ============================================================================

export const GUIDE_PERSONALITIES = {
  fan: {
    id: "fan",
    name: "The Enthusiastic Fan",
    tagline: "Hyped lore-lover begging for behind-the-scenes details about your world.",
    badge: "Enthusiastic Fan",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/star-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/341-sun-ray.png",
    introQuote:
      "Okay, I have been dying to hear about this world! Don't worry about organizing anything—just tell me what's cool and I'll jot it right into your campaign tome!",
    savedToast: "Ooh, that's awesome! Saved straight to your tome—ready for the next one?"
  },
  scholar: {
    id: "scholar",
    name: "The Grand Archivist",
    tagline: "Inquisitive scholar chronicling the realms, eras, and histories for the Great Library.",
    badge: "Royal Archivist",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/papyrus-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/171-parchment-experience-medallion-with-ochre-open-book-silhouette.png",
    introQuote:
      "Greetings, Chronicler. Let us record the foundational truths of your realm one entry at a time so future ages remember how this story began.",
    savedToast: "Recorded cleanly in the archives. Shall we examine the next entry?"
  },
  bard: {
    id: "bard",
    name: "The Fireside Chronicler",
    tagline: "Story-hungry tavern bard hunting for rumors, villains, and unforgettable hooks.",
    badge: "Fireside Bard",
    rpgIcon: "./GUI_Fantasy_RPG_Kit/chest-icon.png",
    parchmentIcon: "./Parchwood_UI_Kit/102-rolled-treasure-map-with-a-dotted-route-and-small-crimson-X-blank-margins.png",
    introQuote:
      "Pull up a chair by the hearth! Every legendary ballad starts with a spark—answer whichever questions catch your fancy and we'll weave the tale together.",
    savedToast: "Now THAT is worth a verse! Saved to your notes—what happens next?"
  }
};

export const PREP_PATHS = {
  session1: {
    id: "session1",
    name: "Session 1 First (Bottom-Up)",
    description: "Start small with your opening town, local tavern, first NPC, and initial quest hook."
  },
  bigpicture: {
    id: "bigpicture",
    name: "Big Picture First (Top-Down)",
    description: "Start with your world's vibe, central crisis, main villain, and major factions."
  }
};

let guideSettings = {
  personality: "fan",
  prepPath: "session1"
};

let activePromptIndex = 0;
let activeSparkIndex = -1;
let hideBannerForCampaignId = null;

export function initGuideSettings() {
  try {
    const raw = localStorage.getItem(GUIDE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.personality && GUIDE_PERSONALITIES[parsed.personality]) {
        guideSettings.personality = parsed.personality;
      }
      if (parsed.prepPath && PREP_PATHS[parsed.prepPath]) {
        guideSettings.prepPath = parsed.prepPath;
      }
    }
  } catch (e) {
    // Default to enthusiastic fan + session1
  }
}

export function getGuideSettings() {
  return { ...guideSettings };
}

export function saveGuideSettings(partial) {
  guideSettings = { ...guideSettings, ...partial };
  try {
    localStorage.setItem(GUIDE_SETTINGS_KEY, JSON.stringify(guideSettings));
  } catch (e) {
    // Ignore storage restriction errors
  }
}

// ============================================================================
// 2. DYNAMIC WORLD CONTEXT EXTRACTOR (FOR CONNECT-THE-DOTS FOLLOW-UPS)
// ============================================================================

function extractWorldContext(entities = []) {
  const setting = entities.find((e) => e.type === "campaign-setting")?.systemData || {};
  const plot = entities.find((e) => e.type === "plot-adventures")?.systemData || {};
  const enemies = entities.find((e) => e.type === "enemies")?.systemData || {};
  const factions = entities.find((e) => e.type === "faction")?.systemData || {};
  const npc = entities.find((e) => e.type === "npc")?.systemData || {};
  const deities = entities.find((e) => e.type === "deities")?.systemData || {};
  const encounters = entities.find((e) => e.type === "random-encounters")?.systemData || {};

  const firstTown = Array.isArray(setting.towns) && setting.towns[0]?.name ? setting.towns[0].name.trim() : "";
  const firstMarket = Array.isArray(setting.markets) && setting.markets[0]?.marketName ? setting.markets[0].marketName.trim() : "";
  const firstAdventure = Array.isArray(plot.adventures) && plot.adventures[0]?.title ? plot.adventures[0].title.trim() : "";
  const firstFaction = Array.isArray(factions.factions) && factions.factions[0]?.factionName ? factions.factions[0].factionName.trim() : "";
  const firstMinorNpc = Array.isArray(npc.minorNpcs) && npc.minorNpcs[0]?.name ? npc.minorNpcs[0].name.trim() : "";
  const firstKeyNpc = Array.isArray(npc.keyNpcs) && npc.keyNpcs[0]?.name ? npc.keyNpcs[0].name.trim() : "";

  return {
    setting,
    plot,
    enemies,
    factions,
    npc,
    deities,
    encounters,
    worldName: (setting.worldName || "").trim(),
    timePeriod: (setting.timePeriod || "").trim(),
    magicSystem: (setting.magicSystem || "").trim(),
    currentEvents: (setting.currentEvents || "").trim(),
    firstTown,
    firstMarket,
    apocalypticEvent: (plot.apocalypticEvent || "").trim(),
    howToStop: (plot.howToStop || "").trim(),
    firstAdventure,
    mainVillain: (enemies.mainVillain || "").trim(),
    villainMotivation: (enemies.villainMotivation || "").trim(),
    firstFaction,
    firstMinorNpc,
    firstKeyNpc
  };
}

// ============================================================================
// 3. CURATED PROMPT BANK (WITH ENTHUSIASTIC FAN VOICE + ALTERNATE PERSONAS)
// ============================================================================

const PROMPT_TEMPLATES = [
  {
    id: "starting-town",
    stage: "Stage 1: Starting Sandbox",
    session1Order: 1,
    bigPictureOrder: 6,
    chapterId: "campaign-setting",
    sectionId: "towns",
    chapterLabel: "Ch. 1: Campaign Setting › Towns & Cities",
    hasNameField: true,
    nameLabel: "Starting Town or City Name",
    namePlaceholder: "e.g., Oakhaven, Port Brass, Lantern's Rest",
    answerLabel: "First Impressions, Atmosphere & Notable Spots",
    answerPlaceholder: "Describe what it looks, smells, and feels like when the story opens—plus a landmark or two...",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "Every great chronicle begins at a specific crossroads. What is the name of the settlement where our story opens, and what notable landmarks define its streets?";
      }
      if (persona === "bard") {
        return "Set the stage for our opening scene! What's the name of the town or city where the party first crosses paths, and what catches their eye right away?";
      }
      return "Okay, I'm already hooked—where does the story kick off?! What's the name of the starting town or city, and what's the very first thing someone sees when they walk down the main street?";
    },
    sparkIdeas: [
      "A cliffside port town built around the ribcage of a colossal sea leviathan, where lantern oil is worth more than silver.",
      "A quiet logging village bordering an ancient mist-shrouded forest where the trees subtly shift positions every full moon.",
      "A bustling crossroads market town resting atop ancient dwarven aqueducts that hum softly whenever magic is cast nearby."
    ],
    readState: (ctx) => {
      const t = ctx.setting.towns?.[0];
      return {
        isAnswered: Boolean(t && (t.name || t.notableLocations)),
        nameValue: t?.name || "",
        answerValue: t?.notableLocations || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = { ...(existing?.systemData || {}) };
      const towns = Array.isArray(sysData.towns) ? [...sysData.towns] : [];
      if (towns.length === 0) {
        towns.push({
          name: nameVal || "Starting Town",
          keyNpcs: "",
          notableLocations: answerVal,
          localHistory: "",
          localGovernment: "",
          laws: "",
          socialEconomic: "",
          racesLanguages: "",
          rumors: "",
          townMapUrl: ""
        });
      } else {
        towns[0] = {
          ...towns[0],
          name: nameVal || towns[0].name,
          notableLocations: answerVal
        };
      }
      sysData.towns = towns;
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title: sysData.worldName || "Campaign Setting",
          content: `Starting Town: ${towns[0].name}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "local-hangout",
    stage: "Stage 1: Starting Sandbox",
    session1Order: 2,
    bigPictureOrder: 8,
    chapterId: "campaign-setting",
    sectionId: "markets",
    chapterLabel: "Ch. 1: Campaign Setting › Markets & Shops",
    hasNameField: true,
    nameLabel: "Tavern, Shop, or Market Name",
    namePlaceholder: "e.g., The Copper Kettle, Vespera's Curiosities",
    answerLabel: "Owner, Vibe & Signature Goods or Drinks",
    answerPlaceholder: "Who runs the place, what do they sell or serve, and why do locals gather here?",
    getQuestion: (persona, ctx) => {
      const townRef = ctx.firstTown ? ` in ${ctx.firstTown}` : "";
      if (persona === "scholar") {
        return `Commerce and gathering halls reveal the true pulse of a community. What notable tavern, market, or workshop${townRef} serves as a hub for locals and travelers alike?`;
      }
      if (persona === "bard") {
        return `No proper adventure starts without a memorable watering hole or bazaar! What's the best tavern or shop${townRef}, who runs the counter, and what's their house specialty?`;
      }
      return `I love a good home-base hangout! What's the coolest tavern, shop, or market${townRef} where everyone ends up gathering, and what weird or signature thing do they sell?`;
    },
    sparkIdeas: [
      "The Tarnished Compass — a cozy tavern where travelers trade strange trinkets instead of coin for a mug of spiced cider.",
      "Ember & Anvil — a forge run by a retired adventurer who tests every blade against a chunk of meteorite on the counter.",
      "The Whispering Bazaar — a lantern-lit night market that only sets up its stalls when fog rolls in from the harbor."
    ],
    readState: (ctx) => {
      const m = ctx.setting.markets?.[0];
      return {
        isAnswered: Boolean(m && (m.marketName || m.itemsAndPrices)),
        nameValue: m?.marketName || "",
        answerValue: m?.itemsAndPrices || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = { ...(existing?.systemData || {}) };
      const markets = Array.isArray(sysData.markets) ? [...sysData.markets] : [];
      const defaultLoc = sysData.towns?.[0]?.name || "";
      if (markets.length === 0) {
        markets.push({
          marketName: nameVal || "Local Market",
          traderName: "",
          townLocation: defaultLoc,
          itemsAndPrices: answerVal
        });
      } else {
        markets[0] = {
          ...markets[0],
          marketName: nameVal || markets[0].marketName,
          townLocation: markets[0].townLocation || defaultLoc,
          itemsAndPrices: answerVal
        };
      }
      sysData.markets = markets;
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title: sysData.worldName || "Campaign Setting",
          content: `Market: ${markets[0].marketName}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "friendly-local-npc",
    stage: "Stage 1: Starting Sandbox",
    session1Order: 3,
    bigPictureOrder: 9,
    chapterId: "npc",
    sectionId: "minor-npcs",
    chapterLabel: "Ch. 7: NPC › Town & Minor NPCs",
    hasNameField: true,
    nameLabel: "Local NPC Name & Role",
    namePlaceholder: "e.g., Barnaby Finch (Retired Cartographer)",
    answerLabel: "Personality, Quirks & Why Everyone Remembers Them",
    answerPlaceholder: "How do they talk or act, what do they care about, and what rumor or favor do they have?",
    getQuestion: (persona, ctx) => {
      const townRef = ctx.firstTown ? ` in ${ctx.firstTown}` : "";
      if (persona === "scholar") {
        return `History is shaped by vivid personalities. Which local figure${townRef} is most likely to become a recurring contact, guide, or beloved eccentric?`;
      }
      if (persona === "bard") {
        return `Every town has one unforgettable character who steals the spotlight! Who${townRef} is going to become an instant fan-favorite the moment they speak?`;
      }
      return `Oh! Who's the one local NPC${townRef} that everyone is going to fall in love with (or instantly adopt as a mascot) within the first ten minutes?!`;
    },
    sparkIdeas: [
      "An overly dramatic Halfling archivist who treats every minor errand like a world-shattering prophecy.",
      "A soft-spoken half-orc florist who secretly knows every piece of criminal gossip in the district.",
      "A jittery clockwork tinkerer whose pocket-sized mechanical owl keeps interrupting conversations."
    ],
    readState: (ctx) => {
      const n = ctx.npc.minorNpcs?.[0];
      return {
        isAnswered: Boolean(n && (n.name || n.personality)),
        nameValue: n?.name || "",
        answerValue: n?.personality || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "npc");
      const setting = entities.find((e) => e.type === "campaign-setting")?.systemData || {};
      const defaultLoc = setting.towns?.[0]?.name || "";
      const sysData = {
        mainPlotNpcsNeeded: "",
        townNpcsNeeded: "",
        importantVsMinorNpcs: "",
        keyNpcs: [],
        minorNpcs: [],
        miscNotes: "",
        ...(existing?.systemData || {})
      };
      if (sysData.minorNpcs.length === 0) {
        sysData.minorNpcs.push({
          name: nameVal || "Local Contact",
          imageUrl: "",
          strength: "",
          dexterity: "",
          constitution: "",
          intelligence: "",
          wisdom: "",
          charisma: "",
          age: "",
          gender: "",
          race: "",
          alignment: "",
          profession: "",
          location: defaultLoc,
          equipmentItems: "",
          appearance: "",
          languages: "",
          motivation: "",
          plotHook: "",
          personality: answerVal
        });
      } else {
        sysData.minorNpcs[0] = {
          ...sysData.minorNpcs[0],
          name: nameVal || sysData.minorNpcs[0].name,
          location: sysData.minorNpcs[0].location || defaultLoc,
          personality: answerVal
        };
      }
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "npc",
          title: "NPCs",
          content: `Local NPC: ${sysData.minorNpcs[0].name}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "first-adventure-hook",
    stage: "Stage 1: Starting Sandbox",
    session1Order: 4,
    bigPictureOrder: 7,
    chapterId: "plot-adventures",
    sectionId: "adventures",
    chapterLabel: "Ch. 2: Plot & Adventures › Adventures & Battle Maps",
    hasNameField: true,
    nameLabel: "First Adventure / Quest Title",
    namePlaceholder: "e.g., Trouble at Bellweather Mine",
    answerLabel: "The Inciting Incident / Plot Hook",
    answerPlaceholder: "What sudden event, plea for help, or mystery kicks off the very first adventure?",
    getQuestion: (persona, ctx) => {
      const placeRef = ctx.firstMarket
        ? `at ${ctx.firstMarket}`
        : ctx.firstTown
        ? `in ${ctx.firstTown}`
        : "in the opening scene";
      if (persona === "scholar") {
        return `What inciting incident ${placeRef} compels the heroes to take up arms and embark on their very first expedition?`;
      }
      if (persona === "bard") {
        return `Picture the opening scene ${placeRef}: the music stops, the door bursts open—what sudden crisis or tempting bounty launches the first adventure?`;
      }
      return `Alright, imagine the camera pans in ${placeRef}—what suddenly bursts through the door or drops onto the table to kick off the very first quest?!`;
    },
    sparkIdeas: [
      "A courier stumbles in clutching a locked iron strongbox that's ticking—and says three different factions are already tracking it.",
      "The town's ancient beacon flame suddenly turns violet, and every compass in the room spins wildly toward the old quarry.",
      "A local merchant offers triple pay to escort a sealed wagon overnight—with one rule: never open the canvas tarp."
    ],
    readState: (ctx) => {
      const adv = ctx.plot.adventures?.[0];
      return {
        isAnswered: Boolean(adv && (adv.title || adv.plotHook)),
        nameValue: adv?.title || "",
        answerValue: adv?.plotHook || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "plot-adventures");
      const setting = entities.find((e) => e.type === "campaign-setting")?.systemData || {};
      const defaultLoc = setting.towns?.[0]?.name || "";
      const sysData = {
        apocalypticEvent: "",
        eventCause: "",
        eventMotivation: "",
        howToStop: "",
        escalationPlotPoints: "",
        centralTensionSynopsis: "",
        adventures: [],
        miscNotes: "",
        ...(existing?.systemData || {})
      };
      if (sysData.adventures.length === 0) {
        sysData.adventures.push({
          title: nameVal || "First Adventure",
          startLocation: defaultLoc,
          playerLevel: "Levels 1–3",
          experiencePts: "",
          keyNpcs: "",
          plotHook: answerVal,
          battlesEnemiesXp: "",
          loot: "",
          description: "",
          battleMapUrl: ""
        });
      } else {
        sysData.adventures[0] = {
          ...sysData.adventures[0],
          title: nameVal || sysData.adventures[0].title,
          startLocation: sysData.adventures[0].startLocation || defaultLoc,
          plotHook: answerVal
        };
      }
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "plot-adventures",
          title: "Plot and Adventures",
          content: `Adventure 1: ${sysData.adventures[0].title}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "world-vibe",
    stage: "Stage 2: Driving Conflict",
    session1Order: 5,
    bigPictureOrder: 1,
    chapterId: "campaign-setting",
    sectionId: "overview",
    chapterLabel: "Ch. 1: Campaign Setting › Core Concept & Prompts",
    hasNameField: false,
    answerLabel: "World Era, Genre & Atmosphere",
    answerPlaceholder: "e.g., Gritty medieval fantasy after a fallen arcane empire, sun-drenched sky-pirate archipelago, gothic steampunk...",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "To properly categorize this world in our archives, what historical era, aesthetic tone, and genre conventions define daily life across the realm?";
      }
      if (persona === "bard") {
        return "Set the mood for the listeners! What kind of world are we stepping into—high heroic fantasy, grim survival, arcane steampunk, or something totally unique?";
      }
      return "Okay, give me the elevator pitch! What kind of vibe are we talking for this world—classic swords-and-sorcery, gritty low magic, sky-pirate steampunk, or something totally wild?!";
    },
    sparkIdeas: [
      "Post-apocalyptic high fantasy: civilization survives in walled city-states built inside the ruins of colossal fallen titans.",
      "Frontier arcane-western: rail lines powered by bound elementals push into untamed wilderness full of ancient elven vaults.",
      "Nautical age-of-sail fantasy: thousands of volcanic islands connected by storm-chasers, sea monsters, and rival merchant navies."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.timePeriod),
      nameValue: "",
      answerValue: ctx.timePeriod
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = { ...(existing?.systemData || {}), timePeriod: answerVal };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title: sysData.worldName || "Campaign Setting",
          content: `Setting: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "world-name-hook",
    stage: "Stage 2: Driving Conflict",
    session1Order: 6,
    bigPictureOrder: 2,
    chapterId: "campaign-setting",
    sectionId: "world-profile",
    chapterLabel: "Ch. 1: Campaign Setting › World Profile",
    hasNameField: true,
    nameLabel: "World or Realm Name",
    namePlaceholder: "e.g., Aethelgard, The Shattered Reach, Vaelora",
    answerLabel: "What Makes This World Instantly Memorable?",
    answerPlaceholder: "e.g., Two moons that control the tides of magic, a continent where the sun never fully sets, floating stone islands...",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "By what name do inhabitants call this world, and what cosmological or geographical trait sets it apart from all other planes?";
      }
      if (persona === "bard") {
        return "Every great legend has a name on the map! What do folks call this world, and what's the one unforgettable wonder everyone talks about?";
      }
      return "Every iconic fantasy world has a killer name and one cool signature quirk! What's your world called, and what makes someone say 'Whoa, I want to explore THAT'?!";
    },
    sparkIdeas: [
      "The Sundering Sea — a world where the ocean floor is a glowing crystalline abyss and islands float on giant coral rafts.",
      "Cinderfall — a realm locked in perpetual autumn where golden leaves fall year-round and carry faint whispers of past memories.",
      "Aurelia — a land lit by three moons, each governing a different school of magic as it waxes and wanes."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.worldName || ctx.setting.worldCharacteristics),
      nameValue: ctx.worldName,
      answerValue: ctx.setting.worldCharacteristics || ""
    }),
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = {
        ...(existing?.systemData || {}),
        worldName: nameVal || existing?.systemData?.worldName || "",
        worldCharacteristics: answerVal
      };
      const title = sysData.worldName || "Campaign Setting";
      if (existing) {
        await updateEntity(existing.id, { title, systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title,
          content: `World: ${title} — ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "central-tension",
    stage: "Stage 2: Driving Conflict",
    session1Order: 7,
    bigPictureOrder: 3,
    chapterId: "plot-adventures",
    sectionId: "central-tension",
    chapterLabel: "Ch. 2: Plot & Adventures › Central Tension",
    hasNameField: false,
    answerLabel: "The Overarching Crisis or Threat",
    answerPlaceholder: "What big conflict, war, curse, or looming disaster threatens the realm if nobody steps up?",
    getQuestion: (persona, ctx) => {
      const worldRef = ctx.worldName ? ` in ${ctx.worldName}` : "";
      if (persona === "scholar") {
        return `What monumental crisis, war, or upheaval is currently unfolding${worldRef} that will define this chapter of history?`;
      }
      if (persona === "bard") {
        return `Every ballad needs high stakes! What dark storm is gathering${worldRef} that threatens to turn everyone's lives upside down?`;
      }
      return `Okay, hit me with the big stakes! What huge crisis, war, or looming disaster is brewing${worldRef} that's going to make this campaign unforgettable?!`;
    },
    sparkIdeas: [
      "The ancient ward-stones sealing away an immortal lich-king are cracking one by one across the continent.",
      "A magical blight is turning iron and steel into brittle rust, throwing kingdoms into panic over dwindling weapons and tools.",
      "The immortal Empress vanished without naming an heir, and four ruthless dukes are racing to claim the throne."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.apocalypticEvent),
      nameValue: "",
      answerValue: ctx.apocalypticEvent
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "plot-adventures");
      const sysData = {
        apocalypticEvent: answerVal,
        eventCause: "",
        eventMotivation: "",
        howToStop: "",
        escalationPlotPoints: "",
        centralTensionSynopsis: "",
        adventures: [],
        miscNotes: "",
        ...(existing?.systemData || {}),
        apocalypticEvent: answerVal
      };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "plot-adventures",
          title: "Plot and Adventures",
          content: `Central Tension: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "main-villain",
    stage: "Stage 2: Driving Conflict",
    session1Order: 8,
    bigPictureOrder: 4,
    chapterId: "enemies",
    sectionId: "bbg-hierarchy",
    chapterLabel: "Ch. 4: Enemies › Main Villain & Hierarchy",
    hasNameField: true,
    nameLabel: "Main Villain (Big Bad Guy) Name & Title",
    namePlaceholder: "e.g., High Inquisitor Malakor, The Ashen Queen",
    answerLabel: "Why Are They Doing This? (Their Motivation)",
    answerPlaceholder: "What do they want to achieve, and why do they believe they're justified (or unstoppable)?",
    getQuestion: (persona, ctx) => {
      const crisisRef = ctx.apocalypticEvent
        ? ` behind "${ctx.apocalypticEvent.slice(0, 65)}${ctx.apocalypticEvent.length > 65 ? "..." : ""}"`
        : "";
      if (persona === "scholar") {
        return `Who is the primary architect${crisisRef}, and what ideology, grievance, or ambition drives their campaign?`;
      }
      if (persona === "bard") {
        return `A story is only as good as its villain! Who is the mastermind${crisisRef}, and what dark desire fuels their ambition?`;
      }
      return `Ooh, tell me about the Big Bad! Who is the main villain pulling the strings${crisisRef}, and why are they so determined to pull it off?!`;
    },
    sparkIdeas: [
      "A former paladin general who believes the gods abandoned mortals and is trying to forge a new god out of stolen souls.",
      "An aristocratic alchemist prince who discovered a way to grant immortality—at the cost of draining life from neighboring provinces.",
      "An ancient dragon disguising herself as a benevolent merchant guild leader to bankrupt and conquer rival kingdoms from within."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.mainVillain || ctx.villainMotivation),
      nameValue: ctx.mainVillain,
      answerValue: ctx.villainMotivation
    }),
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "enemies");
      const sysData = {
        mainVillain: "",
        villainMotivation: "",
        enemyHierarchy: "",
        alliedEnemiesList: "",
        enemies: [],
        miscNotes: "",
        ...(existing?.systemData || {}),
        mainVillain: nameVal || existing?.systemData?.mainVillain || "",
        villainMotivation: answerVal
      };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "enemies",
          title: "Enemies",
          content: `BBG: ${sysData.mainVillain}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "how-to-stop-crisis",
    stage: "Stage 2: Driving Conflict",
    session1Order: 9,
    bigPictureOrder: 5,
    chapterId: "plot-adventures",
    sectionId: "central-tension",
    chapterLabel: "Ch. 2: Plot & Adventures › Central Tension",
    hasNameField: false,
    answerLabel: "How Can the Heroes Turn the Tide?",
    answerPlaceholder: "Lost relics, fragile alliances, a hidden weakness, or a ritual that must be interrupted...",
    getQuestion: (persona, ctx) => {
      const villainRef = ctx.mainVillain ? `stop ${ctx.mainVillain}` : "stop the looming crisis";
      if (persona === "scholar") {
        return `According to prophecy or ancient lore, what artifacts, alliances, or stratagems are required to ${villainRef}?`;
      }
      if (persona === "bard") {
        return `Hope is never completely lost! What secret weakness, lost relic, or daring plan could actually ${villainRef}?`;
      }
      return `Wait—how can the heroes actually ${villainRef}?! Is there a lost artifact, a secret weakness, or an unlikely alliance they have to pull together?`;
    },
    sparkIdeas: [
      "Three shattered crown-keys hidden in ancient vaults must be reforged at the Mount of Dawn before the winter solstice.",
      "Convincing two bitterly feuding kingdoms to combine their navies before the enemy armada crosses the strait.",
      "Destroying the villain's three soul-anchors hidden inside monuments they built in their own honor."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.howToStop),
      nameValue: "",
      answerValue: ctx.howToStop
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "plot-adventures");
      const sysData = {
        apocalypticEvent: "",
        eventCause: "",
        eventMotivation: "",
        howToStop: answerVal,
        escalationPlotPoints: "",
        centralTensionSynopsis: "",
        adventures: [],
        miscNotes: "",
        ...(existing?.systemData || {}),
        howToStop: answerVal
      };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "plot-adventures",
          title: "Plot and Adventures",
          content: `Solution: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "major-faction",
    stage: "Stage 3: Powers & People",
    session1Order: 10,
    bigPictureOrder: 10,
    chapterId: "faction",
    sectionId: "faction-profiles",
    chapterLabel: "Ch. 6: Faction › Faction Sheets",
    hasNameField: true,
    nameLabel: "Faction / Guild / Order Name",
    namePlaceholder: "e.g., The Iron Vanguard, The Veilwalkers",
    answerLabel: "Their Goal, Reputation & Methods",
    answerPlaceholder: "What do they stand for, how do commoners view them, and what are they secretly after?",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "Which influential guild, order, or political faction wields significant sway in the realm, and what objective guides their actions?";
      }
      if (persona === "bard") {
        return "From knightly orders to shadowy syndicates—name one major faction making waves right now and what they're really after!";
      }
      return "I love faction politics! Tell me about one major guild, knightly order, or shadowy syndicate in your world—who are they and what's their big goal?!";
    },
    sparkIdeas: [
      "The Lantern Wardens — monster-hunting rangers who patrol the wild roads, respected by villagers but distrusted by corrupt nobles.",
      "The Gilded Ledger — a merchant banking syndicate whose debt contracts are enforced by bound shadow-assassins.",
      "The Ashen Choir — mystic scholars who collect forbidden magic items to lock them away before they can be misused."
    ],
    readState: (ctx) => {
      const f = ctx.factions.factions?.[0];
      return {
        isAnswered: Boolean(f && (f.factionName || f.motivationGoal)),
        nameValue: f?.factionName || "",
        answerValue: f?.motivationGoal || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "faction");
      const sysData = {
        opposingFactionsCount: "",
        playersAlliedOrAgainst: "",
        factionsHierarchy: "",
        factionsSummaryList: "",
        mainQuestInteraction: "",
        factions: [],
        miscNotes: "",
        ...(existing?.systemData || {})
      };
      if (sysData.factions.length === 0) {
        sysData.factions.push({
          factionName: nameVal || "Major Faction",
          imageUrl: "",
          leader: "",
          location: "",
          alignment: "",
          motivationGoal: answerVal,
          enemies: "",
          allies: "",
          characteristics: "",
          description: "",
          keyMembersRoles: ""
        });
      } else {
        sysData.factions[0] = {
          ...sysData.factions[0],
          factionName: nameVal || sysData.factions[0].factionName,
          motivationGoal: answerVal
        };
      }
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "faction",
          title: "Factions",
          content: `Faction: ${sysData.factions[0].factionName}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "connect-faction-town",
    stage: "Stage 3: Powers & People",
    session1Order: 11,
    bigPictureOrder: 11,
    chapterId: "campaign-setting",
    sectionId: "towns",
    chapterLabel: "Ch. 1: Campaign Setting › Towns & Cities (Rumors)",
    hasNameField: false,
    answerLabel: "Local Rumors & Faction Presence",
    answerPlaceholder: "What are townsfolk whispering about? Are agents recruiting, extorting, or protecting the town?",
    getQuestion: (persona, ctx) => {
      const townName = ctx.firstTown || "your starting town";
      const facName = ctx.firstFaction || "the local powers";
      if (persona === "scholar") {
        return `Connecting your threads: How does ${facName} exert influence or spark local rumors within ${townName}?`;
      }
      if (persona === "bard") {
        return `Word travels fast in taverns! What rumors are swirling around ${townName} regarding ${facName}?`;
      }
      return `Ooh, connect-the-dots time! You mentioned ${facName} and ${townName}—what rumors are going around town about what they're up to right now?!`;
    },
    sparkIdeas: [
      "Locals whisper that disguised agents have been buying up every silver weapon in town at double price.",
      "A mysterious bounty notice appeared on the town gate overnight bearing their wax seal—and no one admits to posting it.",
      "Two scouts from the faction vanished in the old ruins just outside town three nights ago."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.setting.towns?.[0]?.rumors),
      nameValue: "",
      answerValue: ctx.setting.towns?.[0]?.rumors || ""
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = { ...(existing?.systemData || {}) };
      const towns = Array.isArray(sysData.towns) ? [...sysData.towns] : [];
      if (towns.length === 0) {
        towns.push({
          name: "Starting Town",
          keyNpcs: "",
          notableLocations: "",
          localHistory: "",
          localGovernment: "",
          laws: "",
          socialEconomic: "",
          racesLanguages: "",
          rumors: answerVal,
          townMapUrl: ""
        });
      } else {
        towns[0] = { ...towns[0], rumors: answerVal };
      }
      sysData.towns = towns;
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title: sysData.worldName || "Campaign Setting",
          content: `Town Rumors: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "key-plot-npc",
    stage: "Stage 3: Powers & People",
    session1Order: 12,
    bigPictureOrder: 12,
    chapterId: "npc",
    sectionId: "key-npcs",
    chapterLabel: "Ch. 7: NPC › Key NPCs & Backstory",
    hasNameField: true,
    nameLabel: "Key NPC Name & Title",
    namePlaceholder: "e.g., Lady Seraphina Thorne, Archmage Vaelen",
    answerLabel: "Their Secret, Agenda & Connection to the Main Plot",
    answerPlaceholder: "What do they want, what secret are they hiding, and how will they help or complicate the party's journey?",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "Which pivotal patron, ruler, or enigmatic figure stands at the center of the main storyline, and what hidden motive shapes their counsel?";
      }
      if (persona === "bard") {
        return "Every epic has a dramatic patron or mysterious ally with an ace up their sleeve! Who is your biggest Key NPC, and what secret are they keeping?";
      }
      return "Who's the major plot-driving NPC—like a royal patron, mysterious mentor, or morally gray ally—and what secret agenda are they hiding behind their back?!";
    },
    sparkIdeas: [
      "The young Regent who hires the party to investigate treason—while secretly trying to break an ancestral blood-pact of their own.",
      "An eccentric scholar who deciphers ancient prophecies for the party, hiding the fact that they once served the villain.",
      "A charismatic rebel leader whose cause is just, but whose next planned strike could endanger innocent townsfolk."
    ],
    readState: (ctx) => {
      const k = ctx.npc.keyNpcs?.[0];
      return {
        isAnswered: Boolean(k && (k.name || k.motivation)),
        nameValue: k?.name || "",
        answerValue: k?.motivation || ""
      };
    },
    saveAnswer: async (entities, nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "npc");
      const sysData = {
        mainPlotNpcsNeeded: "",
        townNpcsNeeded: "",
        importantVsMinorNpcs: "",
        keyNpcs: [],
        minorNpcs: [],
        miscNotes: "",
        ...(existing?.systemData || {})
      };
      if (sysData.keyNpcs.length === 0) {
        sysData.keyNpcs.push({
          name: nameVal || "Key NPC",
          imageUrl: "",
          strength: "",
          dexterity: "",
          constitution: "",
          intelligence: "",
          wisdom: "",
          charisma: "",
          age: "",
          gender: "",
          race: "",
          alignment: "",
          profession: "",
          location: "",
          equipmentItems: "",
          appearance: "",
          languages: "",
          motivation: answerVal,
          plotHook: "",
          personality: "",
          backstory: ""
        });
      } else {
        sysData.keyNpcs[0] = {
          ...sysData.keyNpcs[0],
          name: nameVal || sysData.keyNpcs[0].name,
          motivation: answerVal
        };
      }
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "npc",
          title: "NPCs",
          content: `Key NPC: ${sysData.keyNpcs[0].name}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "magic-rules",
    stage: "Stage 4: Living World",
    session1Order: 13,
    bigPictureOrder: 13,
    chapterId: "campaign-setting",
    sectionId: "world-details",
    chapterLabel: "Ch. 1: Campaign Setting › Nature, Magic & Society",
    hasNameField: false,
    answerLabel: "How Magic & the Supernatural Work",
    answerPlaceholder: "Is magic common and sold in shops, feared by commoners, regulated by guilds, or wildly unpredictable?",
    getQuestion: (persona, ctx) => {
      const worldRef = ctx.worldName ? ` in ${ctx.worldName}` : "";
      if (persona === "scholar") {
        return `How is arcane or supernatural power sourced, practiced, and regulated by society${worldRef}?`;
      }
      if (persona === "bard") {
        return `Do folks light their hearths with cantrips, or do villagers cross the street when a spellcaster walks by? How does magic feel${worldRef}?`;
      }
      return `Tell me about the magic system${worldRef}! Is magic super common and everyday, rare and mysterious, or regulated by strict wizard guilds?!`;
    },
    sparkIdeas: [
      "Magic leaves visible glowing frost or embers on the caster's hands for hours, making secret spellcasting risky.",
      "Arcane spells are powered by harvested starlight stored in glass vials—and supplies are running dangerously low.",
      "Divine magic is common in cities, while wild primal magic rules the untamed forests beyond the walls."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.magicSystem),
      nameValue: "",
      answerValue: ctx.magicSystem
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "campaign-setting");
      const sysData = { ...(existing?.systemData || {}), magicSystem: answerVal };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "campaign-setting",
          title: sysData.worldName || "Campaign Setting",
          content: `Magic: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "faith-pantheon",
    stage: "Stage 4: Living World",
    session1Order: 14,
    bigPictureOrder: 14,
    chapterId: "deities",
    sectionId: "religion-overview",
    chapterLabel: "Ch. 5: Deities › Religion & Pantheon Overview",
    hasNameField: false,
    answerLabel: "Role of Gods, Faith & Patrons",
    answerPlaceholder: "Are the gods active and vocal, distant myths, locked in celestial war, or central to the main plot?",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "What role do deities, temples, and cosmological faiths play in the mortal affairs and central conflict of your world?";
      }
      if (persona === "bard") {
        return "Do the gods still answer prayers and walk among mortals, or are their temples echoes of an older age?";
      }
      return "What's the deal with the gods and religion in your world?! Are they super active in the main plot, or more distant legends that clerics pray to?";
    },
    sparkIdeas: [
      "The gods went silent a century ago, and now their abandoned cathedrals are suddenly relighting their sacred braziers.",
      "A tight pantheon of seven seasonal deities whose temples act as neutral sanctuaries across warring kingdoms.",
      "Mortals worship ancestral spirits and local river/mountain guardians rather than distant cosmic gods."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.deities.religionEssentialToPlot),
      nameValue: "",
      answerValue: ctx.deities.religionEssentialToPlot || ""
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "deities");
      const sysData = {
        religionEssentialToPlot: answerVal,
        godsCountFocus: "",
        playersNeedFollowers: "",
        godsAndCharacteristicsOverview: "",
        deities: [],
        miscNotes: "",
        ...(existing?.systemData || {}),
        religionEssentialToPlot: answerVal
      };
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "deities",
          title: "Deities",
          content: `Faith & Pantheon: ${answerVal}`,
          systemData: sysData
        });
      }
    }
  },
  {
    id: "wilderness-danger",
    stage: "Stage 4: Living World",
    session1Order: 15,
    bigPictureOrder: 15,
    chapterId: "random-encounters",
    sectionId: "encounter-tables",
    chapterLabel: "Ch. 3: Random Encounters › Encounter Table",
    hasNameField: false,
    answerLabel: "Signature Road or Wilderness Encounter",
    answerPlaceholder: "e.g., 1d4+1 Rust-Eater Wolves hunting at dusk, or a traveling clockwork merchant with a broken axle...",
    getQuestion: (persona, ctx) => {
      if (persona === "scholar") {
        return "What notable hazard, creature pack, or unexpected encounter awaits travelers who stray off the cobbles onto the wild roads?";
      }
      if (persona === "bard") {
        return "The road between towns is never quiet for long! What memorable monster or roadside encounter might ambush or surprise travelers on the journey?";
      }
      return "When the party hits the open road between towns, what's one awesome monster pack or wild roadside encounter they might run into?!";
    },
    sparkIdeas: [
      "1d4+1 Lantern-Moths — giant nocturnal moths whose hypnotic wing patterns lure travelers off the trail toward a spider nest.",
      "A desperate band of deserters guarding a broken bridge, willing to trade safe passage for food and healing.",
      "A wandering stone colossus covered in wildflowers that ignores travelers unless someone tries to mine the crystals on its back."
    ],
    readState: (ctx) => ({
      isAnswered: Boolean(ctx.encounters.rows?.[0]?.enemies),
      nameValue: "",
      answerValue: ctx.encounters.rows?.[0]?.enemies || ""
    }),
    saveAnswer: async (entities, _nameVal, answerVal) => {
      const existing = entities.find((e) => e.type === "random-encounters");
      const sysData = {
        rows: [],
        miscNotes: "",
        ...(existing?.systemData || {})
      };
      if (!Array.isArray(sysData.rows)) sysData.rows = [];
      if (sysData.rows.length === 0) {
        sysData.rows.push({
          day: "Lvl 1–3",
          night: "Lvl 1–3",
          enemies: answerVal
        });
      } else {
        sysData.rows[0] = {
          ...sysData.rows[0],
          enemies: answerVal
        };
      }
      if (existing) {
        await updateEntity(existing.id, { systemData: sysData });
      } else {
        await createEntity({
          type: "random-encounters",
          title: "Random Encounters",
          content: `1 encounter table row(s)`,
          systemData: sysData
        });
      }
    }
  }
];

/**
 * Returns the ordered prompt list sorted by the active Prep Path ("session1" vs "bigpicture").
 */
export function getOrderedPrompts() {
  const orderKey = guideSettings.prepPath === "bigpicture" ? "bigPictureOrder" : "session1Order";
  return [...PROMPT_TEMPLATES].sort((a, b) => a[orderKey] - b[orderKey]);
}

/**
 * Computes progress across all prompts for the current campaign's entities.
 */
export function getPromptProgress(entities = []) {
  const ctx = extractWorldContext(entities);
  const prompts = getOrderedPrompts();
  const items = prompts.map((p) => {
    const status = p.readState(ctx);
    return { prompt: p, ...status };
  });
  const answeredCount = items.filter((i) => i.isAnswered).length;
  const nextUnansweredIndex = items.findIndex((i) => !i.isAnswered);
  return {
    items,
    answeredCount,
    totalCount: items.length,
    nextUnansweredIndex: nextUnansweredIndex >= 0 ? nextUnansweredIndex : 0,
    nextPromptItem: items[nextUnansweredIndex >= 0 ? nextUnansweredIndex : 0] || items[0]
  };
}

// ============================================================================
// 4. HEADER SETTINGS BUTTON & GLOBAL SETTINGS MODAL
// ============================================================================

export function renderHeaderSettingsButton(container) {
  if (!container) return;
  const isParchment = getTheme() === "parchment";

  container.innerHTML = `
    <button type="button" id="open-global-settings-btn"
      title="Worldbuilding Guide & Theme Settings"
      class="rpg-btn-secondary text-xs px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center gap-1.5">
      <img src="${
        isParchment
          ? "./Parchwood_UI_Kit/042-square-parchment-gear-button.png"
          : "./GUI_Fantasy_RPG_Kit/settings-btn.png"
      }" data-parchment-src="./Parchwood_UI_Kit/042-square-parchment-gear-button.png"
         alt="Settings" class="w-4 h-4 object-contain" onerror="this.style.display='none'" />
      <span class="hidden sm:inline">Settings</span>
    </button>
  `;

  container.querySelector("#open-global-settings-btn")?.addEventListener("click", () => {
    openSettingsModal();
  });
}

export function openSettingsModal(onSettingsSaved = null) {
  let modal = document.getElementById("realmforge-settings-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "realmforge-settings-modal";
    modal.className = "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4";
    document.body.appendChild(modal);
  }

  const currentTheme = getTheme();

  modal.innerHTML = `
    <div class="rpg-panel-ornate rounded-2xl max-w-lg w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between gap-3 mb-2">
        <div class="flex items-center gap-2.5">
          <div class="rpg-slot-small w-9 h-9 p-1 shrink-0">
            <img src="./GUI_Fantasy_RPG_Kit/settings-btn.png"
                 data-parchment-src="./Parchwood_UI_Kit/042-square-parchment-gear-button.png"
                 alt="" class="w-5 h-5 object-contain" onerror="this.style.display='none'" />
          </div>
          <div>
            <h2 class="font-rpg-display text-lg font-bold text-amber-100">RealmForge Settings</h2>
            <p class="text-[11px] text-slate-400">Customize your Campaign Muse personality, prep order, and theme.</p>
          </div>
        </div>
        <button type="button" id="close-settings-modal-btn" class="rpg-icon-btn w-7 h-7" title="Close">
          <img src="./GUI_Fantasy_RPG_Kit/close-btn.png"
               data-parchment-src="./Parchwood_UI_Kit/038-round-crimson-close-button-with-cream-X.png"
               alt="Close" class="w-7 h-7 object-contain" onerror="this.outerHTML='<span class=\\'text-slate-400 hover:text-white\\'>✕</span>'" />
        </button>
      </div>

      <div class="rpg-divider my-4"></div>

      <div class="space-y-5">
        <!-- 1. Campaign Muse Personality -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-2">
            Campaign Muse Personality
          </label>
          <div class="space-y-2">
            ${Object.values(GUIDE_PERSONALITIES)
              .map((p) => {
                const isSelected = guideSettings.personality === p.id;
                return `
                  <label class="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-950/90 border-amber-400/60"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                  }">
                    <input type="radio" name="guide-personality" value="${p.id}" ${isSelected ? "checked" : ""}
                      class="mt-1 text-amber-500 focus:ring-amber-500" />
                    <div class="rpg-slot-small w-8 h-8 p-1 shrink-0">
                      <img src="${p.rpgIcon}" data-parchment-src="${p.parchmentIcon}" alt="" class="w-5 h-5 object-contain" onerror="this.style.display='none'" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs sm:text-sm font-bold text-white">${escapeHtml(p.name)}</span>
                        ${
                          p.id === "fan"
                            ? `<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/40">Default</span>`
                            : ""
                        }
                      </div>
                      <p class="text-xs text-slate-300 mt-0.5 leading-relaxed">${escapeHtml(p.tagline)}</p>
                    </div>
                  </label>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- 2. Worldbuilding Prep Path -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-2">
            Guided Prompt Order
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${Object.values(PREP_PATHS)
              .map((path) => {
                const isSelected = guideSettings.prepPath === path.id;
                return `
                  <label class="flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? "bg-slate-950/90 border-amber-400/60"
                      : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
                  }">
                    <input type="radio" name="guide-prep-path" value="${path.id}" ${isSelected ? "checked" : ""}
                      class="mt-0.5 text-amber-500 focus:ring-amber-500" />
                    <div>
                      <div class="text-xs font-bold text-white">${escapeHtml(path.name)}</div>
                      <p class="text-[11px] text-slate-300 mt-0.5 leading-snug">${escapeHtml(path.description)}</p>
                    </div>
                  </label>
                `;
              })
              .join("")}
          </div>
        </div>

        <!-- 3. Visual Theme -->
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-amber-200 mb-2">
            Visual Theme
          </label>
          <div class="grid grid-cols-2 gap-2.5">
            <button type="button" data-pick-theme="stone"
              class="settings-theme-btn p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                currentTheme === "stone"
                  ? "bg-slate-950/90 border-amber-400/60"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
              }">
              <span class="w-4 h-4 rounded-full bg-slate-800 border border-amber-400/60 shrink-0"></span>
              <div>
                <div class="text-xs font-bold text-white">Stone (Dark)</div>
                <div class="text-[10px] text-slate-400">Carved slate & gold</div>
              </div>
            </button>
            <button type="button" data-pick-theme="parchment"
              class="settings-theme-btn p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 ${
                currentTheme === "parchment"
                  ? "bg-slate-950/90 border-amber-400/60"
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700"
              }">
              <span class="w-4 h-4 rounded-full bg-amber-100 border border-amber-800/60 shrink-0"></span>
              <div>
                <div class="text-xs font-bold text-white">Parchment (Light)</div>
                <div class="text-[10px] text-slate-400">Sunlit oak & vellum</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="rpg-divider my-4"></div>

      <div class="flex justify-end gap-2">
        <button type="button" id="cancel-settings-modal-btn" class="rpg-btn-secondary px-4 py-2 text-xs font-medium rounded-lg">
          Cancel
        </button>
        <button type="button" id="save-settings-modal-btn" class="rpg-btn-primary px-4 py-2 text-xs font-semibold rounded-lg">
          Save Settings
        </button>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  if (window.lucide) window.lucide.createIcons();
  applyThemeToImages(modal);

  const closeModal = () => {
    modal.classList.add("hidden");
  };

  modal.querySelector("#close-settings-modal-btn")?.addEventListener("click", closeModal);
  modal.querySelector("#cancel-settings-modal-btn")?.addEventListener("click", closeModal);

  modal.querySelectorAll(".settings-theme-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextTheme = btn.getAttribute("data-pick-theme");
      setTheme(nextTheme);
      openSettingsModal(onSettingsSaved);
    });
  });

  modal.querySelector("#save-settings-modal-btn")?.addEventListener("click", () => {
    const selectedPersonality =
      modal.querySelector('input[name="guide-personality"]:checked')?.value || "fan";
    const selectedPath =
      modal.querySelector('input[name="guide-prep-path"]:checked')?.value || "session1";

    saveGuideSettings({
      personality: selectedPersonality,
      prepPath: selectedPath
    });

    closeModal();
    if (typeof onSettingsSaved === "function") {
      onSettingsSaved();
    } else {
      // Trigger a state refresh so active workspace banners immediately adopt the new personality
      setState({});
    }
  });
}

// ============================================================================
// 5. WORKSPACE "NEXT PROMPT" BANNER & INTERVIEW MODAL
// ============================================================================

/**
 * Renders the compact "Campaign Muse" prompt bar at the top of the workspace
 * and wires the sidebar trigger button.
 */
export function renderWorkspacePromptBanner(bannerSlot, state, onJumpToChapter) {
  if (!bannerSlot) return;

  const campId = state.activeCampaign?.id;
  if (hideBannerForCampaignId === campId) {
    bannerSlot.innerHTML = "";
    return;
  }

  const persona = GUIDE_PERSONALITIES[guideSettings.personality] || GUIDE_PERSONALITIES.fan;
  const ctx = extractWorldContext(state.entities);
  const progress = getPromptProgress(state.entities);
  const nextItem = progress.nextPromptItem;

  if (!nextItem) {
    bannerSlot.innerHTML = "";
    return;
  }

  const questionPreview = nextItem.prompt.getQuestion(persona.id, ctx);

  bannerSlot.innerHTML = `
    <div class="rpg-panel rounded-xl p-3.5 sm:p-4 mb-5">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="rpg-slot-medium w-10 h-10 p-1.5 shrink-0 mt-0.5">
            <img src="${persona.rpgIcon}" data-parchment-src="${persona.parchmentIcon}" alt="" class="w-6 h-6 object-contain" onerror="this.style.display='none'" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="rpg-slot-long text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                ${escapeHtml(persona.badge)} • ${progress.answeredCount}/${progress.totalCount} Answered
              </span>
              <span class="text-[11px] text-slate-400 truncate">${escapeHtml(nextItem.prompt.stage)}</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-100 leading-relaxed">
              "${escapeHtml(questionPreview)}"
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 self-end md:self-center">
          <button type="button" id="banner-answer-prompt-btn"
            class="rpg-btn-primary text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1.5">
            <i data-lucide="message-circle" class="w-3.5 h-3.5"></i>
            <span>Answer Prompt</span>
          </button>
          <button type="button" id="banner-guide-settings-btn" title="Change Guide Personality"
            class="rpg-btn-secondary text-xs px-2.5 py-2 rounded-lg">
            <i data-lucide="sliders-horizontal" class="w-3.5 h-3.5"></i>
          </button>
          <button type="button" id="dismiss-prompt-banner-btn" title="Hide Prompt Bar for Now"
            class="p-1.5 text-slate-400 hover:text-rose-400 rounded transition">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  bannerSlot.querySelector("#banner-answer-prompt-btn")?.addEventListener("click", () => {
    openPromptInterviewModal(state, progress.nextUnansweredIndex, onJumpToChapter);
  });

  bannerSlot.querySelector("#banner-guide-settings-btn")?.addEventListener("click", () => {
    openSettingsModal(() => renderWorkspacePromptBanner(bannerSlot, state, onJumpToChapter));
  });

  bannerSlot.querySelector("#dismiss-prompt-banner-btn")?.addEventListener("click", () => {
    hideBannerForCampaignId = campId;
    bannerSlot.innerHTML = "";
  });
}

/**
 * Opens the focused 1-Question-at-a-Time Worldbuilding Interview Modal.
 */
export function openPromptInterviewModal(state, startIndex = null, onJumpToChapter = null) {
  const progress = getPromptProgress(state.entities);
  if (typeof startIndex === "number" && startIndex >= 0 && startIndex < progress.items.length) {
    activePromptIndex = startIndex;
  } else if (activePromptIndex >= progress.items.length) {
    activePromptIndex = progress.nextUnansweredIndex;
  }

  activeSparkIndex = -1;

  let modal = document.getElementById("realmforge-prompt-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "realmforge-prompt-modal";
    modal.className = "fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4";
    document.body.appendChild(modal);
  }

  const renderModalContent = (toastMessage = "") => {
    const freshProgress = getPromptProgress(appState.entities);
    const ctx = extractWorldContext(appState.entities);
    const persona = GUIDE_PERSONALITIES[guideSettings.personality] || GUIDE_PERSONALITIES.fan;
    const currentItem = freshProgress.items[activePromptIndex] || freshProgress.items[0];
    const promptObj = currentItem.prompt;
    const questionText = promptObj.getQuestion(persona.id, ctx);

    const activeSpark =
      activeSparkIndex >= 0 && promptObj.sparkIdeas?.[activeSparkIndex]
        ? promptObj.sparkIdeas[activeSparkIndex]
        : null;

    modal.innerHTML = `
      <div class="rpg-panel-ornate rounded-2xl max-w-2xl w-full p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <!-- Top Modal Header -->
        <div class="flex items-center justify-between gap-3 mb-2">
          <div class="flex items-center gap-3 min-w-0">
            <div class="rpg-slot-big w-12 h-12 p-1.5 shrink-0">
              <img src="${persona.rpgIcon}" data-parchment-src="${persona.parchmentIcon}" alt="" class="w-7 h-7 object-contain" onerror="this.style.display='none'" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="font-rpg-display text-base sm:text-lg font-bold text-amber-100 truncate">
                  ${escapeHtml(persona.name)}
                </h2>
                <span class="rpg-slot-long text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                  ${freshProgress.answeredCount} of ${freshProgress.totalCount} Explored
                </span>
              </div>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">
                Auto-saves to: <strong class="text-amber-200">${escapeHtml(promptObj.chapterLabel)}</strong>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" id="interview-settings-btn" title="Switch Guide Personality"
              class="rpg-btn-secondary text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1">
              <i data-lucide="settings" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Guide</span>
            </button>
            <button type="button" id="close-prompt-modal-btn" class="rpg-icon-btn w-7 h-7" title="Close">
              <img src="./GUI_Fantasy_RPG_Kit/close-btn.png"
                   data-parchment-src="./Parchwood_UI_Kit/038-round-crimson-close-button-with-cream-X.png"
                   alt="Close" class="w-7 h-7 object-contain" onerror="this.outerHTML='<span class=\\'text-slate-400 hover:text-white\\'>✕</span>'" />
            </button>
          </div>
        </div>

        <div class="rpg-divider my-3.5"></div>

        ${
          toastMessage
            ? `<div class="mb-4 p-3 rounded-xl bg-emerald-950/75 border border-emerald-600/50 text-emerald-200 text-xs flex items-center gap-2">
                <i data-lucide="sparkles" class="w-4 h-4 shrink-0 text-emerald-400"></i>
                <span>${escapeHtml(toastMessage)}</span>
              </div>`
            : ""
        }

        <!-- Stage & Question Navigator -->
        <div class="flex items-center justify-between gap-2 mb-3 text-xs">
          <span class="font-semibold text-amber-300">${escapeHtml(promptObj.stage)}</span>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-400">Prompt ${activePromptIndex + 1} / ${freshProgress.totalCount}</span>
            ${
              currentItem.isAnswered
                ? `<span class="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/50 text-[10px] font-semibold">Answered ✓</span>`
                : `<span class="px-2 py-0.5 rounded-full bg-slate-900 text-slate-300 border border-slate-700 text-[10px]">Unanswered</span>`
            }
          </div>
        </div>

        <!-- Question Speech Box -->
        <div class="bg-slate-950/75 border border-amber-500/30 rounded-xl p-4 mb-4">
          <p class="text-sm sm:text-base text-amber-50 font-medium leading-relaxed">
            "${escapeHtml(questionText)}"
          </p>
        </div>

        <!-- Answer Form -->
        <div class="space-y-3.5">
          ${
            promptObj.hasNameField
              ? `
                <div>
                  <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    ${escapeHtml(promptObj.nameLabel || "Name / Title")}
                  </label>
                  <input type="text" id="prompt-name-input" value="${escapeHtml(currentItem.nameValue || "")}"
                    placeholder="${escapeHtml(promptObj.namePlaceholder || "")}"
                    class="w-full px-3.5 py-2 rounded-lg text-sm font-semibold focus:outline-none" />
                </div>
              `
              : ""
          }

          <div>
            <div class="flex items-center justify-between gap-2 mb-1">
              <label class="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                ${escapeHtml(promptObj.answerLabel || "Your Answer")}
              </label>
              <button type="button" id="spark-idea-btn"
                class="rpg-btn-secondary text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1">
                <i data-lucide="sparkles" class="w-3 h-3"></i>
                <span>Spark an Idea</span>
              </button>
            </div>
            <textarea id="prompt-answer-input" rows="4"
              placeholder="${escapeHtml(promptObj.answerPlaceholder || "")}"
              class="w-full px-3.5 py-2.5 rounded-lg text-sm leading-relaxed focus:outline-none">${escapeHtml(currentItem.answerValue || "")}</textarea>
          </div>

          ${
            activeSpark
              ? `
                <div class="p-3 rounded-xl bg-indigo-950/70 border border-indigo-500/40 text-xs text-indigo-100 flex items-start justify-between gap-3">
                  <div class="space-y-1">
                    <div class="font-bold text-amber-300 flex items-center gap-1">
                      <i data-lucide="lightbulb" class="w-3.5 h-3.5"></i> Idea Spark #${activeSparkIndex + 1}:
                    </div>
                    <p class="leading-relaxed">${escapeHtml(activeSpark)}</p>
                  </div>
                  <button type="button" id="use-spark-btn"
                    class="rpg-btn-secondary text-[11px] px-2.5 py-1 rounded shrink-0">
                    Use This
                  </button>
                </div>
              `
              : ""
          }
        </div>

        <div class="rpg-divider my-4"></div>

        <!-- Bottom Action Controls -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <button type="button" id="prev-prompt-btn" class="rpg-btn-secondary text-xs px-3 py-2 rounded-lg">
              ← Prev
            </button>
            <button type="button" id="skip-prompt-btn" class="rpg-btn-secondary text-xs px-3 py-2 rounded-lg">
              Ask Something Else →
            </button>
            ${
              typeof onJumpToChapter === "function"
                ? `
                  <button type="button" id="jump-to-chapter-btn" title="Open Full Chapter Sheet"
                    class="text-xs text-amber-300 hover:underline px-2 py-1.5">
                    Open Sheet ↗
                  </button>
                `
                : ""
            }
          </div>

          <button type="button" id="save-next-prompt-btn"
            class="rpg-btn-primary text-xs px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1.5">
            <i data-lucide="save" class="w-4 h-4"></i>
            <span>Save & Next Question →</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
    applyThemeToImages(modal);

    // Wire Close & Settings
    modal.querySelector("#close-prompt-modal-btn")?.addEventListener("click", () => {
      modal.classList.add("hidden");
    });

    modal.querySelector("#interview-settings-btn")?.addEventListener("click", () => {
      openSettingsModal(() => renderModalContent());
    });

    // Wire Spark Idea cycling
    modal.querySelector("#spark-idea-btn")?.addEventListener("click", () => {
      const ideas = promptObj.sparkIdeas || [];
      if (ideas.length === 0) return;
      activeSparkIndex = (activeSparkIndex + 1) % ideas.length;
      renderModalContent();
    });

    modal.querySelector("#use-spark-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#prompt-answer-input");
      if (box && activeSpark) {
        box.value = activeSpark;
      }
    });

    // Wire Previous / Skip
    modal.querySelector("#prev-prompt-btn")?.addEventListener("click", () => {
      activeSparkIndex = -1;
      activePromptIndex = (activePromptIndex - 1 + freshProgress.totalCount) % freshProgress.totalCount;
      renderModalContent();
    });

    modal.querySelector("#skip-prompt-btn")?.addEventListener("click", () => {
      activeSparkIndex = -1;
      activePromptIndex = (activePromptIndex + 1) % freshProgress.totalCount;
      renderModalContent();
    });

    // Wire Open Full Chapter Sheet
    modal.querySelector("#jump-to-chapter-btn")?.addEventListener("click", () => {
      modal.classList.add("hidden");
      if (typeof onJumpToChapter === "function") {
        onJumpToChapter(promptObj.chapterId, promptObj.sectionId);
      }
    });

    // Wire Save & Advance to Next Unanswered Prompt
    modal.querySelector("#save-next-prompt-btn")?.addEventListener("click", async () => {
      const saveBtn = modal.querySelector("#save-next-prompt-btn");
      const nameVal = modal.querySelector("#prompt-name-input")?.value.trim() || "";
      const answerVal = modal.querySelector("#prompt-answer-input")?.value.trim() || "";

      if (!nameVal && !answerVal) {
        activeSparkIndex = -1;
        activePromptIndex = (activePromptIndex + 1) % freshProgress.totalCount;
        renderModalContent();
        return;
      }

      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving to Tome...";
      }

      try {
        await promptObj.saveAnswer(appState.entities, nameVal, answerVal);
        activeSparkIndex = -1;

        const updatedProgress = getPromptProgress(appState.entities);
        const nextIdx = updatedProgress.items.findIndex(
          (item, idx) => idx > activePromptIndex && !item.isAnswered
        );
        if (nextIdx >= 0) {
          activePromptIndex = nextIdx;
        } else if (updatedProgress.nextUnansweredIndex >= 0 && !updatedProgress.items[updatedProgress.nextUnansweredIndex].isAnswered) {
          activePromptIndex = updatedProgress.nextUnansweredIndex;
        } else {
          activePromptIndex = (activePromptIndex + 1) % updatedProgress.totalCount;
        }

        renderModalContent(persona.savedToast);
      } catch (err) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save & Next Question →";
        }
      }
    });
  };

  renderModalContent();
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
