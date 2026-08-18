import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Contrato, ContratoPaginatedResult, CrearContratoDto } from '../../models/contratos.model';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ContratoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlContratos;

  async create(data: CrearContratoDto): Promise<number> {
    const response = await firstValueFrom(
      this.http.post<{ id: number }>(this.baseUrl, data),
    );
    return response.id;
  }

  async update(id: number, data: Partial<CrearContratoDto>): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.baseUrl}/${id}`, data));
  }

  async setDescuento(id: number, descuentoPorcentaje: number | null): Promise<Contrato> {
    return firstValueFrom(
      this.http.patch<Contrato>(`${this.baseUrl}/${id}/descuento`, { descuento_renovacion_porcentaje: descuentoPorcentaje }),
    );
  }

  async getByIdSepultura(idSepultura: number): Promise<Contrato[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<ContratoPaginatedResult>(
          `${this.baseUrl}?idSepultura=${idSepultura}&limit=100`,
        ),
      );
      return response.data;
    } catch {
      return [];
    }
  }
}
