import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  ChevronDown,
  ChevronUp,
  Calendar,
  Users,
  FileSpreadsheet,
  AlertCircle,
  X,
  ExternalLink,
  Clock,
  DollarSign,
  TrendingDown,
  Wrench
} from 'lucide-react';
import { CalendarAlertItem } from '../lib/calendarNotificationEngine';
import { formatCurrency } from '../lib/dateUtils';
import { SectionType } from './Sidebar';

interface NotificacionesBarProps {
  alerts: CalendarAlertItem[];
  totalPagosHoy: number;
  conteoPagos: number;
  conteoPresupuestos: number;
  conteoNotas: number;
  conteoEgresos: number;
  conteoTrabajos: number;
  onNavigateSection: (section: SectionType) => void;
  currentSection: SectionType;
}

export const NotificacionesBar: React.FC<NotificacionesBarProps> = ({
  alerts,
  totalPagosHoy,
  conteoPagos,
  conteoPresupuestos,
  conteoNotas,
  conteoEgresos,
  conteoTrabajos,
  onNavigateSection,
  currentSection
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If there are no alerts, don't show the bar
  if (!alerts || alerts.length === 0) {
    return null;
  }

  // If user minimized/dismissed the full banner, show a compact floating pill at the top
  if (isDismissed) {
    return (
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsDismissed(false)}
          className="px-3.5 py-1.5 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-purple-800/60 shadow-lg text-xs font-semibold text-purple-300 flex items-center gap-2 transition-all hover:scale-102 backdrop-blur-sm"
          title="Ver alertas del día"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
          </span>
          <Bell className="w-3.5 h-3.5 text-purple-400" />
          <span>
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} hoy
          </span>
          {totalPagosHoy > 0 && (
            <span className="text-emerald-400 font-bold ml-1">
              (Pagos: {formatCurrency(totalPagosHoy)})
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-purple-800/60 bg-gradient-to-r from-purple-950/85 via-neutral-900 to-neutral-900 shadow-xl shadow-purple-950/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Barra Principal Superior */}
      <div className="p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-900/70 border border-purple-700/80 flex items-center justify-center shrink-0 text-purple-300 shadow-inner">
            <BellRing className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>

          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                {conteoPagos > 0 ? (
                  <>
                    <span className="text-red-400">●</span>
                    <span>Pagos de Personal Programados Hoy</span>
                  </>
                ) : (
                  <>
                    <span className="text-purple-400">●</span>
                    <span>Compromisos y Alertas para Hoy</span>
                  </>
                )}
              </span>

              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/80 border border-purple-700 text-purple-200">
                {alerts.length} aviso{alerts.length > 1 ? 's' : ''}
              </span>

              {totalPagosHoy > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-700 text-emerald-300">
                  Total a Pagar: {formatCurrency(totalPagosHoy)}
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-300">
              {alerts.slice(0, 2).map((a) => a.titulo).join('  •  ')}
              {alerts.length > 2 && (
                <span className="text-neutral-400 ml-1.5 font-medium">
                  (+{alerts.length - 2} más)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Acciones Rápidas en la Barra */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 border border-neutral-700 transition-colors"
          >
            <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {conteoPagos > 0 && currentSection !== 'trabajadores' && (
            <button
              onClick={() => onNavigateSection('trabajadores')}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              title="Ir a sección de Trabajadores"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Trabajadores</span>
            </button>
          )}

          {currentSection !== 'calendario' && (
            <button
              onClick={() => onNavigateSection('calendario')}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              title="Abrir Calendario Completo"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
          )}

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800/80 transition-colors"
            title="Minimizar barra superior"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Desplegable con Detalle Completo de Alertas */}
      {isExpanded && (
        <div className="border-t border-purple-900/60 bg-neutral-950/90 p-4 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-neutral-400 pb-1">
            <span className="font-semibold text-neutral-300">
              Desglose de compromisos del día ({alerts.length})
            </span>
            <span className="text-[11px]">
              Actualizado en tiempo real desde el taller
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const isPago = alert.tipo === 'pago';
              const isPresupuesto = alert.tipo === 'presupuesto';
              const isNota = alert.tipo === 'nota';
              const isEgreso = alert.tipo === 'egreso';
              const isTrabajo = alert.tipo === 'trabajo';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs transition-colors ${
                    isPago
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-100 hover:bg-emerald-950/50'
                      : isPresupuesto
                      ? 'bg-amber-950/30 border-amber-800/60 text-amber-100 hover:bg-amber-950/50'
                      : isEgreso
                      ? 'bg-rose-950/30 border-rose-800/60 text-rose-100 hover:bg-rose-950/50'
                      : isTrabajo
                      ? 'bg-blue-950/30 border-blue-800/60 text-blue-100 hover:bg-blue-950/50'
                      : 'bg-purple-950/30 border-purple-800/60 text-purple-100 hover:bg-purple-950/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          isPago
                            ? 'bg-emerald-900/80 border-emerald-700 text-emerald-200'
                            : isPresupuesto
                            ? 'bg-amber-900/80 border-amber-700 text-amber-200'
                            : isEgreso
                            ? 'bg-rose-900/80 border-rose-700 text-rose-200'
                            : isTrabajo
                            ? 'bg-blue-900/80 border-blue-700 text-blue-200'
                            : 'bg-purple-900/80 border-purple-700 text-purple-200'
                        }`}
                      >
                        {isPago
                          ? '💰 Pago a Personal'
                          : isPresupuesto
                          ? '📋 Presupuesto'
                          : isEgreso
                          ? '📉 Egreso'
                          : isTrabajo
                          ? '🚗 Entrega'
                          : '📌 Nota'}
                      </span>

                      <span className="font-bold text-white">{alert.titulo}</span>
                    </div>

                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {alert.detalle}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {alert.monto && alert.monto > 0 && (
                      <span className="font-bold text-xs text-white px-2 py-0.5 rounded-lg bg-neutral-900/90 border border-neutral-700">
                        {formatCurrency(alert.monto)}
                      </span>
                    )}

                    {isPago && (
                      <button
                        onClick={() => onNavigateSection('trabajadores')}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                      >
                        <span>Pagar</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}

                    {isPresupuesto && (
                      <button
                        onClick={() => onNavigateSection('presupuestos')}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                      >
                        <span>Revisar</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
