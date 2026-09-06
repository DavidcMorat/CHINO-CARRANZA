// Service Worker para EL CHINO CARRANZA
// Las notificaciones fuera de la app han sido eliminadas por solicitud del usuario.
// Todas las alertas y recordatorios se gestionan exclusivamente dentro de la aplicación.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
