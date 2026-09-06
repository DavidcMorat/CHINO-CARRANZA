import React, { useState } from 'react';
import {
  Users,
  Plus,
  Banknote,
  Edit3,
  Trash2,
  Phone,
  DollarSign,
  Calendar as CalendarIcon,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  FileText,
  AlertTriangle,
  History
} from 'lucide-react';
import { AppData, Trabajador, Anticipo, Asistencia } from '../types';
import { formatCurrency, generateId, getTodayStr, parseDateString } from '../lib/dateUtils';

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
  const [activeTab, setActiveTab] = useState<'lista' | 'asistencia_detalle' | 'resumen_mes'>('lista');
  const [selectedFecha, setSelectedFecha] = useState<string>(getTodayStr());

  // Worker Form Modal
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Trabajador | null>(null);
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

  // Absence Detail Modal
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [workerForAbsenceModal, setWorkerForAbsenceModal] = useState<Trabajador | null>(null);
  const [absenceTipo, setAbsenceTipo] = useState<'ausente' | 'tardanza'>('ausente');
  const [absenceMotivo, setAbsenceMotivo] = useState('');
  const [absenceDescuento, setAbsenceDescuento] = useState('');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper functions
  const getAnticiposTrabajador = (tid: string) => {
    return data.anticipos
      .filter((a) => a.trabajadorId === tid)
      .reduce((sum, a) => sum + (Number(a.monto) || 0), 0);
  };

  const getAsistenciaStatus = (workerId: string, fecha: string): {
    status: 'presente' | 'ausente' | 'tardanza' | 'sin_marcar';
    record?: Asistencia;
  } => {
    const found = data.asistencias.find(
      (a) => a.trabajadorId === workerId && a.fecha === fecha
    );
    if (!found) {
      return { status: 'sin_marcar' };
    }
    if (found.presente) {
      return { status: 'presente', record: found };
    }
    if (found.descripcionFalta?.toLowerCase().includes('tardanza')) {
      return { status: 'tardanza', record: found };
    }
    return { status: 'ausente', record: found };
  };

  // Direct Attendance Actions
  const handleMarkDirectStatus = (
    worker: Trabajador,
    tipo: 'presente' | 'ausente' | 'tardanza'
  ) => {
    const dailyRate = Math.round(((Number(worker.sueldo) || 0) / 30) * 100) / 100;

    if (tipo === 'presente') {
      const existingIdx = data.asistencias.findIndex(
        (a) => a.trabajadorId === worker.id && a.fecha === selectedFecha
      );
      let updated = [...data.asistencias];
      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          presente: true,
          descripcionFalta: '',
          montoDescuento: 0
        };
      } else {
        updated.push({
          id: generateId(),
          trabajadorId: worker.id,
          fecha: selectedFecha,
          presente: true,
          montoDescuento: 0,
          descripcionFalta: ''
        });
      }
      onSaveData({ ...data, asistencias: updated });
      onToast(`${worker.nombre}: Presente (${selectedFecha})`);
    } else {
      // Open modal to specify reason and discount
      setWorkerForAbsenceModal(worker);
      setAbsenceTipo(tipo);
      setAbsenceMotivo(tipo === 'tardanza' ? 'Llegada tarde' : 'Falta sin justificar');
      setAbsenceDescuento(tipo === 'tardanza' ? String(Math.round((dailyRate / 2) * 100) / 100) : String(dailyRate));
      setIsAbsenceModalOpen(true);
    }
  };

  const handleSaveAbsenceModal = () => {
    if (!workerForAbsenceModal) return;

    const existingIdx = data.asistencias.findIndex(
      (a) => a.trabajadorId === workerForAbsenceModal.id && a.fecha === selectedFecha
    );

    const newRecord: Asistencia = {
      id: existingIdx >= 0 ? data.asistencias[existingIdx].id : generateId(),
      trabajadorId: workerForAbsenceModal.id,
      fecha: selectedFecha,
      presente: false,
      descripcionFalta: absenceTipo === 'tardanza' ? `[Tardanza] ${absenceMotivo.trim()}` : absenceMotivo.trim(),
      montoDescuento: parseFloat(absenceDescuento) || 0
    };

    let updated = [...data.asistencias];
    if (existingIdx >= 0) {
      updated[existingIdx] = newRecord;
    } else {
      updated.push(newRecord);
    }

    onSaveData({ ...data, asistencias: updated });
    setIsAbsenceModalOpen(false);
    onToast(`${workerForAbsenceModal.nombre}: ${absenceTipo === 'tardanza' ? 'Tardanza' : 'Falta'} guardada`);
  };

  const handleMarkAllPresent = () => {
    let updated = [...data.asistencias];
    data.trabajadores.forEach((w) => {
      const idx = updated.findIndex((a) => a.trabajadorId === w.id && a.fecha === selectedFecha);
      if (idx >= 0) {
        updated[idx] = {
          ...updated[idx],
          presente: true,
          descripcionFalta: '',
          montoDescuento: 0
        };
      } else {
        updated.push({
          id: generateId(),
          trabajadorId: w.id,
          fecha: selectedFecha,
          presente: true,
          montoDescuento: 0,
          descripcionFalta: ''
        });
      }
    });

    onSaveData({ ...data, asistencias: updated });
    onToast(`Todos los trabajadores marcados presentes (${selectedFecha})`);
  };

  // Date Navigation
  const handleShiftDate = (days: number) => {
    const parsed = parseDateString(selectedFecha);
    if (!parsed) return;
    const d = new Date(parsed.year, parsed.month, parsed.day + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedFecha(`${y}-${m}-${day}`);
  };

  // Worker Form Handlers
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

  // Cash Advance Modal Handlers
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

  // Monthly stats calculation
  const parsedSel = parseDateString(selectedFecha) || { year: new Date().getFullYear(), month: new Date().getMonth() };
  const currentMonthWorkersStats = data.trabajadores.map((w) => {
    const monthAsistencias = data.asistencias.filter((a) => {
      if (a.trabajadorId !== w.id) return false;
      const p = parseDateString(a.fecha);
      return p && p.year === parsedSel.year && p.month === parsedSel.month;
    });

    const presentes = monthAsistencias.filter((a) => a.presente).length;
    const tardanzas = monthAsistencias.filter(
      (a) => !a.presente && a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;
    const faltas = monthAsistencias.filter(
      (a) => !a.presente && !a.descripcionFalta?.toLowerCase().includes('tardanza')
    ).length;

    const totalDescuentos = monthAsistencias
      .filter((a) => !a.presente)
      .reduce((sum, a) => sum + (Number(a.montoDescuento) || 0), 0);

    const totalAnticipos = data.anticipos
      .filter((ant) => {
        if (ant.trabajadorId !== w.id) return false;
        const p = parseDateString(ant.fecha);
        return p && p.year === parsedSel.year && p.month === parsedSel.month;
      })
      .reduce((sum, ant) => sum + (Number(ant.monto) || 0), 0);

    const sueldoNetoEstimado = Math.max(0, (Number(w.sueldo) || 0) - totalDescuentos - totalAnticipos);

    return {
      worker: w,
      presentes,
      tardanzas,
      faltas,
      totalDescuentos,
      totalAnticipos,
      sueldoNetoEstimado
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-7 h-7 text-purple-400" />
            <span>Gestión de Trabajadores y Asistencia</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Control de personal, asistencia diaria directa, salarios, adelantos y descuentos unificados
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleOpenNewWorker}
            className="py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Trabajador</span>
          </button>
        </div>
      </div>

      {/* Date Bar & Tabs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('lista')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'lista'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Lista y Asistencia Directa</span>
          </button>
          <button
            onClick={() => setActiveTab('resumen_mes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'resumen_mes'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-950/40'
                : 'text-neutral-400 hover:text-white bg-neutral-950 border border-neutral-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Resumen Mensual y Sueldos</span>
          </button>
        </div>

        {/* Date Selector & Fast Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-xl p-1">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 px-2">
              <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
              <input
                type="date"
                value={selectedFecha}
                onChange={(e) => setSelectedFecha(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              />
            </div>
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedFecha(getTodayStr())}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              selectedFecha === getTodayStr()
                ? 'border-purple-600 bg-purple-950/40 text-purple-300'
                : 'border-neutral-800 text-neutral-400 hover:text-white bg-neutral-950'
            }`}
          >
            Hoy
          </button>

          <button
            onClick={handleMarkAllPresent}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow transition-colors flex items-center gap-1.5"
            title="Marcar a todos presentes para la fecha seleccionada"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Todos Presentes</span>
          </button>
        </div>
      </div>

      {activeTab === 'lista' ? (
        /* Workers Table with Direct Attendance */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3">Sueldo Base</th>
                  <th className="px-4 py-3">
                    Asistencia del Día ({selectedFecha})
                  </th>
                  <th className="px-4 py-3">Anticipos</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                {data.trabajadores.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                      No hay trabajadores registrados.
                    </td>
                  </tr>
                ) : (
                  data.trabajadores.map((w) => {
                    const totalAnticipos = getAnticiposTrabajador(w.id);
                    const att = getAsistenciaStatus(w.id, selectedFecha);

                    return (
                      <tr key={w.id} className="hover:bg-neutral-800/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{w.nombre}</div>
                          <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-neutral-500" />
                            <span>{w.telefono || 'Sin teléfono'}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3 font-medium text-white">
                          <div>
                            <span>{formatCurrency(Number(w.sueldo) || 0)}</span>
                            <span className="block text-[10px] text-purple-400 capitalize font-semibold">
                              {w.frecuenciaPago === 'personalizado'
                                ? `Cada ${w.diasPagoPersonalizado || 7} días`
                                : w.frecuenciaPago || 'Mensual'} (Día {w.fechaPago || '25'})
                            </span>
                          </div>
                        </td>

                        {/* Direct Attendance Action Buttons */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleMarkDirectStatus(w, 'presente')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                att.status === 'presente'
                                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
                                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:border-emerald-800'
                              }`}
                              title="Marcar como presente"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Presente</span>
                            </button>

                            <button
                              onClick={() => handleMarkDirectStatus(w, 'tardanza')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                att.status === 'tardanza'
                                  ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-amber-400 hover:border-amber-800'
                              }`}
                              title="Marcar tardanza"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Tardanza</span>
                            </button>

                            <button
                              onClick={() => handleMarkDirectStatus(w, 'ausente')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                att.status === 'ausente'
                                  ? 'bg-red-600 text-white shadow-md shadow-red-950/50'
                                  : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-red-400 hover:border-red-800'
                              }`}
                              title="Marcar falta"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Falta</span>
                            </button>

                            {att.record && !att.record.presente && (
                              <span className="text-[10px] text-amber-400 font-semibold ml-1">
                                (-{formatCurrency(Number(att.record.montoDescuento) || 0)})
                              </span>
                            )}
                          </div>
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
                                  className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[10px] font-bold rounded-lg"
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
      ) : (
        /* Monthly Attendance and Payroll Summary */
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Resumen Acumulado del Mes Seleccionado ({parsedSel.month + 1}/{parsedSel.year})
            </h2>
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-800">
            <table className="w-full text-left text-xs text-neutral-300">
              <thead className="bg-neutral-950/80 text-neutral-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Trabajador</th>
                  <th className="px-4 py-3 text-center">Asistencias</th>
                  <th className="px-4 py-3 text-center">Tardanzas</th>
                  <th className="px-4 py-3 text-center">Faltas</th>
                  <th className="px-4 py-3">Descuentos</th>
                  <th className="px-4 py-3">Anticipos</th>
                  <th className="px-4 py-3 font-bold text-emerald-400">Sueldo Neto a Pagar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 bg-neutral-900">
                {currentMonthWorkersStats.map((item) => (
                  <tr key={item.worker.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      {item.worker.nombre}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 font-bold border border-emerald-800">
                        {item.presentes}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 font-bold border border-amber-800">
                        {item.tardanzas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-400 font-bold border border-red-800">
                        {item.faltas}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-400 font-semibold">
                      -{formatCurrency(item.totalDescuentos)}
                    </td>
                    <td className="px-4 py-3 text-amber-400 font-semibold">
                      -{formatCurrency(item.totalAnticipos)}
                    </td>
                    <td className="px-4 py-3 text-emerald-400 font-black text-sm">
                      {formatCurrency(item.sueldoNetoEstimado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Worker (Crear / Editar) */}
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
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
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
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
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
                    placeholder=""
                    className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
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
                      placeholder=""
                      className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Día / Detalle de Pago (1-31)</span>
                    </label>
                    <input
                      type="text"
                      value={fechaPago}
                      onChange={(e) => setFechaPago(e.target.value)}
                      placeholder=""
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
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
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
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
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

      {/* Modal Falta / Tardanza Detail */}
      {isAbsenceModalOpen && workerForAbsenceModal && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800 bg-neutral-900">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {absenceTipo === 'tardanza' ? (
                  <Clock className="w-5 h-5 text-amber-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span>
                  {absenceTipo === 'tardanza' ? 'Registrar Tardanza' : 'Registrar Falta'} - {workerForAbsenceModal.nombre}
                </span>
              </h3>
              <button
                onClick={() => setIsAbsenceModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5">
                  Motivo o Detalle
                </label>
                <input
                  type="text"
                  value={absenceMotivo}
                  onChange={(e) => setAbsenceMotivo(e.target.value)}
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-neutral-400 mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-red-400" />
                  <span>Monto a Descontar (S/)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={absenceDescuento}
                  onChange={(e) => setAbsenceDescuento(e.target.value)}
                  placeholder=""
                  className="w-full py-2.5 px-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white text-xs focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Se deducirá del sueldo mensual en el cálculo contable.
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-3 bg-neutral-900">
              <button
                onClick={() => setIsAbsenceModalOpen(false)}
                className="py-2 px-4 rounded-xl border border-neutral-800 text-neutral-400 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAbsenceModal}
                className="py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-950/40"
              >
                Guardar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
