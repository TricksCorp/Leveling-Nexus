import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getFirestore, doc, updateDoc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// ── Firebase Config ──────────────────────────────────────────────────────────
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

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// ── Inject Modal HTML ────────────────────────────────────────────────────────
function injectSettingsModal() {
  const modal = document.createElement("div");
  modal.id = "settings-modal";
  modal.innerHTML = `
    <div class="settings-overlay" id="settings-overlay"></div>
    <div class="settings-panel">

      <!-- Header -->
      <div class="settings-header">
        <div class="settings-title">
          <span class="settings-icon">⚙</span>
          SETTINGS
        </div>
        <button class="settings-close" id="settings-close">✕</button>
      </div>

      <!-- Divider -->
      <div class="settings-divider"></div>

      <!-- Change Username -->
      <div class="settings-section">
        <div class="settings-section-label">IDENTITY</div>
        <div class="settings-field-group">
          <label class="settings-label">Change In-Game Name</label>
          <div class="settings-input-row">
            <input
              type="text"
              id="settings-username-input"
              class="settings-input"
              placeholder="Enter new name..."
              maxlength="24"
            />
            <button class="settings-btn settings-btn-confirm" id="settings-save-name">
              SAVE
            </button>
          </div>
          <div class="settings-hint">3–24 characters. Letters, numbers, underscores only.</div>
          <div class="settings-feedback" id="settings-name-feedback"></div>
        </div>
      </div>

      <!-- Divider -->
      <div class="settings-divider"></div>

      <!-- Danger Zone -->
      <div class="settings-section">
        <div class="settings-section-label danger-label">DANGER ZONE</div>
        <div class="settings-field-group">
          <label class="settings-label">Delete Account Data</label>
          <p class="settings-warning-text">
            This will permanently erase your profile, XP, stats, and all progress.
            <strong>This cannot be undone.</strong>
          </p>
          <button class="settings-btn settings-btn-danger" id="settings-delete-btn">
            DELETE MY ACCOUNT
          </button>
          <div class="settings-feedback" id="settings-delete-feedback"></div>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(modal);

  /* ── Confirm sub-modal appended separately so fixed/inset covers full viewport ── */
  const confirmModal = document.createElement("div");
  confirmModal.className = "confirm-modal";
  confirmModal.id = "confirm-modal";
  confirmModal.innerHTML = `
    <div class="confirm-box">
      <div class="confirm-title">⚠ CONFIRM DELETION</div>
      <p class="confirm-text">
        Type your password below to confirm permanent account deletion.
      </p>
      <input
        type="password"
        id="confirm-password-input"
        class="settings-input"
        placeholder="Your password..."
      />
      <div class="confirm-actions">
        <button class="settings-btn settings-btn-ghost" id="confirm-cancel">CANCEL</button>
        <button class="settings-btn settings-btn-danger" id="confirm-delete">DELETE</button>
      </div>
      <div class="settings-feedback" id="confirm-feedback"></div>
    </div>
  `;
  document.body.appendChild(confirmModal);
}

// ── Inject CSS ───────────────────────────────────────────────────────────────
function injectSettingsStyles() {
  const style = document.createElement("style");
  style.textContent = `
    /* ── Overlay ── */
    .settings-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      z-index: 999;
      opacity: 0;
      animation: fadeInOverlay 0.25s forwards;
    }
    @keyframes fadeInOverlay {
      to { opacity: 1; }
    }

    /* ── Panel ── */
    #settings-modal {
      display: none;
    }
    #settings-modal.active {
      display: block;
    }
    .settings-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -48%);
      z-index: 1000;
      background: #080f0e;
      border: 1px solid rgba(0, 255, 180, 0.2);
      border-radius: 8px;
      width: min(480px, 92vw);
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px 28px 32px;
      box-shadow:
        0 0 60px rgba(0, 255, 180, 0.06),
        inset 0 1px 0 rgba(0, 255, 180, 0.06);
      animation: slideUpPanel 0.28s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    @keyframes slideUpPanel {
      from { transform: translate(-50%, -44%); opacity: 0; }
      to   { transform: translate(-50%, -50%); opacity: 1; }
    }

    /* ── Panel Header ── */
    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .settings-title {
      font-family: 'Orbitron', monospace;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 4px;
      color: var(--accent, #00ffb4);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .settings-icon {
      font-size: 16px;
      opacity: 0.8;
    }
    .settings-close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      font-size: 16px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 4px;
      transition: color 0.2s, background 0.2s;
    }
    .settings-close:hover {
      color: #fff;
      background: rgba(255,255,255,0.08);
    }

    /* ── Divider ── */
    .settings-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(0,255,180,0.15), transparent);
      margin: 20px 0;
    }

    /* ── Sections ── */
    .settings-section {
      margin-bottom: 4px;
    }
    .settings-section-label {
      font-family: 'Orbitron', monospace;
      font-size: 9px;
      letter-spacing: 3px;
      color: rgba(255,255,255,0.3);
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .danger-label {
      color: rgba(255, 80, 80, 0.5);
    }
    .settings-field-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .settings-label {
      font-family: 'Orbitron', monospace;
      font-size: 11px;
      letter-spacing: 1.5px;
      color: rgba(255,255,255,0.7);
    }

    /* ── Input ── */
    .settings-input-row {
      display: flex;
      gap: 10px;
    }
    .settings-input {
      flex: 1;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(0, 255, 180, 0.15);
      border-radius: 4px;
      color: #fff;
      font-family: 'Orbitron', monospace;
      font-size: 12px;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      width: 100%;
      box-sizing: border-box;
    }
    .settings-input::placeholder {
      color: rgba(255,255,255,0.2);
    }
    .settings-input:focus {
      border-color: rgba(0, 255, 180, 0.5);
      box-shadow: 0 0 0 3px rgba(0, 255, 180, 0.07);
    }

    /* ── Hints & Feedback ── */
    .settings-hint {
      font-size: 10px;
      color: rgba(255,255,255,0.25);
      letter-spacing: 0.5px;
    }
    .settings-feedback {
      font-size: 11px;
      letter-spacing: 0.5px;
      min-height: 16px;
      transition: color 0.2s;
    }
    .settings-feedback.success { color: #00ffb4; }
    .settings-feedback.error   { color: #ff5050; }

    /* ── Buttons ── */
    .settings-btn {
      font-family: 'Orbitron', monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 2px;
      padding: 10px 18px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .settings-btn-confirm {
      background: rgba(0, 255, 180, 0.1);
      border-color: rgba(0, 255, 180, 0.4);
      color: #00ffb4;
    }
    .settings-btn-confirm:hover {
      background: rgba(0, 255, 180, 0.2);
      box-shadow: 0 0 16px rgba(0, 255, 180, 0.2);
    }
    .settings-btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .settings-btn-danger {
      background: rgba(255, 50, 50, 0.08);
      border-color: rgba(255, 50, 50, 0.4);
      color: #ff5050;
    }
    .settings-btn-danger:hover {
      background: rgba(255, 50, 50, 0.18);
      box-shadow: 0 0 16px rgba(255, 50, 50, 0.2);
    }
    .settings-btn-ghost {
      background: transparent;
      border-color: rgba(255,255,255,0.2);
      color: rgba(255,255,255,0.5);
    }
    .settings-btn-ghost:hover {
      border-color: rgba(255,255,255,0.4);
      color: #fff;
    }

    /* ── Warning text ── */
    .settings-warning-text {
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      line-height: 1.6;
      margin: 0;
    }
    .settings-warning-text strong {
      color: rgba(255, 80, 80, 0.7);
    }

    /* ── Confirm Sub-Modal ── */
    .confirm-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1200;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(6px);
    }
    .confirm-modal.active {
      display: flex;
    }
    .confirm-box {
      background: #060d0c;
      border: 1px solid rgba(255, 50, 50, 0.3);
      border-radius: 8px;
      padding: 28px;
      width: min(400px, 88vw);
      max-height: 90vh;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 0 40px rgba(255, 50, 50, 0.1);
      animation: slideUpPanel 0.22s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      position: relative;
      margin: auto;
    }
    .confirm-title {
      font-family: 'Orbitron', monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 3px;
      color: #ff5050;
    }
    .confirm-text {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      line-height: 1.6;
      margin: 0;
    }
    .confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    }
  `;
  document.head.appendChild(style);
}

// ── Validation ───────────────────────────────────────────────────────────────
function isValidUsername(name) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(name);
}

function setFeedback(el, msg, type) {
  el.textContent = msg;
  el.className = "settings-feedback " + type;
}

// ── Main Init ────────────────────────────────────────────────────────────────
export function initSettings() {
  injectSettingsStyles();
  injectSettingsModal();

  const modal           = document.getElementById("settings-modal");
  const overlay         = document.getElementById("settings-overlay");
  const closeBtn        = document.getElementById("settings-close");
  const openBtn         = document.getElementById("open-settings");

  const nameInput       = document.getElementById("settings-username-input");
  const saveNameBtn     = document.getElementById("settings-save-name");
  const nameFeedback    = document.getElementById("settings-name-feedback");

  const deleteBtn       = document.getElementById("settings-delete-btn");
  const deleteFeedback  = document.getElementById("settings-delete-feedback");

  const confirmModal    = document.getElementById("confirm-modal");
  const confirmCancel   = document.getElementById("confirm-cancel");
  const confirmDelete   = document.getElementById("confirm-delete");
  const confirmPwInput  = document.getElementById("confirm-password-input");
  const confirmFeedback = document.getElementById("confirm-feedback");

  // ── Open / Close ──
  function openModal() { modal.classList.add("active"); }
  function closeModal() {
    modal.classList.remove("active");
    confirmModal.classList.remove("active");
    nameFeedback.textContent = "";
    deleteFeedback.textContent = "";
    confirmFeedback.textContent = "";
    nameInput.value = "";
    confirmPwInput.value = "";
  }

  openBtn?.addEventListener("click", openModal);
  closeBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);

  // ── Change Username ──
  saveNameBtn.addEventListener("click", async () => {
    const newName = nameInput.value.trim();

    if (!isValidUsername(newName)) {
      setFeedback(nameFeedback, "Invalid name. 3–24 chars, letters/numbers/underscores only.", "error");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      setFeedback(nameFeedback, "Not logged in.", "error");
      return;
    }

    saveNameBtn.disabled = true;
    saveNameBtn.textContent = "...";

    try {
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, { username: newName });

      setFeedback(nameFeedback, `✓ Name updated to "${newName}"`, "success");
      nameInput.value = "";

      // Update the visible name on the Profile page if the element exists
      const nameEl = document.getElementById("user-name");
      if (nameEl) nameEl.textContent = newName;

    } catch (err) {
      console.error("Error updating username:", err);
      setFeedback(nameFeedback, "Failed to update. Try again.", "error");
    } finally {
      saveNameBtn.disabled = false;
      saveNameBtn.textContent = "SAVE";
    }
  });

  // ── Delete Account — open confirm sub-modal ──
  deleteBtn.addEventListener("click", () => {
    document.querySelector(".settings-panel").style.display = "none";
    confirmModal.classList.add("active");
    confirmPwInput.focus();
  });

  confirmCancel.addEventListener("click", () => {
    confirmModal.classList.remove("active");
    document.querySelector(".settings-panel").style.display = "";
    confirmPwInput.value = "";
    confirmFeedback.textContent = "";
  });

  // ── Delete Account — confirm ──
  confirmDelete.addEventListener("click", async () => {
    const password = confirmPwInput.value;
    const user = auth.currentUser;

    if (!user) {
      setFeedback(confirmFeedback, "Not logged in.", "error");
      return;
    }
    if (!password) {
      setFeedback(confirmFeedback, "Please enter your password.", "error");
      return;
    }

    confirmDelete.disabled = true;
    confirmDelete.textContent = "...";

    try {
      // Re-authenticate before deletion (Firebase requirement)
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      // Delete all user-related Firestore documents across all collections
      const collections = ["users", "gameData", "history", "leaderboard"];
      for (const col of collections) {
        try {
          const ref = doc(firestore, col, user.uid);
          await deleteDoc(ref);
          console.log(`Deleted from ${col}`);
        } catch (e) {
          // Don't block if a collection doesn't have this user's doc
          console.warn(`Could not delete from ${col}:`, e);
        }
      }

      // Delete the Firebase Auth account
      await deleteUser(user);

      // Redirect to login
      window.location.href = "/LEVELING-NEXUS/Login.html";

    } catch (err) {
      console.error("Delete error:", err);
      const msg =
        err.code === "auth/wrong-password"      ? "Wrong password. Try again." :
        err.code === "auth/invalid-credential"  ? "Wrong password. Try again." :
        err.code === "auth/too-many-requests"   ? "Too many attempts. Wait a moment." :
        "Deletion failed. Try again.";
      setFeedback(confirmFeedback, msg, "error");
      confirmDelete.disabled = false;
      confirmDelete.textContent = "DELETE";
      document.querySelector(".settings-panel").style.display = "";
    }
  });
}
