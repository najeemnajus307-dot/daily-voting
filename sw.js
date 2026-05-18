// Service Worker for Faith & Fitness Native Push Notifications

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// Listen to notification clicks and focus the app window
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let c of clientList) {
                    if (c.focused) {
                        return c.focus();
                    }
                }
                return client.focus();
            }
            return clients.openWindow('./user/voting.html');
        })
    );
});
