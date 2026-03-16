/**
 * y-leaderboard.js
 *
 * Renders the leaderboard page for Leveling Nexus.
 *
 * Data source: leaderboard/{userId} collection (public mirror)
 * Ranking:     1st by level (desc), 2nd by xp (desc)
 * Display:     Top 3 podium at top, ranks 4–100 in scrollable list below.
 *              Current player's rank shown at the bottom regardless of position.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
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

// ===============================
// STYLES
// ===============================
const _style = document.createElement("style");
_style.textContent = `

/* ── Podium — top 3 ── */
.lb-podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 12px;
  padding: 20px 0 24px;
}

.lb-podium-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 130px;
  position: relative;
}

.lb-podium-slot.rank-1 { order: 2; }
.lb-podium-slot.rank-2 { order: 1; }
.lb-podium-slot.rank-3 { order: 3; }

.lb-podium-crown {
  font-size: 18px;
  line-height: 1;
}

.lb-podium-avatar {
  width: 52px; height: 52px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui;
  font-size: 18px; font-weight: 700;
  border: 2px solid transparent;
  position: relative;
}
.lb-podium-slot.rank-1 .lb-podium-avatar {
  width: 64px; height: 64px; font-size: 22px;
  border-color: #ffb800;
  background: rgba(255,180,0,0.12);
  box-shadow: 0 0 20px rgba(255,180,0,0.35);
  color: #ffb800;
}
.lb-podium-slot.rank-2 .lb-podium-avatar {
  border-color: rgba(192,192,192,0.7);
  background: rgba(192,192,192,0.08);
  box-shadow: 0 0 14px rgba(192,192,192,0.2);
  color: #c0c0c0;
}
.lb-podium-slot.rank-3 .lb-podium-avatar {
  border-color: rgba(205,127,50,0.7);
  background: rgba(205,127,50,0.08);
  box-shadow: 0 0 14px rgba(205,127,50,0.2);
  color: #cd7f32;
}

/* Inactive overlay on avatar */
.lb-podium-avatar.inactive::after {
  content: "z";
  position: absolute;
  top: -4px; right: -4px;
  font-size: 10px;
  color: rgba(255,255,255,0.4);
  font-family: "Orbitron", system-ui;
}

.lb-podium-name {
  font-family: "Orbitron", system-ui;
  font-size: 10px; font-weight: 700;
  color: #d9eefc;
  letter-spacing: 0.5px;
  text-align: center;
  max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.lb-podium-info {
  font-family: "Orbitron", system-ui;
  font-size: 9px;
  color: rgba(65,182,255,0.5);
  letter-spacing: 0.3px;
  text-align: center;
}

.lb-podium-rank-badge {
  font-family: "Orbitron", system-ui;
  font-size: 10px; font-weight: 700;
  padding: 3px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}
.lb-podium-slot.rank-1 .lb-podium-rank-badge {
  background: rgba(255,180,0,0.15);
  border: 1px solid rgba(255,180,0,0.4);
  color: #ffb800;
}
.lb-podium-slot.rank-2 .lb-podium-rank-badge {
  background: rgba(192,192,192,0.1);
  border: 1px solid rgba(192,192,192,0.3);
  color: #c0c0c0;
}
.lb-podium-slot.rank-3 .lb-podium-rank-badge {
  background: rgba(205,127,50,0.1);
  border: 1px solid rgba(205,127,50,0.3);
  color: #cd7f32;
}

/* Podium platform heights */
.lb-podium-platform {
  width: 100%;
  border-radius: 8px 8px 0 0;
  display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui;
  font-size: 16px; font-weight: 700;
}
.lb-podium-slot.rank-1 .lb-podium-platform {
  height: 44px; background: rgba(255,180,0,0.1);
  border: 1px solid rgba(255,180,0,0.25); border-bottom: none;
  color: #ffb800;
}
.lb-podium-slot.rank-2 .lb-podium-platform {
  height: 30px; background: rgba(192,192,192,0.06);
  border: 1px solid rgba(192,192,192,0.18); border-bottom: none;
  color: #c0c0c0;
}
.lb-podium-slot.rank-3 .lb-podium-platform {
  height: 22px; background: rgba(205,127,50,0.06);
  border: 1px solid rgba(205,127,50,0.18); border-bottom: none;
  color: #cd7f32;
}

/* ── Divider between podium and list ── */
.lb-divider {
  display: flex; align-items: center; gap: 10px;
  margin: 4px 0 12px;
  font-family: "Orbitron", system-ui;
  font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  color: rgba(65,182,255,0.3); text-transform: uppercase;
}
.lb-divider::before,
.lb-divider::after {
  content: ""; flex: 1; height: 1px;
  background: rgba(65,182,255,0.1);
}

/* ── Scrollable list (ranks 4–100) ── */
.lb-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 380px;
  overflow-y: auto;
  padding-right: 4px;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(65,182,255,0.08);
  background: rgba(65,182,255,0.03);
  transition: border-color 0.2s, background 0.2s;
}
.lb-row:hover {
  border-color: rgba(65,182,255,0.2);
  background: rgba(65,182,255,0.06);
}
.lb-row.is-me {
  border-color: rgba(65,182,255,0.35);
  background: rgba(65,182,255,0.08);
}

