import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { AppData } from '../types';
import { formatCurrency, getCurrentMonthStr, parseDateString } from '../lib/dateUtils';

interface ExportarViewProps {
  data: AppData;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const ExportarView: React.FC<ExportarViewProps> = ({ data, onToast }) => {
  const [selectedMonthStr, setSelectedMonthStr] = useState<string>(getCurrentMonthStr());

  // Parse year and month
  const parts = selectedMonthStr.split('-');
  const selYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const selMonth = (parseInt(parts[1], 10) || 1) - 1; // 0-indexed

  // Filter jobs for month
  const trabajosMes = data.trabajos.filter((t) => {
    const parsed = parseDateString(t.fecha);
    if (!parsed) return false;
    return parsed.month === selMonth && parsed.year === selYear;
  });

  const ingresos = trabajosMes.reduce((acc, t) => acc + (Number(t.costo) || 0), 0);

  // Filter egresos for month
  const egresosMes = data.egresos.filter((e) => {
    const parsed = parseDateString(e.fecha);
    if (!parsed) return false;
    return parsed.month === selMonth && parsed.year === selYear;
  });

  const egresos = egresosMes.reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  // Workers payroll
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
      return parsed.month === selMonth && parsed.year === selYear;
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
    const desc = faltas * getDescuentoPorFalta(tid);
    const ant = getAnticiposTrabajador(tid);
    return Math.max(0, sueldo - desc - ant);
  };

  const pagosPersonal = data.trabajadores.reduce(
    (sum, w) => sum + getTotalPagoTrabajador(w.id),
    0
  );

  const gananciaNeta = ingresos - egresos - pagosPersonal;

  const getClienteNombre = (id: string) => {
    const c = data.clientes.find((x) => x.id === id);
    return c ? c.nombre : 'Sin cliente';
  };

  const getTrabajadorNombre = (id: string) => {
    const t = data.trabajadores.find((x) => x.id === id);
    return t ? t.nombre : 'Sin asignar';
  };

