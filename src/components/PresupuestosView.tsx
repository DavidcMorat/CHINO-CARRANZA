import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle2,
  Trash2,
  Calendar,
  DollarSign,
  X,
  TrendingUp,
  TrendingDown,
  Info,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  HelpCircle,
  Tag
} from 'lucide-react';
import { AppData, Presupuesto } from '../types';
import { formatCurrency, generateId, getTodayStr, parseDateString } from '../lib/dateUtils';

interface PresupuestosViewProps {
  data: AppData;
  onSaveData: (newData: AppData) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

const CATEGORIAS_PRESUPUESTO = [
  { id: 'compras_deseadas', label: '🛍️ Compra Deseada', icon: '🛍️' },
  { id: 'pagos_clientes', label: '🤝 Pago a Cliente / Tercero', icon: '🤝' },
  { id: 'herramientas', label: '🔧 Herramienta / Equipo', icon: '🔧' },
  { id: 'servicios', label: '⚡ Servicio / Alquiler', icon: '⚡' },
  { id: 'otros', label: '📦 Otro Plan Especial', icon: '📦' }
];

export const PresupuestosView: React.FC<PresupuestosViewProps> = ({
  data,
  onSaveData,
  onToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [fechaLimite, setFechaLimite] = useState(getTodayStr());
  const [categoria, setCategoria] = useState('compras_deseadas');
  
  // Balance reference state: 'mes' (this month's net profit) or 'acumulado' (all-time)
  const [balanceSource, setBalanceSource] = useState<'mes' | 'acumulado'>('mes');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // --- FINANCIAL CALCULATION ENGINE ---
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 1. Ingresos de este mes (trabajos completados)
  const trabajosMes = data.trabajos.filter((t) => {
    const parsed = parseDateString(t.fecha);
    if (!parsed) return false;
    return parsed.month === currentMonth && parsed.year === currentYear;
  });
  const ingresosMes = trabajosMes.reduce((acc, t) => acc + (Number(t.costo) || 0), 0);

  // 2. Egresos de este mes
  const egresosMes = data.egresos
    .filter((e) => {
      const parsed = parseDateString(e.fecha);
      if (!parsed) return false;
      return parsed.month === currentMonth && parsed.year === currentYear;
    })
    .reduce((acc, e) => acc + (Number(e.monto) || 0), 0);

  // 3. Pago de Personal de este mes
  const getAnticiposTrabajador = (tid: string) => {
    return data.anticipos
      .filter((a) => a.trabajadorId === tid)
      .reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  };

  const getFaltasMes = (tid: string) => {
    return data.asistencias.filter((a) => {
      if (a.trabajadorId !== tid || !a.fecha || a.presente) return false;
      const parsed = parseDateString(a.fecha);
      if (!parsed) return false;
      return parsed.month === currentMonth && parsed.year === currentYear;
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
    const descFaltas = faltas * getDescuentoPorFalta(tid);
    const ant = getAnticiposTrabajador(tid);
    return Math.max(0, sueldo - descFaltas - ant);
  };

  const pagosPersonalTotalMes = data.trabajadores.reduce(
    (sum, w) => sum + getTotalPagoTrabajador(w.id),
    0
  );

  const gananciaNetaMes = ingresosMes - egresosMes - pagosPersonalTotalMes;

  // 4. Ganancia Neta Acumulada (Todo el Tiempo)
  const ingresosAllTime = data.trabajos.reduce((acc, t) => acc + (Number(t.costo) || 0), 0);
  const egresosAllTime = data.egresos.reduce((acc, e) => acc + (Number(e.monto) || 0), 0);
  const sueldosMensualesTotal = data.trabajadores.reduce((sum, w) => sum + (Number(w.sueldo) || 0), 0);
  const anticiposAllTime = data.anticipos.reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  const pagosPersonalAllTime = Math.max(0, sueldosMensualesTotal + anticiposAllTime);
  const gananciaNetaAllTime = ingresosAllTime - egresosAllTime - pagosPersonalAllTime;

  // Active Reference Balance
  const saldoDisponible = balanceSource === 'mes' ? gananciaNetaMes : gananciaNetaAllTime;

  // --- SIMULATED PLANS (Pending items where simular !== false) ---
  const presupuestosSimulados = data.presupuestos.filter(
    (p) => p.estado === 'pendiente' && p.simular !== false
  );
  const totalSimulado = presupuestosSimulados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
  const saldoRestante = saldoDisponible - totalSimulado;
  const isSufficient = saldoRestante >= 0;

  const percentageUsed = saldoDisponible > 0 
    ? Math.min(100, Math.max(0, (totalSimulado / saldoDisponible) * 100)) 
    : 0;

  // --- SAVE & ACTIONS ---
  const handleOpenNew = () => {
    setDescripcion('');
    setMonto('');
    setCategoria('compras_deseadas');
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
      estado: 'pendiente',
      categoria,
      simular: true // Included in simulation by default
    };

    onSaveData({
      ...data,
      presupuestos: [...data.presupuestos, newPresupuesto]
    });

    setIsModalOpen(false);
    onToast('Presupuesto registrado para planificación anticipada');
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

  const handleToggleSimular = (id: string) => {
    const updated = data.presupuestos.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          simular: p.simular === false ? true : false
        };
      }
      return p;
    });

    onSaveData({
      ...data,
      presupuestos: updated
    });
  };

