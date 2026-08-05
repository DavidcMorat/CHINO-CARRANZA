import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Users,
  FileSpreadsheet,
  Info
} from 'lucide-react';
import { AppData } from '../types';
import { formatCurrency, parseDateString } from '../lib/dateUtils';

interface CalendarioViewProps {
  data: AppData;
}

export const CalendarioView: React.FC<CalendarioViewProps> = ({ data }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(null);

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

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDateNum = today.getDate();

  const getDayEvents = (dayNum: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

    const jobs = data.trabajos.filter((t) => t.fecha === dateStr);
    const paydays = data.trabajadores.filter((w) => Number(w.fechaPago) === dayNum);
    const budgets = data.presupuestos.filter(
      (p) => p.fechaLimite === dateStr && p.estado === 'pendiente'
    );

    return { dateStr, jobs, paydays, budgets };
  };

  const selectedEvents = selectedDayStr ? getDayEvents(parseInt(selectedDayStr.split('-')[2], 10)) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-red-500" />
            <span>Calendario del Taller</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Programación mensual de servicios, fechas de pago a personal y vencimiento de presupuestos
          </p>
        </div>
      </div>

      {/* Main Grid Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-lg">
        {/* Calendar Navigation Bar */}
        <div className="flex items-center justify-between p-4 bg-neutral-950 border-b border-neutral-800">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="font-bold text-base text-white capitalize">
            {monthNames[month]} {year}
          </h3>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-950/60 text-center py-2.5 text-[11px] font-bold uppercase text-neutral-400">
          {daysOfWeek.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 bg-neutral-800 gap-[1px]">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
            <div key={`empty-${idx}`} className="bg-neutral-950/40 min-h-[64px]" />
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, idx) => {
            const dayNum = idx + 1;
            const { dateStr, jobs, paydays, budgets } = getDayEvents(dayNum);
            const isToday = isCurrentMonth && dayNum === todayDateNum;
            const isSelected = selectedDayStr === dateStr;

            return (
              <button
                key={`day-${dayNum}`}
                onClick={() => setSelectedDayStr(dateStr)}
                className={`bg-neutral-900 min-h-[64px] p-2 flex flex-col items-center justify-between text-left transition-all relative ${
                  isToday ? 'ring-2 ring-red-500 z-10' : ''
                } ${isSelected ? 'bg-neutral-800/80 ring-1 ring-neutral-500' : 'hover:bg-neutral-800/40'}`}
              >
                <span
                  className={`text-xs font-bold ${
                    isToday ? 'text-red-400 font-extrabold' : 'text-neutral-300'
                  }`}
                >
                  {dayNum}
                </span>

                {/* Event Indicator Dots */}
                <div className="flex items-center gap-1 mt-1">
                  {jobs.length > 0 && (
                    <span
                      className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"
                      title={`${jobs.length} trabajo(s)`}
                    />
                  )}
                  {paydays.length > 0 && (
                    <span
                      className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      title={`${paydays.length} pago(s) de personal`}
                    />
                  )}
                  {budgets.length > 0 && (
                    <span
                      className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"
                      title={`${budgets.length} presupuesto(s)`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend & Detail View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Legend */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-neutral-400" />
            <span>Leyenda del Calendario</span>
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span>Trabajos programados</span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Días de pago a trabajadores</span>
            </div>
            <div className="flex items-center gap-2.5 text-neutral-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span>Vencimiento de presupuestos</span>
            </div>
          </div>
        </div>

        {/* Day Detail Card */}
        <div className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Detalle del Día: {selectedDayStr || 'Selecciona un día en la cuadrícula'}
          </h3>

          {!selectedEvents ? (
            <p className="text-xs text-neutral-500 py-4">
              Haz clic sobre cualquier fecha en el calendario para visualizar la lista detallada de servicios, sueldos o compromisos.
            </p>
          ) : (
            <div className="space-y-3 text-xs">
              {/* Jobs */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-red-400" />
                  <span>Trabajos ({selectedEvents.jobs.length}):</span>
                </div>
                {selectedEvents.jobs.length === 0 ? (
                  <p className="text-neutral-500 pl-6 text-[11px]">No hay trabajos programados.</p>
                ) : (
                  <ul className="pl-6 list-disc text-neutral-300 space-y-0.5">
                    {selectedEvents.jobs.map((j) => (
                      <li key={j.id}>
                        {j.descripcion} —{' '}
                        <span className="font-semibold text-white">
                          {formatCurrency(Number(j.costo) || 0)}
                        </span>{' '}
                        ({j.estado})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Paydays */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Pagos de Personal ({selectedEvents.paydays.length}):</span>
                </div>
                {selectedEvents.paydays.length === 0 ? (
                  <p className="text-neutral-500 pl-6 text-[11px]">Sin pagos agendados para este día.</p>
                ) : (
                  <ul className="pl-6 list-disc text-neutral-300 space-y-0.5">
                    {selectedEvents.paydays.map((w) => (
                      <li key={w.id}>
                        {w.nombre} — Sueldo base: {formatCurrency(Number(w.sueldo) || 0)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Budgets */}
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-1">
                <div className="font-semibold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                  <span>Presupuestos Limite ({selectedEvents.budgets.length}):</span>
                </div>
                {selectedEvents.budgets.length === 0 ? (
                  <p className="text-neutral-500 pl-6 text-[11px]">Ningún presupuesto vence hoy.</p>
                ) : (
                  <ul className="pl-6 list-disc text-neutral-300 space-y-0.5">
                    {selectedEvents.budgets.map((b) => (
                      <li key={b.id}>
                        {b.descripcion} — {formatCurrency(Number(b.monto) || 0)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
