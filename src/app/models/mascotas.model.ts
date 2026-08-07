import type { PaginatedResult } from './clientes.model';

export interface Mascota {
  id: number;
  id_sepultura: number;
  id_cliente?: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  fecha_nacimiento: string | null;
  fecha_muerte: string;
  causa_muerte: string;
  fecha_sepultacion: string;
  estado: string;
  observaciones: string;
  encargado: string;
  fecha_creacion: string;
  eliminado: boolean;
}

export interface CrearMascotaDto {
  id_sepultura: number;
  nombre: string;
  especie: string;
  raza: string;
  sexo: string;
  fecha_nacimiento?: string | null;
  fecha_muerte: string;
  causa_muerte: string;
  fecha_sepultacion: string;
  estado: string;
  observaciones?: string;
  encargado: string;
}

export type MascotaPaginatedResult = PaginatedResult<Mascota>;
