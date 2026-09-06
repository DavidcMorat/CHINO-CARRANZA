import express from 'express';
import path from 'path';
import fs from 'fs';
import webpush from 'web-push';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();

app.use(express.json());

// Claves VAPID estables para Web Push en segundo plano
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BMziAY3WG1q9_oDvF2SuwNzdBX-R9aDmT4W-YbIdYF36z81jjwjUHJgh2KuEA6wsc72_CqMHOLvZMo2-xsPUaa4';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || '3yUhbOS16QYnpYTmpEB5ekklhWBDNBrL0yGryGOrTgY';
const VAPID_SUBJECT = 'mailto:tallerchino.notificaciones@gmail.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Server] Web Push VAPID configurado correctamente.');
} catch (err) {
  console.error('[Server] Error configurando VAPID:', err);
}

// Persistencia de suscripciones de dispositivos
const DATA_DIR = path.join(process.cwd(), 'data');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const CALENDAR_CACHE_FILE = path.join(DATA_DIR, 'calendar-sync.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StoredSubscription {
  id: string;
  subscription: webpush.PushSubscription;
  userId?: string;
  userAgent?: string;
  platform?: string;
  updatedAt: string;
}

function loadSubscriptions(): StoredSubscription[] {
  try {
    if (fs.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('[Server] Error leyendo archivo de suscripciones:', err);
  }
  return [];
}

function saveSubscriptions(subs: StoredSubscription[]) {
  try {
    fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Error guardando archivo de suscripciones:', err);
  }
}

function loadCalendarCache(): any {
  try {
    if (fs.existsSync(CALENDAR_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CALENDAR_CACHE_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveCalendarCache(data: any) {
  try {
    fs.writeFileSync(CALENDAR_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch {}
}

let activeSubscriptions: StoredSubscription[] = loadSubscriptions();
let cachedCalendarData: any = loadCalendarCache();
let lastAutoPushDate: string = '';

// Helper para enviar push a todas las suscripciones registradas
async function broadcastPushNotification(payload: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  data?: any;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const payloadString = JSON.stringify(payload);
  const remainingSubs: StoredSubscription[] = [];

  for (const item of activeSubscriptions) {
    try {
      await webpush.sendNotification(item.subscription, payloadString);
      sent++;
      remainingSubs.push(item);
    } catch (err: any) {
      console.warn('[Server] Error enviando push a dispositivo:', err?.statusCode || err?.message);
      failed++;
      // Si la suscripción expiró o fue revocada por el navegador (404 / 410)
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        console.log('[Server] Eliminando suscripción inválida / expirada');
      } else {
        remainingSubs.push(item);
      }
    }
  }

  if (remainingSubs.length !== activeSubscriptions.length) {
    activeSubscriptions = remainingSubs;
    saveSubscriptions(activeSubscriptions);
  }

  return { sent, failed };
}

// -------------------------------------------------------------
// RUTAS DE LA API (Deben ir PRIMERO antes de Vite)
// -------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    subscriptionsCount: activeSubscriptions.length,
    timestamp: new Date().toISOString()
  });
});

// Obtener clave pública de VAPID
app.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Registrar o actualizar suscripción de un dispositivo
app.post('/api/push/subscribe', (req, res) => {
  const { subscription, userId, userAgent, platform } = req.body;

  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: 'Suscripción inválida' });
    return;
  }

  const endpoint = subscription.endpoint;
  const existingIdx = activeSubscriptions.findIndex((s) => s.subscription.endpoint === endpoint);

  const subRecord: StoredSubscription = {
    id: 'sub_' + Buffer.from(endpoint).toString('base64').substring(0, 24),
    subscription,
    userId: userId || 'anonimo',
    userAgent: userAgent || '',
    platform: platform || '',
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    activeSubscriptions[existingIdx] = subRecord;
  } else {
    activeSubscriptions.push(subRecord);
  }

  saveSubscriptions(activeSubscriptions);
  console.log(`[Server] Dispositivo suscrito a Web Push. Total activos: ${activeSubscriptions.length}`);

  res.json({ success: true, count: activeSubscriptions.length });
});

