import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { AppAccessStatus, AsisRole, AsisUser } from '../../models/asis-users.model';

@Injectable({ providedIn: 'root' })
export class AsisUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrlAsisUsers;

  getAll(): Promise<AsisUser[]> {
    return firstValueFrom(this.http.get<AsisUser[]>(this.base));
  }

  getRoles(): Promise<AsisRole[]> {
    return firstValueFrom(this.http.get<AsisRole[]>(`${this.base}/roles`));
  }

  updateUser(id: number, patch: { status?: AppAccessStatus; roles?: string[] }): Promise<AsisUser> {
    return firstValueFrom(this.http.patch<AsisUser>(`${this.base}/${id}`, patch));
  }
}
