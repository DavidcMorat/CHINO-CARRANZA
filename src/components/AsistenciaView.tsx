import React, { useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  Users,
  Check
} from 'lucide-react';
import { AppData, Asistencia } from '../types';
import { formatCurrency, generateId, getTodayStr, parseDateString } from '../lib/dateUtils';

interface AsistenciaViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const AsistenciaView: React.FC<AsistenciaViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [selectedFecha, setSelectedFecha] = useState<string>(getTodayStr());

  const parsedSelected = parseDateString(selectedFecha) || {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    day: new Date().getDate()
  };

  const getFaltasMes = (tid: string) => {
    return data.asistencias.filter((a) => {
      if (a.trabajadorId !== tid || a.presente) return false;
      const parsed = parseDateString(a.fecha);
      if (!parsed) return false;
      return parsed.month === parsedSelected.month && parsed.year === parsedSelected.year;
    }).length;
  };

  const getDescuentoPorFalta = (tid: string) => {
    const w = data.trabajadores.find((t) => t.id === tid);
    if (!w) return 0;
    const sueldo = Number(w.sueldo) || 0;
    return Math.round((sueldo / 30) * 100) / 100;
  };

  const isPresente = (tid: string) => {
    const record = data.asistencias.find(
      (a) => a.trabajadorId === tid && a.fecha === selectedFecha
    );
    return record ? record.presente : true; // default present
  };

  const toggleAsistencia = (tid: string, newPresente: boolean) => {
    let updated = [...data.asistencias];
    const idx = updated.findIndex((a) => a.trabajadorId === tid && a.fecha === selectedFecha);

    if (idx >= 0) {
      updated[idx] = { ...updated[idx], presente: newPresente };
    } else {
      updated.push({
        id: generateId(),
        trabajadorId: tid,
        fecha: selectedFecha,
        presente: newPresente
      });
    }

    onSaveData({
      ...data,
      asistencias: updated
    });
  };

  const handleMarkAllPresent = () => {
    let updated = [...data.asistencias];
    data.trabajadores.forEach((w) => {
      const idx = updated.findIndex((a) => a.trabajadorId === w.id && a.fecha === selectedFecha);
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], presente: true };
      } else {
        updated.push({
          id: generateId(),
          trabajadorId: w.id,
          fecha: selectedFecha,
          presente: true
        });
      }
    });

    onSaveData({
      ...data,
      asistencias: updated
    });

    onToast('Todos los trabajadores fueron marcados como PRESENTES');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-emerald-400" />
            <span>Asistencia de Personal</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Registro diario de asistencia con descuento automático por inasistencia (1/30 sueldo)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={selectedFecha}
            onChange={(e) => setSelectedFecha(e.target.value)}
            className="py-2 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handleMarkAllPresent}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Marcar Todos Presentes</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3 text-center">Asistencia ({selectedFecha})</th>
                <th className="px-4 py-3">Descuento del Día</th>
                <th className="px-4 py-3">Faltas Acumuladas en el Mes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.trabajadores.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                    No hay trabajadores registrados.
                  </td>
                </tr>
              ) : (
                data.trabajadores.map((w) => {
                  const presente = isPresente(w.id);
                  const desc = getDescuentoPorFalta(w.id);
                  const faltasMes = getFaltasMes(w.id);

                  return (
                    <tr key={w.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-neutral-500" />
                          <span>{w.nombre}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex items-center justify-center cursor-pointer p-1">
                          <input
                            type="checkbox"
                            checked={presente}
                            onChange={(e) => toggleAsistencia(w.id, e.target.checked)}
                            className="w-5 h-5 rounded border-neutral-700 bg-neutral-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-neutral-900 accent-emerald-500 cursor-pointer"
                          />
                        </label>
                      </td>

                      <td className="px-4 py-3">
                        {presente ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>S/ 0.00 (Presente)</span>
                          </span>
                        ) : (
                          <span className="text-red-400 font-bold">
                            - {formatCurrency(desc)} (Inasistencia)
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            faltasMes > 0
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {faltasMes} falta(s) en el mes
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
