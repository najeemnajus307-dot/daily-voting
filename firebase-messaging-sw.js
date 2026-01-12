/* firebase-messaging-sw.js */

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
  authDomain: "daily-voting-793ee.firebaseapp.com",
  projectId: "daily-voting-793ee",
  messagingSenderId: "106550006876",
  appId: "1:106550006876:web:xxxxxxxxxxxx"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  console.log("Background message:", payload);

  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: "/logo.png"
    }
  );
});
