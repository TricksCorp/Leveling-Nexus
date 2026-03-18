/**
 * y-homeActiveQuest.js
 *
 * Renders the Active Quest card on home.html.
 * Shows the same in-progress state as the Quest page's In Progress tab
 * (timer bar, countdown, phase info) but replaces Accept / Reject / Complete
 * with a single "GO TO QUEST" button that navigates to quest.html.
 *
 * Drop-in: just include this script on home.html — no other changes needed.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
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

// ===============================
// STYLES
// ===============================
const _style = document.createElement("style");
_style.textContent = `
/* ── Home Active Quest card container ── */
#quest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* ── Quest row (same DNA as quest page ip-row) ── */
.haq-row {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid rgba(65,182,255,0.18);
  background: rgba(65,182,255,0.04);
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: border-color 0.2s;
}
.haq-row:hover { border-color: rgba(65,182,255,0.3); }

.haq-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.haq-title {
  font-family: "Orbitron", system-ui;
  font-size: 11px; font-weight: 700;
  color: #d9eefc;
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.haq-category {
  font-family: "Orbitron", system-ui;
  font-size: 9px; letter-spacing: 0px; flex-shrink: 0;
}
.haq-category.strength     { color: #ff8080; }
.haq-category.intelligence { color: #41b6ff; }
.haq-category.stamina      { color: #41ff88; }
.haq-category.health       { color: #41ff88; }
.haq-category.multi        { color: #41ff88; }

.haq-time {
  font-family: "Orbitron", system-ui;
  font-size: 9px; color: rgba(65,182,255,0.5); letter-spacing: 0px;
}

/* Timer bar */
.haq-bar-wrap {
  width: 100%; height: 4px;
  border-radius: 4px;
  background: rgba(65,182,255,0.08);
  overflow: hidden;
}
.haq-bar-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--neon), var(--neon-2));
  box-shadow: 0 0 6px rgba(65,182,255,0.5);
  transition: width 1s linear;
}
.haq-bar-fill.expiring {
  background: linear-gradient(90deg, #ffb800, #ff6b6b);
  box-shadow: 0 0 6px rgba(255,100,0,0.5);
}

/* Countdown */
.haq-countdown {
  font-family: "Orbitron", system-ui;
  font-size: 9px; color: rgba(65,182,255,0.6); letter-spacing: 0px;
}
.haq-countdown.expiring { color: #ffb800; }
.haq-countdown.critical { color: #ff6b6b; }

/* XP */
.haq-xp {
  font-family: "Orbitron", system-ui;
  font-size: 9px; color: rgba(65,182,255,0.4); letter-spacing: 0px;
}

/* Go To Quest button */
.haq-goto-btn {
  margin-top: 4px;
  padding: 5px 14px;
  font-family: "Orbitron", system-ui;
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
  color: #021726;
  background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border: none; border-radius: 7px; cursor: pointer;
  box-shadow: 0 0 8px rgba(65,182,255,0.5);
  transition: all 0.2s ease;
  align-self: flex-start;
}
.haq-goto-btn:hover  { transform: translateY(-1px); box-shadow: 0 0 14px rgba(65,182,255,0.8); }
.haq-goto-btn:active { transform: translateY(0); }

/* Phase badge (accepted/missed) */
.haq-phase-badge {
  font-family: "Orbitron", system-ui;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 8px; border-radius: 6px; white-space: nowrap;
  align-self: flex-start; margin-top: 4px;
}
.haq-phase-badge.accepted { background: rgba(65,255,130,0.1);  border: 1px solid rgba(65,255,130,0.4); color: #41ff88; }
.haq-phase-badge.missed   { background: rgba(255,80,80,0.1);   border: 1px solid rgba(255,80,80,0.3);  color: #ff6b6b; }

/* Empty state */
.haq-empty {
  font-family: "Orbitron", system-ui;
  font-size: 11px; color: rgba(217,238,252,0.2);
  text-align: center; padding: 18px 0; letter-spacing: 0.5px;
}
`;
document.head.appendChild(_style);

// ===============================
// HELPERS
// ===============================

// Day number (0=Sun … 6=Sat) → abbreviation
const DAY_NUM_TO_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

/**
 * Normalise a quest's days array to abbreviation strings.
 * Handles both number format [0,1,2,...] (Sleep quest from evaluation)
 * and string format ["Mon","Tue",...] (player-created quests).
 */
function normaliseDays(days) {
  if (!Array.isArray(days)) return [];
  return days.map(d => typeof d === "number" ? (DAY_NUM_TO_ABBR[d] || String(d)) : d);
}

/**
 * Returns the CSS class for a category.
 * Arrays with multiple entries → "multi" (green).
 */
function getCatClass(category) {
  if (Array.isArray(category)) {
    return category.length > 1 ? "multi" : (category[0] || "").toLowerCase();
  }
  return (category || "").toLowerCase();
}

/**
 * Returns the display string for a category.
 * Arrays are joined as "Health + Stamina".
 */
function getCatDisplay(category) {
  if (Array.isArray(category)) return category.join(" + ");
  return category || "—";
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getTodayAbbr() {
  return DAY_NUM_TO_ABBR[new Date().getDay()];
}

function minsToTime(tot) {
  const h = Math.floor(tot/60), m = tot%60, ap = h>=12?"PM":"AM", h12 = h%12||12;
  return `${h12}:${String(m).padStart(2,"0")} ${ap}`;
}

function fmtMs(ms) {
  const s = Math.max(0, Math.floor(ms/1000));
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2,"0")}s`;
  return `${sec}s`;
}

function getTodaySchedule(quest) {
  const now  = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    startMs: base.getTime() + quest.startMin * 60_000,
    endMs:   base.getTime() + quest.endMin   * 60_000
  };
}

function getQuestPhase(quest) {
  const today = getTodayAbbr();
  // normaliseDays converts number-based days (Sleep quest) to abbreviations
  // before comparing, so Sleep always matches correctly
  if (!normaliseDays(quest.days).includes(today)) return "not-today";

  const { startMs, endMs } = getTodaySchedule(quest);
  const now   = Date.now();
  const grace = endMs + 30 * 60_000;

  if (now < startMs - 30 * 60_000) return "too-early";
  if (now < startMs)                return "accept-window";
  if (now < endMs - 30 * 60_000)   return "late-accept";
  if (now < endMs)                  return "final-window";
  if (now < grace)                  return "grace";
  return "expired";
}

function calcActiveXP(quest, player) {
  const level = player.level ?? 1;
  const slots = quest.slots || (quest.endMin - quest.startMin) / 30;
  return slots * 100 * level;
}

// ===============================
// TIMER REGISTRY (for cleanup)
// ===============================
const _haqTimers = new Map();

// ===============================
// BUILD ROW
// ===============================
function buildHomeActiveRow(quest, player) {
  const phase          = getQuestPhase(quest);
  const { startMs, endMs } = getTodaySchedule(quest);
  const graceMs        = endMs + 30 * 60_000;

  // category can be a string or an array — normalise for display
  const catClass   = getCatClass(quest.category);
  const catDisplay = getCatDisplay(quest.category);

  const baseXP     = calcActiveXP(quest, player);
  const todayKey   = getTodayKey();
  const getIsAccepted = () =>
    quest.acceptedToday === true && quest.acceptedDateKey === todayKey;

  const row = document.createElement("div");
  row.className = "haq-row";

  // ── Header ──
  const header = document.createElement("div");
  header.className = "haq-header";
  header.innerHTML = `
    <div class="haq-title">${quest.title}</div>
    <div class="haq-category ${catClass}">${catDisplay}</div>
  `;
  row.appendChild(header);

  // ── Time label ──
  const timeLabel = document.createElement("div");
  timeLabel.className = "haq-time";
  timeLabel.textContent = `${minsToTime(quest.startMin)} – ${minsToTime(quest.endMin)}`;
  row.appendChild(timeLabel);

  // ── Timer bar ──
  const barWrap = document.createElement("div");
  barWrap.className = "haq-bar-wrap";
  const barFill = document.createElement("div");
  barFill.className = "haq-bar-fill";
  barWrap.appendChild(barFill);
  row.appendChild(barWrap);

  // ── Countdown ──
  const countdown = document.createElement("div");
  countdown.className = "haq-countdown";
  row.appendChild(countdown);

  // ── XP ──
  const xpLabel = document.createElement("div");
  xpLabel.className = "haq-xp";
  xpLabel.textContent = `XP: ${baseXP.toLocaleString()} × lvl`;
  row.appendChild(xpLabel);

  // ── Action area ──
  const actionArea = document.createElement("div");
  row.appendChild(actionArea);

  function refreshActionArea(currentPhase) {
    const accepted = getIsAccepted();
    const key = `${currentPhase}-${accepted}`;
    if (actionArea.dataset.key === key) return;
    actionArea.dataset.key = key;
    actionArea.innerHTML   = "";
    actionArea.style.cssText = "";

    if ((currentPhase === "final-window" || currentPhase === "grace") && !accepted) {
      // Missed window
      const badge = document.createElement("span");
      badge.className    = "haq-phase-badge missed";
      badge.textContent  = "MISSED — Go to Quest";
      badge.style.cursor = "pointer";
      badge.onclick      = () => toQuest();
      actionArea.appendChild(badge);

    } else if (accepted) {
      // Accepted — show badge + Go To Quest
      actionArea.style.cssText = "display:flex;align-items:center;gap:8px;margin-top:4px;";
      const badge = document.createElement("span");
      badge.className   = "haq-phase-badge accepted";
      badge.textContent = "ACCEPTED";
      actionArea.appendChild(badge);
      const btn = document.createElement("button");
      btn.className       = "haq-goto-btn";
      btn.textContent     = "GO TO QUEST";
      btn.style.marginTop = "0";
      btn.onclick         = () => toQuest();
      actionArea.appendChild(btn);

    } else {
      // Pending / available
      const btn = document.createElement("button");
      btn.className   = "haq-goto-btn";
      btn.textContent = "GO TO QUEST";
      btn.onclick     = () => toQuest();
      actionArea.appendChild(btn);
    }
  }

  // ── Live tick ──
  function tick() {
    const now          = Date.now();
    const currentPhase = getQuestPhase(quest);

    if (currentPhase === "expired") {
      clearInterval(timerHandle);
      _haqTimers.delete(quest.id);
      row.remove();
      _checkEmpty();
      return;
    }

    let barPct = 0, cdText = "", cdClass = "haq-countdown", expiring = false;

    if (currentPhase === "accept-window") {
      const elapsed = now - (startMs - 30 * 60_000);
      barPct = Math.min(100, (elapsed / (30 * 60_000)) * 100);
      cdText = `Accept by: ${fmtMs(startMs - now)}`;

    } else if (currentPhase === "late-accept" || currentPhase === "final-window") {
      const totalDur = endMs - startMs;
      barPct   = Math.max(0, 100 - ((now - startMs) / totalDur) * 100);
      expiring = (endMs - now) < 10 * 60_000;
      cdText   = `Ends in: ${fmtMs(endMs - now)}`;
      cdClass  = expiring ? "haq-countdown expiring" : "haq-countdown";

    } else if (currentPhase === "grace") {
      const elapsed = now - endMs;
      barPct = Math.min(100, (elapsed / (30 * 60_000)) * 100);
      barFill.classList.add("expiring");
      cdText  = `⚠ Grace: ${fmtMs(graceMs - now)}`;
      cdClass = "haq-countdown critical";
    }

    barFill.style.width   = `${barPct}%`;
    if (expiring) barFill.classList.add("expiring");
    countdown.className   = cdClass;
    countdown.textContent = cdText;

    refreshActionArea(currentPhase);
  }

  let timerHandle;
  tick();
  timerHandle = setInterval(tick, 1000);
  _haqTimers.set(quest.id, timerHandle);

  return row;
}

// ===============================
// NAVIGATION HELPER
// ===============================
function toQuest() {
  window.location.href = "/LEVELING-NEXUS/Quest.html";
}

// ===============================
// RENDER
// ===============================
function _checkEmpty() {
  const container = document.getElementById("quest-list");
  if (!container) return;
  if (container.querySelectorAll(".haq-row").length === 0) {
    container.innerHTML = `<div class="haq-empty">No active quests right now.</div>`;
  }
}

function renderHomeActiveQuests(activeQuests, player) {
  const container = document.getElementById("quest-list");
  if (!container) return;

  if (!container.dataset.loaded) {
    container.innerHTML = `<div class="haq-empty" style="color:rgba(65,182,255,0.4);">Loading...</div>`;
  }

  _haqTimers.forEach(t => clearInterval(t));
  _haqTimers.clear();
  container.innerHTML      = "";
  container.dataset.loaded = "true";

  const todayKey = getTodayKey();

  const relevant = activeQuests.filter(q => {
    const phase = getQuestPhase(q);
    if (phase === "not-today" || phase === "too-early" || phase === "expired") return false;
    if (q.rejectedToday  === true && q.rejectedDateKey  === todayKey) return false;
    if (q.completedToday === true && q.completedDateKey === todayKey) return false;
    if (q.expiredPenaltyDate === todayKey) return false;
    return true;
  });

  if (relevant.length === 0) {
    container.innerHTML = `<div class="haq-empty">No active quests right now.</div>`;
    return;
  }

  relevant.forEach(q => container.appendChild(buildHomeActiveRow(q, player)));
}

// ===============================
// POLLER — refresh every 30s
// ===============================
let _haqPollData = null;

setInterval(() => {
  if (_haqPollData) {
    renderHomeActiveQuests(_haqPollData.activeQuests, _haqPollData.player);
  }
}, 30_000);

// ===============================
// AUTH + LOAD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    _haqTimers.forEach(t => clearInterval(t));
    _haqTimers.clear();
    _haqPollData = null;
    return;
  }

  const gameDoc = await getDoc(doc(firestore, "gameData", user.uid));
  if (!gameDoc.exists()) return;

  const gameData   = gameDoc.data();
  const player     = gameData.player || {};
  const activeList = gameData.quests?.active || [];

  _haqPollData = { activeQuests: activeList, player };

  renderHomeActiveQuests(activeList, player);
});
