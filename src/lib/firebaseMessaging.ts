import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

export const FCM_VAPID_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_FIREBASE_VAPID_KEY) ||
  'BEbZPQQrQa_0hDkVzBYUA0ge4GsBW_-QP79WSiPjg16FlCQ4g964b5tUuV5bmbBwj4RoE2svfrWWI5V4AYDvgEI';

let messagingInstance: Messaging | null = null;

/**
 * Verifica si Firebase Cloud Messaging y las Notificaciones son compatibles en el navegador actual.
 */
export async function isFCMSupported(): Promise<boolean> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return false;
    }
    const supported = await isSupported();
    return supported;
  } catch (error) {
    console.warn('Error verificando compatibilidad de FCM:', error);
    return false;
  }
}

/**
 * Obtiene la instancia de Firebase Messaging de forma lazy y segura.
 */
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messagingInstance) return messagingInstance;
  const supported = await isFCMSupported();
  if (!supported) return null;
  try {
    const app = getApp();
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error('Error inicializando Firebase Messaging:', err);
    return null;
  }
}

/**
 * Solicita permiso de notificaciones al usuario, registra el Service Worker de FCM
 * y genera el Token de dispositivo para guardarlo en Firestore.
 */
export async function requestPushNotificationPermission(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { success: false, error: 'Tu navegador no soporta notificaciones push.' };
    }

    // Solicitar permiso nativo al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Permiso de notificaciones bloqueado. Actívalo en la configuración del navegador (ícono del candado 🔒 en la barra de direcciones).'
            : 'Permiso no otorgado.'
      };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { success: false, error: 'Firebase Messaging no es compatible en este entorno.' };
    }

    // Registrar Service Worker dedicado de FCM
    let swRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      try {
        swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
      } catch (swErr) {
        console.warn('Registro directo de SW falló, buscando registro existente:', swErr);
        swRegistration = await navigator.serviceWorker.getRegistration('/');
      }
    }

    // Obtener FCM Token usando la VAPID key
    const currentToken = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: swRegistration
    });

    if (!currentToken) {
      return {
        success: false,
        error: 'No se pudo generar el token de registro de FCM. Verifica la clave VAPID.'
      };
    }

    // Guardar token en localStorage
    localStorage.setItem('fcm_token', currentToken);
    localStorage.setItem('fcm_token_time', new Date().toISOString());

    // Guardar token en Firestore si el usuario está autenticado
    const user = auth.currentUser;
    if (user) {
      try {
        const tokenKey = currentToken.substring(0, 32).replace(/[^a-zA-Z0-9]/g, '_');
        const tokenDocRef = doc(db, 'users', user.uid, 'fcmTokens', tokenKey);
        await setDoc(
          tokenDocRef,
          {
            token: currentToken,
            userAgent: navigator.userAgent,
            plataforma: navigator.platform || 'web',
            actualizadoEn: new Date().toISOString(),
            usuarioEmail: user.email || 'anonimo'
          },
          { merge: true }
        );
      } catch (saveError) {
        console.warn('No se pudo guardar el token en Firestore (se guardó en local):', saveError);
      }
    }

    return { success: true, token: currentToken };
  } catch (error: unknown) {
    console.error('Error al solicitar permiso de notificaciones:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

/**
 * Escucha notificaciones push en primer plano (cuando la app está abierta)
 */
export function setupFCMForegroundListener(
  onNotificationReceived: (payload: { title: string; body: string; data?: Record<string, unknown> }) => void
): () => void {
  let unsubscribe: (() => void) | null = null;

  getMessagingInstance().then((messaging) => {
    if (!messaging) return;
    try {
      unsubscribe = onMessage(messaging, (payload) => {
        console.log('[FCM Foreground] Notificación recibida:', payload);
        const title = payload.notification?.title || payload.data?.title || 'EL CHINO CARRANZA';
        const body = payload.notification?.body || payload.data?.body || 'Nuevo aviso del sistema';
        
        onNotificationReceived({
          title,
          body,
          data: payload.data
        });

        // Si tenemos permiso, disparar también notificación nativa del SO
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/favicon-32x32.png'
            });
          } catch {
            // Ignorar si el navegador bloquea Notification en primer plano
          }
        }
      });
    } catch (e) {
      console.warn('Error configurando onMessage foreground listener:', e);
    }
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}

/**
 * Dispara una notificación de prueba local o alerta programada del calendario
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  options?: NotificationOptions
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const res = await requestPushNotificationPermission();
    if (!res.success) return false;
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: '/pwa-192x192.png',
        badge: '/favicon-32x32.png',
        ...({ vibrate: [200, 100, 200] } as any),
        ...options
      });
      return true;
    } else {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        ...options
      });
      return true;
    }
  } catch (err) {
    console.warn('Fallo al mostrar notificación nativa:', err);
    try {
      new Notification(title, { body, ...options });
      return true;
    } catch {
      return false;
    }
  }
}
