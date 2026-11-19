// firebase-config.js
// Initializes the Firebase App, Authentication, and Firestore Database using modular v10+ CDN imports.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCek_kKMWvKqdU-rYZGzQQ2JowYSTuhLcg",
  authDomain: "campaign-builder-ad44c.firebaseapp.com",
  projectId: "campaign-builder-ad44c",
  storageBucket: "campaign-builder-ad44c.firebasestorage.app",
  messagingSenderId: "546547882300",
  appId: "1:546547882300:web:b935753d707379fdce6639"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances for use across firebase-manager.js and ui-auth.js
export { app, auth, db };
