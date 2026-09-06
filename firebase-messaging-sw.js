// Service Worker de Notificaciones Push y Segundo Plano para EL CHINO CARRANZA
// Diseñado para funcionar cuando la app está CERRADA, bloqueada o en segundo plano.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// 1. Inicializar Firebase Messaging para compatibilidad con FCM
try {
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
    console.log('[SW] Mensaje FCM recibido en segundo plano:', payload);
    const title = payload.notification?.title || payload.data?.title || 'EL CHINO CARRANZA';
    const body = payload.notification?.body || payload.data?.body || 'Aviso importante del taller';

    return self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      data: payload.data || {},
      vibrate: [200, 100, 200, 100, 200],
      tag: payload.data?.tag || 'fcm-chino-' + Date.now(),
      renotify: true,
      requireInteraction: true
    });
  });
} catch (e) {
  console.warn('[SW] Firebase messaging compat init warning:', e);
}

// 2. Escuchar evento Push nativo estándar (Web Push desde servidor / VAPID)
// Este evento se dispara cuando la app está COMPLETAMENTE CERRADA o el teléfono bloqueado
self.addEventListener('push', (event) => {
  console.log('[SW] Evento Push nativo recibido en segundo plano:', event);

  let payload = {
    title: '🔔 Taller EL CHINO CARRANZA',
    body: 'Tienes compromisos o avisos programados en el taller.',
    url: '/',
    tag: 'push-chino-' + Date.now()
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch (err) {
      try {
        const text = event.data.text();
        if (text) payload.body = text;
      } catch (e) {}
    }
  }

  const notificationOptions = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    vibrate: [250, 100, 250, 100, 250],
    data: {
      url: payload.url || '/',
      dateStr: payload.dateStr,
      tipo: payload.tipo,
      timestamp: Date.now()
    },
    tag: payload.tag || 'chino-alert',
    renotify: true,
    requireInteraction: true,
    actions: [
      { action: 'open_app', title: 'Abrir Taller' },
      { action: 'dismiss', title: 'Entendido' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

// 3. Periodic Background Sync (Android Chrome PWA)
// El sistema operativo despierta al Service Worker periódicamente para verificar alertas
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] PeriodicSync activado:', event.tag);
  if (event.tag === 'check-calendar-alerts') {
    event.waitUntil(checkPendingAlertsFromStorage());
  }
});

// 4. Background Sync estándar
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync activado:', event.tag);
  if (event.tag === 'check-calendar-alerts' || event.tag === 'sync-alerts') {
    event.waitUntil(checkPendingAlertsFromStorage());
  }
});

// Función para leer alertas pendientes desde IndexedDB en segundo plano
async function checkPendingAlertsFromStorage() {
  try {
    const alertsData = await getAlertsFromIndexedDB();
    if (!alertsData || !alertsData.alerts || alertsData.alerts.length === 0) {
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAlerts = alertsData.alerts.filter((a) => a.esParaHoy || a.fecha === todayStr);

    if (todayAlerts.length > 0) {
      const first = todayAlerts[0];
      const count = todayAlerts.length;
      const title = count > 1 
        ? `🔔 ${count} Compromisos para Hoy en el Taller` 
        : first.titulo;
      const body = count > 1 
        ? `${first.titulo} y ${count - 1} evento(s) más. Toca para ver el calendario.` 
        : first.detalle;

      await self.registration.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon-32x32.png',
        vibrate: [200, 100, 200],
        tag: 'periodic-alert-' + todayStr,
        renotify: false,
        data: { url: '/' }
      });
    }
  } catch (err) {
    console.warn('[SW] Error verificando alertas en IndexedDB:', err);
  }
}

function getAlertsFromIndexedDB() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open('ChinoTallerDB', 1);
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('calendar_alerts')) {
          return resolve(null);
        }
        const tx = db.transaction('calendar_alerts', 'readonly');
        const store = tx.objectStore('calendar_alerts');
        const getReq = store.get('current_alerts');
        getReq.onsuccess = () => resolve(getReq.result ? getReq.result.data : null);
        getReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// 5. Interacción al hacer clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

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

// Forzar activación inmediata de nueva versión del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
