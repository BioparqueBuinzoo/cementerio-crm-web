export interface Contrato {
  id: number;
  id_sepultura: number;
  fecha_pago: string;
  fecha_vencimiento: string;
  valor_renovacion: number;
  descuento_renovacion_porcentaje: number | null;
  forma_pago: string;
  numero_comprobante: string;
  monto_pagado_real: number | null;
  id_receptor: number;
  id_pagador: number;
  fecha_creacion: string;
  eliminado: boolean;
}

export interface CrearContratoDto {
  id_sepultura: number;
  fecha_pago: string;
  fecha_vencimiento: string;
  valor_renovacion: number;
  forma_pago: string;
  numero_comprobante: string;
  id_receptor: number;
  id_pagador: number;
}

export interface ContratoPaginatedResult {
  data: Contrato[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CalcularRenovacionItem {
  valorRenovacion: number;
  descuentoPorcentaje: number | null;
  formaPago: string;
  fechaVencimiento: string;
}

export interface RenovacionCalculada {
  periodos: number;
  /** Monto compuesto de cada período (largo = periodos), antes de descuento. */
  detalle: number[];
  subtotal: number;
  recargo: number;
  total: number;
  fechaVencimientoNueva: string;
}
