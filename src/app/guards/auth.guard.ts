import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth/auth.service';

export const authGuard: CanActivateFn = () => {
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
