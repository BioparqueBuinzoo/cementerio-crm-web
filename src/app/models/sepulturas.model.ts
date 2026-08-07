import type { PaginatedResult } from './clientes.model';

export interface Sepultura {
  id: number;
  id_cliente: number;
  rut_cliente?: string;
  numero_ficha: string;
  tipo: string;
  ubicacion_vieja: string;
  ubicacion_nueva: string;
  estado: string;
  encargado?: string;
  observaciones: string;
  fecha_creacion: string;
  eliminado: boolean;
}

export interface CrearSepulturaDto {
  id_cliente: number;
  numero_ficha: string;
  tipo: string;
  ubicacion_vieja: string;
  ubicacion_nueva: string;
  estado: string;
  encargado?: string;
  observaciones?: string;
}

export type SepulturaPaginatedResult = PaginatedResult<Sepultura>;
