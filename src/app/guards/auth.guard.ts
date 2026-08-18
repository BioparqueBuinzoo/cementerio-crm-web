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
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: router.url },
  });
};
