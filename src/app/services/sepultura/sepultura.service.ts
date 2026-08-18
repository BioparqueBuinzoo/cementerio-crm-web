import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Sepultura, SepulturaPaginatedResult, CrearSepulturaDto } from '../../models/sepulturas.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SepulturaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlSepulturas;
  private readonly _total = signal<number>(0);
  private readonly _page = signal<number>(1);
  private readonly _totalPages = signal<number>(0);

  private readonly _sepulturas = signal<Sepultura[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly sepulturas = this._sepulturas.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();

  private requestToken = 0;

  async getAll(
    page: number = 1, limit: number = 20, idCliente?: number, rut?: string, numeroFicha?: string, estado?: string, tipo?: string
  ): Promise<void> {
    const token = ++this.requestToken;
    try {
      this._loading.set(true);
      this._error.set(null);
      let url = `${this.baseUrl}?page=${page}&limit=${limit}`;
      if (idCliente != null) url += `&idCliente=${idCliente}`;
      if (rut) url += `&rut=${encodeURIComponent(rut)}`;
      if (numeroFicha) url += `&numero_ficha=${encodeURIComponent(numeroFicha)}`;
      if (estado) url += `&estado=${encodeURIComponent(estado)}`;
      if (tipo) url += `&tipo=${encodeURIComponent(tipo)}`;
      const response = await firstValueFrom(
        this.http.get<SepulturaPaginatedResult>(url),
      );
      if (token !== this.requestToken) return; // una solicitud más nueva ya reemplazó a esta
      this._sepulturas.set(response.data);
      this._total.set(response.total);
      this._page.set(response.page);
      this._totalPages.set(response.totalPages);
    } catch {
      if (token !== this.requestToken) return;
      this._error.set('Error al obtener las sepulturas');
    } finally {
      if (token === this.requestToken) this._loading.set(false);
    }
  }

  async findByNumeroFicha(numeroFicha: string): Promise<Sepultura[]> {
    const response = await firstValueFrom(
      this.http.get<{ data: Sepultura[] }>(`${this.baseUrl}?page=1&limit=10&numero_ficha=${encodeURIComponent(numeroFicha)}`),
    );
    return response.data;
  }

  async getById(id: number): Promise<Sepultura | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<Sepultura>(`${this.baseUrl}/${id}`),
      );
      return response;
    } catch {
      return null;
    }
  }

  async getByClienteId(idCliente: number): Promise<Sepultura[] | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<Sepultura[]>(`${this.baseUrl}/cliente/${idCliente}`),
      );
      return response;
    } catch {
      return null;
    }
  }

  async getNextFicha(): Promise<number> {
    const res = await firstValueFrom(
      this.http.get<{ next_ficha: number }>(`${this.baseUrl}/next-ficha`),
    );
    return res.next_ficha;
  }

  async create(data: CrearSepulturaDto): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ id: number }>(this.baseUrl, data),
    );
    return response.id;
  }

  async update(id: number, data: Partial<CrearSepulturaDto>): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.baseUrl}/${id}`, data));
  }
}
