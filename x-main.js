import {} from "./z-getDocs.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBO6a6nJKh_edhLswQEIk07gnQI46UBrCQ",
  authDomain: "leveling-nexus-bdee1.firebaseapp.com",
  projectId: "leveling-nexus-bdee1",
  storageBucket: "leveling-nexus-bdee1.appspot.com",
  messagingSenderId: "360029039248",
  appId: "1:360029039248:web:99b73cb4e8a5e6fc08c615",
  measurementId: "G-4TFCZV1RWX",
  databaseURL: "https://leveling-nexus-bdee1-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

// Initialize Firebase
const app       = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth      = getAuth(app);

// ===============================
// PAGE FLAGS
// ===============================
const isProfilePage = document.body.classList.contains("profile");
const isHomePage    = document.body.classList.contains("home");

// ===============================
// TOAST NOTIFICATION
// Replaces alert() with a styled
// non-blocking toast message.
// ===============================
function showToast(msg, isError = false) {
  // Remove existing toast
  document.getElementById("app-toast")?.remove();

  const toast = document.createElement("div");
  toast.id = "app-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    border-radius: 10px;
    font-family: "Orbitron", system-ui;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
    z-index: 99999;
    white-space: nowrap;
    pointer-events: none;
    animation: toastIn 0.25s ease forwards;
    ${isError
      ? "background:rgba(255,80,80,0.12);border:1px solid rgba(255,80,80,0.35);color:#ff6b6b;"
      : "background:rgba(65,182,255,0.1);border:1px solid rgba(65,182,255,0.3);color:rgba(65,182,255,0.9);"
    }
  `;
  toast.textContent = msg;

  // Inject keyframe once
  if (!document.getElementById("toast-style")) {
    const s = document.createElement("style");
    s.id = "toast-style";
    s.textContent = `
      @keyframes toastIn  { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
      @keyframes toastOut { from { opacity:1; } to { opacity:0; } }
    `;
    document.head.appendChild(s);
  }

  document.body.appendChild(toast);

  // Auto-dismiss after 2.5s
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ===============================
// GAME DISPLAY
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  // Fetch data once
  const userDoc = await getDoc(doc(firestore, "users", user.uid));
  const gameDoc = await getDoc(doc(firestore, "gameData", user.uid));

  if (!userDoc.exists() || !gameDoc.exists()) return;

  const userData = userDoc.data();
  const gameData = gameDoc.data();
  const player   = gameData.player || {};
  const stats    = player.stats   || {};

  // ── Profile page ──
  if (isProfilePage) {
    document.getElementById("user-name").textContent  = userData.username;
    document.getElementById("user-level").textContent = player.level ?? 1;
    document.getElementById("user-class").textContent = player.class ?? "F";
    document.getElementById("stat-strength").textContent = stats.strength     ?? 0;
    document.getElementById("stat-intel").textContent    = stats.intelligence ?? 0;
    document.getElementById("stat-stam").textContent     = stats.stamina      ?? 0;
    document.getElementById("stat-health").textContent   = stats.health       ?? 0;
  }

  // ── Home page ──
  if (isHomePage) {
    const xp    = player.xp    ?? 0;
    const level = player.level ?? 1;
    const xpMax = level * 1000;

    // Stats
    document.getElementById("stat-strength").textContent = stats.strength     ?? 0;
    document.getElementById("stat-intel").textContent    = stats.intelligence ?? 0;
    document.getElementById("stat-stam").textContent     = stats.stamina      ?? 0;
    document.getElementById("stat-health").textContent   = stats.health       ?? 0;

    // Class and level
    document.getElementById("class-pill").textContent  = `CLASS: ${player.class ?? "F"}`;
    document.getElementById("level-num").textContent   = level;

    // XP bar
    document.getElementById("xp-text").textContent        = `${xp.toLocaleString()} / ${xpMax.toLocaleString()}`;
    document.getElementById("xp-fill").style.width        = `${Math.min((xp / xpMax) * 100, 100)}%`;
  }
});

// ===============================
// LOGOUT
// ===============================
const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async (event) => {
    event.preventDefault();

    try {
      await signOut(auth);
      showToast("Signed out successfully.");
      setTimeout(() => {
        window.location.href = "Login.html";
      }, 1000);
    } catch (err) {
      console.error("[logout]", err);
      showToast("Sign out failed — please try again.", true);
    }
  });
}