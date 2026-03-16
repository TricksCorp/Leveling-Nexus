/**
 * z-connectionGuard.js
 *
 * Monitors online/offline status and Firebase reachability.
 * When a connection problem is detected, an overlay is injected
 * that:
 *   — blurs and blocks all interaction with the page beneath
 *   — shows an animated "CONNECTION ISSUE" indicator
 *   — auto-dismisses when connectivity is restored
 *
 * Usage: <script type="module" src="z-connectionGuard.js"></script>
 * No configuration needed — drop it in and it works.
 */

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const _css = document.createElement("style");
_css.textContent = `

/* ── Overlay ── */
#conn-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;

  /* Blurs whatever is behind it */
  backdrop-filter: blur(10px) brightness(0.55);
  -webkit-backdrop-filter: blur(10px) brightness(0.55);

  /* Blocks all pointer interaction on the page */
  pointer-events: all;

  display: flex;
  align-items: center;
  justify-content: center;

  /* Fade in / out */
  opacity: 0;
  transition: opacity 0.4s ease;
}

#conn-overlay.conn-visible {
  opacity: 1;
}

/* ── Panel ── */
.conn-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;

  padding: 40px 48px;
  border-radius: 18px;

  background: rgba(6, 16, 24, 0.82);
  border: 1px solid rgba(65, 182, 255, 0.25);
  box-shadow:
    0 0 40px rgba(65, 182, 255, 0.18),
    0 0 80px rgba(65, 182, 255, 0.06),
    inset 0 0 60px rgba(65, 182, 255, 0.04);

  /* Subtle scale-in when overlay appears */
  transform: scale(0.92);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

#conn-overlay.conn-visible .conn-panel {
  transform: scale(1);
}

/* ── Spinner ring ── */
.conn-spinner {
  position: relative;
  width: 72px;
  height: 72px;
}

/* Outer static ring */
.conn-spinner::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(65, 182, 255, 0.1);
}

/* Animated arc */
.conn-spinner::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid transparent;
  border-top-color: #41b6ff;
  border-right-color: rgba(65, 182, 255, 0.4);
  animation: conn-spin 1s linear infinite;
  filter: drop-shadow(0 0 6px rgba(65, 182, 255, 0.7));
}

/* Inner pulsing dot */
.conn-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #41b6ff;
  box-shadow: 0 0 10px #41b6ff, 0 0 20px rgba(65,182,255,0.5);
  animation: conn-pulse 1.6s ease-in-out infinite;
}

@keyframes conn-spin {
  to { transform: rotate(360deg); }
}

@keyframes conn-pulse {
  0%, 100% { opacity: 1;   transform: translate(-50%,-50%) scale(1);    }
  50%       { opacity: 0.3; transform: translate(-50%,-50%) scale(0.55); }
}

/* ── Text block ── */
.conn-title {
  font-family: "Orbitron", system-ui;
  font-size: clamp(14px, 2vw, 18px);
  font-weight: 700;
  letter-spacing: 3px;
  color: #41b6ff;
  text-shadow:
    0 0 10px rgba(65, 182, 255, 0.6),
    0 0 24px rgba(65, 182, 255, 0.25);
  text-transform: uppercase;
  text-align: center;
}

.conn-sub {
  font-family: "Orbitron", system-ui;
  font-size: clamp(9px, 1.1vw, 11px);
  color: #9fb6d1;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  text-align: center;
  opacity: 0.75;
}

/* ── Animated dots on the sub-line ── */
.conn-dots::after {
  content: "";
  display: inline-block;
  width: 1.8em;
  text-align: left;
  animation: conn-ellipsis 1.6s steps(4, end) infinite;
}

@keyframes conn-ellipsis {
  0%   { content: "";    }
  25%  { content: ".";   }
  50%  { content: "..";  }
  75%  { content: "..."; }
  100% { content: "";    }
}

/* ── Divider line ── */
.conn-divider {
  width: 100%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(65, 182, 255, 0.3) 30%,
    rgba(65, 182, 255, 0.3) 70%,
    transparent
  );
}

/* ── Retry hint ── */
.conn-hint {
  font-family: "Orbitron", system-ui;
  font-size: clamp(8px, 0.9vw, 10px);
  color: rgba(159, 182, 209, 0.45);
  letter-spacing: 1px;
  text-align: center;
  text-transform: uppercase;
}

`;
document.head.appendChild(_css);

// ─────────────────────────────────────────────
// DOM — build overlay once, reuse it
// ─────────────────────────────────────────────
const _overlay = document.createElement("div");
_overlay.id = "conn-overlay";
_overlay.innerHTML = `
  <div class="conn-panel">

    <div class="conn-spinner">
      <div class="conn-dot"></div>
    </div>

    <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
      <div class="conn-title" id="conn-title-text">Connection Issue</div>
      <div class="conn-sub"><span class="conn-dots" id="conn-sub-text">Attempting to reconnect</span></div>
    </div>

    <div class="conn-divider"></div>

    <div class="conn-hint">Please check your network connection</div>

  </div>
`;

