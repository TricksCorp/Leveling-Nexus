import { refreshQuestCards } from "./y-questSystem.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
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
const modalStyle = document.createElement("style");
modalStyle.textContent = `
.quest-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.quest-modal {
  background: rgba(20,20,40,0.95);
  border-radius: var(--radius);
  padding: 24px; padding-top: 52px;
  width: 340px; max-height: 85vh; overflow-y: auto;
  border: 1px solid rgba(65,182,255,0.5);
  box-shadow: 0 0 10px rgba(65,182,255,0.6), 0 0 20px rgba(65,182,255,0.5),
    0 10px 30px rgba(0,0,0,0.6), inset 0 0 40px rgba(65,182,255,0.1);
  position: relative; color: #d9eefc;
}
.quest-modal-close {
  position: absolute; top: 12px; right: 12px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; font-family: "Orbitron", system-ui;
  color: #021726; background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-radius: 8px; cursor: pointer;
  box-shadow: 0 0 10px rgba(65,182,255,0.6), 0 4px 14px rgba(0,0,0,0.6);
  transition: all 0.2s ease;
}
.quest-modal-close:hover { transform: translateY(-1px); }
.quest-modal-close:active { transform: translateY(0); }
.quest-type {
  margin-top: 14px; padding: 12px 14px; text-align: center;
  font-family: "Orbitron", system-ui; font-size: 12px; font-weight: 700; letter-spacing: 1px;
  color: #021726; background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-radius: 10px; border: none; cursor: pointer;
  box-shadow: 0 0 10px rgba(65,182,255,0.6), 0 4px 14px rgba(0,0,0,0.6);
  transition: all 0.2s ease;
}
.quest-type:hover { transform: translateY(-1px); box-shadow: 0 0 14px rgba(65,182,255,0.85), 0 8px 20px rgba(0,0,0,0.7); }
.quest-type:active { transform: translateY(0); }
.quest-modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.quest-back {
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui; font-weight: 700;
  color: #021726; background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-radius: 8px; cursor: pointer;
  box-shadow: 0 0 10px rgba(65,182,255,0.6), 0 4px 14px rgba(0,0,0,0.6);
  transition: all 0.2s ease;
}
.quest-back:hover { transform: translateY(-1px); }
.quest-modal-title { font-weight: 700; letter-spacing: 1px; color: var(--neon); text-shadow: 0 0 6px rgba(65,182,255,0.25); }
.quest-input {
  width: 100%; padding: 12px 14px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.03);
  color: #d9eefc; font-family: "Orbitron", system-ui; font-size: 12px;
  outline: none; box-sizing: border-box;
}
.quest-input:focus { border-color: rgba(65,182,255,0.35); background: rgba(65,182,255,0.04); }
.quest-input-label {
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700; letter-spacing: 1.5px;
  color: rgba(65,182,255,0.5); text-transform: uppercase; margin: 12px 0 5px; display: block;
}
.quest-add-btn {
  margin-top: 20px; padding: 8px 18px;
  display: inline-flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui; font-size: 11px; font-weight: 700; letter-spacing: 1px;
  color: #021726; background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border: none; border-radius: 8px;
  box-shadow: 0 0 10px rgba(65,182,255,0.6), 0 4px 14px rgba(0,0,0,0.6);
  cursor: pointer; line-height: 1; transition: all 0.2s ease;
}
.quest-add-btn:hover { transform: translateY(-1px); box-shadow: 0 0 14px rgba(65,182,255,0.85), 0 8px 20px rgba(0,0,0,0.7); }
.quest-add-btn:active { transform: translateY(0); }
.quest-add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
.quest-error {
  margin-top: 10px; padding: 9px 12px; border-radius: 8px;
  background: rgba(255,80,80,0.08); border: 1px solid rgba(255,80,80,0.3);
  color: #ff8080; font-family: "Orbitron", system-ui; font-size: 10px; line-height: 1.5; letter-spacing: 0.3px;
}
/* Time pair (hour : minute selects) */
.quest-time-pair { display: flex; align-items: center; gap: 6px; }
.quest-time-pair .quest-time-sel { flex: 1; }
.quest-time-colon {
  font-family: "Orbitron", system-ui; font-size: 16px; font-weight: 700;
  color: rgba(65,182,255,0.5); flex-shrink: 0;
}
/* Day picker */
.quest-day-picker { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.quest-day-btn {
  width: 36px; height: 30px; display: flex; align-items: center; justify-content: center;
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  color: rgba(65,182,255,0.6); background: rgba(65,182,255,0.06);
  border: 1px solid rgba(65,182,255,0.2); border-radius: 7px; cursor: pointer; transition: all 0.15s ease;
}
.quest-day-btn.active {
  color: #021726; background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-color: transparent; box-shadow: 0 0 8px rgba(65,182,255,0.5);
}
.quest-day-btn:hover:not(.active) { border-color: rgba(65,182,255,0.4); background: rgba(65,182,255,0.1); }
/* XP preview */
.quest-xp-preview {
  margin-top: 12px; padding: 8px 12px; border-radius: 8px;
  background: rgba(65,182,255,0.06); border: 1px solid rgba(65,182,255,0.18);
  font-family: "Orbitron", system-ui; font-size: 10px; color: rgba(65,182,255,0.7);
  letter-spacing: 0.5px; line-height: 1.7;
}
.quest-xp-preview b { color: var(--neon); }
/* Saved quest list */
.saved-quests-section { margin-top: 24px; }
.saved-quests-label {
  font-family: "Orbitron", system-ui; font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
  color: rgba(65,182,255,0.6); text-transform: uppercase; margin-bottom: 8px;
}
.saved-quests-list { display: flex; flex-direction: column; gap: 6px; }
.saved-quest-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 10px;
  border: 1px solid rgba(65,182,255,0.15); background: rgba(65,182,255,0.05);
  transition: border-color 0.2s, background 0.2s;
}
.saved-quest-item:hover { border-color: rgba(65,182,255,0.3); background: rgba(65,182,255,0.08); }
.saved-quest-info { flex: 1; min-width: 0; }
.saved-quest-text { font-family: "Orbitron", system-ui; font-size: 11px; color: #d9eefc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.saved-quest-sub { font-family: "Orbitron", system-ui; font-size: 9px; color: rgba(65,182,255,0.45); margin-top: 2px; letter-spacing: 0.3px; }
.saved-quest-badge {
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 7px; border-radius: 6px; white-space: nowrap; flex-shrink: 0;
}
.saved-quest-badge.strength    { background: rgba(255,80,80,0.15); border: 1px solid rgba(255,80,80,0.4); color: #ff8080; }
.saved-quest-badge.intelligence { background: rgba(65,182,255,0.15); border: 1px solid rgba(65,182,255,0.4); color: #41b6ff; }
.saved-quest-badge.urgent      { background: rgba(255,180,0,0.15); border: 1px solid rgba(255,180,0,0.4); color: #ffb800; }
.saved-quests-empty  { font-family: "Orbitron", system-ui; font-size: 11px; color: rgba(217,238,252,0.3); text-align: center; padding: 10px 0; letter-spacing: 0.5px; }
.saved-quests-loading { font-family: "Orbitron", system-ui; font-size: 11px; color: rgba(65,182,255,0.5); text-align: center; padding: 10px 0; letter-spacing: 0.5px; }
.saved-quest-divider { border: none; border-top: 1px solid rgba(65,182,255,0.1); margin: 18px 0 0; }
.quest-count-badge {
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700;
  color: rgba(65,182,255,0.7); background: rgba(65,182,255,0.1);
  border: 1px solid rgba(65,182,255,0.2); border-radius: 6px; padding: 2px 7px; margin-left: auto;
}
/* Delete */
.quest-delete-btn {
  width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  font-size: 11px; font-weight: 700; font-family: "Orbitron", system-ui;
  color: #ff6b6b; background: rgba(255,80,80,0.1); border: 1px solid rgba(255,80,80,0.3);
  border-radius: 6px; cursor: pointer; transition: all 0.2s ease; line-height: 1;
}
.quest-delete-btn:hover { background: rgba(255,80,80,0.25); border-color: rgba(255,80,80,0.6); color: #ff4040; transform: translateY(-1px); box-shadow: 0 0 8px rgba(255,80,80,0.4); }
.quest-delete-btn:active { transform: translateY(0); }
.quest-delete-btn:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }
.quest-delete-confirm { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.quest-delete-confirm-yes {
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(255,80,80,0.5); background: rgba(255,80,80,0.2); color: #ff6b6b; cursor: pointer; transition: all 0.15s ease;
}
.quest-delete-confirm-yes:hover { background: rgba(255,80,80,0.4); border-color: #ff6b6b; }
.quest-delete-confirm-no {
  font-family: "Orbitron", system-ui; font-size: 9px; font-weight: 700; padding: 3px 8px; border-radius: 6px;
  border: 1px solid rgba(65,182,255,0.3); background: rgba(65,182,255,0.08); color: rgba(65,182,255,0.7); cursor: pointer; transition: all 0.15s ease;
}
.quest-delete-confirm-no:hover { background: rgba(65,182,255,0.18); border-color: rgba(65,182,255,0.6); }
/* Urgent deadline row */
.quest-deadline-row { display: flex; gap: 8px; align-items: center; }
.quest-deadline-row .quest-input { flex: 1; }
.quest-days-badge {
  font-family: "Orbitron", system-ui; font-size: 10px; font-weight: 700;
  padding: 8px 12px; border-radius: 8px; white-space: nowrap;
  background: rgba(255,180,0,0.08); border: 1px solid rgba(255,180,0,0.25);
  color: rgba(255,180,0,0.8); letter-spacing: 0.5px;
}
`;
document.head.appendChild(modalStyle);

