import React, { useState } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Calendar,
  DollarSign,
  CreditCard,
  X,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [tipoMovimiento, setTipoMovimiento] = useState<'egreso' | 'ingreso'>('egreso');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'yape' | 'otro'>('efectivo');
  const [fecha, setFecha] = useState(getTodayStr());
  const [filterTipo, setFilterTipo] = useState<'todos' | 'ingreso' | 'egreso'>('todos');

  const handleOpenNew = (tipo: 'egreso' | 'ingreso' = 'egreso') => {
    setTipoMovimiento(tipo);
    setDescripcion('');
    setMonto('');
    setMetodoPago('efectivo');
    setFecha(getTodayStr());
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!descripcion.trim() || !monto || parseFloat(monto) <= 0) {
      onToast('Completa la descripción y un monto válido mayor a 0.', 'error');
      return;
    }

    const newMovimiento: Egreso = {
      id: generateId(),
      descripcion: descripcion.trim(),
      monto: parseFloat(monto),
      metodoPago,
      fecha,
      tipo: tipoMovimiento
    };

    onSaveData({
      ...data,
      egresos: [...data.egresos, newMovimiento]
    });

    setIsModalOpen(false);
    onToast(tipoMovimiento === 'ingreso' ? 'Ingreso registrado con éxito' : 'Egreso registrado con éxito');
  };

  const handleDelete = (id: string) => {
    const updated = data.egresos.filter((e) => e.id !== id);
    onSaveData({
      ...data,
      egresos: updated
    });
    onToast('Movimiento eliminado');
    setConfirmDeleteId(null);
  };

  // Calculations
  const totalIngresosAdicionales = data.egresos
    .filter((e) => e.tipo === 'ingreso')
    .reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  const totalEgresos = data.egresos
    .filter((e) => e.tipo !== 'ingreso')
    .reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  const balanceMovimientos = totalIngresosAdicionales - totalEgresos;

  const filteredList = data.egresos.filter((e) => {
    if (filterTipo === 'ingreso') return e.tipo === 'ingreso';
    if (filterTipo === 'egreso') return e.tipo !== 'ingreso';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Wallet className="w-7 h-7 text-emerald-400" />
            <span>Ingresos y Egresos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gestión de salidas de caja (gastos) e ingresos adicionales no relacionados a trabajos específicos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => handleOpenNew('ingreso')}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Ingreso</span>
          </button>
          <button
            onClick={() => handleOpenNew('egreso')}
            className="py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Egreso</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Ingresos Adicionales
            </span>
            <div className="text-lg font-bold text-emerald-400">
              +{formatCurrency(totalIngresosAdicionales)}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Egresos / Gastos
            </span>
            <div className="text-lg font-bold text-amber-400">
              -{formatCurrency(totalEgresos)}
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Balance Movimientos
            </span>
            <div className={`text-lg font-bold ${balanceMovimientos >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(balanceMovimientos)}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterTipo('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTipo === 'todos'
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          Todos ({data.egresos.length})
        </button>
        <button
          onClick={() => setFilterTipo('ingreso')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTipo === 'ingreso'
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
              : 'text-neutral-400 hover:text-emerald-400'
          }`}
        >
          Ingresos ({data.egresos.filter((e) => e.tipo === 'ingreso').length})
        </button>
        <button
          onClick={() => setFilterTipo('egreso')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            filterTipo === 'egreso'
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'text-neutral-400 hover:text-amber-400'
          }`}
        >
          Egresos ({data.egresos.filter((e) => e.tipo !== 'ingreso').length})
        </button>
      </div>

      {/* Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Monto (S/)</th>
                <th className="px-4 py-3">Método de Pago</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    No hay registros con el filtro seleccionado.
                  </td>
                </tr>
              ) : (
                filteredList.map((e) => {
                  const isIngreso = e.tipo === 'ingreso';
                  return (
                    <tr key={e.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isIngreso
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {isIngreso ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {isIngreso ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">{e.descripcion}</td>
                      <td className={`px-4 py-3 font-extrabold ${isIngreso ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {isIngreso ? '+' : '-'} {formatCurrency(Number(e.monto) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            e.metodoPago === 'efectivo'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
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
                        {confirmDeleteId === e.id ? (
                          <div className="flex items-center justify-end gap-1 animate-in fade-in duration-200">
                            <button
                              onClick={() => handleDelete(e.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-lg"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(e.id)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                            title="Eliminar movimiento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Ingreso / Egreso */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {tipoMovimiento === 'ingreso' ? (
                  <>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span>Registrar Ingreso Adicional</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5 text-amber-500" />
                    <span>Registrar Salida de Dinero (Egreso)</span>
                  </>
                )}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Tipo de Movimiento
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('ingreso')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tipoMovimiento === 'ingreso'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Ingreso Adicional</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoMovimiento('egreso')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      tipoMovimiento === 'egreso'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Egreso / Gasto</span>
                  </button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  {tipoMovimiento === 'ingreso'
                    ? 'Ingreso externo independiente de los servicios o trabajos mecánicos del taller.'
                    : 'Gasto operativo, servicios, compras menores, movilidad u otros pagos del taller.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  {tipoMovimiento === 'ingreso' ? 'Concepto del Ingreso' : 'Descripción del Gasto'}
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className={`w-3.5 h-3.5 ${tipoMovimiento === 'ingreso' ? 'text-emerald-400' : 'text-amber-500'}`} />
                    <span>Monto (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder=""
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className={`w-3.5 h-3.5 ${tipoMovimiento === 'ingreso' ? 'text-emerald-400' : 'text-amber-500'}`} />
                    <span>Método de Pago</span>
                  </label>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="yape">Yape / Plin</option>
                    <option value="otro">Otro / Transferencia</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className={`w-3.5 h-3.5 ${tipoMovimiento === 'ingreso' ? 'text-emerald-400' : 'text-amber-500'}`} />
                  <span>Fecha</span>
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
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
                className={`py-2 px-4 text-white text-xs font-semibold rounded-xl shadow-lg ${
                  tipoMovimiento === 'ingreso'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40'
                }`}
              >
                {tipoMovimiento === 'ingreso' ? 'Guardar Ingreso' : 'Guardar Egreso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
