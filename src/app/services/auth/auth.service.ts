import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PublicClientApplication } from '@azure/msal-browser';
import { environment } from '../../../environments/environment';
import { UserInfo } from '../user/model/user.model';
import { LoginResponse, MeResponse } from './model';
import { Router } from '@angular/router';


@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly returnUrlKey = 'crm-return-url';
  private readonly http = inject(HttpClient);
  private readonly msalInstance = new PublicClientApplication({
    auth: {
      clientId: environment.azureAd.clientId,
      authority: environment.azureAd.authority,
      redirectUri: environment.azureAd.redirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
    },
  });

  private readonly _currentUser = signal<UserInfo | null>(null);
  private readonly router = inject(Router);
  private readonly _loading = signal<boolean>(true);
  private readonly _error = signal<string | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  readonly isAdmin = computed(() =>
    this._currentUser()?.roles?.includes('Admin') ?? false
  );
  readonly userRoles = computed(() => this._currentUser()?.roles ?? []);

  readonly userName = computed(() => this._currentUser()?.name ?? '');

  private msalInitialized = false;
  private _redirectPromise: Promise<void> | null = null;

  private async ensureMsalInitialized(): Promise<void> {
    if (!this.msalInitialized) {
      await this.msalInstance.initialize();
      this.msalInitialized = true;
    }
  }

  handleRedirect(): Promise<void> {
    if (!this._redirectPromise) {
      this._redirectPromise = this._doHandleRedirect();
    }
    return this._redirectPromise;
  }

  private async _doHandleRedirect(): Promise<void> {
    try {
      this._loading.set(true);
      this._error.set(null);

      await this.ensureMsalInitialized();

      const response = await this.msalInstance.handleRedirectPromise();

      if (response?.idToken) {
        await this._loginWithBackend(response.idToken);
      } else {
        await this.loadUserInfo();
      }
    } catch (error) {
      console.error('Error en handleRedirect:', error);
      if (error instanceof HttpErrorResponse && error.status === 403) {
        this._error.set('SIN_ROL');
      } else {
        this._error.set('Error al inicializar la sesión');
      }
      this._currentUser.set(null);
    } finally {
      this._loading.set(false);
    }
  }
  private async _loginWithBackend(idToken: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, {
        idToken,
      })
    );
    this._currentUser.set(response.data);
    const requested = sessionStorage.getItem(this.returnUrlKey) ?? '/asis';
    sessionStorage.removeItem(this.returnUrlKey);
    const safeReturnUrl = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/asis';
    await this.router.navigateByUrl(safeReturnUrl);
  }

  async loadUserInfo(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<MeResponse>(`${environment.apiUrl}/api/auth/me`)
      );
      this._currentUser.set(response.data);
    } catch {
      // 401 u otro error: no hay sesión activa. El interceptor redirigirá.
      this._currentUser.set(null);
    }
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(returnUrl = '/asis'): Promise<void> {
    await this.ensureMsalInitialized();
    this._error.set(null);

    sessionStorage.setItem(this.returnUrlKey, returnUrl);
    await this.msalInstance.loginRedirect({
      scopes: ['openid', 'profile', 'email'],
      prompt: 'select_account',
    });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await this.ensureMsalInitialized();

    try {
      // Le avisamos al backend que invalide la cookie de sesión.
      // El backend debe responder con Set-Cookie que expira la cookie.
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/api/auth/logout`, {})
      );
    } catch (error) {
      // Si el backend falla, igual limpiamos el estado local.
      console.error('Error en logout del backend:', error);
    }

    // Limpiamos el estado local inmediatamente.
    this._currentUser.set(null);

    // Redirigimos a Microsoft para cerrar también la sesión SSO de Azure AD.
    // Si no querés cerrar la sesión de Microsoft (solo la tuya), usá
    // this.msalInstance.clearCache() en su lugar.
    await this.msalInstance.logoutRedirect();
  }

  // ── Helpers de roles ──────────────────────────────────────────────────────
  //
  // Estos son métodos (no computed) porque reciben parámetros.
  // computed() no acepta argumentos — para lógica parametrizada usamos métodos.
  // Internamente leen el signal, así que siguen siendo reactivos en effects/computed externos.

  hasRole(role: string): boolean {
    return this._currentUser()?.roles?.includes(role) ?? false;
  }

  hasAnyRole(roles: string[]): boolean {
    const userRoles = this._currentUser()?.roles;
    if (!userRoles) return false;
    return roles.some(role => userRoles.includes(role));
  }
}
