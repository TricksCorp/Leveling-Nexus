import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  setDoc
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
// POLL INTERVAL — 10 seconds
// ===============================
const POLL_INTERVAL_MS = 10_000;
let _pollHandle = null;
let _currentUserId = null;

// ===============================
// CLASS TIERS
// ===============================
const CLASS_TIERS = [
  { label: "Monarch",        min: 401 },
  { label: "National Level", min: 251 },
  { label: "S",              min: 151 },
  { label: "A",              min: 101 },
  { label: "B",              min: 71  },
  { label: "C",              min: 51  },
  { label: "D",              min: 31  },
  { label: "E",              min: 11  },
  { label: "F",              min: 1   },
];

/**
 * Returns the correct class label for a given player level.
 * @param {number} level
 * @returns {string}
 */
export function getClassForLevel(level) {
  for (const tier of CLASS_TIERS) {
    if (level >= tier.min) return tier.label;
  }
  return "F";
}

// ===============================
// DERIVED STATS
//
// PRIMARY stats (set by quests):
//   strength, intelligence
//
// DERIVED stats (computed here, never touched by quests):
//   stamina = floor(strength / 2)
//   health  = floor(stamina / 2) + floor(intelligence / 2)
//
// NOTE: computeDerivedStats takes only the two primary values
// so it can never accidentally feed a stale stored stamina
// back into the health formula.
// ===============================

/**
 * @param {number} strength
 * @param {number} intelligence
 * @returns {{ stamina: number, health: number }}
 */
export function computeDerivedStats(strength, intelligence) {
  const stamina = Math.max(1, Math.floor(strength / 2));
  const health  = Math.max(1, Math.floor(stamina  / 2) + Math.floor(intelligence / 2));
  return { stamina, health };
}

// ===============================
// HELPERS
// ===============================
function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ===============================
// STALE FLAG CLEANUP
//
// Active quests accumulate per-day flags (rejectedToday,
// completedToday, expiredPenaltyDate, acceptedToday) that
// are keyed to a specific date. Once the date changes they
// are stale and should be cleared so quests appear fresh
// the next day without manual intervention.
//
// Runs once per day (guard: player.lastFlagCleanupDate).
// ===============================
async function _cleanStaleActiveFlags(userId) {
  try {
    const gameRef = doc(firestore, "gameData", userId);
    const snap    = await getDoc(gameRef);
    if (!snap.exists()) return;

    const data      = snap.data();
    const todayKey  = getTodayKey();

    // Guard — already cleaned today
    if (data.player?.lastFlagCleanupDate === todayKey) return;

    const activeList = data.quests?.active || [];
    let   changed    = false;

    activeList.forEach(q => {
      // Clear rejectedToday if it's from a previous day
      if (q.rejectedToday && q.rejectedDateKey !== todayKey) {
        delete q.rejectedToday;
        delete q.rejectedDateKey;
        changed = true;
      }
      // Clear completedToday if it's from a previous day
      if (q.completedToday && q.completedDateKey !== todayKey) {
        delete q.completedToday;
        delete q.completedDateKey;
        changed = true;
      }
      // Clear expiredPenaltyDate if it's from a previous day
      if (q.expiredPenaltyDate && q.expiredPenaltyDate !== todayKey) {
        delete q.expiredPenaltyDate;
        changed = true;
      }
      // Clear acceptedToday if it's from a previous day
      if (q.acceptedToday && q.acceptedDateKey !== todayKey) {
        q.acceptedToday   = false;
        q.acceptedDateKey = null;
        changed = true;
      }
    });

    const updates = {
      "player.lastFlagCleanupDate": todayKey,
      updatedAt: Date.now()
    };

    if (changed) {
      updates["quests.active"] = activeList;
      console.log("[gameLogic] Cleaned stale active quest flags");
    }

    await updateDoc(gameRef, updates);

  } catch (err) {
    console.error("[gameLogic] _cleanStaleActiveFlags failed:", err);
  }
}

