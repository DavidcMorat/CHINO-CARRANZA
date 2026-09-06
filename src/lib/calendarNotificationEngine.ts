import { AppData, AutoNotificationConfig, Trabajador, Anticipo, Presupuesto, NotaImportante, Egreso, Trabajo } from '../types';
import { getTodayStr, getTomorrowStr, parseDateString, formatCurrency } from './dateUtils';
import { sendLocalNotification } from './firebaseMessaging';
import { syncAlertsWithServer, saveAlertsToIndexedDB } from './pushSubscription';

export const DEFAULT_NOTIFICATION_CONFIG: AutoNotificationConfig = {
  enabled: true,
  notificarPagos: true,
  notificarPresupuestos: true,
  notificarNotas: true,
  notificarEgresos: true,
  notificarTrabajos: true,
  anticiparUnDia: true
};

export interface CalendarAlertItem {
  id: string;
  tipo: 'pago_sueldo' | 'anticipo' | 'presupuesto' | 'nota' | 'egreso' | 'trabajo' | 'pago_manana';
  titulo: string;
  detalle: string;
  monto?: number;
  esParaHoy: boolean;
  fecha: string;
  prioridad: 'alta' | 'media' | 'baja';
}

/**
 * Determina si una fecha específica (YYYY-MM-DD) corresponde al día de pago de un trabajador.
 */
export function isWorkerPayday(worker: Trabajador, dateStr: string): boolean {
  const parsed = parseDateString(dateStr);
  if (!parsed) return false;
  const { year, month, day } = parsed;

  if (worker.frecuenciaPago === 'quincenal') {
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    return day === 15 || day === lastDayOfMonth || day === 30;
  }

  // Frecuencia mensual o especificada en fechaPago
  if (worker.fechaPago) {
    const pNum = Number(worker.fechaPago);
    if (!isNaN(pNum) && pNum === day) return true;
    if (worker.fechaPago.includes(String(day))) return true;
    
    // Si dice fin de mes
    const lower = worker.fechaPago.toLowerCase();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    if ((lower.includes('fin') || lower.includes('ultimo') || lower.includes('último')) && day === lastDayOfMonth) {
      return true;
    }
  }

  return false;
}

/**
 * Extrae y compila todas las alertas y compromisos importantes del calendario
 * para el día de hoy y (opcionalmente) alertas anticipadas para mañana.
 */
