import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  Trash2,
  Calendar,
  DollarSign,
  X
} from 'lucide-react';
import { AppData, Presupuesto } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';

interface PresupuestosViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const PresupuestosView: React.FC<PresupuestosViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaLimite, setFechaLimite] = useState(getTodayStr());

  const handleOpenNew = () => {
    setDescripcion('');
    setMonto('');
    setFechaLimite(getTodayStr());
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!descripcion.trim()) {
      onToast('Ingresa la descripción del presupuesto o compra proyectada.', 'error');
      return;
    }

    const newPresupuesto: Presupuesto = {
      id: generateId(),
      descripcion: descripcion.trim(),
      monto: parseFloat(monto) || 0,
      fechaLimite,
      estado: 'pendiente'
    };

    onSaveData({
      ...data,
      presupuestos: [...data.presupuestos, newPresupuesto]
    });

    setIsModalOpen(false);
    onToast('Presupuesto registrado correctamente');
  };

  const handleToggleCompletado = (id: string) => {
    const updated = data.presupuestos.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          estado: (p.estado === 'completado' ? 'pendiente' : 'completado') as 'pendiente' | 'completado'
        };
      }
      return p;
    });

    onSaveData({
      ...data,
      presupuestos: updated
    });
    onToast('Estado del presupuesto actualizado');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Deseas eliminar este presupuesto?')) {
      const updated = data.presupuestos.filter((p) => p.id !== id);
      onSaveData({
        ...data,
        presupuestos: updated
      });
      onToast('Presupuesto eliminado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
            <span>Presupuestos y Compras Futuras</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Proyección de compras de insumos, herramientas y renovación de equipamiento
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Presupuesto</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Monto Estimado</th>
                <th className="px-4 py-3">Fecha Límite</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.presupuestos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No hay presupuestos registrados.
                  </td>
                </tr>
              ) : (
                data.presupuestos.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{p.descripcion}</td>
                    <td className="px-4 py-3 font-bold text-white">
                      {formatCurrency(Number(p.monto) || 0)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{p.fechaLimite || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          p.estado === 'completado'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleCompletado(p.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            p.estado === 'completado'
                              ? 'bg-emerald-900/60 text-emerald-300'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-emerald-950 hover:text-emerald-400'
                          }`}
                          title={p.estado === 'completado' ? 'Marcar pendiente' : 'Marcar completado'}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Eliminar presupuesto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Presupuesto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>Nuevo Presupuesto Proyectado</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Descripción de la Compra / Proyecto
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Scanner Diagnóstico Automotriz Multimarca"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Monto Presupuestado (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="1200.00"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Fecha Límite</span>
                  </label>
                  <input
                    type="date"
                    value={fechaLimite}
                    onChange={(e) => setFechaLimite(e.target.value)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900">
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-950/40"
              >
                Guardar Presupuesto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
