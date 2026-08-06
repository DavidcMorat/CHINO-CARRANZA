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
  X,
  Package,
  Layers,
  UserPlus
} from 'lucide-react';
import { AppData, Trabajo, MaterialUsadoItem } from '../types';
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(initialOpenNewModal);
  const [editingJob, setEditingJob] = useState<Trabajo | null>(null);

  // Form states
  const [clienteType, setClienteType] = useState<'registrado' | 'manual'>('registrado');
  const [clienteId, setClienteId] = useState<string>(prefilledClienteId);
  const [clienteNombreManual, setClienteNombreManual] = useState<string>('');
  const [vehiculo, setVehiculo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fecha, setFecha] = useState<string>(getTodayStr());
  const [estado, setEstado] = useState<'pendiente' | 'en progreso' | 'completado'>('pendiente');
  const [costo, setCosto] = useState<string>('');
  const [trabajadorId, setTrabajadorId] = useState<string>('');

  // Materials Modal State for a specific job
  const [selectedJobForMaterials, setSelectedJobForMaterials] = useState<Trabajo | null>(null);
  const [matSelectId, setMatSelectId] = useState<string>('');
  const [matCantidad, setMatCantidad] = useState<string>('1');

  const getClienteNombreDisplay = (t: Trabajo) => {
    if (t.clienteId) {
      const c = data.clientes.find((x) => x.id === t.clienteId);
      if (c) return c.nombre;
    }
    if (t.clienteNombre) return t.clienteNombre;
    return 'Cliente General';
  };

  const getTrabajadorNombre = (id: string) => {
    const tr = data.trabajadores.find((x) => x.id === id);
    return tr ? tr.nombre : 'Sin asignar';
  };

  const handleOpenNew = () => {
    setEditingJob(null);
    setClienteType(data.clientes.length > 0 ? 'registrado' : 'manual');
    setClienteId(data.clientes.length > 0 ? data.clientes[0].id : '');
    setClienteNombreManual('');
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
    if (job.clienteId && data.clientes.some((c) => c.id === job.clienteId)) {
      setClienteType('registrado');
      setClienteId(job.clienteId);
      setClienteNombreManual('');
    } else {
      setClienteType('manual');
      setClienteId('');
      setClienteNombreManual(job.clienteNombre || '');
    }
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

    if (clienteType === 'manual' && !clienteNombreManual.trim()) {
      onToast('Ingresa el nombre del cliente.', 'error');
      return;
    }

    const jobCosto = parseFloat(costo) || 0;

    const newJob: Trabajo = {
      id: editingJob ? editingJob.id : generateId(),
      clienteId: clienteType === 'registrado' ? clienteId : undefined,
      clienteNombre: clienteType === 'manual' ? clienteNombreManual.trim() : undefined,
      vehiculo: vehiculo.trim(),
      descripcion: descripcion.trim(),
      fecha,
      estado,
      costo: jobCosto,
      trabajadorId,
      materialesDetalle: editingJob ? editingJob.materialesDetalle : []
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
    const updated = data.trabajos.filter((x) => x.id !== id);
    onSaveData({
      ...data,
      trabajos: updated
    });
    onToast('Trabajo eliminado');
    setConfirmDeleteId(null);
  };

  // Auto populate vehicle when selecting registered client if blank
  const handleClientChange = (newCId: string) => {
    setClienteId(newCId);
    if (!vehiculo) {
      const c = data.clientes.find((x) => x.id === newCId);
      if (c && c.vehiculo) {
        setVehiculo(c.vehiculo);
      }
    }
  };

  // Manage Materials inside Job
  const handleOpenMaterialsModal = (job: Trabajo) => {
    setSelectedJobForMaterials(job);
    setMatSelectId(data.materiales.length > 0 ? data.materiales[0].id : '');
    setMatCantidad('1');
  };

  const handleAddMaterialToJob = () => {
    if (!selectedJobForMaterials) return;
    if (!matSelectId) {
      onToast('Selecciona un material del inventario.', 'error');
      return;
    }

    const cant = parseInt(matCantidad, 10);
    if (!cant || cant <= 0) {
      onToast('Ingresa una cantidad válida.', 'error');
      return;
    }

    const mat = data.materiales.find((m) => m.id === matSelectId);
    if (!mat) {
      onToast('Material no encontrado en inventario.', 'error');
      return;
    }

    if (mat.stock < cant) {
      onToast(`Stock insuficiente. Disponible en inventario: ${mat.stock}`, 'error');
      return;
    }

    // 1. Discount stock from materials list
    const updatedMateriales = data.materiales.map((m) => {
      if (m.id === mat.id) {
        return { ...m, stock: m.stock - cant };
      }
      return m;
    });

    // 2. Add to job's materialesDetalle
    const currentList = selectedJobForMaterials.materialesDetalle || [];
    const existingIdx = currentList.findIndex((item) => item.materialId === mat.id);

    let updatedDetalle: MaterialUsadoItem[] = [];
    if (existingIdx >= 0) {
      updatedDetalle = [...currentList];
      updatedDetalle[existingIdx] = {
        ...updatedDetalle[existingIdx],
        cantidad: updatedDetalle[existingIdx].cantidad + cant
      };
    } else {
      updatedDetalle = [
        ...currentList,
        {
          materialId: mat.id,
          nombre: mat.nombre,
          cantidad: cant,
          precioUnitario: Number(mat.precio) || 0
        }
      ];
    }

    const updatedJob: Trabajo = {
      ...selectedJobForMaterials,
      materialesDetalle: updatedDetalle
    };

    const updatedTrabajos = data.trabajos.map((t) =>
      t.id === updatedJob.id ? updatedJob : t
    );

    onSaveData({
      ...data,
      materiales: updatedMateriales,
      trabajos: updatedTrabajos
    });

    setSelectedJobForMaterials(updatedJob);
    onToast(`Se agregaron ${cant} unidad(es) de ${mat.nombre} al trabajo`);
  };

  const handleRemoveMaterialFromJob = (matId: string, cantToRemove: number) => {
    if (!selectedJobForMaterials) return;

    // Restore stock back to materials
    const updatedMateriales = data.materiales.map((m) => {
      if (m.id === matId) {
        return { ...m, stock: (m.stock || 0) + cantToRemove };
      }
      return m;
    });

    // Filter out item from job's materialesDetalle
    const currentList = selectedJobForMaterials.materialesDetalle || [];
    const updatedDetalle = currentList.filter((item) => item.materialId !== matId);

    const updatedJob: Trabajo = {
      ...selectedJobForMaterials,
      materialesDetalle: updatedDetalle
    };

    const updatedTrabajos = data.trabajos.map((t) =>
      t.id === updatedJob.id ? updatedJob : t
    );

    onSaveData({
      ...data,
      materiales: updatedMateriales,
      trabajos: updatedTrabajos
    });

    setSelectedJobForMaterials(updatedJob);
    onToast('Material devuelto al inventario y retirado del trabajo');
  };

  // Filter & Search
  let filteredList = data.trabajos.filter((t) => {
    if (filterEstado !== 'todos' && t.estado !== filterEstado) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const clientName = getClienteNombreDisplay(t).toLowerCase();
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
            Registro de servicios, clientes (registrados u ocasionales) y aplicación de materiales
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
                <th className="px-4 py-3">Materiales Usados</th>
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
                  <td colSpan={10} className="px-4 py-8 text-center text-neutral-500">
                    No se encontraron trabajos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredList.map((t) => {
                  const matItems = t.materialesDetalle || [];
                  const totalMatCount = matItems.reduce((acc, m) => acc + m.cantidad, 0);

                  return (
                    <tr key={t.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-neutral-500">
                        #{t.id.slice(-6)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{getClienteNombreDisplay(t)}</span>
                          {!t.clienteId && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-800 text-neutral-400 border border-neutral-700">
                              Ocasional
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">{t.vehiculo || '-'}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{t.descripcion}</td>

                      {/* Materiales Usados Column */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpenMaterialsModal(t)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all ${
                            totalMatCount > 0
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900'
                              : 'bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700'
                          }`}
                          title="Gestionar materiales usados en este trabajo"
                        >
                          <Package className="w-3.5 h-3.5 text-emerald-400" />
                          <span>
                            {totalMatCount > 0 ? `${totalMatCount} mat. asignado(s)` : '+ Agregar material'}
                          </span>
                        </button>
                      </td>

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
                          {confirmDeleteId === t.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                              <button
                                onClick={() => handleDelete(t.id)}
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
                              onClick={() => setConfirmDeleteId(t.id)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Eliminar trabajo"
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
              {/* Cliente Type selector */}
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-red-400" />
                  <span>Tipo de Cliente</span>
                </label>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setClienteType('registrado')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      clienteType === 'registrado'
                        ? 'bg-red-950/60 border-red-600 text-white shadow-md'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Cliente Registrado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClienteType('manual')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                      clienteType === 'manual'
                        ? 'bg-red-950/60 border-red-600 text-white shadow-md'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cliente Manual / Ocasional</span>
                  </button>
                </div>

                {clienteType === 'registrado' ? (
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Selecciona un cliente de la lista
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
                ) : (
                  <div>
                    <label className="block text-[11px] text-neutral-400 mb-1">
                      Nombre completo del cliente (sin necesidad de registrarlo)
                    </label>
                    <input
                      type="text"
                      value={clienteNombreManual}
                      onChange={(e) => setClienteNombreManual(e.target.value)}
                      placeholder="Ej. Juan Pérez (Cliente ocasional)"
                      className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500"
                    />
                  </div>
                )}
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

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Descripción del Servicio / Trabajo
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
                    <span>Costo del Servicio (S/)</span>
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

      {/* Modal Materiales Usados en Trabajo */}
      {selectedJobForMaterials && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <span>Materiales Usados en Trabajo #{selectedJobForMaterials.id.slice(-6)}</span>
              </h3>
              <button
                onClick={() => setSelectedJobForMaterials(null)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-neutral-300 flex items-center justify-between">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Cliente</span>
                  <span className="font-semibold text-white">{getClienteNombreDisplay(selectedJobForMaterials)}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase font-bold">Vehículo</span>
                  <span className="font-semibold text-white">{selectedJobForMaterials.vehiculo || '-'}</span>
                </div>
              </div>

              {/* Form to Add Material */}
              <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>Agregar Material del Registro / Inventario</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                      Material
                    </label>
                    <select
                      value={matSelectId}
                      onChange={(e) => setMatSelectId(e.target.value)}
                      className="w-full py-2 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    >
                      {data.materiales.length === 0 && (
                        <option value="">No hay materiales en inventario</option>
                      )}
                      {data.materiales.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} (Stock: {m.stock} ud. - {formatCurrency(m.precio)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={matCantidad}
                      onChange={(e) => setMatCantidad(e.target.value)}
                      className="w-full py-2 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-end">
                    <button
                      type="button"
                      onClick={handleAddMaterialToJob}
                      className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1 transition-all"
                      title="Aplicar al trabajo y descontar del inventario"
                    >
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table of Applied Materials */}
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Lista de Materiales Aplicados a este Trabajo</span>
                </h4>

                <div className="overflow-x-auto rounded-xl border border-neutral-800">
                  <table className="w-full text-left text-xs text-neutral-300">
                    <thead className="bg-neutral-950 text-neutral-400 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Material</th>
                        <th className="px-3 py-2.5">Cantidad</th>
                        <th className="px-3 py-2.5">Precio Unit.</th>
                        <th className="px-3 py-2.5">Subtotal</th>
                        <th className="px-3 py-2.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                      {(!selectedJobForMaterials.materialesDetalle ||
                        selectedJobForMaterials.materialesDetalle.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                            Aún no se han agregado materiales a este trabajo.
                          </td>
                        </tr>
                      ) : (
                        selectedJobForMaterials.materialesDetalle.map((item) => {
                          const subtotal = item.cantidad * item.precioUnitario;
                          return (
                            <tr key={item.materialId} className="hover:bg-neutral-800/40">
                              <td className="px-3 py-2.5 font-semibold text-white">{item.nombre}</td>
                              <td className="px-3 py-2.5 font-bold text-emerald-400">{item.cantidad} ud.</td>
                              <td className="px-3 py-2.5 text-neutral-400">
                                {formatCurrency(item.precioUnitario)}
                              </td>
                              <td className="px-3 py-2.5 font-bold text-white">
                                {formatCurrency(subtotal)}
                              </td>
                              <td className="px-3 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveMaterialFromJob(item.materialId, item.cantidad)}
                                  className="p-1 rounded bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                                  title="Quitar material y devolver al inventario"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            <div className="p-4 border-t border-neutral-800 flex items-center justify-between bg-neutral-900">
              <div className="text-xs text-neutral-400">
                Total Materiales:{' '}
                <strong className="text-emerald-400 font-bold">
                  {formatCurrency(
                    (selectedJobForMaterials.materialesDetalle || []).reduce(
                      (sum, item) => sum + item.cantidad * item.precioUnitario,
                      0
                    )
                  )}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setSelectedJobForMaterials(null)}
                className="py-2 px-4 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
