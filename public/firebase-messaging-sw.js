// Service Worker de Firebase Cloud Messaging (FCM) para EL CHINO CARRANZA
// Permite recibir notificaciones push en segundo plano incluso con la app cerrada

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDgd0hZFb64DPCmrRedcDgD0ZkwwyatDfs",
  authDomain: "app-taller-e07d2.firebaseapp.com",
  projectId: "app-taller-e07d2",
  storageBucket: "app-taller-e07d2.firebasestorage.app",
  messagingSenderId: "762019943290",
  appId: "1:762019943290:web:7989917d245f62243e7cc3",
  measurementId: "G-W89C5GRMG7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'EL CHINO CARRANZA';
  const notificationBody = payload.notification?.body || payload.data?.body || 'Aviso importante del taller';
  
  const notificationOptions = {
    body: notificationBody,
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    data: payload.data || {},
    vibrate: [200, 100, 200, 100, 200],
    tag: payload.data?.tag || 'fcm-taller-notification',
    renotify: true,
    requireInteraction: true
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
