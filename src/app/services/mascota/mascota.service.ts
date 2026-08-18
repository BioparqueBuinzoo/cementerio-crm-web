import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Mascota, MascotaPaginatedResult, CrearMascotaDto } from '../../models/mascotas.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MascotaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlMascotas;
  private readonly _total = signal<number>(0);
  private readonly _page = signal<number>(1);
  private readonly _totalPages = signal<number>(0);

  private readonly _mascotas = signal<Mascota[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly mascotas = this._mascotas.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();

  async getAll(
    page: number = 1, limit: number = 20, idSepultura?: number, nombre?: string, especie?: string, sexo?: string, estado?: string
  ): Promise<void> {
    try {
      this._loading.set(true);
      this._error.set(null);
      let url = `${this.baseUrl}?page=${page}&limit=${limit}`;
      if (idSepultura != null) url += `&idSepultura=${idSepultura}`;
      if (nombre) url += `&nombre=${encodeURIComponent(nombre)}`;
      if (especie) url += `&especie=${encodeURIComponent(especie)}`;
      if (sexo) url += `&sexo=${encodeURIComponent(sexo)}`;
      if (estado) url += `&estado=${encodeURIComponent(estado)}`;
      const response = await firstValueFrom(
        this.http.get<MascotaPaginatedResult>(url),
      );
      this._mascotas.set(response.data);
      this._total.set(response.total);
      this._page.set(response.page);
      this._totalPages.set(response.totalPages);
    } catch {
      this._error.set('Error al obtener las mascotas');
    } finally {
      this._loading.set(false);
    }
  }

  async getById(id: number): Promise<Mascota | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<Mascota>(`${this.baseUrl}/${id}`),
      );
      return response;
    } catch {
      return null;
    }
  }
  async getByIdSepultura(idSepultura: number): Promise<Mascota[] | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<Mascota[]>(`${this.baseUrl}/sepultura/${idSepultura}`),
      );
      return response;
    } catch {
      return null;
    }
  }

  async create(data: CrearMascotaDto): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ id: number }>(this.baseUrl, data),
    );
    return response.id;
  }

  async update(id: number, data: Partial<Omit<CrearMascotaDto, 'id_sepultura'>>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.baseUrl}/${id}`, data));
  }
}
