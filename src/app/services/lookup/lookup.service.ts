import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface FormaPago  { id: number; nombre: string; }
export interface Usuario    { id: number; nombre: string; apellido1: string; apellido2: string; }
export interface Encargado  { id: number; nombre: string; }

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);

  getFormasPago(): Promise<FormaPago[]> {
    return firstValueFrom(this.http.get<FormaPago[]>(environment.apiUrlFormasPago));
  }

  getUsuarios(): Promise<Usuario[]> {
    return firstValueFrom(this.http.get<Usuario[]>(environment.apiUrlUsuarios));
  }

  getEncargados(): Promise<Encargado[]> {
    return firstValueFrom(this.http.get<Encargado[]>(environment.apiUrlEncargados));
  }
}
