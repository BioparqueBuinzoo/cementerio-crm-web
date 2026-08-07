import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface TipoSepultura {
  id: number;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class TipoSepulturaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlTiposSepulturas;

  async getAll(): Promise<TipoSepultura[]> {
    return firstValueFrom(this.http.get<TipoSepultura[]>(this.baseUrl));
  }
}
