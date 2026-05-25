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

  // Get target path from notification data
  const targetPath = event.notification.data?.path || "/";
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          // Navigate to target path
          client.postMessage({ type: "NAVIGATE_TO", path: targetPath });
          return;
        }
      }
      // No window found, open new one with target path
      return clients.openWindow(targetUrl);
    })
  );
});