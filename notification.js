// ============================================================
//  notification.js — Leveling Nexus
//  Self-contained. Just add to any HTML page:
//    <script type="module" src="notification.js"></script>
//
//  Handles:
//    1. Permission request
//    2. Daily quest reminder at 9:00 AM
//    3. Quest reset notification (new day detected)
// ============================================================

const NOTIF_ICON  = "/LEVELING-NEXUS/AppIcon.png";
const NOTIF_BADGE = "/LEVELING-NEXUS/AppIcon.png";
const SW_PATH     = "/LEVELING-NEXUS/sw-notifications.js";
const SW_SCOPE    = "/LEVELING-NEXUS/";

// ── Keys stored in localStorage ──────────────────────────────
const KEY_LAST_DAY        = "nexus_last_notif_day";       // "YYYY-MM-DD"
const KEY_DAILY_SCHEDULED = "nexus_daily_scheduled_date"; // "YYYY-MM-DD"

// ── Utility: today as "YYYY-MM-DD" ───────────────────────────
function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Register Service Worker ───────────────────────────────────
async function registerSW() {
  if (!("serviceWorker" in navigator)) {
    console.warn("[Notif] Service workers not supported.");
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
    console.log("[Notif] SW registered:", reg.scope);
    return reg;
  } catch (err) {
    console.error("[Notif] SW registration failed:", err);
    return null;
  }
}

// ── Request Notification Permission ──────────────────────────
async function requestPermission() {
  if (!("Notification" in window)) {
    console.warn("[Notif] Notifications not supported.");
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied")  return false;

  const result = await Notification.requestPermission();
  return result === "granted";
}

// ── Show a notification via the Service Worker ────────────────
async function showNotification(reg, title, body, tag = "nexus-general") {
  if (!reg) return;
  await reg.showNotification(title, {
    body,
    icon:     NOTIF_ICON,
    badge:    NOTIF_BADGE,
    tag,
    renotify: false,
    vibrate:  [200, 100, 200],
    data:     { url: SW_SCOPE + "index.html" }
  });
}

// ── Schedule the 9 AM daily reminder ─────────────────────────
function scheduleDailyReminder(reg) {
  const todayStr = getTodayStr();

  // Don't re-schedule if already done for today
  if (localStorage.getItem(KEY_DAILY_SCHEDULED) === todayStr) return;

  const now    = new Date();
  const target = new Date();
  target.setHours(9, 0, 0, 0); // 9:00:00 AM

  // If 9 AM already passed today, schedule for tomorrow
  if (now >= target) {
    target.setDate(target.getDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  console.log(`[Notif] Daily reminder scheduled in ${Math.round(delay / 60000)} min`);

  setTimeout(async () => {
    const granted = await requestPermission();
    if (!granted) return;

    await showNotification(
      reg,
      "⚔ Don't forget your quests!",
      "Don't forget to complete your daily quests. Check the game to see any active or urgent quests.",
      "nexus-daily-reminder"
    );

    // Mark as scheduled for today
    localStorage.setItem(KEY_DAILY_SCHEDULED, getTodayStr());

    // Re-schedule for tomorrow automatically
    scheduleDailyReminder(reg);
  }, delay);
}

// ── Quest Reset Notification (new day detected) ───────────────
async function checkQuestReset(reg) {
  const todayStr   = getTodayStr();
  const lastDayStr = localStorage.getItem(KEY_LAST_DAY);

  if (lastDayStr && lastDayStr !== todayStr) {
    // New day — quests have reset
    const granted = await requestPermission();
    if (granted) {
      await showNotification(
        reg,
        "🌅 A new day has begun!",
        "Check the game to see any active or urgent quests. Complete them before midnight!",
        "nexus-quest-reset"
      );
    }
  }

  // Always update the stored day
  localStorage.setItem(KEY_LAST_DAY, todayStr);
}

// ── Auto-run on load ──────────────────────────────────────────
async function initNotifications() {
  const reg     = await registerSW();
  const granted = await requestPermission();

  if (!granted) {
    console.warn("[Notif] Permission not granted. Notifications disabled.");
    return;
  }

  await checkQuestReset(reg);
  scheduleDailyReminder(reg);

  // Welcome notification on login page open
  await showNotification(
    reg,
    "👋 Welcome, Player!",
    "Are you ready to complete your quests? Your journey continues!",
    "nexus-welcome"
  );
}

initNotifications();
