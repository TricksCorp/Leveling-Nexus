/**
 * activityLog.js
 *
 * Manages the activity log for Leveling Nexus.
 *
 * Storage: Firestore  →  history/{userId}/entries  (collection)
 * Each entry document:
 *   {
 *     ts:      number,   // Date.now() — used for ordering
 *     type:    "gain" | "loss" | "level" | "info",
 *     message: string,
 *     xp:      number    // positive = gain, negative = loss, 0 = info
 *   }
 *
 * Cap: 50 entries per player. When a new entry is added and the
 * count exceeds 50, the oldest entry is deleted.
 *
 * Renders into:
 *   home.html  →  #log
 *   quest.html →  .log-content
 *
 * Export:
 *   logActivity(userId, type, message, xp) — call from y-questSystem.js
 *     after every XP event.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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

const app       = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth      = getAuth(app);

const MAX_ENTRIES = 50;

// ===============================
// STYLES
// ===============================
const _style = document.createElement("style");
_style.textContent = `
.log-entry {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(65,182,255,0.07);
  font-family: "Orbitron", system-ui;
  animation: logFadeIn 0.3s ease forwards;
}
.log-entry:last-child { border-bottom: none; }

@keyframes logFadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.log-icon {
  font-size: 12px;
  flex-shrink: 0;
  margin-top: 1px;
  width: 16px;
  text-align: center;
}

.log-body { flex: 1; min-width: 0; }

.log-message {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-entry.gain  .log-message { color: #41ff88; }
.log-entry.loss  .log-message { color: #ff6b6b; }
.log-entry.level .log-message { color: #ffb800; }
.log-entry.info  .log-message { color: rgba(65,182,255,0.7); }

.log-xp {
  font-size: 9px;
  letter-spacing: 0.3px;
  margin-top: 1px;
}
.log-entry.gain  .log-xp { color: rgba(65,255,130,0.5); }
.log-entry.loss  .log-xp { color: rgba(255,80,80,0.5); }
.log-entry.level .log-xp { color: rgba(255,180,0,0.5); }
.log-entry.info  .log-xp { color: rgba(65,182,255,0.35); }

.log-time {
  font-size: 8px;
  color: rgba(65,182,255,0.25);
  letter-spacing: 0.3px;
  flex-shrink: 0;
  margin-top: 2px;
  white-space: nowrap;
}

.log-empty {
  font-family: "Orbitron", system-ui;
  font-size: 11px;
  color: rgba(217,238,252,0.2);
  text-align: center;
  padding: 18px 0;
  letter-spacing: 0.5px;
}

/* Scroll container for both #log and .log-content */
#log,
.log-content {
  max-height: 200px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(65,182,255,0.5) transparent;
}
#log::-webkit-scrollbar,
.log-content::-webkit-scrollbar       { width: 6px; }
#log::-webkit-scrollbar-track,
.log-content::-webkit-scrollbar-track { background: transparent; }
#log::-webkit-scrollbar-thumb,
.log-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(65,182,255,0.7), rgba(65,182,255,0.3));
  border-radius: 6px;
  box-shadow: 0 0 6px rgba(65,182,255,0.6);
}
`;
document.head.appendChild(_style);

// ===============================
// HELPERS
// ===============================
const ICONS = {
  gain:  "▲",
  loss:  "▼",
  level: "★",
  info:  "●"
};

function formatTime(ts) {
  const d   = new Date(ts);
  const now = new Date();
  const diffMs   = now - d;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHrs  = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1)   return "just now";
  if (diffMins < 60)  return `${diffMins}m ago`;
  if (diffHrs  < 24)  return `${diffHrs}h ago`;
  if (diffDays < 7)   return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatXP(xp, type) {
  if (type === "info" || type === "level" || xp === 0) return null;
  return xp > 0
    ? `+${xp.toLocaleString()} XP`
    : `${xp.toLocaleString()} XP`;
}

// ===============================
// RENDER
// ===============================
function getLogContainer() {
  // home.html uses #log, quest.html uses .log-content
  return document.getElementById("log") || document.querySelector(".log-content");
}

function renderEntries(entries) {
  const container = getLogContainer();
  if (!container) return;

  if (entries.length === 0) {
    container.innerHTML = `<div class="log-empty">No activity yet.</div>`;
    return;
  }

  container.innerHTML = "";

  entries.forEach(entry => {
    const el = document.createElement("div");
    el.className = `log-entry ${entry.type}`;

    const xpStr = formatXP(entry.xp, entry.type);

    el.innerHTML = `
      <div class="log-icon">${ICONS[entry.type] ?? "●"}</div>
      <div class="log-body">
        <div class="log-message">${entry.message}</div>
        ${xpStr ? `<div class="log-xp">${xpStr}</div>` : ""}
      </div>
      <div class="log-time">${formatTime(entry.ts)}</div>
    `;

    container.appendChild(el);
  });
}

// ===============================
// WRITE — exported for y-questSystem
// ===============================
/**
 * Add a log entry for the given user.
 * Automatically prunes the oldest entry if count exceeds MAX_ENTRIES.
 *
 * @param {string} userId
 * @param {"gain"|"loss"|"level"|"info"} type
 * @param {string} message  — short description, e.g. "+300 XP — Daily: 20 Push Ups"
 * @param {number} xp       — XP delta (positive = gain, negative = loss, 0 = info)
 */
export async function logActivity(userId, type, message, xp = 0) {
  if (!userId) return;

  try {
    const colRef = collection(firestore, "history", userId, "entries");

    // Add new entry
    await addDoc(colRef, {
      ts:      Date.now(),
      type,
      message,
      xp
    });

    // Prune: fetch all entries ordered oldest first, delete if over cap
    const allSnap = await getDocs(query(colRef, orderBy("ts", "asc")));
    if (allSnap.size > MAX_ENTRIES) {
      const toDelete = allSnap.docs.slice(0, allSnap.size - MAX_ENTRIES);
      await Promise.all(toDelete.map(d => deleteDoc(d.ref)));
    }

  } catch (err) {
    console.error("[activityLog] logActivity failed:", err);
  }
}

// ===============================
// LIVE LISTENER
// Subscribes to the last 50 entries
// in real-time so the log updates
// the moment a new entry is written.
// ===============================
let _unsubscribe = null;

function subscribeToLog(userId) {
  // Unsubscribe from any previous listener first
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

  const colRef = collection(firestore, "history", userId, "entries");
  const q      = query(colRef, orderBy("ts", "desc"), limit(MAX_ENTRIES));

  _unsubscribe = onSnapshot(q, (snap) => {
    const entries = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => b.ts - a.ts); // newest first
    renderEntries(entries);
  }, (err) => {
    console.error("[activityLog] onSnapshot error:", err);
  });
}

// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    subscribeToLog(user.uid);
  } else {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    const container = getLogContainer();
    if (container) container.innerHTML = "";
  }
});