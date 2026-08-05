export interface Trabajo {
  id: string;
  clienteId: string;
  vehiculo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  estado: 'pendiente' | 'en progreso' | 'completado';
  costo: number;
  trabajadorId: string;
  materialesUsados?: string;
}

export interface Trabajador {
  id: string;
  nombre: string;
  telefono: string;
  sueldo: number;
  fechaPago: string; // e.g. "25"
}

export interface Material {
  id: string;
  nombre: string;
  stock: number;
  precio: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  vehiculo: string;
  placa: string;
}

export interface Presupuesto {
  id: string;
  descripcion: string;
  monto: number;
  fechaLimite: string; // YYYY-MM-DD
  estado: 'pendiente' | 'completado';
}

export interface Egreso {
  id: string;
  descripcion: string;
  monto: number;
  metodoPago: 'efectivo' | 'yape' | 'otro';
  fecha: string; // YYYY-MM-DD
}

export interface Asistencia {
  id: string;
  trabajadorId: string;
  fecha: string; // YYYY-MM-DD
  presente: boolean;
}

export interface Anticipo {
  id: string;
  trabajadorId: string;
  monto: number;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
}

export interface AppData {
  trabajos: Trabajo[];
  trabajadores: Trabajador[];
  materiales: Material[];
  clientes: Cliente[];
  presupuestos: Presupuesto[];
  egresos: Egreso[];
  asistencias: Asistencia[];
  anticipos: Anticipo[];
}
