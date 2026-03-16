import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-analytics.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBO6a6nJKh_edhLswQEIk07gnQI46UBrCQ",
  authDomain: "leveling-nexus-bdee1.firebaseapp.com",
  projectId: "leveling-nexus-bdee1",
  storageBucket: "leveling-nexus-bdee1.appspot.com",
  messagingSenderId: "360029039248",
  appId: "1:360029039248:web:99b73cb4e8a5e6fc08c615",
  measurementId: "G-4TFCZV1RWX"
};

// Initialize Firebase
const app       = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth      = getAuth(app);
const firestore = getFirestore(app);

// ===============================
// STATUS HELPER
// ===============================
function setStatus(msg, isError = false) {
  let el = document.getElementById("login-status");
  if (!el) {
    el = document.createElement("div");
    el.id = "login-status";
    el.style.cssText = `
      margin-top:12px;padding:10px 14px;border-radius:8px;
      font-family:"Orbitron",system-ui;font-size:11px;
      letter-spacing:0.5px;text-align:center;`;
    document.getElementById("submit")?.parentNode?.appendChild(el);
  }
  el.textContent      = msg;
  el.style.background = isError ? "rgba(255,80,80,0.1)"        : "rgba(65,182,255,0.08)";
  el.style.border     = isError ? "1px solid rgba(255,80,80,0.35)" : "1px solid rgba(65,182,255,0.25)";
  el.style.color      = isError ? "#ff6b6b"                    : "rgba(65,182,255,0.8)";
}

// ===============================
// LOGIN
// ===============================
document.getElementById("submit").addEventListener("click", async (event) => {
  event.preventDefault();

  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    setStatus("Please enter your email and password.", true);
    return;
  }

  const submitBtn = document.getElementById("submit");
  submitBtn.disabled = true;
  setStatus("Signing in...");

  try {
    // ── Step 1: Sign in ──
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // ── Step 2: Check email verification ──
    if (!user.emailVerified) {
      await signOut(auth);
      setStatus("Please verify your email before logging in. Check your inbox (and spam folder).", true);
      submitBtn.disabled = false;
      return;
    }

    // ── Step 3: Check if evaluation is done ──
    setStatus("Loading your profile...");
    const snap = await getDoc(doc(firestore, "gameData", user.uid));

    if (!snap.exists()) {
      // No game data — something went wrong during registration
      await signOut(auth);
      setStatus("Account data not found. Please register again.", true);
      submitBtn.disabled = false;
      return;
    }

    const evaluationDone = snap.data().player?.evaluationDone === true;

    if (!evaluationDone) {
      // New player — send to evaluation
      setStatus("Welcome! Redirecting to rank evaluation...");
      setTimeout(() => {
        window.location.href = "Evaluation.html";
      }, 800);
    } else {
      // Returning player — send to home
      setStatus("Welcome back! Entering the Nexus...");
      setTimeout(() => {
        window.location.href = "Home.html";
      }, 800);
    }

  } catch (err) {
    console.error("[login]", err);

    const msg = err.code === "auth/invalid-credential"
      ? "Incorrect email or password."
      : err.code === "auth/user-not-found"
      ? "No account found with that email."
      : err.code === "auth/wrong-password"
      ? "Incorrect password."
      : err.code === "auth/too-many-requests"
      ? "Too many failed attempts. Please wait and try again."
      : err.code === "auth/invalid-email"
      ? "Please enter a valid email address."
      : "Login failed — check your connection and try again.";

    setStatus(msg, true);
    submitBtn.disabled = false;
  }
});