  // Export Monthly Excel
  const handleExportMonth = () => {
    if (!selectedMonthStr) {
      onToast('Selecciona un mes para exportar.', 'error');
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Trabajos
      const trabajosData: (string | number)[][] = [
        ['ID', 'Cliente', 'Vehículo', 'Descripción', 'Fecha', 'Estado', 'Costo (S/)', 'Trabajador']
      ];
      trabajosMes.forEach((t) => {
        trabajosData.push([
          t.id.slice(-6),
          getClienteNombre(t.clienteId),
          t.vehiculo || '',
          t.descripcion,
          t.fecha,
          t.estado,
          Number(t.costo) || 0,
          getTrabajadorNombre(t.trabajadorId)
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trabajosData), 'Trabajos');

      // Sheet 2: Egresos
      const egresosData: (string | number)[][] = [
        ['ID', 'Descripción', 'Monto (S/)', 'Método Pago', 'Fecha']
      ];
      egresosMes.forEach((e) => {
        egresosData.push([
          e.id.slice(-6),
          e.descripcion,
          Number(e.monto) || 0,
          e.metodoPago,
          e.fecha
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(egresosData), 'Egresos');

      // Sheet 3: Resumen Financiero
      const resumenData: (string | number)[][] = [
        ['Concepto Financiero', 'Monto Total (S/)'],
        ['Ingresos Totales (Servicios)', ingresos],
        ['Egresos Totales (Gastos)', egresos],
        ['Pagos a Personal (Sueldos Neta)', pagosPersonal],
        ['Ganancia Neta del Mes', gananciaNeta]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

      XLSX.writeFile(wb, `EL_CHINO_CARRANZA_Reporte_${selectedMonthStr}.xlsx`);
      onToast('Reporte Excel descargado exitosamente');
    } catch (err) {
      console.error('Export error:', err);
      onToast('Error al generar el archivo Excel.', 'error');
    }
  };

  // Export Full System Database Excel
  const handleExportFull = () => {
    try {
      const wb = XLSX.utils.book_new();

      // All Jobs
      const jobsData: (string | number)[][] = [
        ['ID', 'Cliente', 'Vehículo', 'Descripción', 'Fecha', 'Estado', 'Costo (S/)', 'Trabajador']
      ];
      data.trabajos.forEach((t) => {
        jobsData.push([
          t.id.slice(-6),
          getClienteNombre(t.clienteId),
          t.vehiculo || '',
          t.descripcion,
          t.fecha,
          t.estado,
          Number(t.costo) || 0,
          getTrabajadorNombre(t.trabajadorId)
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(jobsData), 'Todos los Trabajos');

      // All Expenses
      const expData: (string | number)[][] = [
        ['ID', 'Descripción', 'Monto (S/)', 'Método Pago', 'Fecha']
      ];
      data.egresos.forEach((e) => {
        expData.push([
          e.id.slice(-6),
          e.descripcion,
          Number(e.monto) || 0,
          e.metodoPago,
          e.fecha
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expData), 'Todos los Egresos');

      // All Workers & Payroll
      const workData: (string | number)[][] = [
        ['Nombre', 'Sueldo Base (S/)', 'Anticipos Totales (S/)', 'Faltas este Mes', 'Total a Pagar (S/)']
      ];
      data.trabajadores.forEach((w) => {
        const f = getFaltasMes(w.id);
        workData.push([
          w.nombre,
          Number(w.sueldo) || 0,
          getAnticiposTrabajador(w.id),
          f,
          getTotalPagoTrabajador(w.id)
        ]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(workData), 'Trabajadores');

      // All Clients
      const clientData: (string | number)[][] = [
        ['ID', 'Nombre', 'Teléfono', 'Vehículo', 'Placa']
      ];
      data.clientes.forEach((c) => {
        clientData.push([c.id, c.nombre, c.telefono || '', c.vehiculo || '', c.placa || '']);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clientData), 'Clientes');

      XLSX.writeFile(wb, `EL_CHINO_CARRANZA_Resumen_Completo.xlsx`);
      onToast('Resumen Completo Excel descargado exitosamente');
    } catch (err) {
      console.error('Export full error:', err);
      onToast('Error al exportar resumen completo.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Download className="w-7 h-7 text-emerald-400" />
            <span>Exportar Reportes Financieros en Excel</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Genera libros contables en formato .XLSX compatibles con Microsoft Excel y Hojas de Cálculo de Google
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-neutral-950 border border-neutral-800 rounded-xl">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="block text-xs font-semibold uppercase text-neutral-400">
                Seleccionar Mes del Reporte
              </span>
              <input
                type="month"
                value={selectedMonthStr}
                onChange={(e) => setSelectedMonthStr(e.target.value)}
                className="mt-1 py-1.5 px-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportMonth}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40 flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Excel del Mes</span>
            </button>

            <button
              onClick={handleExportFull}
              className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Resumen Completo</span>
            </button>
          </div>
        </div>

        {/* Live Month Preview Grid */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3">
            Vista Previa de Indicadores ({selectedMonthStr})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Ingresos</span>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-lg font-extrabold text-white mt-1">
                {formatCurrency(ingresos)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                {trabajosMes.length} trabajo(s) en {selectedMonthStr}
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Egresos</span>
                <TrendingDown className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg font-extrabold text-white mt-1">
                {formatCurrency(egresos)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                {egresosMes.length} gasto(s) en {selectedMonthStr}
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Pagos a Personal</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-lg font-extrabold text-white mt-1">
                {formatCurrency(pagosPersonal)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Neta a pagar este mes
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span>Ganancia Neta</span>
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
              <div
                className={`text-lg font-extrabold mt-1 ${
                  gananciaNeta >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {formatCurrency(gananciaNeta)}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">Balance final estimado</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
