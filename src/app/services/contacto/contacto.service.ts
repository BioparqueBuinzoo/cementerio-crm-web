import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Cliente } from '../../models/clientes.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContactoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlClientes;

  getByClienteId(idCliente: number): Promise<Cliente[]> {
    return firstValueFrom(
      this.http.get<Cliente[]>(`${this.baseUrl}/${idCliente}/contactos`)
    );
  }

  add(idCliente: number, idContacto: number): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.baseUrl}/${idCliente}/contactos`, { id_contacto: idContacto })
    );
  }

  remove(idCliente: number, idContacto: number): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.baseUrl}/${idCliente}/contactos/${idContacto}`)
    );
  }
}
