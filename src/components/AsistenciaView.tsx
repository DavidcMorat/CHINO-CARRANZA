import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  Check,
  AlertTriangle,
  FileText,
  DollarSign,
  Save,
  RotateCcw,
  Sparkles,
  TrendingDown,
  Info
} from 'lucide-react';
import { AppData, Asistencia, Trabajador } from '../types';
import { formatCurrency, generateId, getTodayStr, parseDateString } from '../lib/dateUtils';

interface AsistenciaViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

interface WorkerAttendanceState {
  presente: boolean;
  tipo: 'presente' | 'ausente' | 'tardanza';
  descripcionFalta: string;
  montoDescuento: number;
}

export const AsistenciaView: React.FC<AsistenciaViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  // Currently selected date for detail sheet (YYYY-MM-DD)
  const [selectedFecha, setSelectedFecha] = useState<string>(getTodayStr());

  // Month displayed in calendar (0-indexed month and year)
  const todayParsed = parseDateString(getTodayStr()) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  };

  const [calYear, setCalYear] = useState<number>(todayParsed.year);
  const [calMonth, setCalMonth] = useState<number>(todayParsed.month); // 0 = Enero, 11 = Diciembre

  // Local draft state for the selected date's attendance sheet
  const [localSheet, setLocalSheet] = useState<Record<string, WorkerAttendanceState>>({});
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'calendario' | 'resumen'>('calendario');

  // Load existing records from data.asistencias whenever selectedFecha or data.asistencias changes
  useEffect(() => {
    const newSheet: Record<string, WorkerAttendanceState> = {};

    data.trabajadores.forEach((w) => {
      const existing = data.asistencias.find(
        (a) => a.trabajadorId === w.id && a.fecha === selectedFecha
      );

      const defaultDailyRate = Math.round(((Number(w.sueldo) || 0) / 30) * 100) / 100;

      if (existing) {
        let tipo: 'presente' | 'ausente' | 'tardanza' = existing.presente ? 'presente' : 'ausente';
        if (!existing.presente && existing.descripcionFalta?.toLowerCase().includes('tardanza')) {
          tipo = 'tardanza';
        }

        newSheet[w.id] = {
          presente: existing.presente,
          tipo,
          descripcionFalta: existing.descripcionFalta || '',
          montoDescuento: existing.montoDescuento ?? (existing.presente ? 0 : defaultDailyRate)
        };
      } else {
        // Default: Present
        newSheet[w.id] = {
          presente: true,
          tipo: 'presente',
          descripcionFalta: '',
          montoDescuento: 0
        };
      }
    });

    setLocalSheet(newSheet);
    setIsDirty(false);
  }, [selectedFecha, data.asistencias, data.trabajadores]);

  // Navigate Months
  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    const today = getTodayStr();
    const parsed = parseDateString(today);
    if (parsed) {
      setCalYear(parsed.year);
      setCalMonth(parsed.month);
    }
    setSelectedFecha(today);
  };

  // Local state updaters for selected date sheet
  const handleSetWorkerStatus = (
    workerId: string,
    tipo: 'presente' | 'ausente' | 'tardanza'
  ) => {
    const worker = data.trabajadores.find((w) => w.id === workerId);
    const defaultDailyRate = worker ? Math.round(((Number(worker.sueldo) || 0) / 30) * 100) / 100 : 0;

    setLocalSheet((prev) => {
      const current = prev[workerId] || {
        presente: true,
        tipo: 'presente',
        descripcionFalta: '',
        montoDescuento: 0
      };

      if (tipo === 'presente') {
        return {
          ...prev,
          [workerId]: {
            presente: true,
            tipo: 'presente',
            descripcionFalta: '',
            montoDescuento: 0
          }
        };
      } else if (tipo === 'tardanza') {
        return {
          ...prev,
          [workerId]: {
            presente: false,
            tipo: 'tardanza',
            descripcionFalta: current.descripcionFalta || 'Tardanza (Llegada a deshora)',
            montoDescuento: current.montoDescuento > 0 ? current.montoDescuento : Math.round(defaultDailyRate * 0.5 * 100) / 100
          }
        };
      } else {
        // ausente
        return {
          ...prev,
          [workerId]: {
            presente: false,
            tipo: 'ausente',
            descripcionFalta: current.descripcionFalta || 'Inasistencia sin permiso',
            montoDescuento: current.montoDescuento > 0 ? current.montoDescuento : defaultDailyRate
          }
        };
      }
    });
    setIsDirty(true);
  };

  const handleUpdateWorkerText = (workerId: string, desc: string) => {
    setLocalSheet((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        descripcionFalta: desc
      }
    }));
    setIsDirty(true);
  };

  const handleUpdateWorkerDiscount = (workerId: string, montoStr: string) => {
    const val = parseFloat(montoStr);
    setLocalSheet((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        montoDescuento: isNaN(val) ? 0 : Math.max(0, val)
      }
    }));
    setIsDirty(true);
  };

  // Quick batch actions for selected date sheet
  const handleMarkAllPresent = () => {
    const updated: Record<string, WorkerAttendanceState> = {};
    data.trabajadores.forEach((w) => {
      updated[w.id] = {
        presente: true,
        tipo: 'presente',
        descripcionFalta: '',
        montoDescuento: 0
      };
    });
    setLocalSheet(updated);
    setIsDirty(true);
  };

  const handleMarkAllAbsent = () => {
    const updated: Record<string, WorkerAttendanceState> = {};
    data.trabajadores.forEach((w) => {
      const dailyRate = Math.round(((Number(w.sueldo) || 0) / 30) * 100) / 100;
      updated[w.id] = {
        presente: false,
        tipo: 'ausente',
        descripcionFalta: 'Inasistencia general',
        montoDescuento: dailyRate
      };
    });
    setLocalSheet(updated);
    setIsDirty(true);
  };

  // Save current sheet to AppData / Firestore
  const handleSaveAttendance = () => {
    // Remove all old records for selectedFecha
    let updatedAsistencias = data.asistencias.filter((a) => a.fecha !== selectedFecha);

    // Build new records
    data.trabajadores.forEach((w) => {
      const state = localSheet[w.id];
      if (state) {
        updatedAsistencias.push({
          id: generateId(),
          trabajadorId: w.id,
          fecha: selectedFecha,
          presente: state.presente,
          descripcionFalta: state.presente ? '' : state.descripcionFalta.trim(),
          montoDescuento: state.presente ? 0 : Number(state.montoDescuento) || 0
        });
      }
    });

    onSaveData({
      ...data,
      asistencias: updatedAsistencias
    });

    setIsDirty(false);
    onToast(`Asistencia del ${selectedFecha} registrada y guardada correctamente`, 'success');
  };

  // Calculations for selectedFecha
  const workerList = data.trabajadores;
  const totalWorkers = workerList.length;
  const localSheetValues = Object.values(localSheet) as WorkerAttendanceState[];
  const presentCount = localSheetValues.filter((s) => s.presente).length;
  const absentCount = localSheetValues.filter((s) => !s.presente).length;
  const totalDayDiscounts = localSheetValues.reduce(
    (sum, s) => sum + (s.presente ? 0 : s.montoDescuento || 0),
    0
  );

  // Calendar Grid helper logic
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Days in month
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  // First day of month (0 = Dom, 1 = Lun, ...) -> convert to Monday-first (0 = Lun, 6 = Dom)
  const firstDayRaw = new Date(calYear, calMonth, 1).getDay();
  const firstDayMondayFirst = firstDayRaw === 0 ? 6 : firstDayRaw - 1;

  // Build calendar matrix
  const calendarCells: ({ day: number; dateStr: string } | null)[] = [];
  for (let i = 0; i < firstDayMondayFirst; i++) {
    calendarCells.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const monthFormatted = String(calMonth + 1).padStart(2, '0');
    const dayFormatted = String(d).padStart(2, '0');
    const dateStr = `${calYear}-${monthFormatted}-${dayFormatted}`;
    calendarCells.push({ day: d, dateStr });
  }

  // Get attendance stats for any given date string
  const getDateAttendanceSummary = (dateStr: string) => {
    const records = data.asistencias.filter((a) => a.fecha === dateStr);
    if (records.length === 0) return { registered: false, countPresent: 0, countAbsent: 0 };
    const countPresent = records.filter((r) => r.presente).length;
    const countAbsent = records.filter((r) => !r.presente).length;
    return { registered: true, countPresent, countAbsent };
  };

  // Get monthly stats for each worker
  const getWorkerMonthlyStats = (workerId: string) => {
    let asistioCount = 0;
    let faltaCount = 0;
    let totalDescuentos = 0;
    const faltasDetalle: { fecha: string; motivo: string; descuento: number }[] = [];

    data.asistencias.forEach((a) => {
      if (a.trabajadorId !== workerId) return;
      const parsed = parseDateString(a.fecha);
      if (!parsed) return;
      if (parsed.year === calYear && parsed.month === calMonth) {
        if (a.presente) {
          asistioCount++;
        } else {
          faltaCount++;
          const desc = a.montoDescuento || 0;
          totalDescuentos += desc;
          faltasDetalle.push({
            fecha: a.fecha,
            motivo: a.descripcionFalta || 'Sin motivo indicado',
            descuento: desc
          });
        }
      }
    });

    return { asistioCount, faltaCount, totalDescuentos, faltasDetalle };
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-emerald-400" />
            <span>Control de Asistencia y Calendario</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gestión limpia de asistencia diaria, registro puntual de inasistencias, faltas y descuentos por trabajador.
          </p>
        </div>

        {/* View mode pills */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('calendario')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'calendario'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Calendario Interactivo</span>
          </button>
          <button
            onClick={() => setActiveTab('resumen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
              activeTab === 'resumen'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Resumen Mensual</span>
          </button>
        </div>
      </div>

      {activeTab === 'calendario' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Calendar Grid (5 cols in desktop) */}
          <div className="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
            {/* Month Header Controls */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{monthNames[calMonth]}</span>
                  <span className="text-emerald-400">{calYear}</span>
                </h2>
                <p className="text-[11px] text-neutral-400">
                  Haz clic en cualquier día para pasar asistencia
                </p>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleGoToday}
                  className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-semibold transition-colors mr-1"
                >
                  Hoy
                </button>
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                  title="Mes Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                  title="Mes Siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-[11px] text-neutral-400 uppercase tracking-wider py-1 border-b border-neutral-800">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            {/* Calendar Matrix */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarCells.map((cell, idx) => {
                if (!cell) {
                  return <div key={`empty-${idx}`} className="h-12 rounded-xl bg-neutral-950/30" />;
                }

                const isSelected = cell.dateStr === selectedFecha;
                const isToday = cell.dateStr === getTodayStr();
                const stats = getDateAttendanceSummary(cell.dateStr);

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => setSelectedFecha(cell.dateStr)}
                    className={`h-12 p-1 rounded-xl flex flex-col justify-between items-center transition-all relative border ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-500 text-white shadow-lg shadow-emerald-950/50 scale-105 z-10'
                        : isToday
                        ? 'bg-neutral-800/90 border-neutral-600 text-white'
                        : 'bg-neutral-950/80 border-neutral-800/80 hover:bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    <span className={`text-xs font-extrabold ${isToday && !isSelected ? 'text-amber-400' : ''}`}>
                      {cell.day}
                    </span>

                    {/* Indicators */}
                    <div className="flex items-center gap-0.5">
                      {stats.registered ? (
                        stats.countAbsent > 0 ? (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title={`${stats.countAbsent} falta(s)`} />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" title="Todos presentes" />
                        )
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-700" title="Sin registro" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Calendar Legend */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-around text-[10px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Presentes completados</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Registra falta(s)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-700" />
                <span>Sin registro</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Detailed Attendance Sheet for Selected Date (7 cols in desktop) */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-5">
            {/* Date Sheet Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                  Planilla de Registro Diario
                </span>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-emerald-400" />
                  <span>{selectedFecha}</span>
                  {selectedFecha === getTodayStr() && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
                      HOY
                    </span>
                  )}
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAttendance}
                  className={`py-2 px-4 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition-all ${
                    isDirty
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50 animate-pulse'
                      : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  <span>{isDirty ? 'Guardar Cambios *' : 'Guardar Asistencia'}</span>
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">
                  Total Personal
                </span>
                <span className="text-lg font-extrabold text-white">{totalWorkers}</span>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-xl p-3">
                <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
                  Presentes
                </span>
                <span className="text-lg font-extrabold text-emerald-300">{presentCount}</span>
              </div>

              <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-3">
                <span className="text-[10px] text-red-400 font-semibold uppercase block">
                  Ausentes / Faltas
                </span>
                <span className="text-lg font-extrabold text-red-300">{absentCount}</span>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3">
                <span className="text-[10px] text-neutral-400 font-semibold uppercase block">
                  Descuentos Día
                </span>
                <span className="text-lg font-extrabold text-white">
                  {formatCurrency(totalDayDiscounts)}
                </span>
              </div>
            </div>

            {/* Quick Batch Tools */}
            <div className="flex items-center justify-between text-xs bg-neutral-950 border border-neutral-800 rounded-xl p-3">
              <span className="text-neutral-400 font-medium">Acciones rápidas del día:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleMarkAllPresent}
                  className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Todos Presentes</span>
                </button>
                <button
                  onClick={handleMarkAllAbsent}
                  className="px-2.5 py-1 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Todos Ausentes</span>
                </button>
              </div>
            </div>

            {/* Workers List */}
            <div className="space-y-3">
              {workerList.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 bg-neutral-950 rounded-xl border border-neutral-800">
                  No hay trabajadores registrados en el sistema. Agrega trabajadores en la pestaña "Trabajadores".
                </div>
              ) : (
                workerList.map((w) => {
                  const state = localSheet[w.id] || {
                    presente: true,
                    tipo: 'presente',
                    descripcionFalta: '',
                    montoDescuento: 0
                  };

                  const dailyRate = Math.round(((Number(w.sueldo) || 0) / 30) * 100) / 100;

                  return (
                    <div
                      key={w.id}
                      className={`p-4 rounded-xl border transition-all space-y-3 ${
                        state.presente
                          ? 'bg-neutral-950/70 border-neutral-800'
                          : state.tipo === 'tardanza'
                          ? 'bg-amber-950/20 border-amber-800/60'
                          : 'bg-red-950/20 border-red-800/60'
                      }`}
                    >
                      {/* Top Row: Name + Status Selector */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{w.nombre}</span>
                            <span className="text-[11px] text-neutral-400 font-normal">
                              (Sueldo: {formatCurrency(Number(w.sueldo) || 0)}/mes | Día: {formatCurrency(dailyRate)})
                            </span>
                          </h3>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleSetWorkerStatus(w.id, 'presente')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              state.presente
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Presente</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetWorkerStatus(w.id, 'tardanza')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              !state.presente && state.tipo === 'tardanza'
                                ? 'bg-amber-600 text-white shadow-md'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Tardanza</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetWorkerStatus(w.id, 'ausente')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                              !state.presente && state.tipo === 'ausente'
                                ? 'bg-red-600 text-white shadow-md'
                                : 'text-neutral-400 hover:text-white'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Ausente</span>
                          </button>
                        </div>
                      </div>

                      {/* Expandable details when Absent or Tardanza */}
                      {!state.presente && (
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-neutral-800/60 animate-in fade-in duration-200">
                          {/* Motivo de la Falta / Nota */}
                          <div className="sm:col-span-8">
                            <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1 flex items-center gap-1">
                              <FileText className="w-3 h-3 text-amber-400" />
                              <span>Motivo / Detalle de la Falta</span>
                            </label>
                            <input
                              type="text"
                              value={state.descripcionFalta}
                              onChange={(e) => handleUpdateWorkerText(w.id, e.target.value)}
                              placeholder="Ej. Falta sin aviso, permiso médico, retardo..."
                              className="w-full py-2 px-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                            />
                          </div>

                          {/* Monto de Descuento (S/) */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] font-semibold uppercase text-neutral-400 mb-1 flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-red-400" />
                              <span>Monto Descuento (S/)</span>
                            </label>
                            <input
                              type="number"
                              step="0.50"
                              min="0"
                              value={state.montoDescuento}
                              onChange={(e) => handleUpdateWorkerDiscount(w.id, e.target.value)}
                              className="w-full py-2 px-3 bg-neutral-900 border border-red-800/80 rounded-xl text-red-300 font-bold text-xs focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Save Bar */}
            <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Recuerda presionar <strong>Guardar Asistencia</strong> para asegurar el registro.</span>
              </span>

              <button
                onClick={handleSaveAttendance}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Asistencia del Día</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MONTHLY SUMMARY TAB */}
      {activeTab === 'resumen' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                <span>Resumen de Asistencia de {monthNames[calMonth]} {calYear}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Estadísticas acumuladas de faltas y descuentos correspondientes al mes visible en el calendario.
              </p>
            </div>

            {/* Month Switcher in Summary */}
            <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 p-1.5 rounded-xl">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold text-white px-2">
                {monthNames[calMonth]} {calYear}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cards for each worker */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workerList.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-neutral-500">
                No hay trabajadores registrados.
              </div>
            ) : (
              workerList.map((w) => {
                const stats = getWorkerMonthlyStats(w.id);

                return (
                  <div
                    key={w.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                      <div>
                        <h3 className="font-bold text-white text-sm">{w.nombre}</h3>
                        <span className="text-xs text-neutral-400">
                          Sueldo Base: {formatCurrency(Number(w.sueldo) || 0)}
                        </span>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          stats.faltaCount > 0
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }`}
                      >
                        {stats.faltaCount} falta(s) en el mes
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-neutral-400 block font-semibold">
                          Días Asistidos
                        </span>
                        <span className="text-sm font-extrabold text-emerald-400">
                          {stats.asistioCount} días
                        </span>
                      </div>

                      <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-neutral-400 block font-semibold">
                          Inasistencias
                        </span>
                        <span className="text-sm font-extrabold text-red-400">
                          {stats.faltaCount} días
                        </span>
                      </div>

                      <div className="bg-neutral-900 border border-neutral-800 p-2.5 rounded-xl">
                        <span className="text-[10px] uppercase text-neutral-400 block font-semibold">
                          Total Descuentos
                        </span>
                        <span className="text-sm font-extrabold text-white">
                          {formatCurrency(stats.totalDescuentos)}
                        </span>
                      </div>
                    </div>

                    {/* Faltas Detail List */}
                    {stats.faltasDetalle.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                          Detalle de inasistencias del mes:
                        </span>
                        <div className="space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                          {stats.faltasDetalle.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="bg-neutral-900 border border-neutral-800/80 rounded-lg p-2 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-mono text-neutral-300 font-semibold mr-2">
                                  {f.fecha}
                                </span>
                                <span className="text-neutral-400">{f.motivo}</span>
                              </div>
                              <span className="text-red-400 font-bold shrink-0 ml-2">
                                -{formatCurrency(f.descuento)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
