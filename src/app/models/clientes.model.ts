export interface Cliente {
  id: number;
  rut: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  telefono: string;
  celular: string;
  email: string;
  fecha_creacion: string;
  eliminado: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResult<T = Cliente> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}