import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom } from 'rxjs';
import { Cliente, PaginatedResult } from '../../models/clientes.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlClientes;
  private readonly _total = signal<number>(0);
  private readonly _page = signal<number>(1);
  private readonly _totalPages = signal<number>(0);

  private readonly _clientes = signal<Cliente[]>([]);
  private readonly _loading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  readonly clientes = this._clientes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly total = this._total.asReadonly();
  readonly page = this._page.asReadonly();
  readonly totalPages = this._totalPages.asReadonly();

  async getAllClientes(page: number = 1, limit: number = 20, rut?: string, nombre?: string): Promise<void> {
    try {
      this._loading.set(true);
      let url = `${this.baseUrl}?page=${page}&limit=${limit}`;
      if (rut)    url += `&rut=${encodeURIComponent(rut)}`;
      if (nombre) url += `&nombre=${encodeURIComponent(nombre)}`;
      const response = await firstValueFrom(
        this.http.get<PaginatedResult<Cliente>>(url),
      );
      this._clientes.set(response.data);
      this._total.set(response.total);
      this._page.set(response.page);
      this._totalPages.set(response.totalPages);
    } catch {
      this._error.set('Error al obtener los clientes');
    } finally {
      this._loading.set(false);
    }
  }

  async getClienteById(id: number): Promise<Cliente | null> {
    try {
      this._loading.set(true);
      const response = await firstValueFrom(
        this.http.get<Cliente>(`${this.baseUrl}/${id}`)
      );
      return response;
    } catch {
      this._error.set('Error al obtener el cliente');
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async create(data: Partial<Cliente>): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ id: number }>(this.baseUrl, data)
    );
    return response.id;
  }

  async update(id: number, data: Partial<Cliente>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.baseUrl}/${id}`, data));
  }

  exportar(): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/export`, { responseType: 'blob' });
  }

}