// ===============================
// HELPERS
// ===============================
function timeToMinutes(t) { const [h,m] = t.split(":").map(Number); return h*60+m; }
function snapTo30(mins)   { return Math.floor(mins/30)*30; }
function rangesOverlap(s1,e1,s2,e2) { return s1 < e2 && s2 < e1; }
function minsToTime(tot) {
  const h=Math.floor(tot/60), m=tot%60, ap=h>=12?"PM":"AM", h12=h%12||12;
  return `${h12}:${String(m).padStart(2,"0")} ${ap}`;
}
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d-y0)/86400000+1)/7)).padStart(2,"0")}`;
}
function daysUntil(ts) { return Math.max(0, Math.ceil((ts-Date.now())/86400000)); }
function escapeHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function showError(el, msg) { el.textContent=msg; el.style.display="block"; }

// ===============================
// MODAL TYPE LIST
// ===============================
function showQuestTypeList(modal) {
  modal.innerHTML = `
    <div class="quest-modal-close">✕</div>
    <div class="quest-type" data-type="daily">DAILY QUEST</div>
    <div class="quest-type" data-type="active">ACTIVE QUEST</div>
    <div class="quest-type" data-type="urgent">URGENT QUEST</div>
  `;
  modal.querySelector(".quest-modal-close").onclick = closeCreateQuestModal;
  modal.querySelector('[data-type="daily"]').onclick  = () => showDailyQuestForm(modal);
  modal.querySelector('[data-type="active"]').onclick = () => showActiveQuestForm(modal);
  modal.querySelector('[data-type="urgent"]').onclick = () => showUrgentQuestForm(modal);
}

// ───────────────────────────────
// DAILY QUEST FORM
// ───────────────────────────────
async function showDailyQuestForm(modal) {
  modal.innerHTML = `
    <div class="quest-modal-header">
      <div class="quest-back">&lt;</div>
      <div class="quest-modal-title">DAILY QUEST</div>
      <div class="quest-count-badge" id="quest-count">— / 3</div>
    </div>
    <input class="quest-input" id="quest-text-input" type="text" placeholder="Task Description" />
    <select class="quest-input quest-category-select" style="margin-top:10px;">
      <option value="Strength">Strength</option>
      <option value="Intelligence">Intelligence</option>
    </select>
    <button class="quest-add-btn" id="quest-add-btn">ADD</button>
    <hr class="saved-quest-divider" />
    <div class="saved-quests-section">
      <div class="saved-quests-label">Saved Daily Quests</div>
      <div class="saved-quests-list" id="saved-quests-list"><div class="saved-quests-loading">Loading...</div></div>
    </div>
  `;
  modal.querySelector(".quest-back").onclick = () => showQuestTypeList(modal);
  const input = modal.querySelector("#quest-text-input");
  const cat   = modal.querySelector(".quest-category-select");
  const btn   = modal.querySelector("#quest-add-btn");
  const list  = modal.querySelector("#saved-quests-list");
  const badge = modal.querySelector("#quest-count");
  await renderSavedDailyQuests(list, badge);
  btn.onclick = async () => {
    const v = input.value.trim(); if (!v) return;
    btn.disabled = true;
    if (await addDailyQuestToFirestore(v, cat.value)) {
      input.value="";
      await renderSavedDailyQuests(list, badge);
      await refreshQuestCards();
    }
    btn.disabled = false;
  };
}

// ───────────────────────────────
// ACTIVE QUEST FORM
// ───────────────────────────────

/** Build the hour options (12 AM … 11 PM) for a <select> */
function buildHourOptions() {
  let html = `<option value="" disabled selected>HH</option>`;
  for (let h = 0; h < 24; h++) {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12  = h % 12 || 12;
    html += `<option value="${h}">${String(h12).padStart(2,"0")} ${ampm}</option>`;
  }
  return html;
}

/** Build the minute options — strictly 00 and 30 */
function buildMinuteOptions() {
  return `
    <option value="" disabled selected>MM</option>
    <option value="0">00</option>
    <option value="30">30</option>
  `;
}

/** Read selected total minutes from a pair of selects, or null if incomplete */
function readTimePair(hourSel, minSel) {
  const h = hourSel.value;
  const m = minSel.value;
  if (h === "" || m === "") return null;
  return parseInt(h) * 60 + parseInt(m);
}

async function showActiveQuestForm(modal) {
  const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  modal.innerHTML = `
    <div class="quest-modal-header">
      <div class="quest-back">&lt;</div>
      <div class="quest-modal-title">ACTIVE QUEST</div>
    </div>

    <label class="quest-input-label">Quest Title</label>
    <input class="quest-input" id="aq-title" type="text" placeholder="e.g. Morning Run" />

    <label class="quest-input-label">Category</label>
    <select class="quest-input" id="aq-cat">
      <option value="Strength">Strength</option>
      <option value="Intelligence">Intelligence</option>
    </select>

    <label class="quest-input-label">Start Time</label>
    <div class="quest-time-pair">
      <select class="quest-input quest-time-sel" id="aq-start-h">${buildHourOptions()}</select>
      <span class="quest-time-colon">:</span>
      <select class="quest-input quest-time-sel" id="aq-start-m">${buildMinuteOptions()}</select>
    </div>

    <label class="quest-input-label">End Time</label>
    <div class="quest-time-pair">
      <select class="quest-input quest-time-sel" id="aq-end-h">${buildHourOptions()}</select>
      <span class="quest-time-colon">:</span>
      <select class="quest-input quest-time-sel" id="aq-end-m">${buildMinuteOptions()}</select>
    </div>

    <label class="quest-input-label">Repeat Days</label>
    <div class="quest-day-picker" id="aq-days">
      ${DAYS.map(d=>`<div class="quest-day-btn" data-day="${d}">${d}</div>`).join("")}
    </div>

    <div class="quest-xp-preview" id="aq-preview" style="display:none;"></div>
    <div class="quest-error"      id="aq-error"   style="display:none;"></div>

    <button class="quest-add-btn" id="aq-add">ADD QUEST</button>

    <hr class="saved-quest-divider" />
    <div class="saved-quests-section">
      <div class="saved-quests-label">Saved Active Quests</div>
      <div class="saved-quests-list" id="aq-list"><div class="saved-quests-loading">Loading...</div></div>
    </div>
  `;
  modal.querySelector(".quest-back").onclick = () => showQuestTypeList(modal);

  // ── Day toggle ──
  const selectedDays = new Set();
  modal.querySelectorAll(".quest-day-btn").forEach(b => {
    b.addEventListener("click", () => {
      const d = b.dataset.day;
      if (selectedDays.has(d)) { selectedDays.delete(d); b.classList.remove("active"); }
      else                      { selectedDays.add(d);    b.classList.add("active"); }
      updatePreview();
    });
  });

  const titleEl    = modal.querySelector("#aq-title");
  const catEl      = modal.querySelector("#aq-cat");
  const startHEl   = modal.querySelector("#aq-start-h");
  const startMEl   = modal.querySelector("#aq-start-m");
  const endHEl     = modal.querySelector("#aq-end-h");
  const endMEl     = modal.querySelector("#aq-end-m");
  const previewEl  = modal.querySelector("#aq-preview");
  const errorEl    = modal.querySelector("#aq-error");
  const addBtn     = modal.querySelector("#aq-add");
  const listEl     = modal.querySelector("#aq-list");

  function updatePreview() {
    const s = readTimePair(startHEl, startMEl);
    const e = readTimePair(endHEl,   endMEl);
    if (s === null || e === null) { previewEl.style.display="none"; return; }
    const dur = e - s;
    if (dur <= 0) { previewEl.style.display="none"; return; }
    const slots = dur / 30;
    previewEl.style.display = "block";
    previewEl.innerHTML = `
      Duration: <b>${dur>=60?Math.floor(dur/60)+"h ":""}${dur%60?dur%60+"min":""}</b><br>
      XP per completion: <b>${slots*100} × player level</b><br>
      Accept window: <b>30 min before ${minsToTime(s)}</b><br>
      Finish window: <b>up to 30 min after ${minsToTime(e)}</b><br>
      <span style="opacity:0.55;font-size:9px;">
        Late accept: −200×lvl then −100×lvl per 30min ·
        Miss accept (30min before end): −400×lvl ·
        Fail to finish: −200×lvl
      </span>
    `;
  }
  [startHEl, startMEl, endHEl, endMEl].forEach(el => el.addEventListener("change", updatePreview));

  await renderSavedActiveQuests(listEl);

  addBtn.onclick = async () => {
    errorEl.style.display = "none";
    const title    = titleEl.value.trim();
    const days     = [...selectedDays];
    const startMin = readTimePair(startHEl, startMEl);
    const endMin   = readTimePair(endHEl,   endMEl);

    if (!title)              return showError(errorEl, "Quest title is required.");
    if (startMin === null)   return showError(errorEl, "Select a start time.");
    if (endMin   === null)   return showError(errorEl, "Select an end time.");
    if (days.length === 0)   return showError(errorEl, "Select at least one day.");
    if (endMin <= startMin)  return showError(errorEl, "End time must be after start time.");
    if ((endMin-startMin) < 30) return showError(errorEl, "Quest must be at least 30 minutes.");

    const user = auth.currentUser;
    if (!user) return showError(errorEl, "Not logged in.");
    addBtn.disabled = true;

    try {
      const gameRef  = doc(firestore,"gameData",user.uid);
      const snap     = await getDoc(gameRef);
      if (!snap.exists()) { showError(errorEl,"Player data not found."); addBtn.disabled=false; return; }

      const existing = snap.data().quests?.active || [];

      // Overlap check — same day AND overlapping time window
      for (const q of existing) {
        const shared = (q.days||[]).filter(d => days.includes(d));
        if (shared.length > 0 && rangesOverlap(startMin, endMin, q.startMin, q.endMin)) {
          showError(errorEl, `Conflicts with "${q.title}" on ${shared.join(", ")}.`);
          addBtn.disabled=false; return;
        }
      }

      existing.push({
        id:        `aq_${Date.now()}`,
        title,
        category:  catEl.value,
        days,
        startMin,
        endMin,
        slots:     (endMin-startMin)/30,
        status:    "pending",
        createdAt: Date.now()
      });

      await updateDoc(gameRef, { "quests.active": existing, updatedAt: Date.now() });

      // Reset form
      titleEl.value = "";
      startHEl.value = ""; startMEl.value = "";
      endHEl.value   = ""; endMEl.value   = "";
      selectedDays.clear();
      modal.querySelectorAll(".quest-day-btn").forEach(b => b.classList.remove("active"));
      previewEl.style.display = "none";
      await renderSavedActiveQuests(listEl);
      await refreshQuestCards();
    } catch(err) {
      console.error(err); showError(errorEl,"Failed to save. Try again.");
    }
    addBtn.disabled = false;
  };
}

// ───────────────────────────────
// URGENT QUEST FORM
// ───────────────────────────────
async function showUrgentQuestForm(modal) {
  const user = auth.currentUser;
  const snap = user ? await getDoc(doc(firestore,"gameData",user.uid)) : null;
  const data = snap?.exists() ? snap.data() : {};
  const player = data.player || {};
  const thisWeek  = getISOWeek(new Date());
  const urgentWeek = data.quests?.urgentWeek || { week: thisWeek, quests: [] };
  const urgentNext = data.quests?.urgentNextWeek || [];
  const thisCount  = urgentWeek.week===thisWeek ? (urgentWeek.quests||[]).length : 0;
  const nextCount  = urgentNext.length;

  modal.innerHTML = `
    <div class="quest-modal-header">
      <div class="quest-back">&lt;</div>
      <div class="quest-modal-title">URGENT QUEST</div>
      <div class="quest-count-badge" id="uq-count-badge">${thisCount}/3 wk · ${nextCount}/3 nxt</div>
    </div>
    <label class="quest-input-label">Quest Title</label>
    <input class="quest-input" id="uq-title" type="text" placeholder="e.g. Finish Project Report" />
    <label class="quest-input-label">Deadline (1–7 days from now)</label>
    <div class="quest-deadline-row">
      <input class="quest-input" id="uq-days" type="number" min="1" max="7" placeholder="e.g. 3" />
      <div class="quest-days-badge" id="uq-dl-label">— days</div>
    </div>
    <div class="quest-xp-preview" id="uq-preview" style="display:none;"></div>
    <div class="quest-error" id="uq-error" style="display:none;"></div>
    <button class="quest-add-btn" id="uq-add">ADD QUEST</button>
    <hr class="saved-quest-divider" />
    <div class="saved-quests-section">
      <div class="saved-quests-label" id="uq-this-label">This Week (${thisCount}/3)</div>
      <div class="saved-quests-list" id="uq-this-list"><div class="saved-quests-loading">Loading...</div></div>
    </div>
    <div class="saved-quests-section" style="margin-top:16px;">
      <div class="saved-quests-label" id="uq-next-label">Queued — Next Week (${nextCount}/3)</div>
      <div class="saved-quests-list" id="uq-next-list"><div class="saved-quests-loading">Loading...</div></div>
    </div>
  `;
  modal.querySelector(".quest-back").onclick = () => showQuestTypeList(modal);

  // Helper: re-fetch counts and update all badges in the urgent form
  async function refreshUrgentCounts() {
    if (!user) return;
    const freshSnap = await getDoc(doc(firestore,"gameData",user.uid));
    if (!freshSnap.exists()) return;
    const d2         = freshSnap.data();
    const cw         = getISOWeek(new Date());
    const uWeek      = d2.quests?.urgentWeek    || { week:cw, quests:[] };
    const uNext      = d2.quests?.urgentNextWeek || [];
    const tc = uWeek.week===cw ? (uWeek.quests||[]).length : 0;
    const nc = uNext.length;
    const badge      = modal.querySelector("#uq-count-badge");
    const thisLabel  = modal.querySelector("#uq-this-label");
    const nextLabel  = modal.querySelector("#uq-next-label");
    if (badge)     badge.textContent     = `${tc}/3 wk · ${nc}/3 nxt`;
    if (thisLabel) thisLabel.textContent = `This Week (${tc}/3)`;
    if (nextLabel) nextLabel.textContent = `Queued — Next Week (${nc}/3)`;
  }

  const titleEl   = modal.querySelector("#uq-title");
  const daysEl    = modal.querySelector("#uq-days");
  const dlLabel   = modal.querySelector("#uq-dl-label");
  const previewEl = modal.querySelector("#uq-preview");
  const errorEl   = modal.querySelector("#uq-error");
  const addBtn    = modal.querySelector("#uq-add");
  const thisListEl = modal.querySelector("#uq-this-list");
  const nextListEl = modal.querySelector("#uq-next-list");

  daysEl.addEventListener("input", () => {
    const d = parseInt(daysEl.value);
    if (!d||d<1||d>7) { dlLabel.textContent="— days"; previewEl.style.display="none"; return; }
    dlLabel.textContent = `${d} day${d>1?"s":""}`;
    const lvl      = player.level ?? 1;
    const maxXP    = 3000 * lvl;
    const decay    = Math.max(0, d-2);
    const earnedXP = Math.max(0, maxXP - decay * 500 * lvl);
    const dl       = new Date(Date.now()+d*86400000);
    previewEl.style.display = "block";
    previewEl.innerHTML = `
      Deadline: <b>${dl.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"})}</b><br>
      Max XP (complete day 1–2): <b>${maxXP.toLocaleString()}</b><br>
      XP if completed day ${d}: <b>${earnedXP.toLocaleString()}</b><br>
      Stat reward: <b>+1 all stats</b> (max 3 per week)<br>
      <span style="opacity:0.55;font-size:9px;">−500×lvl per day after day 2 · Fail penalty: −5000×lvl</span>
    `;
  });

  await renderSavedUrgentQuests(thisListEl, nextListEl);

  addBtn.onclick = async () => {
    errorEl.style.display = "none";
    const title = titleEl.value.trim();
    const days  = parseInt(daysEl.value);
    if (!title)                    return showError(errorEl,"Quest title is required.");
    if (!days||days<1||days>7)     return showError(errorEl,"Deadline must be 1–7 days.");
    if (!user)                     return showError(errorEl,"Not logged in.");
    addBtn.disabled = true;
    try {
      const gameRef = doc(firestore,"gameData",user.uid);
      const snap2   = await getDoc(gameRef);
      if (!snap2.exists()) { showError(errorEl,"Player data not found."); addBtn.disabled=false; return; }

      const d2         = snap2.data();
      const cw         = getISOWeek(new Date());
      const uWeek      = d2.quests?.urgentWeek    || { week:cw, quests:[] };
      const uNext      = d2.quests?.urgentNextWeek || [];
      if (uWeek.week!==cw) { uWeek.week=cw; uWeek.quests=[]; }

      if (uWeek.quests.length>=3 && uNext.length>=3) {
        showError(errorEl,"Max 3 quests this week + 3 queued for next week reached.");
        addBtn.disabled=false; return;
      }

      const newQ = {
        id:          `uq_${Date.now()}`,
        title,
        deadlineDays: days,
        deadlineTs:   Date.now()+days*86400000,
        status:       "pending",
        createdAt:    Date.now()
      };

      const updates = { updatedAt: Date.now() };
      if (uWeek.quests.length < 3) {
        uWeek.quests.push(newQ);
        updates["quests.urgentWeek"] = uWeek;
      } else {
        uNext.push(newQ);
        updates["quests.urgentNextWeek"] = uNext;
      }

      await updateDoc(gameRef, updates);
      titleEl.value=""; daysEl.value="";
      dlLabel.textContent="— days"; previewEl.style.display="none";
      await renderSavedUrgentQuests(thisListEl, nextListEl);
      await refreshUrgentCounts();
      await refreshQuestCards();
    } catch(err) { console.error(err); showError(errorEl,"Failed to save. Try again."); }
    addBtn.disabled=false;
  };
}

// ===============================
// RENDERERS
// ===============================
async function renderSavedDailyQuests(listEl, countBadge) {
  const user = auth.currentUser;
  if (!user) { listEl.innerHTML=`<div class="saved-quests-empty">Not logged in.</div>`; return; }
  listEl.innerHTML=`<div class="saved-quests-loading">Loading...</div>`;
  try {
    const snap = await getDoc(doc(firestore,"gameData",user.uid));
    if (!snap.exists()) { listEl.innerHTML=`<div class="saved-quests-empty">No data.</div>`; return; }
    const daily = snap.data().quests?.daily||[];
    if (countBadge) countBadge.textContent=`${daily.length} / 3`;
    if (!daily.length) { listEl.innerHTML=`<div class="saved-quests-empty">No daily quests yet.</div>`; return; }
    listEl.innerHTML = daily.map((q,i)=>`
      <div class="saved-quest-item" data-index="${i}">
        <span class="saved-quest-text">${escapeHtml(q.text)}</span>
        <span class="saved-quest-badge ${(q.category||"").toLowerCase()}">${q.category||"—"}</span>
        <button class="quest-delete-btn" data-index="${i}">✕</button>
      </div>`).join("");
    listEl.querySelectorAll(".quest-delete-btn").forEach(b=>{
      b.addEventListener("click",()=>showDeleteConfirm(b,+b.dataset.index,listEl,countBadge,"daily"));
    });
  } catch { listEl.innerHTML=`<div class="saved-quests-empty">Failed to load.</div>`; }
}

async function renderSavedActiveQuests(listEl) {
  const user = auth.currentUser;
  if (!user) { listEl.innerHTML=`<div class="saved-quests-empty">Not logged in.</div>`; return; }
  listEl.innerHTML=`<div class="saved-quests-loading">Loading...</div>`;
  try {
    const snap = await getDoc(doc(firestore,"gameData",user.uid));
    if (!snap.exists()) { listEl.innerHTML=`<div class="saved-quests-empty">No data.</div>`; return; }
    const active = snap.data().quests?.active||[];
    if (!active.length) { listEl.innerHTML=`<div class="saved-quests-empty">No active quests yet.</div>`; return; }
    listEl.innerHTML = active.map((q,i)=>`
      <div class="saved-quest-item" data-index="${i}">
        <div class="saved-quest-info">
          <div class="saved-quest-text">${escapeHtml(q.title)}</div>
          <div class="saved-quest-sub">${minsToTime(q.startMin)}–${minsToTime(q.endMin)} · ${(q.days||[]).join(", ")}</div>
        </div>
        <span class="saved-quest-badge ${(q.category||"").toLowerCase()}">${q.category||"—"}</span>
        <button class="quest-delete-btn" data-index="${i}">✕</button>
      </div>`).join("");
    listEl.querySelectorAll(".quest-delete-btn").forEach(b=>{
      b.addEventListener("click",()=>showDeleteConfirm(b,+b.dataset.index,listEl,null,"active"));
    });
  } catch { listEl.innerHTML=`<div class="saved-quests-empty">Failed to load.</div>`; }
}

async function renderSavedUrgentQuests(thisListEl, nextListEl) {
  const user = auth.currentUser;
  if (!user) { thisListEl.innerHTML=nextListEl.innerHTML=`<div class="saved-quests-empty">Not logged in.</div>`; return; }
  thisListEl.innerHTML=nextListEl.innerHTML=`<div class="saved-quests-loading">Loading...</div>`;
  try {
    const snap = await getDoc(doc(firestore,"gameData",user.uid));
    if (!snap.exists()) { thisListEl.innerHTML=nextListEl.innerHTML=`<div class="saved-quests-empty">No data.</div>`; return; }
    const d         = snap.data();
    const cw        = getISOWeek(new Date());
    const uWeek     = d.quests?.urgentWeek    || { week:cw, quests:[] };
    const uNext     = d.quests?.urgentNextWeek || [];
    const wq        = uWeek.week===cw ? (uWeek.quests||[]) : [];

    // This week
    if (!wq.length) {
      thisListEl.innerHTML=`<div class="saved-quests-empty">No urgent quests this week.</div>`;
    } else {
      thisListEl.innerHTML = wq.map((q,i)=>{
        const dl = daysUntil(q.deadlineTs);
        return `
          <div class="saved-quest-item" data-index="${i}">
            <div class="saved-quest-info">
              <div class="saved-quest-text">${escapeHtml(q.title)}</div>
              <div class="saved-quest-sub">${dl>0?dl+" day"+(dl!==1?"s":"")+" left":"⚠ Due today"}</div>
            </div>
            <span class="saved-quest-badge urgent">${q.status}</span>
            <button class="quest-delete-btn" data-index="${i}">✕</button>
          </div>`;
      }).join("");
      thisListEl.querySelectorAll(".quest-delete-btn").forEach(b=>{
        b.addEventListener("click",()=>showDeleteConfirm(b,+b.dataset.index,thisListEl,null,"urgentWeek"));
      });
    }

    // Next week queue
    if (!uNext.length) {
      nextListEl.innerHTML=`<div class="saved-quests-empty">No quests queued.</div>`;
    } else {
      nextListEl.innerHTML = uNext.map((q,i)=>`
        <div class="saved-quest-item" data-index="${i}">
          <div class="saved-quest-info">
            <div class="saved-quest-text">${escapeHtml(q.title)}</div>
            <div class="saved-quest-sub">${q.deadlineDays}-day deadline · queued</div>
          </div>
          <span class="saved-quest-badge urgent">queued</span>
          <button class="quest-delete-btn" data-index="${i}">✕</button>
        </div>`).join("");
      nextListEl.querySelectorAll(".quest-delete-btn").forEach(b=>{
        b.addEventListener("click",()=>showDeleteConfirm(b,+b.dataset.index,nextListEl,null,"urgentNextWeek"));
      });
    }
  } catch { thisListEl.innerHTML=`<div class="saved-quests-empty">Failed to load.</div>`; }
}

// ===============================
// DELETE FLOW (shared)
// ===============================
function showDeleteConfirm(btn, index, listEl, countBadge, scope) {
  const item = btn.closest(".saved-quest-item");
  btn.replaceWith(createConfirmButtons(index, item, listEl, countBadge, scope));
}

function createConfirmButtons(index, item, listEl, countBadge, scope) {
  const wrap = document.createElement("div");
  wrap.className = "quest-delete-confirm";
  const yesBtn = document.createElement("button");
  yesBtn.className="quest-delete-confirm-yes"; yesBtn.textContent="DEL";
  const noBtn  = document.createElement("button");
  noBtn.className="quest-delete-confirm-no";  noBtn.textContent="NO";

  yesBtn.onclick = async () => {
    yesBtn.disabled=noBtn.disabled=true;
    item.style.opacity="0.4"; item.style.transition="opacity 0.2s";
    const ok = await deleteQuestFromFirestore(index, scope);
    if (ok) {
      if (scope==="daily")           await renderSavedDailyQuests(listEl, countBadge);
      else if (scope==="active")     await renderSavedActiveQuests(listEl);
      else if (scope==="urgentWeek"||scope==="urgentNextWeek") {
        const allLists = listEl.closest(".quest-modal").querySelectorAll(".saved-quests-list");
        const arr = [...allLists];
        const tl  = arr.find(el=>el.id==="uq-this-list") || arr[arr.length-2];
        const nl  = arr.find(el=>el.id==="uq-next-list") || arr[arr.length-1];
        await renderSavedUrgentQuests(tl, nl);
        // Refresh urgent count badges — find refreshUrgentCounts via closure if available
        const badge     = listEl.closest(".quest-modal")?.querySelector("#uq-count-badge");
        const thisLabel = listEl.closest(".quest-modal")?.querySelector("#uq-this-label");
        const nextLabel = listEl.closest(".quest-modal")?.querySelector("#uq-next-label");
        const _currentUser = auth.currentUser;
        if (badge && _currentUser) {
          const freshSnap = await getDoc(doc(firestore,"gameData",_currentUser.uid));
          if (freshSnap.exists()) {
            const d2 = freshSnap.data();
            const cw = getISOWeek(new Date());
            const uw = d2.quests?.urgentWeek || { week:cw, quests:[] };
            const un = d2.quests?.urgentNextWeek || [];
            const tc = uw.week===cw ? (uw.quests||[]).length : 0;
            const nc = un.length;
            badge.textContent     = `${tc}/3 wk · ${nc}/3 nxt`;
            if (thisLabel) thisLabel.textContent = `This Week (${tc}/3)`;
            if (nextLabel) nextLabel.textContent = `Queued — Next Week (${nc}/3)`;
          }
        }
      }
      // Refresh main quest cards immediately after any delete
      await refreshQuestCards();
    } else {
      item.style.opacity="1";
      wrap.replaceWith(restoreDeleteBtn(index, listEl, countBadge, scope));
    }
  };
  noBtn.onclick = () => wrap.replaceWith(restoreDeleteBtn(index, listEl, countBadge, scope));
  wrap.appendChild(yesBtn); wrap.appendChild(noBtn);
  return wrap;
}

function restoreDeleteBtn(index, listEl, countBadge, scope) {
  const btn = document.createElement("button");
  btn.className="quest-delete-btn"; btn.dataset.index=index; btn.title="Delete"; btn.textContent="✕";
  btn.addEventListener("click",()=>showDeleteConfirm(btn,index,listEl,countBadge,scope));
  return btn;
}

async function deleteQuestFromFirestore(index, scope) {
  const user = auth.currentUser; if (!user) return false;
  try {
    const gameRef = doc(firestore,"gameData",user.uid);
    const snap    = await getDoc(gameRef);
    if (!snap.exists()) return false;
    const d = snap.data();
    let arr, key;

    if (scope==="daily")           { arr=d.quests?.daily||[];            key="quests.daily"; }
    else if (scope==="active")     { arr=d.quests?.active||[];           key="quests.active"; }
    else if (scope==="urgentNextWeek") { arr=d.quests?.urgentNextWeek||[]; key="quests.urgentNextWeek"; }
    else if (scope==="urgentWeek") {
      const uw = d.quests?.urgentWeek || { week:"", quests:[] };
      uw.quests.splice(index,1);
      await updateDoc(gameRef,{ "quests.urgentWeek":uw, updatedAt:Date.now() });
      return true;
    } else return false;

    if (index<0||index>=arr.length) return false;
    arr.splice(index,1);
    await updateDoc(gameRef,{ [key]:arr, updatedAt:Date.now() });
    return true;
  } catch(e) { console.error(e); return false; }
}

// ===============================
// MODAL OPEN / CLOSE
// ===============================
function openCreateQuestModal() {
  if (document.querySelector(".quest-overlay")) return;
  const overlay = document.createElement("div"); overlay.className="quest-overlay";
  const modal   = document.createElement("div"); modal.className="quest-modal";
  showQuestTypeList(modal);
  overlay.appendChild(modal); document.body.appendChild(overlay);
  document.body.style.overflow="hidden";
  overlay.addEventListener("click",e=>{ if(e.target===overlay) closeCreateQuestModal(); });
}
function closeCreateQuestModal() {
  document.querySelector(".quest-overlay")?.remove();
  document.body.style.overflow="";
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.querySelector(".add-quest .quest-btn");
  if (btn) btn.addEventListener("click", openCreateQuestModal);
});

// ===============================
// FIRESTORE: ADD DAILY QUEST
// ===============================
async function addDailyQuestToFirestore(taskText, category) {
  const user = auth.currentUser; if (!user) return false;
  const gameRef = doc(firestore,"gameData",user.uid);
  const snap    = await getDoc(gameRef); if (!snap.exists()) return false;
  const daily = snap.data().quests?.daily||[];
  if (daily.length>=3) { alert("Maximum daily quests already added."); return false; }
  daily.push({ text:taskText, category, createdAt:Date.now() });
  await updateDoc(gameRef,{ "quests.daily":daily, updatedAt:Date.now() });
  return true;
}