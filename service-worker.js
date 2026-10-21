/* ================================
   মাদরাসা বাইতুল উলুম — একটাই Service Worker
   (Firebase Cloud Messaging + PWA Cache)
================================ */

importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

const APP_URL = "./index-21-updated.html";

/* Notification click — অ্যাপ খুলবে (আগে থেকে খোলা থাকলে সেটিই ফোকাস হবে) */
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target = new URL(
    (event.notification.data && event.notification.data.url) || APP_URL,
    self.registration.scope
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.registration.scope) && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});

/* ================================
   Firebase Cloud Messaging (Background)
   — কোনো কারণে FCM সাপোর্ট না থাকলেও নিচের ক্যাশ অংশ চলবে
================================ */
try {
  firebase.initializeApp({
    apiKey: "AIzaSyCanmAbhDzftHsfTanv3J8PH83Re6j0qt4",
    authDomain: "my-new-project-4fd70.firebaseapp.com",
    projectId: "my-new-project-4fd70",
    storageBucket: "my-new-project-4fd70.firebasestorage.app",
    messagingSenderId: "394052477072",
    appId: "1:394052477072:web:1cd69b98bde4d40dcb3815"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage(payload => {
    /* payload-এ "notification" থাকলে ব্রাউজার/FCM নিজেই দেখায় — ডুপ্লিকেট এড়াতে আমরা দেখাব না */
    if (payload.notification) return;

    const data = payload.data || {};
    return self.registration.showNotification(data.title || "মাদরাসা বাইতুল উলুম", {
      body: data.body || "নতুন নোটিফিকেশন এসেছে",
      icon: "./icon-192.png",
      badge: "./icon-192.png",
      data: { url: data.url || APP_URL }
    });
  });
} catch (e) {
  console.warn("FCM init skipped:", e);
}

/* ================================
   PWA CACHE (অফলাইন সাপোর্ট)
================================ */
const CACHE_NAME = "baitul-ulum-v3";

const APP_FILES = [
  "./",
  APP_URL,
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      /* একটি ফাইল (যেমন আইকন) না থাকলেও install ব্যর্থ হবে না */
      Promise.all(APP_FILES.map(url => cache.add(url).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Firebase API / লাইভ ডাটা কখনো ক্যাশ হবে না */
function shouldSkip(url) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const h = url.hostname;
  if (h === "fonts.googleapis.com") return false;
  if (h.endsWith("googleapis.com")) return true;   // firestore, auth, fcm, installations...
  if (h.endsWith("firebaseio.com")) return true;
  if (h.endsWith("firebaseapp.com")) return true;  // auth handler
  return false;
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;

  const url = new URL(req.url);
  if (shouldSkip(url)) return;

  event.respondWith(
    fetch(req)
      .then(response => {
        if (response && (response.ok || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then(cached => {
          if (cached) return cached;
          if (req.mode === "navigate") {
            return caches.match(APP_URL).then(r => r || caches.match("./"));
          }
          return undefined;
        })
      )
  );
});
