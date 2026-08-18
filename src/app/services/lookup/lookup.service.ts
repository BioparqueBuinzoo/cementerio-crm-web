import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface FormaPago  { id: number; nombre: string; }
export interface Encargado  { id: number; nombre: string; }

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  getFormasPago(): Promise<FormaPago[]> {
    return firstValueFrom(this.http.get<FormaPago[]>(environment.apiUrlFormasPago));
  }

  getEncargados(): Promise<Encargado[]> {
    return firstValueFrom(this.http.get<Encargado[]>(environment.apiUrlEncargados));
  }
}
