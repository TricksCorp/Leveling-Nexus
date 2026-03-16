/**
 * y-profilePic.js
 *
 * Manages the profile picture on profile.html.
 *
 * - Displays the current profile picture (stored in Firestore users/{uid}.avatar)
 * - Clicking the picture opens a picker modal with built-in avatar options
 * - Selected avatar is saved to Firestore and reflected immediately
 * - Also mirrors the avatar to leaderboard/{uid} so it shows on the leaderboard
 *
 * Built-in avatars: images stored in ./avatars/ folder in your project.
 * Add your images there and list them in the AVATARS array below.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
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
// BUILT-IN AVATARS
// Add your image filenames here.
// Place the images in ./avatars/ folder.
// ===============================
const AVATARS = [
  { id: "avatar_01", src: "./avatars/Beru.jpg",         label: "Beru" },
  { id: "avatar_02", src: "./avatars/Bellion.jpg",      label: "Bellion" },
  { id: "avatar_03", src: "./avatars/Igris.jpg",        label: "Igris" },
  { id: "avatar_04", src: "./avatars/Sung Jinwoo.jpg",  label: "Sung Jinwoo" },
  { id: "avatar_05", src: "./avatars/Cha Hae-In.jpg",   label: "Cha Hae-In" },
  { id: "avatar_06", src: "./avatars/Go Gunhee.jpg",    label: "Go Gunhee" },
  { id: "avatar_07", src: "./avatars/Liu Zhigang.jpg",  label: "Liu Zhigang" },
  { id: "avatar_08", src: "./avatars/Thomas Andre.jpg", label: "Thomas Andre" },
];

const DEFAULT_AVATAR = "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

// ===============================
// STYLES
// ===============================
const _style = document.createElement("style");
_style.textContent = `
/* ── Profile pic wrapper ── */
.profile-pic {
  position: relative;
  display: inline-block;
  cursor: pointer;
  flex-shrink: 0;
}

.profile-pic img {
  width: 100px; height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(65,182,255,0.3);
  transition: border-color 0.2s, box-shadow 0.2s;
  display: block;
}

.profile-pic:hover img {
  border-color: var(--neon);
  box-shadow: 0 0 14px rgba(65,182,255,0.5);
}

/* Change overlay on hover */
.profile-pic-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(2,23,38,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.profile-pic:hover .profile-pic-overlay { opacity: 1; }

.profile-pic-overlay span {
  font-family: "Orbitron", system-ui;
  font-size: 8px; font-weight: 700;
  color: var(--neon); letter-spacing: 0.5px;
  text-align: center; line-height: 1.3;
}

/* ── Picker modal ── */
.pp-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  z-index: 9999;
  animation: ppFade 0.2s ease forwards;
}
@keyframes ppFade {
  from { opacity: 0; } to { opacity: 1; }
}

