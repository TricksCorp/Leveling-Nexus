import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  deleteUser,
  reload
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

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
const analytics = getAnalytics(app);
const auth      = getAuth(app);
const db        = getDatabase(app);
const firestore = getFirestore(app);

// ===============================
// USERNAME LIMIT
// Hard-cap the input field to 13 chars
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const usernameInput = document.getElementById("username");
  if (usernameInput) {
    usernameInput.maxLength = 13;
  }
});

// ===============================
// DEFAULT GAME DATA
// ===============================
function buildDefaultGameData() {
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();
  return {
    player: {
      level: 1, xp: 0, class: "F",
      stats: { strength: 1, stamina: 1, intelligence: 1, health: 1 },
      inactive: false,
      lastActiveDate:          todayKey,
      lastInactivityCheckDate: todayKey,
      lastFlagCleanupDate:     todayKey
    },
    quests: {
      active: [], daily: [], urgent: [],
      urgentWeek: { week: "", quests: [] },
      urgentNextWeek: [],
      dailyCompleted: {},
      lastDailyPenaltyDate: todayKey,
      lastRolloverWeek: ""
    },
    updatedAt: Date.now()
  };
}

// ===============================
// RETRY HELPER
// ===============================
async function withRetry(fn, maxAttempts = 3, baseDelayMs = 1500) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      if (attempt < maxAttempts)
        await new Promise(r => setTimeout(r, baseDelayMs * attempt));
    }
  }
  throw lastErr;
}

// ===============================
// STATUS (on main form)
// ===============================
function setStatus(msg, isError = false) {
  let el = document.getElementById("register-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "register-status";
    el.style.cssText = `
      margin-top:12px;padding:10px 14px;border-radius:8px;
      font-family:"Orbitron",system-ui;font-size:11px;
      letter-spacing:0.5px;text-align:center;`;
    document.getElementById("submit")?.parentNode?.appendChild(el);
  }
  el.textContent      = msg;
  el.style.background = isError ? "rgba(255,80,80,0.1)"       : "rgba(65,182,255,0.08)";
  el.style.border     = isError ? "1px solid rgba(255,80,80,0.35)" : "1px solid rgba(65,182,255,0.25)";
  el.style.color      = isError ? "#ff6b6b"                   : "rgba(65,182,255,0.8)";
}
function clearStatus() { document.getElementById("register-status")?.remove(); }

