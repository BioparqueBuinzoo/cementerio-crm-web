import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface ObservacionCliente {
  id: number;
  id_cliente: number;
  texto: string;
  usuario: string;
  fecha_creacion: string;
}

@Injectable({ providedIn: 'root' })
export class ObservacionClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrlObservacionesClientes;

  getByClienteId(idCliente: number): Promise<ObservacionCliente[]> {
    return firstValueFrom(
      this.http.get<ObservacionCliente[]>(`${this.base}/${idCliente}/observaciones`)
    );
  }

  create(idCliente: number, texto: string, usuario: string): Promise<{ id: number }> {
    return firstValueFrom(
      this.http.post<{ id: number }>(`${this.base}/${idCliente}/observaciones`, { texto, usuario })
    );
  }

  remove(idCliente: number, id: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.base}/${idCliente}/observaciones/${id}`)
    );
  }
}