  const handleDelete = (id: string) => {
    const updated = data.presupuestos.filter((p) => p.id !== id);
    onSaveData({
      ...data,
      presupuestos: updated
    });
    onToast('Presupuesto eliminado');
    setConfirmDeleteId(null);
  };

  const getCategoriaDisplay = (catId?: string) => {
    const cat = CATEGORIAS_PRESUPUESTO.find((c) => c.id === catId);
    return cat ? cat.label : '🛍️ Compra General';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-7 h-7 text-indigo-400" />
            <span>Presupuestos y Plan Anticipado</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Planifica tus compras y pagos anticipadamente tomando como base tu ganancia neta real del taller
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Configurar Gasto Anticipado</span>
        </button>
      </div>

      {/* --- SIMULATION ENGINE & ACTIVE BALANCE CARD (High Fidelity) --- */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Sparkles className="w-40 h-40 text-indigo-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Block: Available balance source selection */}
          <div className="lg:col-span-4 space-y-4">
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                Saldo Real de Referencia (Ganancia Neta)
              </span>
              <h2 className="text-3xl font-black text-white">
                {formatCurrency(saldoDisponible)}
              </h2>
            </div>

            {/* Selector Source */}
            <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 max-w-xs">
              <button
                onClick={() => setBalanceSource('mes')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  balanceSource === 'mes'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => setBalanceSource('acumulado')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  balanceSource === 'acumulado'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Acumulado
              </button>
            </div>
            
            <p className="text-[11px] text-neutral-500">
              {balanceSource === 'mes' 
                ? 'Calculado de trabajos completados este mes menos gastos y pago de planillas del personal.'
                : 'Cálculo total aproximado histórico de ganancias del taller menos egresos registrados.'
              }
            </p>
          </div>

          {/* Center Block: Simulation Math */}
          <div className="lg:col-span-5 space-y-3.5 border-t lg:border-t-0 lg:border-l lg:border-r border-neutral-800/80 lg:px-6 pt-4 lg:pt-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Total en Plan Anticipado:</span>
              </span>
              <span className="font-extrabold text-white text-sm">
                {formatCurrency(totalSimulado)}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-1">
              <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden p-0.5 border border-neutral-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isSufficient ? 'bg-indigo-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${percentageUsed}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-neutral-500 font-bold uppercase">
                <span>0% Utilizado</span>
                <span>{percentageUsed.toFixed(1)}% del Saldo</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5">
              <span className="text-neutral-400 font-semibold">Saldo Restante Estimado:</span>
              <span className={`font-black text-base ${isSufficient ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(saldoRestante)}
              </span>
            </div>
          </div>

          {/* Right Block: Simulation Verdict Alert */}
          <div className="lg:col-span-3">
            {isSufficient ? (
              <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 space-y-2 flex flex-col items-center text-center">
                <div className="w-9 h-9 rounded-full bg-emerald-900/80 flex items-center justify-center text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-emerald-300">¡Presupuesto Viable!</h4>
                  <p className="text-[10px] text-emerald-400 mt-1 leading-relaxed">
                    El dinero disponible en caja cubre perfectamente tus proyectos configurados. Puedes proceder de manera segura.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-4 space-y-2 flex flex-col items-center text-center animate-pulse">
                <div className="w-9 h-9 rounded-full bg-red-900/80 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-red-300">¡Saldo Insuficiente!</h4>
                  <p className="text-[10px] text-red-400 mt-1 leading-relaxed">
                    Te faltan <strong className="text-white">{formatCurrency(Math.abs(saldoRestante))}</strong> para cubrir este plan anticipado. Desactiva ítems para ajustar.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Budget Planning List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Configuración del Plan Anticipado</span>
          </h3>
          <span className="text-[11px] text-neutral-400">
            Marca o desmarca la columna <strong className="text-neutral-200">"Simular"</strong> para ver el impacto en tiempo real.
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-xs text-neutral-300">
            <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 text-center">Simular</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Categoría de Plan</th>
                <th className="px-4 py-3">Monto Proyectado</th>
                <th className="px-4 py-3">Fecha Planeada</th>
                <th className="px-4 py-3">Estado Real</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
              {data.presupuestos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    No hay planes o presupuestos anticipados configurados. ¡Crea el primero usando el botón superior!
                  </td>
                </tr>
              ) : (
                data.presupuestos.map((p) => {
                  const isPending = p.estado === 'pendiente';
                  const isSimulated = p.simular !== false;

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors hover:bg-neutral-850 ${
                        !isPending ? 'opacity-50' : ''
                      } ${isPending && isSimulated ? 'bg-indigo-950/20' : ''}`}
                    >
                      {/* Interactive Switch to Simulate */}
                      <td className="px-4 py-3 text-center">
                        {isPending ? (
                          <button
                            onClick={() => handleToggleSimular(p.id)}
                            className={`inline-flex items-center justify-center p-1 rounded-lg transition-all ${
                              isSimulated 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-neutral-950 text-neutral-600 border border-neutral-800'
                            }`}
                            title={isSimulated ? 'Excluir del simulador' : 'Incluir en el simulador'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-neutral-600 text-[10px] font-bold uppercase">Gastado</span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex flex-col">
                          <span>{p.descripcion}</span>
                          {isPending && !isSimulated && (
                            <span className="text-[10px] text-neutral-500 italic">Excluido del simulador</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-neutral-300">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-950 border border-neutral-800 text-[11px]">
                          <span>{getCategoriaDisplay(p.categoria)}</span>
                        </span>
                      </td>

                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                        {formatCurrency(Number(p.monto) || 0)}
                      </td>

                      <td className="px-4 py-3 text-neutral-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{p.fechaLimite || '-'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            !isPending
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}
                        >
                          {!isPending ? 'Completado (Real)' : 'Pendiente (Plan)'}
                        </span>
                      </td>

                      {/* Stateful Safe Deletion Column */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleToggleCompletado(p.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              !isPending
                                ? 'bg-emerald-900/60 text-emerald-300'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-emerald-950 hover:text-emerald-400'
                            }`}
                            title={!isPending ? 'Marcar como pendiente' : 'Marcar como completado/gasto real'}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>

                          {confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in duration-200">
                              <button
                                onClick={() => handleDelete(p.id)}
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
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-red-950 text-neutral-400 hover:text-red-400 transition-colors"
                              title="Eliminar presupuesto"
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

      {/* Modal Configure Projected Plan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <span>Configurar Gasto Anticipado</span>
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
                  Descripción de la Compra o Pago
                </label>
                <input
                  type="text"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej. Compra de elevador hidráulico o Pago a proveedor"
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Categoría de Presupuesto</span>
                </label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  {CATEGORIAS_PRESUPUESTO.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Monto Estimado (S/)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="1500.00"
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
                Configurar Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
