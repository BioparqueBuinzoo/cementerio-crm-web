import { Component, inject, signal, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-login',
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Login implements OnInit {
  // CAMBIO: inject() en lugar de constructor — patrón moderno Angular 14+
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  // CAMBIO: propiedades mutables → Signals
  // En zoneless, una propiedad normal que cambia no actualiza la vista.
  // isLoading y errorMessage se modifican durante el flujo de login,
  // así que deben ser Signals para que Angular re-renderice el botón y el error.
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly authError = this.auth.error;

  // currentYear no cambia nunca → no necesita ser Signal
  readonly currentYear = new Date().getFullYear();

  // La URL de retorno viene del query param ?returnUrl=
  // que el authGuard o el interceptor añaden cuando redirigen a /login.
  // Si no hay returnUrl, volvemos a /asis por defecto.
  private redirectUrl = '/asis';

  ngOnInit(): void {
    // ActivatedRoute.snapshot.queryParams es síncrono — disponible en ngOnInit.
    // Usamos snapshot porque no necesitamos reaccionar a cambios en los params
    // (la página de login no cambia de URL mientras está activa).
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.redirectUrl = returnUrl;
    }
  }

  async login(): Promise<void> {
    // Evitar doble click — si ya está cargando, ignoramos el click
    if (this.isLoading()) return;

    try {
      this.isLoading.set(true);
      this.errorMessage.set('');

      // auth.login() llama a msalInstance.loginRedirect()
      // Esto redirige el browser a Microsoft — la página se "destruye".
      // Cuando Azure AD redirige de vuelta, APP_INITIALIZER ejecuta
      // handleRedirect() que procesa el token y llama al backend.
      // Después de eso, el authGuard redirige a redirectUrl automáticamente.
      //
      // Por eso NO hacemos router.navigate() acá — la navegación
      // post-login la maneja el guard una vez que isAuthenticated() sea true.
      await this.auth.login(this.redirectUrl);

    } catch (error) {
      // Si MSAL falla antes de redirigir (config incorrecta, popup bloqueado, etc.)
      // mostramos el error. En el caso normal de loginRedirect este catch
      // nunca se ejecuta porque el browser navega fuera antes.
      console.error('Error en login:', error);
      this.errorMessage.set('No se pudo conectar con Microsoft. Intentá de nuevo.');
      this.isLoading.set(false);
    }
  }
}
