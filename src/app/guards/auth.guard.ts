import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';
import { environment } from '../../environments/environment';

export const authGuard: CanActivateFn = () => {
  if (environment.allowUnauthenticatedPreview) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // No autenticado: redirigir a login guardando la URL de destino.
  // Si router.url ya es /login (p.ej. tras un intento de login fallido),
  // no lo anidamos como returnUrl — eso crea un bucle que nunca vuelve a /asis.
  const destination = router.url.startsWith('/login') ? '/asis' : router.url;
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: destination },
  });
};
