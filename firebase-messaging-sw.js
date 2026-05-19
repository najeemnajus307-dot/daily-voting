// Firebase Messaging Service Worker v2 — handles push when app is CLOSED or in BACKGROUND
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Force new SW to activate immediately without waiting for old tabs to close
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

firebase.initializeApp({
    apiKey: "AIzaSyDzcAE2EoLEdhG1VrxGuC981RH-5TmWE",
    authDomain: "daily-voting-793ee.firebaseapp.com",
    projectId: "daily-voting-793ee",
    storageBucket: "daily-voting-793ee.appspot.com",
    messagingSenderId: "1065830068376",
    appId: "1:1065830068376:web:9d3858939d07056a5fa0ed"
});

const messaging = firebase.messaging();

// ✅ Fires when app is CLOSED or in BACKGROUND
messaging.onBackgroundMessage((payload) => {
    console.log('[SW v2] Background message received:', payload);

    const title = payload.notification?.title || '🕊️ Faith & Fitness';
    const body  = payload.notification?.body  || payload.data?.body || '';

    const swUrl   = new URL(self.location.href);
    const scope   = swUrl.pathname.replace('firebase-messaging-sw.js', '');
    const iconUrl = swUrl.origin + scope + 'photo/logo.png';
    const clickUrl = swUrl.origin + scope + 'user/voting.html';

    self.registration.showNotification(title, {
        body,
        icon: iconUrl,
        badge: iconUrl,
        vibrate: [200, 100, 200],
        requireInteraction: true,
        tag: payload.messageId || 'faith-fitness-push',
        data: { url: clickUrl }
    });
});

// ✅ Open app when user taps the notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('voting.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});
