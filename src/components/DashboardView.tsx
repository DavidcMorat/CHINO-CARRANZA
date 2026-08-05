import React from 'react';
import {
  TrendingUp,
  Wallet,
  TrendingDown,
  Clock,
  Users,
  CreditCard,
  AlertCircle,
  Wrench,
  CalendarCheck
} from 'lucide-react';
import { AppData } from '../types';
import { formatCurrency, parseDateString } from '../lib/dateUtils';

interface DashboardViewProps {
  data: AppData;
  onNavigateSection: (section: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ data, onNavigateSection }) => {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Ingresos del mes
  const trabajosMes = data.trabajos.filter((t) => {
    const parsed = parseDateString(t.fecha);
    if (!parsed) return false;
    return parsed.month === currentMonth && parsed.year === currentYear;
  });

  const ingresosMes = trabajosMes.reduce((acc, t) => acc + (Number(t.costo) || 0), 0);

  // Egresos del mes
  const egresosMes = data.egresos
    .filter((e) => {
      const parsed = parseDateString(e.fecha);
      if (!parsed) return false;
      return parsed.month === currentMonth && parsed.year === currentYear;
    })
    .reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  // Calculate worker payroll
  const getAnticiposTrabajador = (tid: string) => {
    return data.anticipos
      .filter((a) => a.trabajadorId === tid)
      .reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  };

  const getFaltasMes = (tid: string) => {
    return data.asistencias.filter((a) => {
      if (a.trabajadorId !== tid || a.presente) return false;
      const parsed = parseDateString(a.fecha);
      if (!parsed) return false;
      return parsed.month === currentMonth && parsed.year === currentYear;
    }).length;
  };

  const getDescuentoPorFalta = (tid: string) => {
    const w = data.trabajadores.find((t) => t.id === tid);
    if (!w) return 0;
    const sueldo = Number(w.sueldo) || 0;
    return Math.round((sueldo / 30) * 100) / 100;
  };

  const getTotalPagoTrabajador = (tid: string) => {
    const w = data.trabajadores.find((t) => t.id === tid);
    if (!w) return 0;
    const sueldo = Number(w.sueldo) || 0;
    const faltas = getFaltasMes(tid);
    const descFaltas = faltas * getDescuentoPorFalta(tid);
    const ant = getAnticiposTrabajador(tid);
    return Math.max(0, sueldo - descFaltas - ant);
  };

  const pagosPersonalTotal = data.trabajadores.reduce(
    (sum, w) => sum + getTotalPagoTrabajador(w.id),
    0
  );

  const gananciaNeta = ingresosMes - egresosMes - pagosPersonalTotal;
  const trabajosPendientes = data.trabajos.filter((t) => t.estado !== 'completado');

  const getClienteNombre = (id: string) => {
    const c = data.clientes.find((x) => x.id === id);
    return c ? c.nombre : 'Sin cliente';
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <TrendingUp className="w-7 h-7 text-red-500" />
            <span>Dashboard Principal</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Resumen financiero y operativo del taller automotriz
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-neutral-900 border border-neutral-800 px-3 py-2 rounded-xl text-neutral-300">
          <CalendarCheck className="w-4 h-4 text-red-500" />
          <span className="capitalize">
            {today.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Ingresos */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              Ingresos del Mes
            </span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-2">
            {formatCurrency(ingresosMes)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {trabajosMes.length} servicio(s) facturado(s)
          </div>
        </div>

        {/* Egresos */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              Egresos
            </span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-2">
            {formatCurrency(egresosMes)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Gastos operativos registrados</div>
        </div>

        {/* Pago a Personal */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              Pago Personal
            </span>
            <CreditCard className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-2">
            {formatCurrency(pagosPersonalTotal)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {data.trabajadores.length} trabajador(es)
          </div>
        </div>

        {/* Ganancia Neta */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              Ganancia Neta
            </span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-xl font-extrabold mt-2 ${
              gananciaNeta >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(gananciaNeta)}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Ingresos - Egresos - Sueldos</div>
        </div>

        {/* Trabajos Pendientes */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 relative overflow-hidden group hover:border-neutral-700 transition-all shadow-lg">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wider">
              Pendientes
            </span>
            <Clock className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-extrabold text-white mt-2">
            {trabajosPendientes.length}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Por finalizar o entregar</div>
        </div>
      </div>

      {/* Próximos Pagos a Trabajadores */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>Próximos Pagos a Trabajadores</span>
          </h3>

          <button
            onClick={() => onNavigateSection('trabajadores')}
            className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline"
          >
            Gestionar Trabajadores
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3">Sueldo Base</th>
                <th className="px-4 py-3">Anticipos</th>
                <th className="px-4 py-3">Descuentos (Faltas)</th>
                <th className="px-4 py-3">Total a Pagar</th>
                <th className="px-4 py-3">Día de Pago</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.trabajadores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    No hay trabajadores registrados.
                  </td>
                </tr>
              ) : (
                data.trabajadores.map((w) => {
                  const ant = getAnticiposTrabajador(w.id);
                  const faltas = getFaltasMes(w.id);
                  const desc = faltas * getDescuentoPorFalta(w.id);
                  const total = getTotalPagoTrabajador(w.id);

                  return (
                    <tr key={w.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{w.nombre}</td>
                      <td className="px-4 py-3">{formatCurrency(Number(w.sueldo) || 0)}</td>
                      <td className="px-4 py-3 text-amber-400 font-medium">
                        - {formatCurrency(ant)}
                      </td>
                      <td className="px-4 py-3 text-red-400 font-medium">
                        - {formatCurrency(desc)} ({faltas} falta{faltas !== 1 ? 's' : ''})
                      </td>
                      <td className="px-4 py-3 font-extrabold text-emerald-400 text-sm">
                        {formatCurrency(total)}
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {w.fechaPago ? `Día ${w.fechaPago}` : 'No definida'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trabajos Pendientes Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white text-base flex items-center gap-2">
            <Wrench className="w-5 h-5 text-red-400" />
            <span>Trabajos Pendientes o En Progreso</span>
          </h3>

          <button
            onClick={() => onNavigateSection('trabajos')}
            className="text-xs text-red-400 hover:text-red-300 font-medium hover:underline"
          >
            Ver Todos los Trabajos
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Costo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {trabajosPendientes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    ¡Excelente! No hay trabajos pendientes.
                  </td>
                </tr>
              ) : (
                trabajosPendientes.slice(0, 8).map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">
                      {getClienteNombre(t.clienteId)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{t.vehiculo || '-'}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{t.descripcion}</td>
                    <td className="px-4 py-3 text-neutral-400">{t.fecha}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.estado === 'en progreso'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {t.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-white">
                      {formatCurrency(Number(t.costo) || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
