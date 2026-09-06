/**
 * Gestor de suscripciones a Web Push para notificaciones en segundo plano
 * Permite recibir notificaciones cuando la app está completamente cerrada o en segundo plano.
 */

export const VAPID_PUBLIC_KEY =
  'BMziAY3WG1q9_oDvF2SuwNzdBX-R9aDmT4W-YbIdYF36z81jjwjUHJgh2KuEA6wsc72_CqMHOLvZMo2-xsPUaa4';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Guarda las alertas del calendario en IndexedDB para que el Service Worker
 * pueda consultarlas incluso si no hay conexión o la app está cerrada.
 */
export async function saveAlertsToIndexedDB(alertsData: any): Promise<void> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return;
  return new Promise((resolve) => {
    const request = indexedDB.open('ChinoTallerDB', 1);
    request.onupgradeneeded = (e: any) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('calendar_alerts')) {
        db.createObjectStore('calendar_alerts', { keyPath: 'id' });
      }
    };
    request.onsuccess = (e: any) => {
      try {
        const db = e.target.result;
        const tx = db.transaction('calendar_alerts', 'readwrite');
        const store = tx.objectStore('calendar_alerts');
        store.put({
          id: 'current_alerts',
          data: alertsData,
          updatedAt: new Date().toISOString()
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    };
    request.onerror = () => resolve();
  });
}

/**
 * Registra o verifica la suscripción a Web Push en el navegador/dispositivo.
 */
export async function subscribeUserToWebPush(userId?: string): Promise<{
  success: boolean;
  subscription?: PushSubscription;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return {
      success: false,
      error: 'Tu navegador o dispositivo no soporta la API de Web Push estándar.'
    };
  }

  try {
    // 1. Obtener permiso de notificaciones
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Notificaciones bloqueadas por el navegador. Habilítalas en los ajustes del sitio (ícono del candado 🔒).'
            : 'Permiso de notificaciones no otorgado.'
      };
    }

    // 2. Registrar el Service Worker dedicado
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    await navigator.serviceWorker.ready;

    // 3. Obtener o crear la suscripción de Push
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // 4. Intentar habilitar Periodic Background Sync (Android Chrome PWA)
    if ('periodicSync' in registration) {
      try {
        const status = await (navigator as any).permissions?.query({
          name: 'periodic-background-sync' as any
        });
        if (status?.state === 'granted') {
          await (registration as any).periodicSync.register('check-calendar-alerts', {
            minInterval: 12 * 60 * 60 * 1000 // Cada 12 horas
          });
          console.log('[Push] Periodic Background Sync registrado con éxito');
        }
      } catch (syncErr) {
        console.warn('[Push] Periodic Background Sync no disponible en este entorno:', syncErr);
      }
    }

    // 5. Enviar la suscripción al servidor para que pueda enviar push con la app cerrada
    try {
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: userId || 'anonimo',
          userAgent: navigator.userAgent,
          platform: navigator.platform
        })
      });
    } catch (serverErr) {
      console.warn('[Push] No se pudo sincronizar suscripción con el servidor local:', serverErr);
    }

    localStorage.setItem('webpush_subscribed', 'true');
    localStorage.setItem('webpush_subscribed_time', new Date().toISOString());

    return { success: true, subscription };
  } catch (error: any) {
    console.error('[Push] Error al suscribir a Web Push:', error);
    return { success: false, error: error?.message || String(error) };
  }
}

/**
 * Comprueba si el dispositivo actual ya está suscrito
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

/**
 * Sincroniza las alertas actuales del calendario con el servidor y con IndexedDB.
 * Permite que el servidor envíe avisos proactivos cuando la app esté cerrada.
 */
export async function syncAlertsWithServer(summary: any): Promise<boolean> {
  // Guardar en IndexedDB localmente para el Service Worker
  await saveAlertsToIndexedDB(summary);

  // Enviar al servidor backend
  try {
    const res = await fetch('/api/push/sync-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary,
        timestamp: new Date().toISOString()
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Envía una notificación push de prueba con un retardo configurable (en segundos).
 * Ideal para probar que la notificación llega cuando el usuario cierra la app o bloquea el teléfono.
 */
export async function sendTestBackgroundPush(delaySeconds: number = 5): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const subscription = await getExistingPushSubscription();
    if (!subscription) {
      const subRes = await subscribeUserToWebPush();
      if (!subRes.success) {
        return {
          success: false,
          message: subRes.error || 'No se pudo suscribir a notificaciones push.'
        };
      }
    }

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '🔔 Taller EL CHINO CARRANZA (Prueba en 2do Plano)',
        body: '¡Excelente! Tu dispositivo recibe notificaciones perfectamente incluso cuando estás fuera de la app.',
        delaySeconds,
        tag: 'test-background-push'
      })
    });

    if (res.ok) {
      return {
        success: true,
        message: `Notificación programada para dentro de ${delaySeconds} segundos. ¡Sal de la app o bloquea tu teléfono para verla llegar!`
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        message: errData.error || 'El servidor devolvió un error al programar la notificación.'
      };
    }
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Error de conexión con el servicio de notificaciones.'
    };
  }
}