export function getCalendarAlerts(
  data: AppData,
  customConfig?: AutoNotificationConfig
): {
  alerts: CalendarAlertItem[];
  totalPagosHoy: number;
  totalEgresosHoy: number;
  conteoPagos: number;
  conteoNotas: number;
  conteoPresupuestos: number;
  todayStr: string;
} {
  const config = customConfig || data.configuracionNotificaciones || DEFAULT_NOTIFICATION_CONFIG;
  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();

  const alerts: CalendarAlertItem[] = [];
  let totalPagosHoy = 0;
  let totalEgresosHoy = 0;
  let conteoPagos = 0;
  let conteoNotas = 0;
  let conteoPresupuestos = 0;

  // 1. Pagos de sueldos a trabajadores HOY
  if (config.notificarPagos) {
    (data.trabajadores || []).forEach((w) => {
      if (isWorkerPayday(w, todayStr)) {
        const sueldo = Number(w.sueldo) || 0;
        totalPagosHoy += sueldo;
        conteoPagos++;
        alerts.push({
          id: `sueldo-${w.id}-${todayStr}`,
          tipo: 'pago_sueldo',
          titulo: `💰 Pago de Sueldo: ${w.nombre}`,
          detalle: `Fecha de pago programada para hoy. Sueldo: ${formatCurrency(sueldo)} (${w.frecuenciaPago || 'mensual'})`,
          monto: sueldo,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: 'alta'
        });
      }
    });

    // Anticipos / Adelantos de sueldo para HOY
    (data.anticipos || []).forEach((a) => {
      if (a.fecha === todayStr) {
        const monto = Number(a.monto) || 0;
        totalPagosHoy += monto;
        conteoPagos++;
        const worker = (data.trabajadores || []).find((w) => w.id === a.trabajadorId);
        alerts.push({
          id: `anticipo-${a.id}`,
          tipo: 'anticipo',
          titulo: `💵 Anticipo de Sueldo: ${worker ? worker.nombre : 'Trabajador'}`,
          detalle: `Adelanto programado para hoy por ${formatCurrency(monto)}. Concepto: ${a.descripcion || 'Sin detalle'}`,
          monto,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: 'alta'
        });
      }
    });
  }

  // 2. Presupuestos pendientes que vencen HOY
  if (config.notificarPresupuestos) {
    (data.presupuestos || []).forEach((p) => {
      if (p.fechaLimite === todayStr && p.estado === 'pendiente') {
        conteoPresupuestos++;
        alerts.push({
          id: `presupuesto-${p.id}`,
          tipo: 'presupuesto',
          titulo: `📋 Presupuesto por Vencer: ${p.descripcion}`,
          detalle: `Vence HOY. Monto cotizado: ${formatCurrency(Number(p.monto) || 0)}. Verificar con cliente.`,
          monto: Number(p.monto) || 0,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: 'media'
        });
      }
    });
  }

  // 3. Notas Importantes y Recordatorios para HOY
  if (config.notificarNotas) {
    (data.notasImportantes || []).forEach((n) => {
      if (n.fecha === todayStr && !n.completada) {
        conteoNotas++;
        const horaStr = n.hora ? ` a las ${n.hora}` : '';
        alerts.push({
          id: `nota-${n.id}`,
          tipo: 'nota',
          titulo: `📌 Recordatorio: ${n.titulo}`,
          detalle: `${n.descripcion || 'Sin detalles'}${horaStr} (${n.prioridad.toUpperCase()})`,
          monto: n.monto,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: n.prioridad
        });
      }
    });
  }

  // 4. Egresos y Gastos programados para HOY
  if (config.notificarEgresos) {
    (data.egresos || []).forEach((e) => {
      if (e.fecha === todayStr && e.tipo !== 'ingreso') {
        const monto = Number(e.monto) || 0;
        totalEgresosHoy += monto;
        alerts.push({
          id: `egreso-${e.id}`,
          tipo: 'egreso',
          titulo: `📉 Gasto Programado: ${e.descripcion}`,
          detalle: `Gasto de ${formatCurrency(monto)} previsto para hoy vía ${e.metodoPago}.`,
          monto,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: 'media'
        });
      }
    });
  }

  // 5. Trabajos que se entregan o agendan para HOY
  if (config.notificarTrabajos) {
    (data.trabajos || []).forEach((t) => {
      if (t.fecha === todayStr && t.estado !== 'completado') {
        alerts.push({
          id: `trabajo-${t.id}`,
          tipo: 'trabajo',
          titulo: `🚗 Trabajo de Taller: ${t.clienteNombre || 'Cliente'} (${t.vehiculo})`,
          detalle: `Trabajo pendiente: ${t.descripcion}. Estado: ${t.estado}. Costo: ${formatCurrency(Number(t.costo) || 0)}`,
          monto: Number(t.costo) || 0,
          esParaHoy: true,
          fecha: todayStr,
          prioridad: 'media'
        });
      }
    });
  }

  // 6. Alerta anticipada para MAÑANA (Pagos de sueldos)
  if (config.anticiparUnDia && config.notificarPagos) {
    (data.trabajadores || []).forEach((w) => {
      if (isWorkerPayday(w, tomorrowStr)) {
        const sueldo = Number(w.sueldo) || 0;
        alerts.push({
          id: `sueldo-tomorrow-${w.id}-${tomorrowStr}`,
          tipo: 'pago_manana',
          titulo: `⏰ Aviso Previo: Mañana es Pago de ${w.nombre}`,
          detalle: `Recordatorio para preparar fondos: mañana ${tomorrowStr} corresponde abonar ${formatCurrency(sueldo)}.`,
          monto: sueldo,
          esParaHoy: false,
          fecha: tomorrowStr,
          prioridad: 'media'
        });
      }
    });
  }

  return {
    alerts,
    totalPagosHoy,
    totalEgresosHoy,
    conteoPagos,
    conteoNotas,
    conteoPresupuestos,
    todayStr
  };
}

/**
 * Construye el contenido del mensaje de notificación push optimizado
 */
export function buildNotificationContent(alertSummary: ReturnType<typeof getCalendarAlerts>): {
  title: string;
  body: string;
} {
  const { alerts, totalPagosHoy, totalEgresosHoy, conteoPagos, conteoNotas, conteoPresupuestos } =
    alertSummary;

  if (alerts.length === 0) {
    return {
      title: 'Taller EL CHINO: Calendario al día',
      body: 'No tienes pagos ni compromisos pendientes programados para hoy.'
    };
  }

  // Prioridad #1: Pagos de Personal
  if (conteoPagos > 0) {
    const title = `💰 ALERTA DE PAGOS HOY (${formatCurrency(totalPagosHoy)})`;
    const pagosList = alerts
      .filter((a) => a.tipo === 'pago_sueldo' || a.tipo === 'anticipo')
      .map((a) => a.titulo.replace('💰 Pago de Sueldo: ', '').replace('💵 Anticipo de Sueldo: ', ''))
      .join(', ');

    const extras: string[] = [];
    if (conteoNotas > 0) extras.push(`${conteoNotas} nota(s)`);
    if (conteoPresupuestos > 0) extras.push(`${conteoPresupuestos} presupuesto(s)`);
    const extraStr = extras.length > 0 ? ` + ${extras.join(', ')}` : '';

    return {
      title,
      body: `Hoy toca abonar a: ${pagosList}${extraStr}. Revisa el calendario para más detalles.`
    };
  }

  // Prioridad #2: Notas importantes de alta prioridad
  const altasNotas = alerts.filter((a) => a.tipo === 'nota' && a.prioridad === 'alta');
  if (altasNotas.length > 0) {
    return {
      title: `📌 ${altasNotas[0].titulo}`,
      body: `${altasNotas[0].detalle} (${alerts.length} eventos en total hoy).`
    };
  }

  // Prioridad #3: Resumen general de eventos
  const parts: string[] = [];
  if (conteoNotas > 0) parts.push(`${conteoNotas} notas`);
  if (conteoPresupuestos > 0) parts.push(`${conteoPresupuestos} presupuestos`);
  if (totalEgresosHoy > 0) parts.push(`egresos ${formatCurrency(totalEgresosHoy)}`);

  return {
    title: `📅 ${alerts.length} Notificaciones del Calendario`,
    body: `Compromisos de hoy: ${parts.join(', ')}. Toca para abrir el taller.`
  };
}

