export interface MaterialUsadoItem {
  materialId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Trabajo {
  id: string;
  clienteId?: string;
  clienteNombre?: string; // Para clientes no registrados en el sistema
  vehiculo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  estado: 'pendiente' | 'en progreso' | 'completado';
  costo: number;
  trabajadorId: string;
  materialesUsados?: string;
  materialesDetalle?: MaterialUsadoItem[];
}

export interface Trabajador {
  id: string;
  nombre: string;
  telefono: string;
  sueldo: number;
  frecuenciaPago?: 'quincenal' | 'mensual' | 'personalizado';
  diasPagoPersonalizado?: number; // días para frecuencia personalizada
  fechaPago: string; // p. ej. "15 y 30", "Día 25", "Cada 10 días"
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
  categoria?: string;
  simular?: boolean;
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
  descripcionFalta?: string;
  montoDescuento?: number;
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