// ===============================
// VERIFICATION MODAL
// Shows while we poll for email
// verification in the background.
// ===============================
function showVerifyModal(email, onVerified, onCancel) {
  if (!document.getElementById("vm-style")) {
    const s = document.createElement("style");
    s.id = "vm-style";
    s.textContent = `
.vm-overlay {
  position:fixed;inset:0;background:rgba(0,0,0,0.8);
  backdrop-filter:blur(6px);display:flex;align-items:center;
  justify-content:center;z-index:9999;
  animation:vmFade 0.2s ease forwards;
}
@keyframes vmFade { from{opacity:0} to{opacity:1} }
.vm-modal {
  background:rgba(20,20,40,0.97);border-radius:14px;
  padding:32px 28px;width:340px;text-align:center;
  border:1px solid rgba(65,182,255,0.45);
  box-shadow:0 0 20px rgba(65,182,255,0.3),0 10px 40px rgba(0,0,0,0.7);
  animation:vmSlide 0.25s ease forwards;
}
@keyframes vmSlide { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
.vm-icon { font-size:40px;margin-bottom:12px; }
.vm-title {
  font-family:"Orbitron",system-ui;font-size:14px;font-weight:700;
  color:var(--neon,#41b6ff);letter-spacing:1px;margin-bottom:8px;
}
.vm-email {
  font-family:"Orbitron",system-ui;font-size:10px;
  color:rgba(65,182,255,0.7);margin-bottom:16px;letter-spacing:0.3px;
  word-break:break-all;
}
.vm-desc {
  font-family:"Orbitron",system-ui;font-size:10px;
  color:rgba(217,238,252,0.55);line-height:1.6;
  letter-spacing:0.3px;margin-bottom:20px;
}
.vm-spinner {
  width:36px;height:36px;border-radius:50%;margin:0 auto 16px;
  border:3px solid rgba(65,182,255,0.15);
  border-top-color:#41b6ff;
  animation:vmSpin 0.9s linear infinite;
}
@keyframes vmSpin { to{transform:rotate(360deg)} }
.vm-status {
  font-family:"Orbitron",system-ui;font-size:10px;
  color:rgba(65,182,255,0.5);margin-bottom:16px;letter-spacing:0.5px;
  min-height:16px;
}
.vm-btn {
  padding:8px 18px;font-family:"Orbitron",system-ui;
  font-size:10px;font-weight:700;letter-spacing:0.8px;
  border:none;border-radius:8px;cursor:pointer;
  transition:all 0.2s ease;
}
.vm-btn.resend {
  background:rgba(65,182,255,0.1);
  border:1px solid rgba(65,182,255,0.3);
  color:rgba(65,182,255,0.7);margin-right:8px;
}
.vm-btn.resend:hover { background:rgba(65,182,255,0.18);color:#41b6ff; }
.vm-btn.resend:disabled { opacity:0.35;cursor:not-allowed; }
.vm-btn.cancel {
  background:rgba(255,80,80,0.08);
  border:1px solid rgba(255,80,80,0.3);
  color:#ff6b6b;
}
.vm-btn.cancel:hover { background:rgba(255,80,80,0.18); }
    `;
    document.head.appendChild(s);
  }

  const overlay = document.createElement("div");
  overlay.className = "vm-overlay";
  overlay.innerHTML = `
    <div class="vm-modal">
      <div class="vm-icon">📧</div>
      <div class="vm-title">VERIFY YOUR EMAIL</div>
      <div class="vm-email">${email}</div>
      <div class="vm-desc">
        A verification link has been sent to your email.<br>
        Click the link to confirm, then come back here.
      </div>
      <div class="vm-spinner"></div>
      <div class="vm-status" id="vm-status">Waiting for verification...</div>
      <div>
        <button class="vm-btn resend" id="vm-resend">Resend Email</button>
        <button class="vm-btn cancel" id="vm-cancel">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const statusEl  = overlay.querySelector("#vm-status");
  const resendBtn = overlay.querySelector("#vm-resend");
  const cancelBtn = overlay.querySelector("#vm-cancel");

  // ── Poll every 3 seconds for emailVerified ──
  let pollHandle = setInterval(async () => {
    try {
      await reload(auth.currentUser);
      if (auth.currentUser?.emailVerified) {
        clearInterval(pollHandle);
        statusEl.textContent      = "✓ Email verified!";
        statusEl.style.color      = "#41ff88";
        overlay.querySelector(".vm-spinner").style.borderTopColor = "#41ff88";
        resendBtn.disabled = true;
        cancelBtn.disabled = true;
        setTimeout(() => {
          overlay.remove();
          onVerified();
        }, 800);
      }
    } catch { /* silent — network blip */ }
  }, 3000);

  // ── Resend with 30s cooldown ──
  let resendCooldown = false;
  resendBtn.addEventListener("click", async () => {
    if (resendCooldown) return;
    resendCooldown = true;
    resendBtn.disabled = true;
    try {
      await sendEmailVerification(auth.currentUser, {
        url: window.location.origin + "/LEVELING-NEXUS/Login.html"
      });
      statusEl.textContent = "Email resent!";
      statusEl.style.color = "rgba(65,182,255,0.7)";
    } catch { statusEl.textContent = "Resend failed. Try again."; }
    setTimeout(() => {
      resendCooldown = false;
      resendBtn.disabled = false;
      statusEl.textContent = "Waiting for verification...";
      statusEl.style.color  = "rgba(65,182,255,0.5)";
    }, 30_000);
  });

  // ── Cancel — delete the auth account cleanly ──
  cancelBtn.addEventListener("click", async () => {
    clearInterval(pollHandle);
    overlay.remove();
    onCancel();
  });
}

// ===============================
// REGISTER FLOW
// ===============================
document.getElementById("submit").addEventListener("click", async (event) => {
  event.preventDefault();

  const username  = document.getElementById("username").value.trim();
  const email     = document.getElementById("email").value.trim();
  const password  = document.getElementById("password").value;

  if (!username || !email || !password) {
    setStatus("Please fill in all fields.", true);
    return;
  }

  // ✅ Username length validation (backup for non-HTML enforcement)
  if (username.length > 13) {
    setStatus("Username must be 13 characters or fewer.", true);
    return;
  }

  // Password policy validation
  if (password.length < 8) {
    setStatus("Password must be at least 8 characters.", true);
    return;
  }
  if (!/[a-z]/.test(password)) {
    setStatus("Password must contain at least one lowercase letter.", true);
    return;
  }
  if (!/[0-9]/.test(password)) {
    setStatus("Password must contain at least one number.", true);
    return;
  }

  const submitBtn = document.getElementById("submit");
  submitBtn.disabled = true;
  clearStatus();

  let user = null;

  try {
    // ── Step 1: Create auth account ──
    setStatus("Creating account...");
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    user = userCredential.user;

    // ── Step 2: Send verification email ──
    setStatus("Sending verification email...");
    await sendEmailVerification(user, {
      url: window.location.origin + "/LEVELING-NEXUS/Login.html"
    });

    // ── Step 3: Show modal and wait for verification ──
    setStatus("Check your email to verify your account.");

    showVerifyModal(email,
      // ── onVerified: save all data ──
      async () => {
        setStatus("Saving your account...");
        try {
          await withRetry(() =>
            set(ref(db, "users/" + user.uid), { username, email })
          );
          await withRetry(() =>
            setDoc(doc(firestore, "users", user.uid), { username, email })
          );
          await withRetry(() =>
            setDoc(doc(firestore, "gameData", user.uid), buildDefaultGameData())
          );
          setStatus("✓ Account ready! Redirecting...");
          setTimeout(() => {
            window.location.href = "/LEVELING-NEXUS/Login.html"; // ✅ Fixed: absolute path
          }, 1200);
        } catch (saveErr) {
          console.error("[register] Save failed after verify:", saveErr);
          try { await deleteUser(user); } catch {}
          setStatus("Failed to save account data. Please register again.", true);
          submitBtn.disabled = false;
        }
      },
      // ── onCancel: delete the pending auth account ──
      async () => {
        try { await deleteUser(user); }
        catch (e) { console.warn("[register] Could not delete unverified account:", e); }
        setStatus("Registration cancelled.", true);
        submitBtn.disabled = false;
      }
    );

  } catch (err) {
    console.error("[register] Error:", err);
    if (user) {
      try { await deleteUser(user); } catch {}
    }
    const msg = err.code === "auth/email-already-in-use"
      ? "That email is already registered."
      : err.code === "auth/weak-password"
      ? "Password must be at least 6 characters."
      : err.code === "auth/invalid-email"
      ? "Please enter a valid email address."
      : "Registration failed — check your connection and try again.";
    setStatus(msg, true);
    submitBtn.disabled = false;
  }
});
