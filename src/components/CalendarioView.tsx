import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Users,
  FileSpreadsheet,
  TrendingDown,
  TrendingUp,
  Bell,
  BellRing,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Send,
  Sparkles,
  X,
  Clock,
  DollarSign,
  Maximize2,
  UserCheck,
  AlertCircle,
  Info,
  Sliders,
  ShieldCheck,
  Smartphone,
  Radio
} from 'lucide-react';
import { AppData, NotaImportante, AutoNotificationConfig } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';
import {
  requestPushNotificationPermission,
  sendLocalNotification,
  FCM_VAPID_KEY,
  isFCMSupported
} from '../lib/firebaseMessaging';
import {
  subscribeUserToWebPush,
  sendTestBackgroundPush,
  getExistingPushSubscription
} from '../lib/pushSubscription';
import {
  getCalendarAlerts,
  checkAndSendAutomaticNotifications,
  DEFAULT_NOTIFICATION_CONFIG
} from '../lib/calendarNotificationEngine';

interface CalendarioViewProps {
  data: AppData;
  onSaveData?: (newData: AppData) => void;
  onToast?: (msg: string, type?: 'success' | 'error') => void;
}

type EventFilterType = 'todos' | 'pagos' | 'ingresos' | 'egresos' | 'notas';

export const CalendarioView: React.FC<CalendarioViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string>(getTodayStr());
  const [filterType, setFilterType] = useState<EventFilterType>('todos');

  // Double Click Detailed Modal State
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalDateStr, setDetailModalDateStr] = useState<string>(getTodayStr());

  // FCM & Notification State
  const [fcmSupported, setFcmSupported] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [fcmToken, setFcmToken] = useState<string>(() => localStorage.getItem('fcm_token') || '');
  const [isActivatingFCM, setIsActivatingFCM] = useState(false);
  const [showFCMModal, setShowFCMModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isCheckingAuto, setIsCheckingAuto] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('chino_notif_history') || '[]');
    } catch {
      return [];
    }
  });
  const [isTestingBackgroundPush, setIsTestingBackgroundPush] = useState(false);
  const [bgTestCountdown, setBgTestCountdown] = useState<number | null>(null);
  const [isWebPushActive, setIsWebPushActive] = useState(false);

  // Notification Config & Alerts for Today
  const notifConfig = data.configuracionNotificaciones || DEFAULT_NOTIFICATION_CONFIG;
  const alertsSummary = getCalendarAlerts(data, notifConfig);

  // Note creation modal
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteFecha, setNoteFecha] = useState(getTodayStr());
  const [noteTitulo, setNoteTitulo] = useState('');
  const [noteDescripcion, setNoteDescripcion] = useState('');
  const [noteTipo, setNoteTipo] = useState<'pago' | 'ingreso' | 'egreso' | 'nota'>('nota');
  const [notePrioridad, setNotePrioridad] = useState<'alta' | 'media' | 'baja'>('media');
  const [noteMonto, setNoteMonto] = useState('');
  const [noteHora, setNoteHora] = useState('');

  useEffect(() => {
    isFCMSupported().then(setFcmSupported);
    if (typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
    getExistingPushSubscription().then((sub) => {
      setIsWebPushActive(!!sub);
    });
  }, [showFCMModal]);

  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ];

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDayStr(getTodayStr());
  };

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayStr = getTodayStr();
  const todayParts = todayStr.split('-');
  const isCurrentMonth = todayParts[0] === String(year) && parseInt(todayParts[1], 10) - 1 === month;
  const todayDateNum = parseInt(todayParts[2], 10);

  // Helper to extract events for any specific day
  const getDayEvents = (dayNum: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    // 1. Trabajos agendados o facturados
    const jobs = (data.trabajos || []).filter((t) => t.fecha === dateStr);
    const trabajosIngresos = jobs.reduce((sum, j) => sum + (Number(j.costo) || 0), 0);

    // 2. Ingresos externos adicionales
    const ingresosExternos = (data.egresos || []).filter(
      (e) => e.fecha === dateStr && e.tipo === 'ingreso'
    );
    const ingresosExternosTotal = ingresosExternos.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    const totalIngresos = trabajosIngresos + ingresosExternosTotal;

    // 3. Pagos de Personal (Sueldos programados y anticipos)
    const paydays = (data.trabajadores || []).filter((w) => {
      if (w.frecuenciaPago === 'quincenal') {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return dayNum === 15 || dayNum === lastDay || dayNum === 30;
      }
      const pNum = Number(w.fechaPago);
      if (!isNaN(pNum) && pNum === dayNum) return true;
      if (w.fechaPago && w.fechaPago.includes(String(dayNum))) return true;
      return false;
    });
    const anticiposDelDia = (data.anticipos || []).filter((a) => a.fecha === dateStr);
    const totalSueldos = paydays.reduce((sum, w) => sum + (Number(w.sueldo) || 0), 0);
    const totalAnticipos = anticiposDelDia.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
    const totalPagos = totalSueldos + totalAnticipos;

    // 4. Egresos y Gastos
    const egresosDelDia = (data.egresos || []).filter(
      (e) => e.fecha === dateStr && e.tipo !== 'ingreso'
    );
    const totalEgresos = egresosDelDia.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);

    // 5. Asistencia del personal en este día
    const asistenciasDelDia = (data.asistencias || []).filter((a) => a.fecha === dateStr);
    const totalPresentes = asistenciasDelDia.filter((a) => a.presente).length;
    const totalTardanzas = asistenciasDelDia.filter(
      (a) => !a.presente && a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;
    const totalFaltas = asistenciasDelDia.filter(
      (a) => !a.presente && !a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;

    // 6. Presupuestos con fecha límite
    const budgets = (data.presupuestos || []).filter(
      (p) => p.fechaLimite === dateStr && p.estado === 'pendiente'
    );

    // 7. Notas Importantes y Recordatorios
    const notasDelDia = (data.notasImportantes || []).filter((n) => n.fecha === dateStr);

    return {
      dateStr,
      jobs,
      trabajosIngresos,
      ingresosExternos,
      ingresosExternosTotal,
      totalIngresos,
      paydays,
      anticiposDelDia,
      totalPagos,
      egresosDelDia,
      totalEgresos,
      asistenciasDelDia,
      totalPresentes,
      totalTardanzas,
      totalFaltas,
      budgets,
      notasDelDia
    };
  };

  // Helper for any string date (YYYY-MM-DD)
  const getEventsByDateStr = (dateStr: string) => {
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);

    const jobs = (data.trabajos || []).filter((t) => t.fecha === dateStr);
    const trabajosIngresos = jobs.reduce((sum, j) => sum + (Number(j.costo) || 0), 0);

    const ingresosExternos = (data.egresos || []).filter(
      (e) => e.fecha === dateStr && e.tipo === 'ingreso'
    );
    const ingresosExternosTotal = ingresosExternos.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);
    const totalIngresos = trabajosIngresos + ingresosExternosTotal;

    const paydays = (data.trabajadores || []).filter((w) => {
      if (w.frecuenciaPago === 'quincenal') {
        const lastDay = new Date(y, m + 1, 0).getDate();
        return d === 15 || d === lastDay || d === 30;
      }
      const pNum = Number(w.fechaPago);
      if (!isNaN(pNum) && pNum === d) return true;
      if (w.fechaPago && w.fechaPago.includes(String(d))) return true;
      return false;
    });

    const anticiposDelDia = (data.anticipos || []).filter((a) => a.fecha === dateStr);
    const totalSueldos = paydays.reduce((sum, w) => sum + (Number(w.sueldo) || 0), 0);
    const totalAnticipos = anticiposDelDia.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
    const totalPagos = totalSueldos + totalAnticipos;

    const egresosDelDia = (data.egresos || []).filter(
      (e) => e.fecha === dateStr && e.tipo !== 'ingreso'
    );
    const totalEgresos = egresosDelDia.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);

    const asistenciasDelDia = (data.asistencias || []).filter((a) => a.fecha === dateStr);
    const totalPresentes = asistenciasDelDia.filter((a) => a.presente).length;
    const totalTardanzas = asistenciasDelDia.filter(
      (a) => !a.presente && a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;
    const totalFaltas = asistenciasDelDia.filter(
      (a) => !a.presente && !a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;

    const budgets = (data.presupuestos || []).filter(
      (p) => p.fechaLimite === dateStr && p.estado === 'pendiente'
    );

    const notasDelDia = (data.notasImportantes || []).filter((n) => n.fecha === dateStr);

    return {
      dateStr,
      jobs,
      trabajosIngresos,
      ingresosExternos,
      ingresosExternosTotal,
      totalIngresos,
      paydays,
      anticiposDelDia,
      totalPagos,
      egresosDelDia,
      totalEgresos,
      asistenciasDelDia,
      totalPresentes,
      totalTardanzas,
      totalFaltas,
      budgets,
      notasDelDia
    };
  };

  // Events of selected day (single click)
  const selectedEvents = getEventsByDateStr(selectedDayStr);

  // Events of detail modal (double click)
  const detailEvents = getEventsByDateStr(detailModalDateStr);

  // Handle Double Click on Day
  const handleDayDoubleClick = (dateStr: string) => {
    setSelectedDayStr(dateStr);
    setDetailModalDateStr(dateStr);
    setIsDetailModalOpen(true);
  };

  // Handle Single Click on Day
  const handleDaySingleClick = (dateStr: string) => {
    setSelectedDayStr(dateStr);
  };

  // Activate FCM & Request Browser Permission & Web Push
  const handleEnableNotifications = async () => {
    setIsActivatingFCM(true);
    try {
      const result = await requestPushNotificationPermission();
      if (result.success) {
        if (result.token) setFcmToken(result.token);
        setNotificationPermission('granted');

        // Suscribir también a Web Push estándar para segundo plano / app cerrada
        try {
          const webPushRes = await subscribeUserToWebPush();
          if (webPushRes.success) {
            setIsWebPushActive(true);
          }
        } catch (wpErr) {
          console.warn('Error registrando Web Push:', wpErr);
        }

        onToast?.('¡Notificaciones Push activadas para este dispositivo (incluso en 2do plano)!', 'success');
        await sendLocalNotification(
          '🔔 Notificaciones Activadas - EL CHINO',
          'Recibirás alertas de pagos, ingresos, egresos y notas importantes del calendario.'
        );
      } else {
        onToast?.(result.error || 'No se pudieron activar las notificaciones', 'error');
        if (typeof Notification !== 'undefined') {
          setNotificationPermission(Notification.permission);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al activar notificaciones';
      onToast?.(msg, 'error');
    } finally {
      setIsActivatingFCM(false);
    }
  };

  // Probar notificación Push en segundo plano con retardo de 5 segundos
  const handleTestBackgroundPush = async () => {
    setIsTestingBackgroundPush(true);
    try {
      const res = await sendTestBackgroundPush(5);
      if (res.success) {
        onToast?.(res.message, 'success');
        setBgTestCountdown(5);
        const interval = setInterval(() => {
          setBgTestCountdown((prev) => {
            if (prev === null || prev <= 1) {
              clearInterval(interval);
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        onToast?.(res.message, 'error');
      }
    } catch (e: any) {
      onToast?.(e?.message || 'Error al programar prueba de segundo plano', 'error');
    } finally {
      setIsTestingBackgroundPush(false);
    }
  };

  // Test local push notification
  const handleTestNotification = async () => {
    const success = await sendLocalNotification(
      '🚗 EL CHINO CARRANZA - Notificación de Prueba',
      'El sistema de notificaciones está funcionando correctamente en este dispositivo.'
    );
    if (success) {
      onToast?.('Notificación de prueba enviada al dispositivo', 'success');
    } else {
      onToast?.('Permite las notificaciones en tu navegador para ver la alerta', 'error');
    }
  };

  // Toggle Auto Notification Preferences
  const handleToggleAutoConfig = (field: keyof AutoNotificationConfig) => {
    const updated: AutoNotificationConfig = {
      ...notifConfig,
      [field]: !notifConfig[field]
    };
    onSaveData?.({
      ...data,
      configuracionNotificaciones: updated
    });
    onToast?.('Preferencia de notificación automática actualizada', 'success');
  };

  // Trigger Automatic Notifications check immediately (for testing or manual force)
  const handleTriggerAutoCheckNow = async () => {
    setIsCheckingAuto(true);
    try {
      const res = await checkAndSendAutomaticNotifications(data, {
        force: true,
        onToast
      });
      try {
        setNotifHistory(JSON.parse(localStorage.getItem('chino_notif_history') || '[]'));
      } catch {}
      if (!res.sent && res.alertCount === 0) {
        onToast?.('Calendario al día: no hay pagos ni compromisos pendientes para hoy', 'success');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al verificar notificaciones';
      onToast?.(msg, 'error');
    } finally {
      setIsCheckingAuto(false);
    }
  };

  const handleClearNotifHistory = () => {
    localStorage.removeItem('chino_notif_history');
    setNotifHistory([]);
    onToast?.('Historial de notificaciones vaciado', 'success');
  };

  // Send Notification for a specific date's commitments
  const handleNotifyDayEvents = async (dateStr: string) => {
    const ev = getEventsByDateStr(dateStr);

    const parts: string[] = [];
    if (ev.totalPagos > 0) {
      parts.push(`💰 Pagos Personal (${formatCurrency(ev.totalPagos)})`);
    }
    if (ev.totalIngresos > 0) {
      parts.push(`📈 Ingresos (${formatCurrency(ev.totalIngresos)})`);
    }
    if (ev.totalEgresos > 0) {
      parts.push(`📉 Egresos (${formatCurrency(ev.totalEgresos)})`);
    }
    if (ev.asistenciasDelDia.length > 0) {
      parts.push(`👥 Asistencia (${ev.totalPresentes} presentes, ${ev.totalFaltas} faltas)`);
    }
    if (ev.budgets.length > 0) {
      parts.push(`📋 ${ev.budgets.length} presupuesto(s)`);
    }
    const pendingNotes = ev.notasDelDia.filter((n) => !n.completada);
    if (pendingNotes.length > 0) {
      parts.push(`📌 ${pendingNotes.length} nota(s) importante(s)`);
    }

    const title = `📅 Alerta Taller: ${dateStr === todayStr ? 'HOY' : dateStr}`;
    const body =
      parts.length > 0
        ? parts.join(' | ')
        : 'Sin eventos ni compromisos registrados para esta fecha.';

    const sent = await sendLocalNotification(title, body, {
      tag: `day-${dateStr}`
    });

    if (sent) {
      onToast?.(`Notificación enviada para la fecha ${dateStr}`, 'success');
    } else {
      onToast?.('Activa las notificaciones del navegador para recibir las alertas', 'error');
    }
  };

  // Add Note Modal
  const handleOpenAddNote = (datePreset?: string) => {
    setNoteFecha(datePreset || selectedDayStr || getTodayStr());
    setNoteTitulo('');
    setNoteDescripcion('');
    setNoteTipo('nota');
    setNotePrioridad('media');
    setNoteMonto('');
    setNoteHora('');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitulo.trim()) {
      onToast?.('Ingresa un título para la nota', 'error');
      return;
    }

    const newNote: NotaImportante = {
      id: generateId(),
      fecha: noteFecha,
      titulo: noteTitulo.trim(),
      descripcion: noteDescripcion.trim(),
      tipo: noteTipo,
      prioridad: notePrioridad,
      monto: noteMonto ? parseFloat(noteMonto) : undefined,
      hora: noteHora || undefined,
      completada: false,
      creadaEn: new Date().toISOString()
    };

    const updatedNotas = [...(data.notasImportantes || []), newNote];
    onSaveData?.({
      ...data,
      notasImportantes: updatedNotas
    });

    setIsNoteModalOpen(false);
    onToast?.('Nota importante agregada al calendario', 'success');
  };

  const handleToggleNoteComplete = (id: string) => {
    const updatedNotas = (data.notasImportantes || []).map((n) =>
      n.id === id ? { ...n, completada: !n.completada } : n
    );
    onSaveData?.({
      ...data,
      notasImportantes: updatedNotas
    });
  };

  const handleDeleteNote = (id: string) => {
    const updatedNotas = (data.notasImportantes || []).filter((n) => n.id !== id);
    onSaveData?.({
      ...data,
      notasImportantes: updatedNotas
    });
    onToast?.('Nota eliminada', 'success');
  };

  const handleCopyToken = () => {
    if (fcmToken) {
      navigator.clipboard.writeText(fcmToken);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
      onToast?.('Token copiado al portapapeles', 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-red-500" />
            <span>Calendario del Taller</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Agenda con 1 clic para ver resumen rápido y 2 clics para ver el detalle completo de todo lo registrado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Notifications Button */}
          <button
            onClick={() => setShowFCMModal(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              notificationPermission === 'granted'
                ? 'bg-neutral-900 border-neutral-800 text-neutral-200 hover:border-emerald-700'
                : 'bg-red-950/60 border-red-800/80 text-red-300 hover:bg-red-900/60'
            }`}
          >
            <BellRing
              className={`w-4 h-4 ${
                notificationPermission === 'granted' ? 'text-emerald-400' : 'text-red-400 animate-pulse'
              }`}
            />
            <span>Notificaciones Push FCM</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={() => handleOpenAddNote()}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Nota / Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Panel Superior: Alertas y Notificaciones Automáticas */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                notifConfig.enabled
                  ? 'bg-purple-950/60 border-purple-800 text-purple-400'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-400'
              }`}
            >
              <BellRing className={`w-5 h-5 ${notifConfig.enabled ? 'animate-pulse text-purple-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Sistema de Notificaciones Automáticas
                </h3>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                    notifConfig.enabled
                      ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {notifConfig.enabled ? '● Automático Activo' : 'Pausado'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Envía alertas automáticamente a tu dispositivo cuando hay pagos programados, presupuestos por vencer o notas importantes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleTriggerAutoCheckNow}
              disabled={isCheckingAuto}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
              title="Comprobar eventos de hoy y disparar notificación inmediata"
            >
              {isCheckingAuto ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Notificar Ahora</span>
            </button>

            <button
              onClick={() => setShowFCMModal(true)}
              className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-neutral-400" />
              <span>Configurar</span>
            </button>
          </div>
        </div>

        {/* Alertas Detectadas Para Hoy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <span>Alertas del Calendario para Hoy ({alertsSummary.todayStr})</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 text-[11px] font-mono">
                {alertsSummary.alerts.length}
              </span>
            </span>

            {alertsSummary.totalPagosHoy > 0 && (
              <span className="font-semibold text-amber-400">
                Total Pagos Personal Hoy: {formatCurrency(alertsSummary.totalPagosHoy)}
              </span>
            )}
          </div>

          {alertsSummary.alerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {alertsSummary.alerts.map((al) => (
                <div
                  key={al.id}
                  className={`p-3 rounded-xl border text-xs flex flex-col justify-between gap-2 transition-all ${
                    al.tipo === 'pago_sueldo' || al.tipo === 'anticipo'
                      ? 'bg-amber-950/20 border-amber-700/50 text-amber-200'
                      : al.tipo === 'presupuesto'
                      ? 'bg-sky-950/20 border-sky-700/50 text-sky-200'
                      : al.tipo === 'nota' && al.prioridad === 'alta'
                      ? 'bg-red-950/20 border-red-700/50 text-red-200'
                      : 'bg-neutral-800/60 border-neutral-700 text-neutral-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center justify-between gap-1">
                      <span className="truncate">{al.titulo}</span>
                      {al.monto ? (
                        <span className="font-mono shrink-0 px-1.5 py-0.5 rounded bg-black/40 text-[11px]">
                          {formatCurrency(al.monto)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] opacity-85 mt-1 line-clamp-2 leading-relaxed">
                      {al.detalle}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] opacity-75 pt-1 border-t border-white/5">
                    <span className="uppercase font-semibold">
                      {al.esParaHoy ? 'Para Hoy' : 'Aviso Mañana'}
                    </span>
                    <span className="capitalize">{al.prioridad} prioridad</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs text-neutral-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                No hay compromisos pendientes de pago ni notas críticas programadas para el día de hoy. El motor automático notificará cuando se registren o alcancen fechas clave.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Calendar View */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Month Navigator & Filters Bar */}
        <div className="p-4 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/40">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              <span>
                {monthNames[month]} {year}
              </span>
            </h2>

            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-xl p-0.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleGoToToday}
                className="px-2.5 py-1 text-xs font-semibold text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Hoy
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'todos'
                  ? 'bg-neutral-800 text-white'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('pagos')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterType === 'pagos'
                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800/60'
                  : 'text-neutral-400 hover:text-purple-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Pagos
            </button>
            <button
              onClick={() => setFilterType('ingresos')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterType === 'ingresos'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'text-neutral-400 hover:text-emerald-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Ingresos
            </button>
            <button
              onClick={() => setFilterType('egresos')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterType === 'egresos'
                  ? 'bg-red-950/80 text-red-300 border border-red-800/60'
                  : 'text-neutral-400 hover:text-red-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Egresos
            </button>
            <button
              onClick={() => setFilterType('notas')}
              className={`px-2.5 py-1 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                filterType === 'notas'
                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  : 'text-neutral-400 hover:text-amber-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Notas
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-950/60 text-center py-2.5 text-[11px] font-bold uppercase text-neutral-400">
          {daysOfWeek.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 bg-neutral-800 gap-[1px]">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-neutral-950/40 min-h-[76px]" />
          ))}

          {/* Month Days */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const {
              dateStr,
              jobs,
              ingresosExternos,
              paydays,
              anticiposDelDia,
              egresosDelDia,
              budgets,
              notasDelDia,
              totalIngresos,
              totalEgresos,
              totalPagos
            } = getDayEvents(dayNum);

            const isToday = isCurrentMonth && dayNum === todayDateNum;
            const isSelected = selectedDayStr === dateStr;

            const hasPagos = paydays.length > 0 || anticiposDelDia.length > 0;
            const hasIngresos = totalIngresos > 0;
            const hasEgresos = egresosDelDia.length > 0;
            const hasBudgets = budgets.length > 0;
            const hasNotas = notasDelDia.length > 0;

            const matchesFilter =
              filterType === 'todos' ||
              (filterType === 'pagos' && hasPagos) ||
              (filterType === 'ingresos' && hasIngresos) ||
              (filterType === 'egresos' && hasEgresos) ||
              (filterType === 'notas' && hasNotas);

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => handleDaySingleClick(dateStr)}
                onDoubleClick={() => handleDayDoubleClick(dateStr)}
                className={`bg-neutral-900 min-h-[76px] p-2 flex flex-col items-start justify-between text-left transition-all relative select-none ${
                  isToday ? 'ring-2 ring-red-500 z-10 bg-red-950/10' : ''
                } ${
                  isSelected ? 'bg-neutral-800 ring-1 ring-neutral-500 shadow-inner' : 'hover:bg-neutral-800/50'
                } ${!matchesFilter ? 'opacity-35' : 'opacity-100'}`}
                title="1 clic: Resumen rápido | 2 clics: Detalle completo de todo lo registrado"
              >
                <div className="w-full flex items-center justify-between">
                  <span
                    className={`text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${
                      isToday
                        ? 'bg-red-600 text-white shadow-sm'
                        : isSelected
                        ? 'text-white'
                        : 'text-neutral-300'
                    }`}
                  >
                    {dayNum}
                  </span>

                  {isToday && (
                    <span className="text-[9px] uppercase font-bold text-red-400 bg-red-950/60 px-1 py-0.5 rounded">
                      Hoy
                    </span>
                  )}
                </div>

                {/* Event Indicators Stack */}
                <div className="w-full mt-1.5 space-y-0.5">
                  {/* Pagos a Personal */}
                  {hasPagos && (filterType === 'todos' || filterType === 'pagos') && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-400 bg-purple-950/40 px-1 py-0.5 rounded truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      <span className="truncate">{formatCurrency(totalPagos)}</span>
                    </div>
                  )}

                  {/* Ingresos */}
                  {hasIngresos && (filterType === 'todos' || filterType === 'ingresos') && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{formatCurrency(totalIngresos)}</span>
                    </div>
                  )}

                  {/* Egresos */}
                  {hasEgresos && (filterType === 'todos' || filterType === 'egresos') && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-950/40 px-1 py-0.5 rounded truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                      <span className="truncate">{formatCurrency(totalEgresos)}</span>
                    </div>
                  )}

                  {/* Notas Importantes */}
                  {hasNotas && (filterType === 'todos' || filterType === 'notas') && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-950/40 px-1 py-0.5 rounded truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{notasDelDia.length} nota(s)</span>
                    </div>
                  )}

                  {/* Presupuestos */}
                  {hasBudgets && filterType === 'todos' && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-950/40 px-1 py-0.5 rounded truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                      <span className="truncate">{budgets.length} pptos</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SINGLE CLICK: Resumen Resumido del Día Seleccionado */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                Resumen Rápido del Día (1 Clic)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950 text-purple-300 border border-purple-800 font-medium">
                Doble clic para ver detalle completo
              </span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{selectedDayStr}</span>
              {selectedDayStr === todayStr && (
                <span className="text-xs font-bold px-2 py-0.5 bg-red-600 text-white rounded-full">
                  HOY
                </span>
              )}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleDayDoubleClick(selectedDayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-md shadow-purple-950/40 transition-colors"
              title="Abrir resumen detallado de todo lo registrado"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Ver Detalle Completo (2 Clics)</span>
            </button>

            <button
              onClick={() => handleOpenAddNote(selectedDayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              <span>Agregar Nota</span>
            </button>

            <button
              onClick={() => handleNotifyDayEvents(selectedDayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-colors"
              title="Disparar notificación push al teléfono con el resumen de este día"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Notificar Día</span>
            </button>
          </div>
        </div>

        {/* Resumen Resumido: Tarjetas Claras de Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Ingresos Totales */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Ingresos</span>
            </span>
            <div className="text-sm font-bold text-emerald-400 mt-1">
              {formatCurrency(selectedEvents.totalIngresos)}
            </div>
            <span className="text-[10px] text-neutral-500">
              {selectedEvents.jobs.length} trabajos, {selectedEvents.ingresosExternos.length} extras
            </span>
          </div>

          {/* Egresos */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              <span>Egresos</span>
            </span>
            <div className="text-sm font-bold text-red-400 mt-1">
              {formatCurrency(selectedEvents.totalEgresos)}
            </div>
            <span className="text-[10px] text-neutral-500">
              {selectedEvents.egresosDelDia.length} gastos
            </span>
          </div>

          {/* Pagos a Personal */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-400" />
              <span>Personal</span>
            </span>
            <div className="text-sm font-bold text-purple-300 mt-1">
              {formatCurrency(selectedEvents.totalPagos)}
            </div>
            <span className="text-[10px] text-neutral-500">
              {selectedEvents.paydays.length} sueldos, {selectedEvents.anticiposDelDia.length} adelantos
            </span>
          </div>

          {/* Asistencias */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-blue-400" />
              <span>Asistencias</span>
            </span>
            <div className="text-xs font-bold text-white mt-1">
              <span className="text-emerald-400">{selectedEvents.totalPresentes}P</span> /{' '}
              <span className="text-red-400">{selectedEvents.totalFaltas}F</span> /{' '}
              <span className="text-amber-400">{selectedEvents.totalTardanzas}T</span>
            </div>
            <span className="text-[10px] text-neutral-500">
              {selectedEvents.asistenciasDelDia.length} marcadas
            </span>
          </div>

          {/* Notas Importantes */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <Bell className="w-3 h-3 text-amber-400" />
              <span>Notas</span>
            </span>
            <div className="text-sm font-bold text-amber-300 mt-1">
              {selectedEvents.notasDelDia.length}
            </div>
            <span className="text-[10px] text-neutral-500">
              {selectedEvents.notasDelDia.filter((n) => !n.completada).length} pendientes
            </span>
          </div>

          {/* Presupuestos */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
              <FileSpreadsheet className="w-3 h-3 text-sky-400" />
              <span>Presupuestos</span>
            </span>
            <div className="text-sm font-bold text-sky-300 mt-1">
              {selectedEvents.budgets.length}
            </div>
            <span className="text-[10px] text-neutral-500">por vencer</span>
          </div>
        </div>

        {/* Concise quick items list */}
        <div className="bg-neutral-950 rounded-xl border border-neutral-800/80 p-3 space-y-2">
          <div className="text-xs text-neutral-400 font-medium flex items-center justify-between">
            <span>Resumen ejecutivo de actividades para {selectedDayStr}:</span>
            <button
              onClick={() => handleDayDoubleClick(selectedDayStr)}
              className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
            >
              <span>Abrir vista detallada</span>
            </button>
          </div>

          {selectedEvents.jobs.length === 0 &&
          selectedEvents.ingresosExternos.length === 0 &&
          selectedEvents.egresosDelDia.length === 0 &&
          selectedEvents.paydays.length === 0 &&
          selectedEvents.anticiposDelDia.length === 0 &&
          selectedEvents.notasDelDia.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-1">
              No hay movimientos ni notas registradas para este día.
            </p>
          ) : (
            <ul className="text-xs space-y-1 text-neutral-300">
              {selectedEvents.jobs.map((j) => (
                <li key={j.id} className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="flex items-center gap-1.5 truncate">
                    <Wrench className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{j.cliente} - {j.modeloAuto || 'Vehículo'} ({j.descripcion})</span>
                  </span>
                  <span className="font-semibold text-emerald-400 shrink-0 ml-2">
                    {formatCurrency(Number(j.costo) || 0)}
                  </span>
                </li>
              ))}

              {selectedEvents.ingresosExternos.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="flex items-center gap-1.5 truncate">
                    <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>[Ingreso Extra] {e.descripcion}</span>
                  </span>
                  <span className="font-semibold text-emerald-400 shrink-0 ml-2">
                    +{formatCurrency(Number(e.monto) || 0)}
                  </span>
                </li>
              ))}

              {selectedEvents.egresosDelDia.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="flex items-center gap-1.5 truncate">
                    <TrendingDown className="w-3 h-3 text-red-400 shrink-0" />
                    <span>[Gasto] {e.descripcion}</span>
                  </span>
                  <span className="font-semibold text-red-400 shrink-0 ml-2">
                    -{formatCurrency(Number(e.monto) || 0)}
                  </span>
                </li>
              ))}

              {selectedEvents.anticiposDelDia.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="flex items-center gap-1.5 truncate">
                    <Users className="w-3 h-3 text-purple-400 shrink-0" />
                    <span>[Adelanto] {a.descripcion || 'Anticipo sueldo'}</span>
                  </span>
                  <span className="font-semibold text-purple-400 shrink-0 ml-2">
                    -{formatCurrency(Number(a.monto) || 0)}
                  </span>
                </li>
              ))}

              {selectedEvents.notasDelDia.map((n) => (
                <li key={n.id} className="flex items-center justify-between py-1 border-b border-neutral-850">
                  <span className="flex items-center gap-1.5 truncate">
                    <Bell className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className={n.completada ? 'line-through text-neutral-500' : ''}>
                      [Nota] {n.titulo}
                    </span>
                  </span>
                  <span className="text-[10px] text-amber-300 uppercase font-semibold shrink-0 ml-2">
                    {n.prioridad}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* DOUBLE CLICK MODAL: Resumen Detallado Completo de Todo lo Registrado */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Resumen Detallado del Día (2 Clics)
                  </span>
                  {detailModalDateStr === todayStr && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-red-600 text-white rounded-full">
                      HOY
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-purple-400" />
                  <span>{detailModalDateStr}</span>
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNotifyDayEvents(detailModalDateStr)}
                  className="px-3 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Notificar al Móvil</span>
                </button>

                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors"
                  title="Cerrar detalle"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Financial Balance Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                <span className="text-xs font-semibold text-emerald-400 uppercase">Ingresos Totales</span>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  +{formatCurrency(detailEvents.totalIngresos)}
                </div>
              </div>

              <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl">
                <span className="text-xs font-semibold text-red-400 uppercase">Egresos y Gastos</span>
                <div className="text-xl font-black text-red-400 mt-1">
                  -{formatCurrency(detailEvents.totalEgresos)}
                </div>
              </div>

              <div className="p-3.5 bg-purple-950/40 border border-purple-800/60 rounded-xl">
                <span className="text-xs font-semibold text-purple-300 uppercase">Pagos de Personal</span>
                <div className="text-xl font-black text-purple-300 mt-1">
                  -{formatCurrency(detailEvents.totalPagos)}
                </div>
              </div>
            </div>

            {/* SECCIÓN 1: Trabajos del Día */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Trabajos e Ingresos de Trabajos ({detailEvents.jobs.length})</span>
              </h3>

              {detailEvents.jobs.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60">
                  No se registraron trabajos para esta fecha.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-800">
                  <table className="w-full text-left text-xs text-neutral-300 bg-neutral-950">
                    <thead className="bg-neutral-900 text-neutral-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5">Vehículo / Modelo</th>
                        <th className="p-2.5">Descripción del Trabajo</th>
                        <th className="p-2.5">Estado</th>
                        <th className="p-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {detailEvents.jobs.map((j) => (
                        <tr key={j.id} className="hover:bg-neutral-900/40">
                          <td className="p-2.5 font-semibold text-white">{j.cliente}</td>
                          <td className="p-2.5 text-neutral-400">{j.modeloAuto || '-'}</td>
                          <td className="p-2.5">{j.descripcion}</td>
                          <td className="p-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                j.estado === 'terminado'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {j.estado}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">
                            {formatCurrency(Number(j.costo) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECCIÓN 2: Ingresos Adicionales (Aparte de trabajos) */}
            {detailEvents.ingresosExternos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Ingresos Adicionales / Externos ({detailEvents.ingresosExternos.length})</span>
                </h3>
                <div className="overflow-x-auto rounded-xl border border-neutral-800">
                  <table className="w-full text-left text-xs text-neutral-300 bg-neutral-950">
                    <thead className="bg-neutral-900 text-neutral-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Concepto</th>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5">Método de Pago</th>
                        <th className="p-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {detailEvents.ingresosExternos.map((e) => (
                        <tr key={e.id} className="hover:bg-neutral-900/40">
                          <td className="p-2.5 font-semibold text-white">{e.descripcion}</td>
                          <td className="p-2.5 text-neutral-400 capitalize">{e.categoria || 'General'}</td>
                          <td className="p-2.5 text-neutral-400 capitalize">{e.metodoPago}</td>
                          <td className="p-2.5 text-right font-bold text-emerald-400">
                            +{formatCurrency(Number(e.monto) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SECCIÓN 3: Egresos y Gastos */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span>Egresos y Gastos ({detailEvents.egresosDelDia.length})</span>
              </h3>

              {detailEvents.egresosDelDia.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60">
                  No se registraron egresos para esta fecha.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-neutral-800">
                  <table className="w-full text-left text-xs text-neutral-300 bg-neutral-950">
                    <thead className="bg-neutral-900 text-neutral-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Descripción del Gasto</th>
                        <th className="p-2.5">Categoría</th>
                        <th className="p-2.5">Método de Pago</th>
                        <th className="p-2.5 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                      {detailEvents.egresosDelDia.map((e) => (
                        <tr key={e.id} className="hover:bg-neutral-900/40">
                          <td className="p-2.5 font-semibold text-white">{e.descripcion}</td>
                          <td className="p-2.5 text-neutral-400 capitalize">{e.categoria || 'General'}</td>
                          <td className="p-2.5 text-neutral-400 capitalize">{e.metodoPago}</td>
                          <td className="p-2.5 text-right font-bold text-red-400">
                            -{formatCurrency(Number(e.monto) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SECCIÓN 4: Asistencia y Personal */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Asistencia y Sueldos del Personal</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Asistencia */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-neutral-300 uppercase">
                    Asistencias Registradas ({detailEvents.asistenciasDelDia.length})
                  </div>
                  {detailEvents.asistenciasDelDia.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-1">Sin marcas de asistencia en esta fecha.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                      {detailEvents.asistenciasDelDia.map((a) => {
                        const worker = data.trabajadores.find((w) => w.id === a.trabajadorId);
                        const isTardanza = !a.presente && a.descripcionFalta?.toLowerCase().includes('tardanza');
                        return (
                          <div
                            key={a.id}
                            className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-semibold text-white">{worker?.nombre || 'Trabajador'}</div>
                              {a.descripcionFalta && (
                                <div className="text-[10px] text-neutral-400">{a.descripcionFalta}</div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {a.presente ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold">
                                  Presente
                                </span>
                              ) : isTardanza ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-bold">
                                  Tardanza (-{formatCurrency(Number(a.montoDescuento) || 0)})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-bold">
                                  Falta (-{formatCurrency(Number(a.montoDescuento) || 0)})
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Pagos / Anticipos */}
                <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 space-y-2">
                  <div className="text-xs font-bold text-neutral-300 uppercase">
                    Pagos y Anticipos ({detailEvents.paydays.length + detailEvents.anticiposDelDia.length})
                  </div>
                  {detailEvents.paydays.length === 0 && detailEvents.anticiposDelDia.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-1">Sin pagos de nómina ni adelantos hoy.</p>
                  ) : (
                    <div className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
                      {detailEvents.paydays.map((w) => (
                        <div
                          key={`payday-modal-${w.id}`}
                          className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-white">{w.nombre}</div>
                            <div className="text-[10px] text-purple-400">Día de Sueldo programado</div>
                          </div>
                          <div className="font-bold text-purple-300">{formatCurrency(Number(w.sueldo) || 0)}</div>
                        </div>
                      ))}

                      {detailEvents.anticiposDelDia.map((ant) => (
                        <div
                          key={`ant-modal-${ant.id}`}
                          className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold text-white">Anticipo entregado</div>
                            <div className="text-[10px] text-neutral-400">{ant.descripcion || 'Adelanto'}</div>
                          </div>
                          <div className="font-bold text-purple-300">{formatCurrency(Number(ant.monto) || 0)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SECCIÓN 5: Notas Importantes y Recordatorios */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>Notas Importantes y Recordatorios ({detailEvents.notasDelDia.length})</span>
                </h3>
                <button
                  onClick={() => handleOpenAddNote(detailModalDateStr)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar Nota</span>
                </button>
              </div>

              {detailEvents.notasDelDia.length === 0 ? (
                <p className="text-xs text-neutral-500 bg-neutral-950 p-3 rounded-xl border border-neutral-800/60">
                  No hay notas ni recordatorios pendientes para esta fecha.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {detailEvents.notasDelDia.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-2 ${
                        n.completada
                          ? 'bg-neutral-950/60 border-neutral-800 opacity-60'
                          : n.prioridad === 'alta'
                          ? 'bg-red-950/20 border-red-800/60'
                          : 'bg-neutral-950 border-neutral-800'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleNoteComplete(n.id)}
                        className="mt-0.5 text-neutral-400 hover:text-white shrink-0"
                      >
                        {n.completada ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold text-white ${n.completada ? 'line-through text-neutral-400' : ''}`}>
                          {n.titulo}
                        </div>
                        {n.descripcion && (
                          <p className="text-[11px] text-neutral-400 mt-1">{n.descripcion}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-[10px]">
                          <span
                            className={`px-2 py-0.5 rounded font-bold uppercase ${
                              n.prioridad === 'alta'
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : n.prioridad === 'media'
                                ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {n.prioridad}
                          </span>
                          {n.monto && <span className="font-bold text-white">{formatCurrency(n.monto)}</span>}
                          {n.hora && <span className="text-neutral-400">🕒 {n.hora}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-neutral-500 hover:text-red-400 p-1 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Nota / Recordatorio del Calendario */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Bell className="w-5 h-5 text-red-500" />
                <span>Programar Nota o Recordatorio</span>
              </div>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs">
              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Tipo de Compromiso / Alerta
                </label>
                <select
                  value={noteTipo}
                  onChange={(e) => setNoteTipo(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                >
                  <option value="nota">📌 Nota General / Pendiente</option>
                  <option value="pago">💰 Recordatorio de Pago (Personal o Proveedor)</option>
                  <option value="ingreso">📈 Recordatorio de Cobro / Ingreso</option>
                  <option value="egreso">📉 Recordatorio de Gasto / Compra Repuestos</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">
                    Fecha Programada <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={noteFecha}
                    onChange={(e) => setNoteFecha(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">
                    Hora (Opcional)
                  </label>
                  <input
                    type="time"
                    value={noteHora}
                    onChange={(e) => setNoteHora(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Título del Recordatorio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={noteTitulo}
                  onChange={(e) => setNoteTitulo(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Descripción o Detalles adicionales
                </label>
                <textarea
                  rows={3}
                  placeholder=""
                  value={noteDescripcion}
                  onChange={(e) => setNoteDescripcion(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">Prioridad</label>
                  <select
                    value={notePrioridad}
                    onChange={(e) => setNotePrioridad(e.target.value as any)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  >
                    <option value="alta">🔴 Alta (Urgente)</option>
                    <option value="media">🟡 Media (Normal)</option>
                    <option value="baja">🔵 Baja (Informativo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-400 font-semibold mb-1">
                    Monto Asociado S/ (Opcional)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder=""
                    value={noteMonto}
                    onChange={(e) => setNoteMonto(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md shadow-red-900/30 transition-colors"
                >
                  Guardar en Calendario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Centro de Notificaciones Firebase Cloud Messaging (FCM) */}
      {showFCMModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-500">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Notificaciones Firebase Cloud Messaging (FCM)
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Alertas push automáticas en celulares y computadoras
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFCMModal(false)}
                className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permission Status Box */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                  : notificationPermission === 'denied'
                  ? 'bg-red-950/30 border-red-800/60 text-red-200'
                  : 'bg-amber-950/30 border-amber-800/60 text-amber-200'
              }`}
            >
              <div className="mt-0.5">
                {notificationPermission === 'granted' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Bell className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="font-bold">
                  Estado actual del navegador:{' '}
                  <span className="uppercase">
                    {notificationPermission === 'granted'
                      ? 'Permitido (Activo)'
                      : notificationPermission === 'denied'
                      ? 'Bloqueado por el navegador'
                      : 'Pendiente de activación'}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  {notificationPermission === 'granted'
                    ? 'Este dispositivo está listo para recibir alertas de pagos a personal, vencimiento de presupuestos, egresos y notas importantes.'
                    : notificationPermission === 'denied'
                    ? 'El navegador tiene bloqueadas las notificaciones. Haz clic en el ícono del candado 🔒 en la barra de direcciones de tu navegador y cambia Notificaciones a "Permitir".'
                    : 'Haz clic en el botón inferior para solicitar permiso al navegador y generar el Token de este dispositivo.'}
                </p>
              </div>
            </div>

            {/* FCM Actions */}
            <div className="flex flex-wrap gap-2.5">
              {notificationPermission !== 'granted' ? (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isActivatingFCM}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all"
                >
                  {isActivatingFCM ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BellRing className="w-4 h-4" />
                  )}
                  <span>Activar Notificaciones Push Ahora</span>
                </button>
              ) : (
                <button
                  onClick={handleEnableNotifications}
                  disabled={isActivatingFCM}
                  className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs flex items-center gap-2 border border-neutral-700 transition-colors"
                  title="Renovar suscripción push en segundo plano"
                >
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Sincronizar Dispositivo</span>
                </button>
              )}

              <button
                onClick={handleTestNotification}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center gap-2 border border-neutral-700 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Probar Notificación en Pantalla</span>
              </button>

              <button
                onClick={handleTestBackgroundPush}
                disabled={isTestingBackgroundPush || bgTestCountdown !== null}
                className="py-2.5 px-4 rounded-xl bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-200 font-semibold text-xs flex items-center gap-2 border border-indigo-800/80 shadow-md transition-colors"
              >
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>
                  {bgTestCountdown !== null
                    ? `¡Sal de la app o bloquea el móvil! (${bgTestCountdown}s)`
                    : 'Probar Fuera de la App (en 5 seg)'}
                </span>
              </button>
            </div>

            {/* Tarjeta Informativa: Notificaciones Fuera de la App */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/40 border border-neutral-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>Notificaciones cuando no estás en la App (Segundo Plano)</span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isWebPushActive
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-800 text-amber-300'
                }`}>
                  {isWebPushActive ? '● Segundo Plano Conectado' : '○ Sincronizando'}
                </span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                El sistema cuenta con un motor Web Push en el servidor. Cuando no tienes la app abierta o tu teléfono está bloqueado, el servidor envía la alerta directamente a través de los servicios de Google (FCM) / Apple Push.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px] text-neutral-400">
                <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/70">
                  <span className="font-semibold text-neutral-200 block mb-1">📱 En Celulares Android:</span>
                  <span>Agrega la app a la pantalla principal (menú de Chrome &gt; "Instalar aplicación"). Asegúrate de que el ahorro de batería de tu teléfono no bloquee las notificaciones en segundo plano.</span>
                </div>
                <div className="bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/70">
                  <span className="font-semibold text-neutral-200 block mb-1">🍏 En iPhone / iPad:</span>
                  <span>En Safari, pulsa Compartir &gt; "Agregar a pantalla de inicio". Abre la app desde el icono instalado para que iOS habilite Web Push en segundo plano (requiere iOS 16.4+).</span>
                </div>
              </div>
            </div>

            {/* Configuración de Envíos Automáticos del Calendario */}
            <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-xs">
                    Reglas de Notificación Automática
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifConfig.enabled}
                    onChange={() => handleToggleAutoConfig('enabled')}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                El sistema escanea el calendario y envía notificaciones automáticamente al dispositivo sin necesidad de hacer clic manual:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.notificarPagos}
                    onChange={() => handleToggleAutoConfig('notificarPagos')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">💰 Pagos a Trabajadores</span>
                    <span className="text-[10px] text-neutral-400">Sueldos programados y adelantos</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.notificarPresupuestos}
                    onChange={() => handleToggleAutoConfig('notificarPresupuestos')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">📋 Presupuestos por Vencer</span>
                    <span className="text-[10px] text-neutral-400">Cotizaciones pendientes con fecha de hoy</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.notificarNotas}
                    onChange={() => handleToggleAutoConfig('notificarNotas')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">📌 Notas Importantes</span>
                    <span className="text-[10px] text-neutral-400">Recordatorios y notas urgentes del día</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.notificarEgresos}
                    onChange={() => handleToggleAutoConfig('notificarEgresos')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">📉 Egresos y Gastos</span>
                    <span className="text-[10px] text-neutral-400">Gastos programados del día</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.notificarTrabajos}
                    onChange={() => handleToggleAutoConfig('notificarTrabajos')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">🚗 Trabajos de Taller</span>
                    <span className="text-[10px] text-neutral-400">Vehículos agendados para entrega hoy</span>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-neutral-900 border border-neutral-800 cursor-pointer hover:border-neutral-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={notifConfig.anticiparUnDia}
                    onChange={() => handleToggleAutoConfig('anticiparUnDia')}
                    className="mt-0.5 rounded border-neutral-700 text-purple-600 focus:ring-0"
                  />
                  <div>
                    <span className="font-semibold text-neutral-200 block">⏰ Aviso 1 Día Antes</span>
                    <span className="text-[10px] text-neutral-400">Avisar previamente sobre pagos de mañana</span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleTriggerAutoCheckNow}
                  disabled={isCheckingAuto}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  {isCheckingAuto ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Comprobar y Enviar Notificación Inmediata</span>
                </button>
              </div>
            </div>

            {/* Historial de Notificaciones Automáticas */}
            {notifHistory.length > 0 && (
              <div className="space-y-2 bg-neutral-950 p-3.5 rounded-xl border border-neutral-800 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-300">
                    Historial de Notificaciones Automáticas ({notifHistory.length})
                  </span>
                  <button
                    onClick={handleClearNotifHistory}
                    className="text-[11px] text-neutral-400 hover:text-red-400 transition-colors"
                  >
                    Vaciar historial
                  </button>
                </div>

                <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
                  {notifHistory.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2 rounded-lg bg-neutral-900 border border-neutral-850 text-[11px]"
                    >
                      <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                        <span className="font-semibold text-neutral-300">{item.title}</span>
                        <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-neutral-400 mt-0.5 line-clamp-1">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token details */}
            <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-300">
                  Token FCM de este Dispositivo:
                </span>
                {fcmToken && (
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1 text-red-400 hover:text-red-300 font-medium"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Token</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {fcmToken ? (
                <div className="p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 text-[11px] font-mono text-neutral-400 break-all max-h-20 overflow-y-auto">
                  {fcmToken}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 italic">
                  Presiona &quot;Activar Notificaciones Push&quot; para registrar y generar el Token único de este equipo.
                </p>
              )}

              <div className="pt-2 border-t border-neutral-850 text-[11px] text-neutral-400">
                <span className="font-semibold text-neutral-300">Clave VAPID Web Push vinculada:</span>
                <div className="font-mono text-neutral-500 truncate mt-0.5">{FCM_VAPID_KEY}</div>
              </div>
            </div>

            {/* How to send from Firebase Console */}
            <div className="space-y-1.5 text-xs text-neutral-400 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-850">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                <span>¿Cómo enviar notificaciones desde Firebase Console?</span>
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                <li>Entra a la consola de Firebase &gt; menú <strong>Messaging (Mensajería)</strong>.</li>
                <li>Haz clic en <strong>Crear tu primera campaña</strong> &gt; Mensajes de Firebase Notifications.</li>
                <li>Escribe el título y cuerpo.</li>
                <li>En destino puedes seleccionar a todos los usuarios o hacer clic en <strong>Enviar mensaje de prueba</strong> pegando el Token FCM copiado arriba.</li>
              </ol>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowFCMModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
