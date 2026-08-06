import React, { useState } from 'react';
import {
  Users,
  Plus,
  Banknote,
  Edit3,
  Trash2,
  Phone,
  DollarSign,
  Calendar,
  X
} from 'lucide-react';
import { AppData, Trabajador, Anticipo } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';

interface TrabajadoresViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const TrabajadoresView: React.FC<TrabajadoresViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Trabajador | null>(null);

  // Worker Form
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sueldo, setSueldo] = useState('');
  const [frecuenciaPago, setFrecuenciaPago] = useState<'quincenal' | 'mensual' | 'personalizado'>('mensual');
  const [diasPagoPersonalizado, setDiasPagoPersonalizado] = useState('7');
  const [fechaPago, setFechaPago] = useState('25');

  // Advance Form Modal
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [selectedWorkerForAdvance, setSelectedWorkerForAdvance] = useState<Trabajador | null>(null);
  const [advanceMonto, setAdvanceMonto] = useState('');
  const [advanceDesc, setAdvanceDesc] = useState('');
  const [advanceFecha, setAdvanceFecha] = useState(getTodayStr());

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const getAnticiposTrabajador = (tid: string) => {
    return data.anticipos
      .filter((a) => a.trabajadorId === tid)
      .reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  };

  const handleOpenNewWorker = () => {
    setEditingWorker(null);
    setNombre('');
    setTelefono('');
    setSueldo('');
    setFrecuenciaPago('mensual');
    setDiasPagoPersonalizado('7');
    setFechaPago('25');
    setIsWorkerModalOpen(true);
  };

  const handleOpenEditWorker = (w: Trabajador) => {
    setEditingWorker(w);
    setNombre(w.nombre);
    setTelefono(w.telefono || '');
    setSueldo(w.sueldo ? String(w.sueldo) : '');
    setFrecuenciaPago(w.frecuenciaPago || 'mensual');
    setDiasPagoPersonalizado(w.diasPagoPersonalizado ? String(w.diasPagoPersonalizado) : '7');
    setFechaPago(w.fechaPago || '25');
    setIsWorkerModalOpen(true);
  };

  const handleSaveWorker = () => {
    if (!nombre.trim()) {
      onToast('El nombre del trabajador es obligatorio.', 'error');
      return;
    }

    const newWorker: Trabajador = {
      id: editingWorker ? editingWorker.id : generateId(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      sueldo: parseFloat(sueldo) || 0,
      frecuenciaPago,
      diasPagoPersonalizado: frecuenciaPago === 'personalizado' ? (parseInt(diasPagoPersonalizado, 10) || 7) : undefined,
      fechaPago: fechaPago.trim() || '25'
    };

    let updatedList = [...data.trabajadores];
    if (editingWorker) {
      const idx = updatedList.findIndex((x) => x.id === editingWorker.id);
      if (idx >= 0) updatedList[idx] = newWorker;
    } else {
      updatedList.push(newWorker);
    }

    onSaveData({
      ...data,
      trabajadores: updatedList
    });

    setIsWorkerModalOpen(false);
    onToast(editingWorker ? 'Trabajador actualizado' : 'Trabajador registrado');
  };

  const handleDeleteWorker = (id: string) => {
    const updatedTrabajadores = data.trabajadores.filter((x) => x.id !== id);
    const updatedAnticipos = data.anticipos.filter((x) => x.trabajadorId !== id);
    const updatedAsistencias = data.asistencias.filter((x) => x.trabajadorId !== id);

    onSaveData({
      ...data,
      trabajadores: updatedTrabajadores,
      anticipos: updatedAnticipos,
      asistencias: updatedAsistencias
    });

    onToast('Trabajador eliminado');
    setConfirmDeleteId(null);
  };

  // Cash Advance Modal
  const handleOpenAdvance = (w: Trabajador) => {
    setSelectedWorkerForAdvance(w);
    setAdvanceMonto('');
    setAdvanceDesc('');
    setAdvanceFecha(getTodayStr());
    setIsAdvanceModalOpen(true);
  };

  const handleSaveAdvance = () => {
    if (!selectedWorkerForAdvance) return;
    const monto = parseFloat(advanceMonto);
    if (!monto || monto <= 0) {
      onToast('Ingresa un monto válido para el anticipo.', 'error');
      return;
    }

    const newAdvance: Anticipo = {
      id: generateId(),
      trabajadorId: selectedWorkerForAdvance.id,
      monto,
      descripcion: advanceDesc.trim(),
      fecha: advanceFecha
    };

    onSaveData({
      ...data,
      anticipos: [...data.anticipos, newAdvance]
    });

    setIsAdvanceModalOpen(false);
    onToast(`Anticipo de ${formatCurrency(monto)} registrado para ${selectedWorkerForAdvance.nombre}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-purple-400" />
            <span>Gestión de Trabajadores</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Control de personal, salarios, días de pago y adelantos de sueldo
          </p>
        </div>

        <button
          onClick={handleOpenNewWorker}
          className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Trabajador</span>
        </button>
      </div>

      {/* Workers Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Sueldo Base</th>
                <th className="px-4 py-3">Día de Pago</th>
                <th className="px-4 py-3">Anticipos (Adelantos)</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.trabajadores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    No hay trabajadores registrados.
                  </td>
                </tr>
              ) : (
                data.trabajadores.map((w) => {
                  const totalAnticipos = getAnticiposTrabajador(w.id);
                  return (
                    <tr key={w.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{w.nombre}</td>
                      <td className="px-4 py-3 text-neutral-400">{w.telefono || '-'}</td>
                      <td className="px-4 py-3 font-medium text-white">
                        <div>
                          <span>{formatCurrency(Number(w.sueldo) || 0)}</span>
                          <span className="block text-[10px] text-purple-400 capitalize font-semibold">
                            {w.frecuenciaPago === 'personalizado'
                              ? `Cada ${w.diasPagoPersonalizado || 7} días`
                              : w.frecuenciaPago || 'Mensual'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {w.fechaPago ? w.fechaPago : 'Sin fecha'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-amber-400">
                        {formatCurrency(totalAnticipos)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenAdvance(w)}
                            className="px-2 py-1 rounded-lg bg-amber-950 hover:bg-amber-900 border border-amber-800/80 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                            title="Registrar adelanto de sueldo"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>Anticipo</span>
                          </button>
                          <button
                            onClick={() => handleOpenEditWorker(w)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                            title="Editar trabajador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === w.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                              <button
                                onClick={() => handleDeleteWorker(w.id)}
                                className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded-lg"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-[10px] font-bold rounded-lg"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(w.id)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Eliminar trabajador"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Worker */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                <span>{editingWorker ? 'Editar Trabajador' : 'Agregar Trabajador'}</span>
              </h3>
              <button
                onClick={() => setIsWorkerModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-purple-400" />
                  <span>Teléfono / WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-purple-400" />
                    <span>Sueldo Base (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sueldo}
                    onChange={(e) => setSueldo(e.target.value)}
                    placeholder="1500.00"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>Frecuencia de Pago</span>
                  </label>
                  <select
                    value={frecuenciaPago}
                    onChange={(e) => setFrecuenciaPago(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="quincenal">Quincenal (Cada 15 días)</option>
                    <option value="mensual">Mensual (Cada 30 días)</option>
                    <option value="personalizado">Personalizado (Establecer Días)</option>
                  </select>
                </div>

                {frecuenciaPago === 'personalizado' ? (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                      Frecuencia de Pago (Cada cuántos días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={diasPagoPersonalizado}
                      onChange={(e) => setDiasPagoPersonalizado(e.target.value)}
                      placeholder="Ej. 7, 10, 20"
                      className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      <span>Día / Detalle de Pago (1-31)</span>
                    </label>
                    <input
                      type="text"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      placeholder="Ej. 25 o 15 y 30"
                      className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900">
              <button
                onClick={() => setIsWorkerModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveWorker}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-950/40"
              >
                {editingWorker ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anticipo */}
      {isAdvanceModalOpen && selectedWorkerForAdvance && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-amber-400" />
                <span>Adelanto de Sueldo - {selectedWorkerForAdvance.nombre}</span>
              </h3>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Monto a Adelantar (S/)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={advanceMonto}
                  onChange={(e) => setAdvanceMonto(e.target.value)}
                  placeholder="0.00"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Concepto / Motivo
                </label>
                <input
                  type="text"
                  value={advanceDesc}
                  onChange={(e) => setAdvanceDesc(e.target.value)}
                  placeholder="Ej. Adelanto semanal personal"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Fecha de Adelanto
                </label>
                <input
                  type="date"
                  value={advanceFecha}
                  onChange={(e) => setAdvanceFecha(e.target.value)}
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900">
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAdvance}
                className="py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-amber-950/40"
              >
                Registrar Anticipo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
