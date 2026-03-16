import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import {
  getAuth,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ===============================
// UI HELPERS
// ===============================
function setStatus(msg, isError = false) {
  let el = document.getElementById("reset-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "reset-status";
    el.style.cssText = `
      margin-top: 12px; padding: 10px 14px; border-radius: 8px;
      font-family: "Orbitron", system-ui; font-size: 11px;
      letter-spacing: 0.5px; text-align: center;
    `;
    document.getElementById("reset-submit")?.parentNode?.appendChild(el);
  }
  el.textContent = msg;
  el.style.background = isError ? "rgba(255,80,80,0.1)" : "rgba(65,182,255,0.08)";
  el.style.border      = isError ? "1px solid rgba(255,80,80,0.35)" : "1px solid rgba(65,182,255,0.25)";
  el.style.color       = isError ? "#ff6b6b" : "rgba(65,182,255,0.8)";
}

// ===============================
// RESET FLOW
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("reset-submit");
  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("reset-email")?.value.trim();
    if (!email) {
      setStatus("Please enter your email address.", true);
      return;
    }

    btn.disabled = true;
    setStatus("Sending reset email...");

    try {
      await sendPasswordResetEmail(auth, email, {
        url: window.location.origin + "/Login.html"
      });

      setStatus("✓ Reset email sent! Check your inbox and follow the link.");

      // Redirect back to login after delay
      setTimeout(() => {
        window.location.href = "Login.html";
      }, 4000);

    } catch (err) {
      console.error("[forgotPassword]", err);

      const msg = err.code === "auth/user-not-found"
        ? "No account found with that email."
        : err.code === "auth/invalid-email"
        ? "Please enter a valid email address."
        : err.code === "auth/too-many-requests"
        ? "Too many attempts. Please wait a moment and try again."
        : "Failed to send reset email. Check your connection.";

      setStatus(msg, true);
      btn.disabled = false;
    }
  });
});