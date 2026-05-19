// Firebase Messaging Service Worker — handles push when app is CLOSED or in BACKGROUND
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

// ✅ This handler fires when the app is CLOSED or in BACKGROUND
// Without this, notifications only appear when the user opens the app again
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const title = payload.notification?.title || '🕊️ Faith & Fitness';
    const body  = payload.notification?.body  || payload.data?.body || '';

    // Derive icon from service worker's own location (works on GitHub Pages too)
    const swUrl  = new URL(self.location.href);
    const origin = swUrl.origin;
    // sw is at root, so /photo/logo.png is always correct
    const scope  = swUrl.pathname.replace('firebase-messaging-sw.js', '');
    const iconUrl = origin + scope + 'photo/logo.png';
    const clickUrl = origin + scope + 'user/voting.html';

    const notificationOptions = {
        body,
        icon: iconUrl,
        badge: iconUrl,
        vibrate: [200, 100, 200],
        requireInteraction: true,      // stays until user taps it
        tag: payload.messageId || 'faith-fitness-push',
        data: { url: clickUrl }        // used in notificationclick below
    };

    self.registration.showNotification(title, notificationOptions);
});

// ✅ Open / focus the app when user taps the notification
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If app is already open in a tab, focus it
            for (const client of clientList) {
                if (client.url.includes('voting.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new tab
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
