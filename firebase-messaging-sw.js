// Firebase Messaging Service Worker — handles push when app is CLOSED
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
    authDomain: "daily-voting-793ee.firebaseapp.com",
    projectId: "daily-voting-793ee",
    storageBucket: "daily-voting-793ee.appspot.com",
    messagingSenderId: "1065830068376",
    appId: "1:1065830068376:web:9d3858939d07056a5fa0ed"
});

const messaging = firebase.messaging();

// Background message — app is closed or hidden
messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || '🕊️ Faith & Fitness';
    const body  = payload.notification?.body  || '';
    self.registration.showNotification(title, {
        body,
        icon:  '/faith-and-fitnesss/photo/logo.png',
        badge: '/faith-and-fitnesss/photo/logo.png',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        data: { url: '/faith-and-fitnesss/user/voting.html' }
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            if (list.length > 0) return list[0].focus();
            return clients.openWindow('/faith-and-fitnesss/user/voting.html');
        })
    );
});
