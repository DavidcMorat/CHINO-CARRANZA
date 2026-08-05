import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Zap,
  Edit3,
  Trash2,
  Phone,
  Car,
  CreditCard,
  X
} from 'lucide-react';
import { AppData, Cliente } from '../types';
import { generateId } from '../lib/dateUtils';

interface ClientesViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
  onQuickPresetJob: (clienteId: string) => void;
}

export const ClientesView: React.FC<ClientesViewProps> = ({
  data,
  onSaveData,
  onToast,
  onQuickPresetJob
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [placa, setPlaca] = useState('');

  const handleOpenNew = () => {
    setEditingClient(null);
    setNombre('');
    setTelefono('');
    setVehiculo('');
    setPlaca('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Cliente) => {
    setEditingClient(c);
    setNombre(c.nombre);
    setTelefono(c.telefono || '');
    setVehiculo(c.vehiculo || '');
    setPlaca(c.placa || '');
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      onToast('El nombre del cliente es obligatorio.', 'error');
      return;
    }

    const newClient: Cliente = {
      id: editingClient ? editingClient.id : generateId(),
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      vehiculo: vehiculo.trim(),
      placa: placa.trim().toUpperCase()
    };

    let updatedList = [...data.clientes];
    if (editingClient) {
      const idx = updatedList.findIndex((x) => x.id === editingClient.id);
      if (idx >= 0) updatedList[idx] = newClient;
    } else {
      updatedList.push(newClient);
    }

    onSaveData({
      ...data,
      clientes: updatedList
    });

    setIsModalOpen(false);
    onToast(editingClient ? 'Cliente actualizado' : 'Cliente guardado');
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      const updated = data.clientes.filter((x) => x.id !== id);
      onSaveData({
        ...data,
        clientes: updated
      });
      onToast('Cliente eliminado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-blue-400" />
            <span>Directorio de Clientes</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Histórico de clientes, datos de vehículos, placas y creación rápida de trabajos
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Cliente</span>
        </button>
      </div>

      {/* Clients Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Nombre del Cliente</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Vehículo Habitual</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.clientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No hay clientes registrados en la base de datos.
                  </td>
                </tr>
              ) : (
                data.clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">{c.nombre}</td>
                    <td className="px-4 py-3 text-neutral-400">{c.telefono || '-'}</td>
                    <td className="px-4 py-3 text-neutral-300">{c.vehiculo || '-'}</td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-400 uppercase">
                      {c.placa || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onQuickPresetJob(c.id)}
                          className="px-2 py-1 rounded-lg bg-red-950 hover:bg-red-900 border border-red-800/80 text-red-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Crear trabajo rápido para este cliente"
                        >
                          <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span>Nuevo Trabajo</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                          title="Editar datos del cliente"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                          title="Eliminar cliente"
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

      {/* Modal Client */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                <span>{editingClient ? 'Editar Cliente' : 'Agregar Cliente'}</span>
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
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Roberto Gomez"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Teléfono / WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 912345678"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-blue-400" />
                    <span>Vehículo</span>
                  </label>
                  <input
                    type="text"
                    value={vehiculo}
                    onChange={(e) => setVehiculo(e.target.value)}
                    placeholder="Ej. Nissan Sentra"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                    <span>Placa</span>
                  </label>
                  <input
                    type="text"
                    value={placa}
                    onChange={(e) => setPlaca(e.target.value)}
                    placeholder="ABC-123"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs uppercase placeholder-neutral-600 focus:outline-none focus:border-blue-500"
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
                className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-950/40"
              >
                {editingClient ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