// Prevent any click/scroll/key event from passing through to the page
_overlay.addEventListener("click",   e => e.stopPropagation());
_overlay.addEventListener("keydown", e => e.stopPropagation());

// ─────────────────────────────────────────────
// SHOW / HIDE
// ─────────────────────────────────────────────
let _overlayActive = false;

function showOverlay() {
  if (_overlayActive) return;
  _overlayActive = true;

  // Append only when needed — avoids it sitting in the DOM at all times
  if (!document.body.contains(_overlay)) {
    document.body.appendChild(_overlay);
  }

  // Force reflow so the transition fires
  _overlay.getBoundingClientRect();
  _overlay.classList.add("conn-visible");

  // Prevent scroll on the body underneath
  document.body.style.overflow = "hidden";
}

function hideOverlay() {
  if (!_overlayActive) return;
  _overlayActive = false;

  _overlay.classList.remove("conn-visible");
  document.body.style.overflow = "";

  // Remove from DOM after the fade-out transition finishes
  _overlay.addEventListener("transitionend", () => {
    if (!_overlayActive && document.body.contains(_overlay)) {
      document.body.removeChild(_overlay);
    }
  }, { once: true });
}

// ─────────────────────────────────────────────
// DETECTION — browser online/offline events
// ─────────────────────────────────────────────
window.addEventListener("offline", () => {
  showOverlay();
});

window.addEventListener("online", () => {
  // Browser says we're back — confirm with a real latency check
  _pingCheck().then(({ ok, latencyMs }) => {
    if (ok && latencyMs < HIGH_PING_MS) hideOverlay();
  });
});

// ─────────────────────────────────────────────
// DETECTION — Firebase Firestore reachability
// Exported so Firebase init code can call it.
// ─────────────────────────────────────────────

/**
 * Call this from your Firebase initialization when a Firestore
 * operation fails due to a network error.
 *
 * Example in your quest/home JS:
 *   import { reportFirebaseError, reportFirebaseOk } from "./z-connectionGuard.js";
 *   try {
 *     await getDoc(ref);
 *     reportFirebaseOk();
 *   } catch (err) {
 *     if (err.code === "unavailable") reportFirebaseError();
 *   }
 */
export function reportFirebaseError() {
  showOverlay();
}

export function reportFirebaseOk() {
  if (_overlayActive) hideOverlay();
}

// ─────────────────────────────────────────────
// PERIODIC PING — catches:
//   1. Backend unreachable (offline / outage)
//   2. Very high latency (slow connection)
// ─────────────────────────────────────────────
const PING_INTERVAL_MS  = 10_000;   // check every 10 s
const PING_TIMEOUT_MS   = 6_000;    // treat as failed if no response within 6 s
const HIGH_PING_MS      = 3_000;    // flag as high-ping above 3 s
const PING_URL          = "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";

// How many consecutive high-ping hits before we show the overlay
// (1 = show immediately, 2 = needs two bad pings in a row — avoids one-off spikes)
const HIGH_PING_STRIKES = 2;
let _highPingStrikes = 0;

/**
 * Returns { ok: boolean, latencyMs: number }
 * ok = false means either timed out or network error
 */
async function _pingCheck() {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
  const t0    = performance.now();

  try {
    await fetch(PING_URL, {
      method: "HEAD",
      mode:   "no-cors",  // avoid CORS errors; we only care about reachability
      signal: ctrl.signal,
      cache:  "no-store"
    });

    clearTimeout(timer);
    const latencyMs = performance.now() - t0;
    return { ok: true, latencyMs };

  } catch {
    clearTimeout(timer);
    return { ok: false, latencyMs: PING_TIMEOUT_MS };
  }
}

/** Update the overlay text depending on the reason it's showing */
function _setOverlayReason(reason) {
  const titleEl = document.getElementById("conn-title-text");
  const subEl   = document.getElementById("conn-sub-text");
  if (!titleEl || !subEl) return;

  if (reason === "highping") {
    titleEl.textContent = "High Latency";
    subEl.textContent   = "Connection is slow";
  } else {
    titleEl.textContent = "Connection Issue";
    subEl.textContent   = "Attempting to reconnect";
  }
}

// Run ping loop — always runs regardless of navigator.onLine
setInterval(async () => {
  const { ok, latencyMs } = await _pingCheck();

  if (!ok) {
    // Hard failure — no response
    _highPingStrikes = 0;
    showOverlay();                  // append to DOM first
    _setOverlayReason("offline");   // then update text
    return;
  }

  if (latencyMs >= HIGH_PING_MS) {
    // Slow response — count strikes
    _highPingStrikes += 1;
    if (_highPingStrikes >= HIGH_PING_STRIKES) {
      showOverlay();                  // append to DOM first
      _setOverlayReason("highping");  // then update text
    }
    return;
  }

  // Good ping — reset strike counter and hide overlay
  _highPingStrikes = 0;
  if (_overlayActive) hideOverlay();

}, PING_INTERVAL_MS);

// Initial check — if the page loaded while already offline
if (!navigator.onLine) {
  // Small delay so the page has a chance to render first
  setTimeout(() => {
    showOverlay();                 // append to DOM first
    _setOverlayReason("offline");  // then update text
  }, 300);
}