// ===============================
// POLL TICK
// Reads the latest Firestore values
// every interval and writes back
// anything that is out of sync.
// ===============================
async function pollTick(userId) {
  try {
    const gameRef = doc(firestore, "gameData", userId);
    const snap    = await getDoc(gameRef);
    if (!snap.exists()) return;

    const player = snap.data().player ?? {};

    // ── Source-of-truth values (only these drive derivations) ──
    const strength     = player.stats?.strength     ?? 1;
    const intelligence = player.stats?.intelligence ?? 1;
    const level        = player.level               ?? 1;

    // ── Compute what everything SHOULD be ──
    const correctClass              = getClassForLevel(level);
    const { stamina: correctStamina,
            health:  correctHealth } = computeDerivedStats(strength, intelligence);

    // ── What is currently stored ──
    const storedClass   = player.class          ?? "F";
    const storedStamina = player.stats?.stamina ?? 1;
    const storedHealth  = player.stats?.health  ?? 1;

    // ── Diff — only include fields that need changing ──
    const updates = {};

    if (storedClass !== correctClass) {
      updates["player.class"] = correctClass;
      console.log(`[gameLogic] Class: ${storedClass} → ${correctClass} (lvl ${level})`);
    }

    if (storedStamina !== correctStamina) {
      updates["player.stats.stamina"] = correctStamina;
      console.log(`[gameLogic] Stamina: ${storedStamina} → ${correctStamina} (str ${strength})`);
    }

    if (storedHealth !== correctHealth) {
      updates["player.stats.health"] = correctHealth;
      console.log(`[gameLogic] Health: ${storedHealth} → ${correctHealth} (stamina ${correctStamina}, int ${intelligence})`);
    }

    if (Object.keys(updates).length === 0) {
      // Nothing changed in gameData — still mirror leaderboard
      // in case username changed or this is first load
      await _mirrorLeaderboard(userId, player);
      return;
    }

    updates.updatedAt = Date.now();
    await updateDoc(gameRef, updates);

    // Re-read the updated player to mirror accurate values
    const updatedSnap = await getDoc(gameRef);
    if (updatedSnap.exists()) {
      await _mirrorLeaderboard(userId, updatedSnap.data().player ?? {});
    }

  } catch (err) {
    console.error("[gameLogic] pollTick failed:", err);
  }
}

// ===============================
// LEADERBOARD MIRROR
// Writes a stripped-down public
// snapshot to leaderboard/{userId}
// so the leaderboard can query
// all players without reading
// sensitive gameData.
// ===============================
async function _mirrorLeaderboard(userId, player) {
  try {
    const todayKey  = getTodayKey();
    const daysSince = player.lastActiveDate
      ? Math.floor((Date.now() - new Date(player.lastActiveDate).getTime()) / 86400000)
      : 999;

    // Fetch username and avatar from users collection
    const userSnap = await getDoc(doc(firestore, "users", userId));
    const username = userSnap.exists() ? (userSnap.data().username ?? "Unknown") : "Unknown";
    const avatar   = userSnap.exists() ? (userSnap.data().avatar   ?? null)      : null;

    await setDoc(doc(firestore, "leaderboard", userId), {
      username,
      avatar,
      level:           player.level                  ?? 1,
      xp:              player.xp                     ?? 0,
      class:           player.class                  ?? "F",
      inactive:        player.inactive               ?? false,
      daysSinceActive: daysSince,
      lastActiveDate:  player.lastActiveDate          ?? null,
      stats: {
        strength:      player.stats?.strength         ?? 1,
        intelligence:  player.stats?.intelligence     ?? 1,
        stamina:       player.stats?.stamina          ?? 1,
        health:        player.stats?.health           ?? 1,
      },
      updatedAt:       Date.now()
    });
  } catch (err) {
    console.error("[gameLogic] _mirrorLeaderboard failed:", err);
  }
}

// ===============================
// EXPORTED: IMMEDIATE SYNC
//
// Call this right after any quest completion that changes
// strength or intelligence so derived stats (stamina, health)
// and class update immediately without waiting for the next
// 10-second poll tick.
// ===============================
export async function syncNow() {
  if (_currentUserId) {
    await pollTick(_currentUserId);
  }
}

// ===============================
// START / STOP POLLING
// ===============================
function startPolling(userId) {
  _currentUserId = userId;

  // Run cleanup once on session start (guarded internally to once/day)
  _cleanStaleActiveFlags(userId);

  // Fire immediately, then on every interval
  pollTick(userId);

  _pollHandle = setInterval(() => {
    pollTick(userId);
  }, POLL_INTERVAL_MS);

  console.log(`[gameLogic] Polling started (every ${POLL_INTERVAL_MS / 1000}s)`);
}

function stopPolling() {
  if (_pollHandle !== null) {
    clearInterval(_pollHandle);
    _pollHandle = null;
    _currentUserId = null;
    console.log("[gameLogic] Polling stopped.");
  }
}

// ===============================
// AUTH LISTENER
// ===============================
onAuthStateChanged(auth, (user) => {
  if (user) {
    startPolling(user.uid);
  } else {
    stopPolling();
  }
});