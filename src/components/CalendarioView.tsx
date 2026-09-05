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
  DollarSign
} from 'lucide-react';
import { AppData, NotaImportante } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';
import {
  requestPushNotificationPermission,
  sendLocalNotification,
  FCM_VAPID_KEY,
  isFCMSupported
} from '../lib/firebaseMessaging';

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

  // FCM & Notification State
  const [fcmSupported, setFcmSupported] = useState<boolean>(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [fcmToken, setFcmToken] = useState<string>(() => localStorage.getItem('fcm_token') || '');
  const [isActivatingFCM, setIsActivatingFCM] = useState(false);
  const [showFCMModal, setShowFCMModal] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

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
  }, []);

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

    // 1. Ingresos (Trabajos agendados o facturados)
    const jobs = data.trabajos.filter((t) => t.fecha === dateStr);
    const totalIngresos = jobs.reduce((sum, j) => sum + (Number(j.costo) || 0), 0);

    // 2. Pagos de Personal (Sueldos programados y anticipos entregados)
    const paydays = data.trabajadores.filter((w) => {
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

    // 3. Egresos (Gastos y compras del taller)
    const egresosDelDia = (data.egresos || []).filter((e) => e.fecha === dateStr);
    const totalEgresos = egresosDelDia.reduce((sum, e) => sum + (Number(e.monto) || 0), 0);

    // 4. Presupuestos con fecha límite
    const budgets = (data.presupuestos || []).filter(
      (p) => p.fechaLimite === dateStr && p.estado === 'pendiente'
    );

    // 5. Notas Importantes y Recordatorios
    const notasDelDia = (data.notasImportantes || []).filter((n) => n.fecha === dateStr);

    return {
      dateStr,
      jobs,
      totalIngresos,
      paydays,
      anticiposDelDia,
      totalPagos,
      egresosDelDia,
      totalEgresos,
      budgets,
      notasDelDia
    };
  };

  // Events of the selected day
  const selectedDayNum = selectedDayStr ? parseInt(selectedDayStr.split('-')[2], 10) : todayDateNum;
  const selectedEvents = selectedDayStr ? getDayEvents(selectedDayNum) : getDayEvents(todayDateNum);

  // Activate FCM & Request Browser Permission
  const handleEnableNotifications = async () => {
    setIsActivatingFCM(true);
    try {
      const result = await requestPushNotificationPermission();
      if (result.success && result.token) {
        setFcmToken(result.token);
        setNotificationPermission('granted');
        onToast?.('¡Notificaciones Push activadas con éxito!', 'success');
        // Enviar notificación de bienvenida
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

  // Send Notification for a specific date's commitments
  const handleNotifyDayEvents = async (dateStr: string) => {
    const day = parseInt(dateStr.split('-')[2], 10);
    const ev = getDayEvents(day);

    const parts: string[] = [];
    if (ev.paydays.length > 0) {
      parts.push(`💰 ${ev.paydays.length} pago(s) de personal (${formatCurrency(ev.totalPagos)})`);
    }
    if (ev.anticiposDelDia.length > 0 && ev.paydays.length === 0) {
      parts.push(`💵 ${ev.anticiposDelDia.length} anticipo(s) (${formatCurrency(ev.totalPagos)})`);
    }
    if (ev.jobs.length > 0) {
      parts.push(`🚗 ${ev.jobs.length} trabajo(s) (${formatCurrency(ev.totalIngresos)})`);
    }
    if (ev.egresosDelDia.length > 0) {
      parts.push(`📉 ${ev.egresosDelDia.length} egreso(s) (${formatCurrency(ev.totalEgresos)})`);
    }
    if (ev.budgets.length > 0) {
      parts.push(`📋 ${ev.budgets.length} presupuesto(s) por vencer`);
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
      tag: `day-${dateStr}`,
      ...({ renotify: true } as any)
    });

    if (sent) {
      onToast?.(`Notificación del día ${dateStr} enviada a tu dispositivo`, 'success');
    } else {
      onToast?.('Activa los permisos de notificación para recibir las alertas', 'error');
      setShowFCMModal(true);
    }
  };

  // Note management
  const handleOpenAddNote = (forDate?: string) => {
    setNoteFecha(forDate || selectedDayStr || todayStr);
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
      onToast?.('Por favor ingresa un título para la nota o recordatorio', 'error');
      return;
    }

    const newNote: NotaImportante = {
      id: generateId(),
      titulo: noteTitulo.trim(),
      descripcion: noteDescripcion.trim(),
      fecha: noteFecha,
      tipo: noteTipo,
      prioridad: notePrioridad,
      monto: noteMonto ? Number(noteMonto) : undefined,
      hora: noteHora || undefined,
      completada: false
    };

    const updatedNotas = [...(data.notasImportantes || []), newNote];
    const updatedData: AppData = {
      ...data,
      notasImportantes: updatedNotas
    };

    onSaveData?.(updatedData);
    setIsNoteModalOpen(false);
    onToast?.('Nota/Recordatorio guardado en el calendario', 'success');

    // Si la nota es para hoy y de alta prioridad, ofrecer notificación
    if (noteFecha === todayStr && notificationPermission === 'granted') {
      sendLocalNotification(
        `📌 Recordatorio ${notePrioridad === 'alta' ? 'URGENTE' : ''}: ${newNote.titulo}`,
        newNote.descripcion || `Programado para hoy en el calendario.`
      );
    }
  };

  const handleToggleNoteComplete = (noteId: string) => {
    const updatedNotas = (data.notasImportantes || []).map((n) =>
      n.id === noteId ? { ...n, completada: !n.completada } : n
    );
    onSaveData?.({ ...data, notasImportantes: updatedNotas });
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedNotas = (data.notasImportantes || []).filter((n) => n.id !== noteId);
    onSaveData?.({ ...data, notasImportantes: updatedNotas });
    onToast?.('Nota eliminada del calendario', 'success');
  };

  const handleCopyToken = () => {
    if (!fcmToken) return;
    navigator.clipboard.writeText(fcmToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2500);
    onToast?.('Token FCM copiado al portapapeles', 'success');
  };

  // Calculate monthly stats for quick summary
  let monthlyIngresos = 0;
  let monthlyEgresos = 0;
  let monthlyPagos = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const ev = getDayEvents(d);
    monthlyIngresos += ev.totalIngresos;
    monthlyEgresos += ev.totalEgresos;
    monthlyPagos += ev.totalPagos;
  }

  return (
    <div className="space-y-6">
      {/* Top Header & FCM Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-red-500" />
            <span>Calendario del Taller</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Programación integral de pagos a personal, ingresos, egresos y notas importantes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Notification FCM Status Button */}
          <button
            onClick={() => setShowFCMModal(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              notificationPermission === 'granted'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/40'
                : notificationPermission === 'denied'
                ? 'bg-red-950/40 border-red-500/50 text-red-300 hover:bg-red-900/40'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-300 hover:bg-amber-900/40 animate-pulse'
            }`}
            title="Configurar Notificaciones Firebase Cloud Messaging (FCM)"
          >
            {notificationPermission === 'granted' ? (
              <BellRing className="w-4 h-4 text-emerald-400" />
            ) : (
              <Bell className="w-4 h-4 text-amber-400" />
            )}
            <span>
              {notificationPermission === 'granted'
                ? 'Notificaciones Push Activas'
                : notificationPermission === 'denied'
                ? 'Notificaciones Bloqueadas'
                : 'Activar Notificaciones FCM'}
            </span>
          </button>

          {/* Alert of Today Button */}
          <button
            onClick={() => handleNotifyDayEvents(todayStr)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-all shadow-sm"
            title="Enviar notificación con el resumen de hoy al teléfono o computadora"
          >
            <Send className="w-3.5 h-3.5 text-red-400" />
            <span>Alerta de Hoy</span>
          </button>

          {/* New Note Button */}
          <button
            onClick={() => handleOpenAddNote()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Nota / Recordatorio</span>
          </button>
        </div>
      </div>

      {/* Monthly Financial Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Ingresos del Mes ({monthNames[month]})
            </span>
            <div className="text-lg font-bold text-emerald-400">
              {formatCurrency(monthlyIngresos)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Egresos Taller ({monthNames[month]})
            </span>
            <div className="text-lg font-bold text-red-400">
              {formatCurrency(monthlyEgresos)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
              Pagos Personal ({monthNames[month]})
            </span>
            <div className="text-lg font-bold text-purple-400">
              {formatCurrency(monthlyPagos)}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-800/40 flex items-center justify-center text-purple-400">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Navigation & Filters Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-neutral-950 border-b border-neutral-800 gap-3">
          {/* Prev/Next Month Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-base text-white capitalize min-w-[160px] text-center">
              {monthNames[month]} {year}
            </h3>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
              title="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleGoToToday}
              className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/60 transition-colors"
            >
              Hoy
            </button>
          </div>

          {/* Event Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setFilterType('todos')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterType === 'todos'
                  ? 'bg-neutral-750 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
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
            const hasIngresos = jobs.length > 0;
            const hasEgresos = egresosDelDia.length > 0;
            const hasBudgets = budgets.length > 0;
            const hasNotas = notasDelDia.length > 0;

            // Check if matches active filter
            const matchesFilter =
              filterType === 'todos' ||
              (filterType === 'pagos' && hasPagos) ||
              (filterType === 'ingresos' && hasIngresos) ||
              (filterType === 'egresos' && hasEgresos) ||
              (filterType === 'notas' && hasNotas);

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => setSelectedDayStr(dateStr)}
                className={`bg-neutral-900 min-h-[76px] p-2 flex flex-col items-start justify-between text-left transition-all relative ${
                  isToday ? 'ring-2 ring-red-500 z-10 bg-red-950/10' : ''
                } ${
                  isSelected ? 'bg-neutral-800 ring-1 ring-neutral-500 shadow-inner' : 'hover:bg-neutral-800/50'
                } ${!matchesFilter ? 'opacity-35' : 'opacity-100'}`}
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

                  {/* Quick notification prompt for today */}
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

                  {/* Ingresos (Trabajos) */}
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

      {/* Detail Section for Selected Day */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Detalle y Compromisos de la Fecha
            </span>
            <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{selectedDayStr}</span>
              {selectedDayStr === todayStr && (
                <span className="text-xs font-bold px-2 py-0.5 bg-red-600 text-white rounded-full">
                  HOY
                </span>
              )}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAddNote(selectedDayStr)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-xl transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-red-400" />
              <span>Agregar Nota para esta Fecha</span>
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

        {/* 4-Column Responsive Grid of Day Commitments */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. PAGOS A PERSONAL */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Users className="w-4 h-4" />
                <span>Pagos de Personal</span>
              </div>
              <span className="text-xs font-bold text-purple-300">
                {formatCurrency(selectedEvents.totalPagos)}
              </span>
            </div>

            {selectedEvents.paydays.length === 0 && selectedEvents.anticiposDelDia.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">Sin pagos de sueldos ni anticipos hoy.</p>
            ) : (
              <div className="space-y-1.5 text-xs">
                {selectedEvents.paydays.map((w) => (
                  <div
                    key={`payday-${w.id}`}
                    className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-200 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-white">{w.nombre}</div>
                      <div className="text-[10px] text-neutral-400">Sueldo mensual pactado</div>
                    </div>
                    <div className="font-bold text-purple-400">{formatCurrency(Number(w.sueldo) || 0)}</div>
                  </div>
                ))}

                {selectedEvents.anticiposDelDia.map((a) => (
                  <div
                    key={`anticipo-${a.id}`}
                    className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-200 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-white">Anticipo entregado</div>
                      <div className="text-[10px] text-neutral-400">{a.descripcion || 'Adelanto'}</div>
                    </div>
                    <div className="font-bold text-purple-400">{formatCurrency(Number(a.monto) || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. INGRESOS (TRABAJOS) */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <TrendingUp className="w-4 h-4" />
                <span>Ingresos / Servicios</span>
              </div>
              <span className="text-xs font-bold text-emerald-300">
                {formatCurrency(selectedEvents.totalIngresos)}
              </span>
            </div>

            {selectedEvents.jobs.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">No hay trabajos registrados para esta fecha.</p>
            ) : (
              <div className="space-y-1.5 text-xs max-h-52 overflow-y-auto pr-1">
                {selectedEvents.jobs.map((j) => (
                  <div
                    key={`job-${j.id}`}
                    className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-200 space-y-0.5"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-white">{j.vehiculo}</span>
                      <span className="font-bold text-emerald-400">
                        {formatCurrency(Number(j.costo) || 0)}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-1">{j.descripcion}</p>
                    <div className="text-[10px] text-neutral-500 capitalize">Estado: {j.estado}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. EGRESOS */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <TrendingDown className="w-4 h-4" />
                <span>Egresos del Taller</span>
              </div>
              <span className="text-xs font-bold text-red-300">
                {formatCurrency(selectedEvents.totalEgresos)}
              </span>
            </div>

            {selectedEvents.egresosDelDia.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">Sin gastos registrados para este día.</p>
            ) : (
              <div className="space-y-1.5 text-xs max-h-52 overflow-y-auto pr-1">
                {selectedEvents.egresosDelDia.map((e) => (
                  <div
                    key={`egreso-${e.id}`}
                    className="p-2 bg-neutral-900 rounded-lg border border-neutral-800 text-neutral-200 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-white">{e.descripcion}</div>
                      <div className="text-[10px] text-neutral-400 capitalize">Pago: {e.metodoPago}</div>
                    </div>
                    <div className="font-bold text-red-400">{formatCurrency(Number(e.monto) || 0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. NOTAS IMPORTANTES Y RECORDATORIOS */}
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                <Bell className="w-4 h-4" />
                <span>Notas & Recordatorios</span>
              </div>
              <span className="text-xs font-bold text-amber-300">
                {selectedEvents.notasDelDia.length}
              </span>
            </div>

            {selectedEvents.notasDelDia.length === 0 ? (
              <div className="py-2 text-center space-y-2">
                <p className="text-xs text-neutral-500">Sin notas o recordatorios pendientes.</p>
                <button
                  onClick={() => handleOpenAddNote(selectedDayStr)}
                  className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 underline"
                >
                  <Plus className="w-3 h-3" />
                  <span>Crear nota</span>
                </button>
              </div>
            ) : (
              <div className="space-y-1.5 text-xs max-h-52 overflow-y-auto pr-1">
                {selectedEvents.notasDelDia.map((n) => (
                  <div
                    key={`nota-${n.id}`}
                    className={`p-2 rounded-lg border transition-all ${
                      n.completada
                        ? 'bg-neutral-900/50 border-neutral-800 opacity-60'
                        : n.prioridad === 'alta'
                        ? 'bg-red-950/30 border-red-800/50 text-neutral-200'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <button
                        onClick={() => handleToggleNoteComplete(n.id)}
                        className="mt-0.5 text-neutral-400 hover:text-white"
                        title={n.completada ? 'Marcar pendiente' : 'Marcar completada'}
                      >
                        {n.completada ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-semibold text-white truncate ${
                            n.completada ? 'line-through text-neutral-400' : ''
                          }`}
                        >
                          {n.titulo}
                        </div>
                        {n.descripcion && (
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5">
                            {n.descripcion}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          <span
                            className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                              n.prioridad === 'alta'
                                ? 'bg-red-900/60 text-red-300'
                                : n.prioridad === 'media'
                                ? 'bg-amber-900/60 text-amber-300'
                                : 'bg-blue-900/60 text-blue-300'
                            }`}
                          >
                            {n.prioridad}
                          </span>
                          {n.monto && (
                            <span className="font-bold text-white">{formatCurrency(n.monto)}</span>
                          )}
                          {n.hora && <span className="text-neutral-400">🕒 {n.hora}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteNote(n.id)}
                        className="text-neutral-500 hover:text-red-400 transition-colors p-1"
                        title="Eliminar nota"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
                  placeholder="Ej: Pago de alquiler del local, Cobrar a Juan por caja de cambios..."
                  value={noteTitulo}
                  onChange={(e) => setNoteTitulo(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-neutral-400 font-semibold mb-1">
                  Descripción o Detalles adicionales
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles, números de contacto, repuestos necesarios..."
                  value={noteDescripcion}
                  onChange={(e) => setNoteDescripcion(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
                    placeholder="0.00"
                    value={noteMonto}
                    onChange={(e) => setNoteMonto(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
              {notificationPermission !== 'granted' && (
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
              )}

              <button
                onClick={handleTestNotification}
                className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs flex items-center gap-2 border border-neutral-700 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Probar Notificación en este Equipo</span>
              </button>
            </div>

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
                <li>Escribe el título y cuerpo (ej: <em>&quot;Recordatorio: Pago de sueldos hoy&quot;</em>).</li>
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