// Sincronizar calendario con el servidor para escaneo en segundo plano
app.post('/api/push/sync-calendar', (req, res) => {
  const { summary } = req.body;
  if (summary) {
    cachedCalendarData = {
      summary,
      receivedAt: new Date().toISOString()
    };
    saveCalendarCache(cachedCalendarData);
  }
  res.json({ success: true, stored: !!cachedCalendarData });
});

// Enviar push notification (con soporte para retardo configurable)
app.post('/api/push/send', async (req, res) => {
  const { title, body, delaySeconds, tag, url, data } = req.body;

  if (!title || !body) {
    res.status(400).json({ error: 'Título y mensaje son requeridos' });
    return;
  }

  if (activeSubscriptions.length === 0) {
    res.status(400).json({
      error: 'No hay dispositivos suscritos. Haz clic en "Activar Notificaciones" primero.'
    });
    return;
  }

  const payload = {
    title,
    body,
    tag: tag || 'chino-alert-' + Date.now(),
    url: url || '/',
    data: data || {}
  };

  const delayMs = Math.max(0, Number(delaySeconds) || 0) * 1000;

  if (delayMs > 0) {
    console.log(`[Server] Programando notificación push para dentro de ${delaySeconds} segundos...`);
    setTimeout(async () => {
      console.log(`[Server] Ejecutando envío diferido de push notification...`);
      const result = await broadcastPushNotification(payload);
      console.log(`[Server] Push diferido completado: ${result.sent} enviados, ${result.failed} fallidos.`);
    }, delayMs);

    res.json({
      success: true,
      scheduled: true,
      delaySeconds,
      recipients: activeSubscriptions.length,
      message: `Notificación programada para dentro de ${delaySeconds} segundos.`
    });
  } else {
    const result = await broadcastPushNotification(payload);
    res.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      recipients: activeSubscriptions.length
    });
  }
});

// -------------------------------------------------------------
// MOTOR EN SEGUNDO PLANO DEL SERVIDOR (Scheduler)
// Revisa periódicamente las alertas del calendario y envía push a los teléfonos
// -------------------------------------------------------------
function checkAndBroadcastDailyAlerts() {
  if (!cachedCalendarData || !cachedCalendarData.summary) return;
  if (activeSubscriptions.length === 0) return;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Evitar enviar repetidamente el mismo día
  if (lastAutoPushDate === todayStr) return;

  const { alerts, totalPagosHoy, conteoPagos } = cachedCalendarData.summary;
  if (!alerts || alerts.length === 0) return;

  // Si son más de las 8:00 AM hora del taller o hay pagos programados
  console.log(`[Server Scheduler] Verificando compromisos del calendario para hoy (${todayStr})...`);

  let title = '📅 Taller EL CHINO: Compromisos de Hoy';
  let body = `Tienes ${alerts.length} evento(s) agendados para hoy en el taller.`;

  if (conteoPagos > 0) {
    title = `💰 ALERTA DE PAGOS HOY (S/ ${totalPagosHoy.toFixed(2)})`;
    const workers = alerts
      .filter((a: any) => a.tipo === 'pago_sueldo' || a.tipo === 'anticipo')
      .map((a: any) => a.titulo.replace('💰 Pago de Sueldo: ', '').replace('💵 Anticipo de Sueldo: ', ''))
      .join(', ');
    body = `Hoy toca abonar a: ${workers}. Toca para revisar el calendario.`;
  }

  broadcastPushNotification({
    title,
    body,
    tag: `auto-push-${todayStr}`,
    url: '/'
  }).then((res) => {
    if (res.sent > 0) {
      lastAutoPushDate = todayStr;
      console.log(`[Server Scheduler] Push diario enviado a ${res.sent} dispositivo(s).`);
    }
  });
}

// Ejecutar cada 15 minutos en segundo plano
setInterval(checkAndBroadcastDailyAlerts, 15 * 60 * 1000);

// -------------------------------------------------------------
// VITE MIDDLEWARE / PRODUCCIÓN
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Servidor ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
