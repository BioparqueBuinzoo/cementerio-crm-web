export interface Contrato {
  id: number;
  id_sepultura: number;
  fecha_pago: string;
  fecha_vencimiento: string;
  valor_renovacion: number;
  forma_pago: string;
  numero_comprobante: string;
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
