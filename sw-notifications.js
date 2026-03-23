// ============================================================
//  sw-notifications.js — Leveling Nexus Service Worker
//  Place this file at: /LEVELING-NEXUS/sw-notifications.js
//
//  Handles:
//    - notificationclick  → opens/focuses the app
//    - notificationclose  → cleanup log
// ============================================================

self.addEventListener("install", (event) => {
  console.log("[SW-Notif] Installed");
  self.skipWaiting(); // Activate immediately
});

self.addEventListener("activate", (event) => {
  console.log("[SW-Notif] Activated");
  event.waitUntil(self.clients.claim()); // Take control of all pages
});

// ── Notification Click ────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "/LEVELING-NEXUS/index.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes("/LEVELING-NEXUS/") && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Notification Close (dismissed) ───────────────────────────
self.addEventListener("notificationclose", (event) => {
  console.log("[SW-Notif] Notification dismissed:", event.notification.tag);
});
