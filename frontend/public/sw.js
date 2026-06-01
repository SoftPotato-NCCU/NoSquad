const CACHE_NAME = "nosquad-v1";
const urlsToCache = [];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const isSilent = data.silent === true;

  if (isSilent) {
    // Silent notification - process data without showing UI
    console.log("[PUSH] Silent notification received:", data);
    event.waitUntil(Promise.resolve());
    return;
  }

  // Show visual notification
  const title = data.title || "NoSquad";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192x192.png",
    badge: "/icon-192x192.png",
    tag: data.tag || "default",
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // 1. One format: Extract strictly from event.notification.data.path
  const targetPath = event.notification.data?.path || "/";

  // Full URL fallback for when the app is closed
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    // includeUncontrolled: true is required for iOS WebKit compatibility
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {

      // Priority 1: App is open in the foreground (visible)
      const foregroundClient = clientList.find(c => c.visibilityState === "visible");
      if (foregroundClient && "focus" in foregroundClient) {
        foregroundClient.postMessage({ type: "NAVIGATE_TO", navigation: targetPath });
        return foregroundClient.focus();
      }

      // Priority 2: App is open in the background (hidden)
      const backgroundClient = clientList.find(c => "focus" in c);
      if (backgroundClient) {
        backgroundClient.postMessage({ type: "NAVIGATE_TO", navigation: targetPath });
        return backgroundClient.focus();
      }

      // Priority 3: App is completely closed
      // iOS PWA ignores deep link URLs and always opens at manifest start_url ("/").
      // Encode the target as a query param so the app can read it after launch.
      if (clients.openWindow) {
        const launchUrl = targetPath === "/"
          ? self.location.origin
          : `${self.location.origin}/?navigate=${encodeURIComponent(targetPath)}`;
        return clients.openWindow(launchUrl);
      }
    })
  );
});