/**
 * Función principal para chequear y enviar notificaciones automáticas.
 * Controla firmas de hashing en localStorage para evitar spam o repeticiones innecesarias,
 * disparándose cuando hay eventos pendientes o nuevos datos registrados.
 */
export async function checkAndSendAutomaticNotifications(
  data: AppData,
  options?: {
    force?: boolean;
    onToast?: (msg: string, type?: 'success' | 'error') => void;
  }
): Promise<{
  sent: boolean;
  alertCount: number;
  reason: string;
}> {
  if (typeof window === 'undefined') {
    return { sent: false, alertCount: 0, reason: 'Entorno no navegador' };
  }

  const config = data.configuracionNotificaciones || DEFAULT_NOTIFICATION_CONFIG;
  if (!config.enabled && !options?.force) {
    return { sent: false, alertCount: 0, reason: 'Notificaciones automáticas desactivadas en configuración' };
  }

  const summary = getCalendarAlerts(data, config);
  const { alerts, todayStr } = summary;

  // Siempre sincronizar con el servidor y con IndexedDB para notificaciones en segundo plano
  syncAlertsWithServer(summary).catch((err) => {
    console.warn('[CalendarEngine] Sync con servidor en background:', err);
  });

  if (alerts.length === 0) {
    if (options?.force) {
      options.onToast?.('Calendario al día: no hay pagos ni compromisos pendientes para hoy', 'success');
    }
    return { sent: false, alertCount: 0, reason: 'Sin alertas pendientes para hoy' };
  }

  // Crear una firma única basada en los IDs de las alertas del día
  const fingerprint = `${todayStr}::${alerts.map((a) => `${a.id}_${a.monto || 0}`).sort().join('|')}`;
  const lastSentFingerprint = localStorage.getItem('chino_last_auto_notif_fingerprint');
  const lastSentTime = localStorage.getItem('chino_last_auto_notif_time');

  // Si ya se envió exactamente esta misma combinación hoy y han pasado menos de 4 horas (salvo forzado manual)
  const fourHoursMs = 4 * 60 * 60 * 1000;
  const isRecent = lastSentTime && Date.now() - Number(lastSentTime) < fourHoursMs;

  if (!options?.force && lastSentFingerprint === fingerprint && isRecent) {
    return {
      sent: false,
      alertCount: alerts.length,
      reason: 'Notificación ya enviada recientemente para estos mismos eventos'
    };
  }

  // Generar contenido y enviar notificación nativa
  const { title, body } = buildNotificationContent(summary);

  try {
    const success = await sendLocalNotification(title, body, {
      tag: `auto-calendar-${todayStr}`,
      data: {
        url: '/',
        todayStr,
        alertsCount: alerts.length
      }
    });

    if (success) {
      localStorage.setItem('chino_last_auto_notif_fingerprint', fingerprint);
      localStorage.setItem('chino_last_auto_notif_time', String(Date.now()));

      // Guardar en historial de notificaciones
      try {
        const histRaw = localStorage.getItem('chino_notif_history') || '[]';
        const history = JSON.parse(histRaw);
        history.unshift({
          id: 'notif_' + Date.now(),
          timestamp: new Date().toISOString(),
          title,
          body,
          tipo: summary.conteoPagos > 0 ? 'pagos' : summary.conteoNotas > 0 ? 'notas' : 'general',
          alertCount: alerts.length
        });
        // Mantener últimas 25
        localStorage.setItem('chino_notif_history', JSON.stringify(history.slice(0, 25)));
      } catch (err) {
        console.warn('Error guardando en historial de notificaciones:', err);
      }

      if (options?.onToast) {
        options.onToast(`🔔 Notificación automática enviada: ${title}`, 'success');
      }

      return { sent: true, alertCount: alerts.length, reason: 'Notificación enviada con éxito' };
    } else {
      return { sent: false, alertCount: alerts.length, reason: 'Permiso de notificaciones no concedido en el navegador' };
    }
  } catch (error) {
    console.error('Error al enviar notificación automática:', error);
    return { sent: false, alertCount: alerts.length, reason: String(error) };
  }
}
