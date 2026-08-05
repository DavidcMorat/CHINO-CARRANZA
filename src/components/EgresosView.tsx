import React, { useState } from 'react';
import {
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  X
} from 'lucide-react';
import { AppData, Egreso } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';

interface EgresosViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const EgresosView: React.FC<EgresosViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'yape' | 'otro'>('efectivo');
  const [fecha, setFecha] = useState(getTodayStr());

  const handleOpenNew = () => {
    setDescripcion('');
    setMonto('');
    setMetodoPago('efectivo');
    setFecha(getTodayStr());
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
      onToast('Completa la descripción y un monto válido para el egreso.', 'error');
      return;
    }

    const newEgreso: Egreso = {
      id: generateId(),
      descripcion: descripcion.trim(),
      monto: parseFloat(monto),
      metodoPago,
      fecha
    };

    onSaveData({
      ...data,
      egresos: [...data.egresos, newEgreso]
    });

    setIsModalOpen(false);
    onToast('Egreso registrado');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este registro de egreso?')) {
      const updated = data.egresos.filter((e) => e.id !== id);
      onSaveData({
        ...data,
        egresos: updated
      });
      onToast('Egreso eliminado');
    }
  };

  const totalEgresos = data.egresos.reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <TrendingDown className="w-7 h-7 text-amber-500" />
            <span>Control de Egresos y Gastos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Registro diario de salidas de caja, servicios básicos, compras menores y movilidad. Total acumulado:{' '}
            <span className="text-amber-400 font-bold">{formatCurrency(totalEgresos)}</span>
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Egreso</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Descripción del Gasto</th>
                <th className="px-4 py-3">Monto (S/)</th>
                <th className="px-4 py-3">Método de Pago</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.egresos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No hay egresos registrados.
                  </td>
                </tr>
              ) : (
                data.egresos.map((e) => (
                  <tr key={e.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{e.descripcion}</td>
                    <td className="px-4 py-3 font-extrabold text-amber-400">
                      {formatCurrency(Number(e.monto) || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          e.metodoPago === 'efectivo'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : e.metodoPago === 'yape'
                            ? 'bg-purple-950 text-purple-400 border border-purple-800'
                            : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        }`}
                      >
                        {e.metodoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{e.fecha || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                        title="Eliminar egreso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Egreso */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-500" />
                <span>Registrar Salida de Dinero (Egreso)</span>
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
                  Descripción del Gasto
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Pago de recibo de luz / Almuerzos del taller"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                    <span>Monto (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0.00"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-amber-500" />
                    <span>Método de Pago</span>
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape">Yape / Plin</option>
                    <option value="otro">Otro / Tarjeta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-500" />
                  <span>Fecha</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
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
                className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-950/40"
              >
                Registrar Egreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
