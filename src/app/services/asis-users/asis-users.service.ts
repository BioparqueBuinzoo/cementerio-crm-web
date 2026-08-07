import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { AsisUser } from '../../models/asis-users.model';

@Injectable({ providedIn: 'root' })
export class AsisUsersService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrlAsisUsers;

  getAll(): Promise<AsisUser[]> {
    return firstValueFrom(this.http.get<AsisUser[]>(this.base));
  }
}
