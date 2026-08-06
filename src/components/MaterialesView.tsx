import React, { useState } from 'react';
import {
  Package,
  Plus,
  Minus,
  Edit3,
  Trash2,
  DollarSign,
  Layers,
  X
} from 'lucide-react';
import { AppData, Material } from '../types';
import { formatCurrency, generateId } from '../lib/dateUtils';

interface MaterialesViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export const MaterialesView: React.FC<MaterialesViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [stock, setStock] = useState('');
  const [precio, setPrecio] = useState('');

  const handleOpenNew = () => {
    setEditingMaterial(null);
    setNombre('');
    setStock('');
    setPrecio('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Material) => {
    setEditingMaterial(m);
    setNombre(m.nombre);
    setStock(String(m.stock));
    setPrecio(String(m.precio));
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!nombre.trim()) {
      onToast('El nombre del material es obligatorio.', 'error');
      return;
    }

    const newMaterial: Material = {
      id: editingMaterial ? editingMaterial.id : generateId(),
      nombre: nombre.trim(),
      stock: parseInt(stock, 10) || 0,
      precio: parseFloat(precio) || 0
    };

    let updatedList = [...data.materiales];
    if (editingMaterial) {
      const idx = updatedList.findIndex((x) => x.id === editingMaterial.id);
      if (idx >= 0) updatedList[idx] = newMaterial;
    } else {
      updatedList.push(newMaterial);
    }

    onSaveData({
      ...data,
      materiales: updatedList
    });

    setIsModalOpen(false);
    onToast(editingMaterial ? 'Material actualizado' : 'Material agregado al inventario');
  };

  const handleDelete = (id: string) => {
    const updated = data.materiales.filter((x) => x.id !== id);
    onSaveData({
      ...data,
      materiales: updated
    });
    onToast('Material eliminado');
    setConfirmDeleteId(null);
  };

  const handleAdjustStock = (id: string, delta: number) => {
    const updated = data.materiales.map((m) => {
      if (m.id === id) {
        const newStock = Math.max(0, (m.stock || 0) + delta);
        return { ...m, stock: newStock };
      }
      return m;
    });
    onSaveData({
      ...data,
      materiales: updated
    });
  };

  const totalInventoryValue = data.materiales.reduce(
    (acc, m) => acc + (Number(m.stock) || 0) * (Number(m.precio) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-400" />
            <span>Registro de Materiales e Insumos</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Materiales y repuestos disponibles para usar en la sección de <strong className="text-neutral-200">Trabajos</strong>. Valor total en stock: {' '}
            <span className="text-emerald-400 font-bold">{formatCurrency(totalInventoryValue)}</span>
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar Material</span>
        </button>
      </div>

      {/* Materials Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Material / Repuesto</th>
                <th className="px-4 py-3">Stock Disponible</th>
                <th className="px-4 py-3">Precio Unitario</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.materiales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    No hay materiales en inventario.
                  </td>
                </tr>
              ) : (
                data.materiales.map((m) => {
                  const stockVal = Number(m.stock) || 0;
                  const priceVal = Number(m.precio) || 0;
                  const itemTotal = stockVal * priceVal;

                  return (
                    <tr key={m.id} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{m.nombre}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdjustStock(m.id, -1)}
                            className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                            title="Restar 1 al stock"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span
                            className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${
                              stockVal <= 2
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : 'bg-neutral-800 text-white'
                            }`}
                          >
                            {stockVal}
                          </span>

                          <button
                            onClick={() => handleAdjustStock(m.id, 1)}
                            className="w-6 h-6 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
                            title="Sumar 1 al stock"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">{formatCurrency(priceVal)}</td>
                      <td className="px-4 py-3 font-bold text-emerald-400">
                        {formatCurrency(itemTotal)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(m)}
                            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                            title="Editar material"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === m.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                              <button
                                onClick={() => handleDelete(m.id)}
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
                              onClick={() => setConfirmDeleteId(m.id)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Eliminar material"
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

      {/* Modal Material */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                <span>{editingMaterial ? 'Editar Material' : 'Agregar Material'}</span>
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
                  Nombre del Material / Repuesto
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Aceite Sintético 5W-30 (Galón)"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cantidad en Stock</span>
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="10"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Precio Unitario (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="45.00"
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
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
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/40"
              >
                {editingMaterial ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