.lb-row-rank {
  font-family: "Orbitron", system-ui;
  font-size: 10px; font-weight: 700;
  color: rgba(65,182,255,0.45);
  width: 28px; flex-shrink: 0; text-align: right;
}

.lb-row-avatar {
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(65,182,255,0.08);
  border: 1px solid rgba(65,182,255,0.18);
  display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui;
  font-size: 11px; font-weight: 700;
  color: rgba(65,182,255,0.6);
  flex-shrink: 0;
  position: relative;
}
.lb-row-avatar.inactive { opacity: 0.45; }

.lb-row-name {
  font-family: "Orbitron", system-ui;
  font-size: 10px; font-weight: 700;
  color: #d9eefc;
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lb-row.is-me .lb-row-name { color: var(--neon); }

.lb-row-info {
  font-family: "Orbitron", system-ui;
  font-size: 9px;
  color: rgba(65,182,255,0.4);
  letter-spacing: 0.3px;
  flex-shrink: 0;
  text-align: right;
}

.lb-row-class {
  font-family: "Orbitron", system-ui;
  font-size: 9px; font-weight: 700;
  padding: 2px 7px; border-radius: 5px;
  flex-shrink: 0;
  background: rgba(65,182,255,0.08);
  border: 1px solid rgba(65,182,255,0.2);
  color: rgba(65,182,255,0.6);
  letter-spacing: 0.5px;
}

/* ── Your rank card ── */
.your-current-rank {
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid rgba(65,182,255,0.25);
  background: rgba(65,182,255,0.05);
}
.your-current-rank .section-title {
  margin-bottom: 10px;
}
.current-rank-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.current-rank-info .rank {
  font-family: "Orbitron", system-ui;
  font-size: 22px; font-weight: 700;
  color: var(--neon);
  text-shadow: 0 0 10px rgba(65,182,255,0.4);
  flex-shrink: 0;
}
.current-rank-info .name {
  font-family: "Orbitron", system-ui;
  font-size: 12px; font-weight: 700;
  color: #d9eefc; flex: 1;
}
.current-rank-info .class {
  font-family: "Orbitron", system-ui;
  font-size: 10px;
  color: rgba(65,182,255,0.5);
}

/* ── Loading / empty ── */
.lb-loading, .lb-empty {
  font-family: "Orbitron", system-ui;
  font-size: 11px;
  color: rgba(65,182,255,0.35);
  text-align: center;
  padding: 24px 0;
  letter-spacing: 0.5px;
}

/* ── Inactive badge in list ── */
.lb-inactive-tag {
  font-family: "Orbitron", system-ui;
  font-size: 8px; font-weight: 700;
  padding: 2px 5px; border-radius: 4px;
  background: rgba(255,180,0,0.08);
  border: 1px solid rgba(255,180,0,0.2);
  color: rgba(255,180,0,0.5);
  letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* ── Profile modal ── */
.lb-profile-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: lbFadeIn 0.2s ease forwards;
}
@keyframes lbFadeIn {
  from { opacity: 0; } to { opacity: 1; }
}

.lb-profile-modal {
  background: rgba(20,20,40,0.97);
  border-radius: var(--radius, 14px);
  padding: 28px 24px 24px;
  width: 300px;
  border: 1px solid rgba(65,182,255,0.4);
  box-shadow: 0 0 12px rgba(65,182,255,0.4), 0 0 30px rgba(65,182,255,0.15),
              0 10px 40px rgba(0,0,0,0.7);
  position: relative;
  animation: lbSlideUp 0.25s ease forwards;
}
@keyframes lbSlideUp {
  from { transform: translateY(16px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.lb-profile-close {
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; font-family: "Orbitron", system-ui;
  color: #021726;
  background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-radius: 7px; cursor: pointer;
  box-shadow: 0 0 8px rgba(65,182,255,0.5);
  transition: all 0.2s ease;
}
.lb-profile-close:hover { transform: translateY(-1px); }

.lb-profile-avatar {
  width: 64px; height: 64px;
  border-radius: 50%;
  margin: 0 auto 12px;
  display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui;
  font-size: 24px; font-weight: 700;
  border: 2px solid rgba(65,182,255,0.4);
  background: rgba(65,182,255,0.08);
  color: rgba(65,182,255,0.8);
  box-shadow: 0 0 16px rgba(65,182,255,0.2);
}

.lb-profile-name {
  font-family: "Orbitron", system-ui;
  font-size: 14px; font-weight: 700;
  color: #d9eefc;
  text-align: center;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.lb-profile-rank {
  font-family: "Orbitron", system-ui;
  font-size: 10px;
  color: rgba(65,182,255,0.5);
  text-align: center;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
}

.lb-profile-class-badge {
  display: inline-flex;
  align-items: center; justify-content: center;
  padding: 4px 14px; border-radius: 8px;
  font-family: "Orbitron", system-ui;
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  background: rgba(65,182,255,0.1);
  border: 1px solid rgba(65,182,255,0.3);
  color: var(--neon);
  margin: 0 auto 16px;
  display: block; text-align: center;
  width: fit-content;
}

.lb-profile-xp-bar-wrap {
  height: 4px; border-radius: 4px;
  background: rgba(65,182,255,0.08);
  overflow: hidden; margin-bottom: 4px;
}
.lb-profile-xp-bar-fill {
  height: 100%; border-radius: 4px;
  background: linear-gradient(90deg, var(--neon), var(--neon-2));
  box-shadow: 0 0 6px rgba(65,182,255,0.4);
}
.lb-profile-xp-text {
  font-family: "Orbitron", system-ui;
  font-size: 9px; color: rgba(65,182,255,0.4);
  display: flex; justify-content: space-between;
  margin-bottom: 16px;
}

.lb-profile-stats {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 8px; margin-bottom: 14px;
}
.lb-profile-stat {
  padding: 8px 10px; border-radius: 8px;
  background: rgba(65,182,255,0.04);
  border: 1px solid rgba(65,182,255,0.1);
  text-align: center;
}
.lb-profile-stat-label {
  font-family: "Orbitron", system-ui;
  font-size: 8px; font-weight: 700; letter-spacing: 1px;
  color: rgba(65,182,255,0.4); text-transform: uppercase;
  margin-bottom: 4px;
}
.lb-profile-stat-value {
  font-family: "Orbitron", system-ui;
  font-size: 18px; font-weight: 700;
  color: #d9eefc;
}

.lb-profile-status {
  display: flex; align-items: center; justify-content: center;
  gap: 6px;
  font-family: "Orbitron", system-ui;
  font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 6px 12px; border-radius: 8px;
  margin-top: 4px;
}
.lb-profile-status.active {
  background: rgba(65,255,130,0.08);
  border: 1px solid rgba(65,255,130,0.25);
  color: #41ff88;
}
.lb-profile-status.inactive {
  background: rgba(255,180,0,0.08);
  border: 1px solid rgba(255,180,0,0.25);
  color: #ffb800;
}
`;
document.head.appendChild(_style);

// ===============================
// AVATAR HELPERS
// Must match the AVATARS list in y-profilePic.js
// ===============================
const _AVATAR_SRCS = {
  avatar_01: "./avatars/Beru.jpg",
  avatar_02: "./avatars/Bellion.jpg",
  avatar_03: "./avatars/Igris.jpg",
  avatar_04: "./avatars/Sung Jinwoo.jpg",
  avatar_05: "./avatars/Cha Hae-In.jpg",
  avatar_06: "./avatars/Go Gunhee.jpg",
  avatar_07: "./avatars/Liu Zhigang.jpg",
  avatar_08: "./avatars/Thomas Andre.jpg",
};
const _DEFAULT_AVATAR = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

function getAvatarSrc(avatarId) {
  if (!avatarId) return null; // null = show initial letter instead
  return _AVATAR_SRCS[avatarId] || null;
}

// ===============================
// HELPERS
// ===============================
function getInitial(username) {
  return (username || "?")[0].toUpperCase();
}

/**
 * Build avatar HTML — shows img if avatar is set, otherwise initial letter.
 * @param {string|null} avatarId
 * @param {string} username
 * @param {string} className  — CSS class for the container
 * @param {boolean} inactive
 */
function buildAvatarHTML(avatarId, username, className, inactive = false) {
  const src = getAvatarSrc(avatarId);
  const inactiveClass = inactive ? " inactive" : "";
  if (src) {
    return `<div class="${className}${inactiveClass}" style="padding:0;overflow:hidden;">
      <img src="${src}" alt="${username}"
           style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
           onerror="this.parentElement.textContent='${getInitial(username)}';this.remove();" />
    </div>`;
  }
  return `<div class="${className}${inactiveClass}">${getInitial(username)}</div>`;
}

// ===============================
// RANK SORTER
// Primary:   level descending
// Secondary: xp    descending
// ===============================
function rankSort(a, b) {
  if (b.level !== a.level) return b.level - a.level;
  return b.xp - a.xp;
}

// ===============================
// PROFILE MODAL
// ===============================
function openProfileModal(entry, rank) {
  if (document.querySelector(".lb-profile-overlay")) return;

  const level      = entry.level ?? 1;
  const xp         = entry.xp   ?? 0;
  const xpNeeded   = level * 1000;
  const xpPct      = Math.min(100, Math.round((xp / xpNeeded) * 100));
  const inactive   = entry.inactive === true;
  const initial    = (entry.username || "?")[0].toUpperCase();
  const days       = entry.daysSinceActive ?? 0;

  const statusText = inactive
    ? `Inactive — ${entry.daysSinceActive ?? "?"} day${entry.daysSinceActive !== 1 ? "s" : ""} ago`
    : days === 0 ? "Active today" : `Active ${days} day${days !== 1 ? "s" : ""} ago`;

  const overlay = document.createElement("div");
  overlay.className = "lb-profile-overlay";

  const avatarSrc = getAvatarSrc(entry.avatar || null);
  const avatarHTML = avatarSrc
    ? `<div class="lb-profile-avatar" style="padding:0;overflow:hidden;">
         <img src="${avatarSrc}" alt="${entry.username}"
              style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
              onerror="this.parentElement.textContent='${initial}';this.remove();" />
       </div>`
    : `<div class="lb-profile-avatar">${initial}</div>`;

  const modal = document.createElement("div");
  modal.className = "lb-profile-modal";
  modal.innerHTML = `
    <div class="lb-profile-close">✕</div>
    ${avatarHTML}
    <div class="lb-profile-name">${entry.username ?? "Unknown"}</div>
    <div class="lb-profile-rank">Rank #${rank}</div>
    <div class="lb-profile-class-badge">CLASS ${entry.class ?? "F"} — LEVEL ${level}</div>

    <div class="lb-profile-xp-bar-wrap">
      <div class="lb-profile-xp-bar-fill" style="width:${xpPct}%"></div>
    </div>
    <div class="lb-profile-xp-text">
      <span>${xp.toLocaleString()} XP</span>
      <span>${xpNeeded.toLocaleString()} needed</span>
    </div>

    <div class="lb-profile-stats">
      <div class="lb-profile-stat">
        <div class="lb-profile-stat-label">Strength</div>
        <div class="lb-profile-stat-value">${entry.stats?.strength ?? 1}</div>
      </div>
      <div class="lb-profile-stat">
        <div class="lb-profile-stat-label">Intelligence</div>
        <div class="lb-profile-stat-value">${entry.stats?.intelligence ?? 1}</div>
      </div>
      <div class="lb-profile-stat">
        <div class="lb-profile-stat-label">Stamina</div>
        <div class="lb-profile-stat-value">${entry.stats?.stamina ?? 1}</div>
      </div>
      <div class="lb-profile-stat">
        <div class="lb-profile-stat-label">Health</div>
        <div class="lb-profile-stat-value">${entry.stats?.health ?? 1}</div>
      </div>
    </div>

    <div class="lb-profile-status ${inactive ? "inactive" : "active"}">
      ${inactive ? "⏸" : "▶"} ${statusText}
    </div>
  `;

  modal.querySelector(".lb-profile-close").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ===============================
// RENDER PODIUM (top 3)
// ===============================
function renderPodium(top3, currentUid) {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  // Clear existing static placeholder content
  container.innerHTML = "";

  if (top3.length === 0) {
    container.innerHTML = `<div class="lb-empty">No players yet.</div>`;
    return;
  }

  const podium = document.createElement("div");
  podium.className = "lb-podium";

  // Positions: rank-1 centre, rank-2 left, rank-3 right (CSS order handles this)
  const slots = [1, 2, 3];
  slots.forEach(rank => {
    const entry = top3[rank - 1];
    if (!entry) return;

    const isMe     = entry.uid === currentUid;
    const inactive = entry.inactive === true;
    const initial  = getInitial(entry.username);

    const slot = document.createElement("div");
    slot.className = `lb-podium-slot rank-${rank}`;

    const crownEmoji = rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉";

    slot.innerHTML = `
      <div class="lb-podium-crown">${rank === 1 ? crownEmoji : ""}</div>
      ${buildAvatarHTML(entry.avatar, entry.username, "lb-podium-avatar", inactive)}
      <div class="lb-podium-name">${entry.username}${isMe ? " (You)" : ""}</div>
      <div class="lb-podium-info">Lv.${entry.level} · ${entry.xp.toLocaleString()} XP</div>
      <div class="lb-podium-rank-badge">${entry.class}</div>
      ${inactive ? `<div class="lb-inactive-tag">INACTIVE</div>` : ""}
      <div class="lb-podium-platform">#${rank}</div>
    `;

    slot.style.cursor = "pointer";
    slot.addEventListener("click", () => openProfileModal(entry, rank));
    podium.appendChild(slot);
  });

  container.appendChild(podium);
}

// ===============================
// RENDER LIST (ranks 4–100)
// ===============================
function renderList(entries, currentUid) {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;

  // Remove any old list
  container.querySelector(".lb-divider")?.remove();
  container.querySelector(".lb-list")?.remove();

  if (entries.length <= 3) return; // nothing beyond top 3

  const divider = document.createElement("div");
  divider.className = "lb-divider";
  divider.textContent = "Rankings";
  container.appendChild(divider);

  const list = document.createElement("div");
  list.className = "lb-list";

  entries.slice(3).forEach((entry, idx) => {
    const rank     = idx + 4;
    const isMe     = entry.uid === currentUid;
    const inactive = entry.inactive === true;
    const initial  = getInitial(entry.username);

    const row = document.createElement("div");
    row.className = `lb-row${isMe ? " is-me" : ""}`;

    row.innerHTML = `
      <div class="lb-row-rank">#${rank}</div>
      ${buildAvatarHTML(entry.avatar, entry.username, "lb-row-avatar", inactive)}
      <div class="lb-row-name">${entry.username}${isMe ? " (You)" : ""}</div>
      ${inactive ? `<div class="lb-inactive-tag">INACTIVE</div>` : ""}
      <div class="lb-row-info">Lv.${entry.level} · ${entry.xp.toLocaleString()} XP</div>
      <div class="lb-row-class">${entry.class}</div>
    `;

    row.style.cursor = "pointer";
    row.addEventListener("click", () => openProfileModal(entry, rank));
    list.appendChild(row);
  });

  container.appendChild(list);
}

// ===============================
// RENDER YOUR RANK
// ===============================
function renderYourRank(entries, currentUid) {
  const rank    = entries.findIndex(e => e.uid === currentUid) + 1;
  const me      = entries.find(e => e.uid === currentUid);

  const rankEl  = document.querySelector(".current-rank-info .rank");
  const nameEl  = document.querySelector(".current-rank-info .name");
  const classEl = document.querySelector(".current-rank-info .class");

  if (!rankEl || !nameEl || !classEl) return;

  if (!me || rank === 0) {
    rankEl.textContent  = "#—";
    nameEl.textContent  = "Not ranked yet";
    classEl.textContent = "";
    return;
  }

  rankEl.textContent  = `#${rank}`;
  nameEl.textContent  = me.username;
  classEl.textContent = `Class ${me.class} · Level ${me.level} · ${me.xp.toLocaleString()} XP`;
}

// ===============================
// FULL RENDER
// ===============================
function renderLeaderboard(rawEntries, currentUid) {
  // Sort: level desc, then xp desc
  const sorted = [...rawEntries].sort(rankSort);

  renderPodium(sorted.slice(0, 3), currentUid);
  renderList(sorted, currentUid);
  renderYourRank(sorted, currentUid);
}

// ===============================
// LIVE LISTENER
// ===============================
let _unsubscribe = null;

function subscribeToLeaderboard(currentUid) {
  if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }

  // Fetch top 100 ordered by level desc — Firestore can't do multi-field
  // orderBy without a composite index, so we fetch by level and re-sort
  // by XP in JS for the tiebreaker.
  const q = query(
    collection(firestore, "leaderboard"),
    orderBy("level", "desc"),
    limit(100)
  );

  // Show loading state
  const container = document.getElementById("leaderboard-list");
  if (container) container.innerHTML = `<div class="lb-loading">Loading...</div>`;

  _unsubscribe = onSnapshot(q, (snap) => {
    const entries = snap.docs.map(d => ({ uid: d.id, ...d.data() }));
    renderLeaderboard(entries, currentUid);
  }, (err) => {
    console.error("[leaderboard] onSnapshot error:", err);
    const container = document.getElementById("leaderboard-list");
    if (container) container.innerHTML = `<div class="lb-empty">Failed to load leaderboard.</div>`;
  });
}

// ===============================
// AUTH
// ===============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    subscribeToLeaderboard(user.uid);
  } else {
    if (_unsubscribe) { _unsubscribe(); _unsubscribe = null; }
    const container = document.getElementById("leaderboard-list");
    if (container) container.innerHTML = "";
  }
});