import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  Car,
  DollarSign,
  Calendar as CalendarIcon,
  X
} from 'lucide-react';
import { AppData, Trabajo } from '../types';
import { formatCurrency, generateId, getTodayStr } from '../lib/dateUtils';

interface TrabajosViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  initialOpenNewModal?: boolean;
  prefilledClienteId?: string;
}

export const TrabajosView: React.FC<TrabajosViewProps> = ({
  data,
  onSaveData,
  onToast,
  initialOpenNewModal = false,
  prefilledClienteId = ''
}) => {
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(initialOpenNewModal);
  const [editingJob, setEditingJob] = useState<Trabajo | null>(null);

  // Form states
  const [clienteId, setClienteId] = useState<string>(prefilledClienteId);
  const [vehiculo, setVehiculo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fecha, setFecha] = useState<string>(getTodayStr());
  const [estado, setEstado] = useState<'pendiente' | 'en progreso' | 'completado'>('pendiente');
  const [costo, setCosto] = useState<string>('');
  const [trabajadorId, setTrabajadorId] = useState<string>('');

  const getClienteNombre = (id: string) => {
    const c = data.clientes.find((x) => x.id === id);
    return c ? c.nombre : 'Sin cliente';
  };

  const getTrabajadorNombre = (id: string) => {
    const t = data.trabajadores.find((x) => x.id === id);
    return t ? t.nombre : 'Sin asignar';
  };

  const handleOpenNew = () => {
    setEditingJob(null);
    setClienteId(data.clientes.length > 0 ? data.clientes[0].id : '');
    setVehiculo('');
    setDescripcion('');
    setFecha(getTodayStr());
    setEstado('pendiente');
    setCosto('');
    setTrabajadorId('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (job: Trabajo) => {
    setEditingJob(job);
    setClienteId(job.clienteId);
    setVehiculo(job.vehiculo || '');
    setDescripcion(job.descripcion);
    setFecha(job.fecha);
    setEstado(job.estado);
    setCosto(job.costo ? String(job.costo) : '');
    setTrabajadorId(job.trabajadorId || '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!descripcion.trim()) {
      onToast('La descripción del trabajo es obligatoria.', 'error');
      return;
    }

    const jobCosto = parseFloat(costo) || 0;

    const newJob: Trabajo = {
      id: editingJob ? editingJob.id : generateId(),
      clienteId,
      vehiculo: vehiculo.trim(),
      descripcion: descripcion.trim(),
      fecha,
      estado,
      costo: jobCosto,
      trabajadorId
    };

    let updatedTrabajos = [...data.trabajos];
    if (editingJob) {
      const idx = updatedTrabajos.findIndex((x) => x.id === editingJob.id);
      if (idx >= 0) updatedTrabajos[idx] = newJob;
    } else {
      updatedTrabajos.push(newJob);
    }

    onSaveData({
      ...data,
      trabajos: updatedTrabajos
    });

    setIsModalOpen(false);
    onToast(editingJob ? 'Trabajo actualizado correctamente' : 'Nuevo trabajo creado');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este registro de trabajo?')) {
      const updated = data.trabajos.filter((x) => x.id !== id);
      onSaveData({
        ...data,
        trabajos: updated
      });
      onToast('Trabajo eliminado');
    }
  };

  // Auto populate vehicle when selecting client if blank
  const handleClientChange = (newCId: string) => {
    setClienteId(newCId);
    if (!vehiculo) {
      const c = data.clientes.find((x) => x.id === newCId);
      if (c && c.vehiculo) {
        setVehiculo(c.vehiculo);
      }
    }
  };

  // Filter & Search
  let filteredList = data.trabajos.filter((t) => {
    if (filterEstado !== 'todos' && t.estado !== filterEstado) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const clientName = getClienteNombre(t.clienteId).toLowerCase();
      const desc = t.descripcion.toLowerCase();
      const veh = (t.vehiculo || '').toLowerCase();
      const id = t.id.toLowerCase();
      return clientName.includes(term) || desc.includes(term) || veh.includes(term) || id.includes(term);
    }
    return true;
  });

  filteredList.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-red-500" />
            <span>Gestión de Trabajos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Registro de servicios automotrices, reparación y mantenimiento
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Trabajo</span>
        </button>
      </div>

      {/* Card Filter & Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, vehiculo, desc..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-500 focus:outline-none focus:border-red-500"
            />
          </div>

          {/* Filter Status Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['todos', 'pendiente', 'en progreso', 'completado'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterEstado(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  filterEstado === st
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-950'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Vehículo</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Costo</th>
                <th className="px-4 py-3">Trabajador</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-neutral-500">
                    No se encontraron trabajos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredList.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">
                      #{t.id.slice(-6)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {getClienteNombre(t.clienteId)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{t.vehiculo || '-'}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{t.descripcion}</td>
                    <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">{t.fecha}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          t.estado === 'completado'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : t.estado === 'en progreso'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {t.estado === 'completado' && <CheckCircle2 className="w-3 h-3" />}
                        {t.estado === 'en progreso' && <Clock className="w-3 h-3" />}
                        {t.estado === 'pendiente' && <AlertTriangle className="w-3 h-3" />}
                        <span>{t.estado}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-white whitespace-nowrap">
                      {formatCurrency(Number(t.costo) || 0)}
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {getTrabajadorNombre(t.trabajadorId)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(t)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                          title="Editar trabajo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Eliminar trabajo"
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

      {/* Modal Crear / Editar Trabajo */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-red-500" />
                <span>{editingJob ? 'Editar Trabajo' : 'Nuevo Trabajo'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-red-400" />
                    <span>Cliente</span>
                  </label>
                  <select
                    value={clienteId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Seleccionar Cliente --</option>
                    {data.clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.vehiculo ? `(${c.vehiculo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-red-400" />
                    <span>Vehículo</span>
                  </label>
                  <input
                    type="text"
                    value={vehiculo}
                    onChange={(e) => setVehiculo(e.target.value)}
                    placeholder="Ej. Toyota Yaris 2020 - ABC-123"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Descripción del Servicio
                </label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                  placeholder="Ej. Cambio de aceite, revisión de frenos y afinamiento electrónico"
                  className="w-full p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-red-400" />
                    <span>Fecha</span>
                  </label>
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                    Estado del Trabajo
                  </label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value as any)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en progreso">En Progreso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-red-400" />
                    <span>Costo (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costo}
                    onChange={(e) => setCosto(e.target.value)}
                    placeholder="0.00"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                    Trabajador Asignado
                  </label>
                  <select
                    value={trabajadorId}
                    onChange={(e) => setTrabajadorId(e.target.value)}
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-red-500"
                  >
                    <option value="">Sin asignar</option>
                    {data.trabajadores.map((tr) => (
                      <option key={tr.id} value={tr.id}>
                        {tr.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-3 sticky bottom-0 bg-neutral-900">
              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-950/40"
              >
                {editingJob ? 'Actualizar Trabajo' : 'Guardar Trabajo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
