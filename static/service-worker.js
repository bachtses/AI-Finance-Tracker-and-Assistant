self.addEventListener("install", event => {
  console.log("Service Worker installed");
  self.skipWaiting(); // activate immediately
});

self.addEventListener("activate", event => {
  console.log("Service Worker activated");
  event.waitUntil(clients.claim());  
});

// Dummy fetch listener (needed for Safari PWA install)
self.addEventListener("fetch", event => {
  // Not caching anything, just let requests pass through
});
