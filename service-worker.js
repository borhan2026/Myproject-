/* ================================
   Firebase Cloud Messaging
================================ */

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCanmAbhDzftHsfTanv3J8PH83Re6j0qt4",
  authDomain: "my-new-project-4fd70.firebaseapp.com",
  projectId: "my-new-project-4fd70",
  storageBucket: "my-new-project-4fd70.firebasestorage.app",
  messagingSenderId: "394052477072",
  appId: "1:394052477072:web:1cd69b98bde4d40dcb3815"
});

const messaging = firebase.messaging();


/* ================================
   Background Notification
================================ */

messaging.onBackgroundMessage((payload) => {

  console.log("Background notification:", payload);

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "মাদরাসা বাইতুল উলুম";

  const options = {
    body:
      payload.notification?.body ||
      payload.data?.body ||
      "নতুন নোটিফিকেশন এসেছে",

    icon: "./icon-192.png",
    badge: "./icon-192.png",

    data: {
      url:
        payload.data?.url ||
        "./index-21-updated.html"
    }
  };

  self.registration.showNotification(title, options);
});


/* ================================
   Notification Click
================================ */

self.addEventListener("notificationclick", event => {

  event.notification.close();

  const targetUrl =
    event.notification.data?.url ||
    "./index-21-updated.html";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {

      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })
  );
});


/* ================================
   PWA CACHE
================================ */

const CACHE_NAME = "baitul-ulum-v2";

const APP_FILES = [
  "./",
  "./index-21-updated.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];


self.addEventListener("install", event => {

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
  );

  self.skipWaiting();
});


self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});


self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") return;

  event.respondWith(

    fetch(event.request)

      .then(response => {

        const copy = response.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, copy));

        return response;

      })

      .catch(() => caches.match(event.request))

  );

});
