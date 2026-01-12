
/* Firebase Messaging Service Worker */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

/* 🔥 Firebase config – SAME as your project */
firebase.initializeApp({
  apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
  authDomain: "daily-voting-793ee.firebaseapp.com",
  projectId: "daily-voting-793ee",
  storageBucket: "daily-voting-793ee.appspot.com",
  messagingSenderId: "106853008376",
  appId: "1:106853008376:web:xxxxxxxxxxxx"
});

/* 🔔 Messaging */
const messaging = firebase.messaging();

/* 📩 Background notification */
messaging.onBackgroundMessage(function(payload) {
  console.log("[firebase-messaging-sw.js] Background message ", payload);

  const title = payload.notification?.title || "Faith & Fitness";
  const options = {
    body: payload.notification?.body || "Voting reminder",
    icon: "/logo.png",
    badge: "/logo.png",
    data: {
      url: payload.notification?.click_action || "/"
    }
  };

  self.registration.showNotification(title, options);
});

/* 👉 Click notification */
self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.openWindow(url)
  );
});
