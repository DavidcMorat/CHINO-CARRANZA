var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_web_push = __toESM(require("web-push"), 1);
var import_vite = require("vite");
var PORT = 3e3;
var app = (0, import_express.default)();
app.use(import_express.default.json());
var VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BMziAY3WG1q9_oDvF2SuwNzdBX-R9aDmT4W-YbIdYF36z81jjwjUHJgh2KuEA6wsc72_CqMHOLvZMo2-xsPUaa4";
var VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "3yUhbOS16QYnpYTmpEB5ekklhWBDNBrL0yGryGOrTgY";
var VAPID_SUBJECT = "mailto:tallerchino.notificaciones@gmail.com";
try {
  import_web_push.default.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log("[Server] Web Push VAPID configurado correctamente.");
} catch (err) {
  console.error("[Server] Error configurando VAPID:", err);
}
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var SUBSCRIPTIONS_FILE = import_path.default.join(DATA_DIR, "push-subscriptions.json");
var CALENDAR_CACHE_FILE = import_path.default.join(DATA_DIR, "calendar-sync.json");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
function loadSubscriptions() {
  try {
    if (import_fs.default.existsSync(SUBSCRIPTIONS_FILE)) {
      const raw = import_fs.default.readFileSync(SUBSCRIPTIONS_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[Server] Error leyendo archivo de suscripciones:", err);
  }
  return [];
}
function saveSubscriptions(subs) {
  try {
    import_fs.default.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(subs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Server] Error guardando archivo de suscripciones:", err);
  }
}
function loadCalendarCache() {
  try {
    if (import_fs.default.existsSync(CALENDAR_CACHE_FILE)) {
      return JSON.parse(import_fs.default.readFileSync(CALENDAR_CACHE_FILE, "utf-8"));
    }
  } catch {
  }
  return null;
}
function saveCalendarCache(data) {
  try {
    import_fs.default.writeFileSync(CALENDAR_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
  }
}
var activeSubscriptions = loadSubscriptions();
var cachedCalendarData = loadCalendarCache();
var lastAutoPushDate = "";
async function broadcastPushNotification(payload) {
  let sent = 0;
  let failed = 0;
  const payloadString = JSON.stringify(payload);
  const remainingSubs = [];
  for (const item of activeSubscriptions) {
    try {
      await import_web_push.default.sendNotification(item.subscription, payloadString);
      sent++;
      remainingSubs.push(item);
    } catch (err) {
      console.warn("[Server] Error enviando push a dispositivo:", err?.statusCode || err?.message);
      failed++;
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        console.log("[Server] Eliminando suscripci\xF3n inv\xE1lida / expirada");
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
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    subscriptionsCount: activeSubscriptions.length,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/push/public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});
app.post("/api/push/subscribe", (req, res) => {
  const { subscription, userId, userAgent, platform } = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Suscripci\xF3n inv\xE1lida" });
    return;
  }
  const endpoint = subscription.endpoint;
  const existingIdx = activeSubscriptions.findIndex((s) => s.subscription.endpoint === endpoint);
  const subRecord = {
    id: "sub_" + Buffer.from(endpoint).toString("base64").substring(0, 24),
    subscription,
    userId: userId || "anonimo",
    userAgent: userAgent || "",
    platform: platform || "",
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
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
app.post("/api/push/sync-calendar", (req, res) => {
  const { summary } = req.body;
  if (summary) {
    cachedCalendarData = {
      summary,
      receivedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveCalendarCache(cachedCalendarData);
  }
  res.json({ success: true, stored: !!cachedCalendarData });
});
app.post("/api/push/send", async (req, res) => {
  const { title, body, delaySeconds, tag, url, data } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "T\xEDtulo y mensaje son requeridos" });
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
    tag: tag || "chino-alert-" + Date.now(),
    url: url || "/",
    data: data || {}
  };
  const delayMs = Math.max(0, Number(delaySeconds) || 0) * 1e3;
  if (delayMs > 0) {
    console.log(`[Server] Programando notificaci\xF3n push para dentro de ${delaySeconds} segundos...`);
    setTimeout(async () => {
      console.log(`[Server] Ejecutando env\xEDo diferido de push notification...`);
      const result = await broadcastPushNotification(payload);
      console.log(`[Server] Push diferido completado: ${result.sent} enviados, ${result.failed} fallidos.`);
    }, delayMs);
    res.json({
      success: true,
      scheduled: true,
      delaySeconds,
      recipients: activeSubscriptions.length,
      message: `Notificaci\xF3n programada para dentro de ${delaySeconds} segundos.`
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
function checkAndBroadcastDailyAlerts() {
  if (!cachedCalendarData || !cachedCalendarData.summary) return;
  if (activeSubscriptions.length === 0) return;
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (lastAutoPushDate === todayStr) return;
  const { alerts, totalPagosHoy, conteoPagos } = cachedCalendarData.summary;
  if (!alerts || alerts.length === 0) return;
  console.log(`[Server Scheduler] Verificando compromisos del calendario para hoy (${todayStr})...`);
  let title = "\u{1F4C5} Taller EL CHINO: Compromisos de Hoy";
  let body = `Tienes ${alerts.length} evento(s) agendados para hoy en el taller.`;
  if (conteoPagos > 0) {
    title = `\u{1F4B0} ALERTA DE PAGOS HOY (S/ ${totalPagosHoy.toFixed(2)})`;
    const workers = alerts.filter((a) => a.tipo === "pago_sueldo" || a.tipo === "anticipo").map((a) => a.titulo.replace("\u{1F4B0} Pago de Sueldo: ", "").replace("\u{1F4B5} Anticipo de Sueldo: ", "")).join(", ");
    body = `Hoy toca abonar a: ${workers}. Toca para revisar el calendario.`;
  }
  broadcastPushNotification({
    title,
    body,
    tag: `auto-push-${todayStr}`,
    url: "/"
  }).then((res) => {
    if (res.sent > 0) {
      lastAutoPushDate = todayStr;
      console.log(`[Server Scheduler] Push diario enviado a ${res.sent} dispositivo(s).`);
    }
  });
}
setInterval(checkAndBroadcastDailyAlerts, 15 * 60 * 1e3);
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Servidor ejecut\xE1ndose en http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