.pp-modal {
  background: rgba(20,20,40,0.97);
  border-radius: var(--radius, 14px);
  padding: 28px 28px 24px;
  width: 680px; max-height: 88vh;
  overflow-y: auto;
  border: 1px solid rgba(65,182,255,0.45);
  box-shadow:
    0 0 12px rgba(65,182,255,0.4),
    0 0 30px rgba(65,182,255,0.12),
    0 10px 40px rgba(0,0,0,0.7);
  position: relative;
  animation: ppSlide 0.25s ease forwards;
}
@keyframes ppSlide {
  from { transform: translateY(14px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}

.pp-modal-close {
  position: absolute; top: 12px; right: 12px;
  width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; font-family: "Orbitron", system-ui;
  color: #021726;
  background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border-radius: 7px; cursor: pointer;
  box-shadow: 0 0 8px rgba(65,182,255,0.5);
  transition: transform 0.2s;
}
.pp-modal-close:hover { transform: translateY(-1px); }

.pp-modal-title {
  font-family: "Orbitron", system-ui;
  font-size: 13px; font-weight: 700; letter-spacing: 1px;
  color: var(--neon);
  text-shadow: 0 0 6px rgba(65,182,255,0.25);
  margin-bottom: 18px;
}

/* Avatar grid */
.pp-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.pp-avatar-btn {
  display: flex; flex-direction: column;
  align-items: center; gap: 5px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 2px solid rgba(65,182,255,0.1);
  background: rgba(65,182,255,0.03);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
}
.pp-avatar-btn:hover {
  border-color: rgba(65,182,255,0.4);
  background: rgba(65,182,255,0.08);
  transform: translateY(-2px);
}
.pp-avatar-btn.selected {
  border-color: var(--neon);
  background: rgba(65,182,255,0.12);
  box-shadow: 0 0 10px rgba(65,182,255,0.3);
}

.pp-avatar-btn img {
  width: 90px; height: 90px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(65,182,255,0.15);
  transition: transform 0.15s ease;
}
.pp-avatar-btn:hover img { transform: scale(1.04); }

.pp-avatar-label {
  font-family: "Orbitron", system-ui;
  font-size: 8px; font-weight: 700; letter-spacing: 0.5px;
  color: rgba(65,182,255,0.5);
  text-align: center;
  text-transform: uppercase;
}
.pp-avatar-btn.selected .pp-avatar-label { color: var(--neon); }

/* Save button */
.pp-save-btn {
  margin-top: 18px;
  width: 100%;
  padding: 10px;
  font-family: "Orbitron", system-ui;
  font-size: 11px; font-weight: 700; letter-spacing: 1px;
  color: #021726;
  background: linear-gradient(180deg, var(--neon), var(--neon-2));
  border: none; border-radius: 8px; cursor: pointer;
  box-shadow: 0 0 10px rgba(65,182,255,0.5);
  transition: all 0.2s ease;
}
.pp-save-btn:hover  { transform: translateY(-1px); box-shadow: 0 0 16px rgba(65,182,255,0.8); }
.pp-save-btn:active { transform: translateY(0); }
.pp-save-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

/* Error */
.pp-error {
  margin-top: 10px;
  font-family: "Orbitron", system-ui;
  font-size: 9px; color: #ff6b6b;
  text-align: center; letter-spacing: 0.3px;
}

/* ── Side-by-side layout: grid left, preview right ── */
.pp-body {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

/* Grid takes available width */
.pp-grid-wrap { flex: 1; min-width: 0; }

/* Preview panel — fixed width on the right */
.pp-preview {
  width: 160px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px 12px;
  border-radius: 12px;
  background: rgba(65,182,255,0.04);
  border: 1px solid rgba(65,182,255,0.15);
  position: sticky;
  top: 0;
}
.pp-preview-img {
  width: 130px; height: 130px;
  border-radius: 14px;
  object-fit: cover;
  border: 2px solid rgba(65,182,255,0.35);
  box-shadow: 0 0 20px rgba(65,182,255,0.25);
  transition: all 0.25s ease;
}
.pp-preview-title {
  font-family: "Orbitron", system-ui;
  font-size: 8px; font-weight: 700; letter-spacing: 1px;
  color: rgba(65,182,255,0.4); text-transform: uppercase;
}
.pp-preview-name {
  font-family: "Orbitron", system-ui;
  font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
  color: #d9eefc; text-align: center;
  line-height: 1.3;
}
.pp-preview-hint {
  font-family: "Orbitron", system-ui;
  font-size: 7px; color: rgba(65,182,255,0.3);
  letter-spacing: 0.3px; text-align: center;
  line-height: 1.4;
}
`;
document.head.appendChild(_style);

// ===============================
// HELPERS
// ===============================
function getAvatarSrc(avatarId) {
  if (!avatarId) return DEFAULT_AVATAR;
  const found = AVATARS.find(a => a.id === avatarId);
  return found ? found.src : DEFAULT_AVATAR;
}

function getProfileImg() {
  return document.querySelector(".profile-pic img");
}

// ===============================
// APPLY AVATAR TO PAGE
// ===============================
function applyAvatar(avatarId) {
  const img = getProfileImg();
  if (img) {
    img.src = getAvatarSrc(avatarId);
  }
}

// ===============================
// PICKER MODAL
// ===============================
function openPicker(currentAvatarId, onSave) {
  if (document.querySelector(".pp-overlay")) return;

  let selected = currentAvatarId || null;

  const overlay = document.createElement("div");
  overlay.className = "pp-overlay";

  const modal = document.createElement("div");
  modal.className = "pp-modal";

  // Grid of avatars
  const gridHTML = AVATARS.map(a => `
    <button class="pp-avatar-btn${selected === a.id ? " selected" : ""}"
            data-id="${a.id}" type="button">
      <img src="${a.src}" alt="${a.label}"
           onerror="this.src='${DEFAULT_AVATAR}'" />
      <div class="pp-avatar-label">${a.label}</div>
    </button>
  `).join("");

  const initialAvatar = AVATARS.find(a => a.id === selected);
  const previewSrc    = initialAvatar ? initialAvatar.src  : DEFAULT_AVATAR;
  const previewLabel  = initialAvatar ? initialAvatar.label : "None selected";

  modal.innerHTML = `
    <div class="pp-modal-close">✕</div>
    <div class="pp-modal-title">CHOOSE AVATAR</div>

    <div class="pp-body">
      <div class="pp-grid-wrap">
        <div class="pp-grid">${gridHTML}</div>
        <button class="pp-save-btn" id="pp-save">SAVE</button>
        <div class="pp-error" id="pp-error" style="display:none;"></div>
      </div>

      <div class="pp-preview">
        <div class="pp-preview-title">Preview</div>
        <img class="pp-preview-img" id="pp-preview-img"
             src="${previewSrc}" alt="preview"
             onerror="this.src='${DEFAULT_AVATAR}'" />
        <div class="pp-preview-name" id="pp-preview-name">${previewLabel}</div>
        <div class="pp-preview-hint">Click an avatar<br>to preview</div>
      </div>
    </div>
  `;

  // Avatar selection — update live preview on click
  const previewImgEl  = modal.querySelector("#pp-preview-img");
  const previewNameEl = modal.querySelector("#pp-preview-name");

  modal.querySelectorAll(".pp-avatar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".pp-avatar-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selected = btn.dataset.id;

      // Live preview update
      const av = AVATARS.find(a => a.id === selected);
      if (av && previewImgEl) {
        previewImgEl.src              = av.src;
        previewImgEl.style.borderColor = "var(--neon)";
        previewImgEl.style.boxShadow   = "0 0 20px rgba(65,182,255,0.5)";
      }
      if (av && previewNameEl) {
        previewNameEl.textContent = av.label;
      }
    });
  });

  // Save
  const saveBtn = modal.querySelector("#pp-save");
  const errEl   = modal.querySelector("#pp-error");

  saveBtn.addEventListener("click", async () => {
    if (!selected) {
      errEl.textContent = "Please select an avatar first.";
      errEl.style.display = "block";
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    try {
      await onSave(selected);
      overlay.remove();
    } catch (err) {
      console.error("[profilePic] save failed:", err);
      errEl.textContent = "Failed to save. Try again.";
      errEl.style.display = "block";
      saveBtn.disabled = false;
      saveBtn.textContent = "SAVE";
    }
  });

  // Close
  modal.querySelector(".pp-modal-close").onclick = () => overlay.remove();
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

// ===============================
// SAVE TO FIRESTORE
// ===============================
async function saveAvatar(userId, avatarId) {
  // Save to users collection
  await updateDoc(doc(firestore, "users", userId), {
    avatar: avatarId
  });

  // Mirror to leaderboard so profile modal on leaderboard also shows it
  await updateDoc(doc(firestore, "leaderboard", userId), {
    avatar: avatarId
  });
}

// ===============================
// WIRE CLICK ON PROFILE PIC
// ===============================
function wrapProfilePic(userId, currentAvatarId) {
  const picEl = document.querySelector(".profile-pic");
  if (!picEl) return;

  // Add hover overlay if not already there
  if (!picEl.querySelector(".profile-pic-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "profile-pic-overlay";
    overlay.innerHTML = `<span>CHANGE<br>AVATAR</span>`;
    picEl.appendChild(overlay);
  }

  // Remove any old listener by cloning
  const newPicEl = picEl.cloneNode(true);
  picEl.parentNode.replaceChild(newPicEl, picEl);

  // Re-add overlay to clone
  if (!newPicEl.querySelector(".profile-pic-overlay")) {
    const overlay = document.createElement("div");
    overlay.className = "profile-pic-overlay";
    overlay.innerHTML = `<span>CHANGE<br>AVATAR</span>`;
    newPicEl.appendChild(overlay);
  }

  newPicEl.style.cursor = "pointer";
  newPicEl.addEventListener("click", () => {
    openPicker(currentAvatarId, async (newAvatarId) => {
      await saveAvatar(userId, newAvatarId);
      applyAvatar(newAvatarId);
      // Update the closure reference for next click
      currentAvatarId = newAvatarId;
      // Re-wire with new avatarId
      wrapProfilePic(userId, newAvatarId);
    });
  });
}

// ===============================
// AUTH + LOAD
// ===============================
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const userSnap = await getDoc(doc(firestore, "users", user.uid));
    const avatarId = userSnap.exists() ? (userSnap.data().avatar || null) : null;

    // Apply current avatar to the img tag
    applyAvatar(avatarId);

    // Wire the click handler
    wrapProfilePic(user.uid, avatarId);

  } catch (err) {
    console.error("[profilePic] load failed:", err);
  }
});