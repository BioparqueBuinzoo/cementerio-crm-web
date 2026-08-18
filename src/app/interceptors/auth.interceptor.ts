import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

// URLs que no deben disparar redirección a /login si reciben 401.
// - /api/auth/login: el 401 significa credenciales inválidas, no sesión expirada.
// - /api/auth/me:    durante el bootstrap, un 401 es esperado (no hay sesión).
//                   AuthService lo maneja silenciosamente.
const AUTH_URLS_EXCLUDED_FROM_REDIRECT = ['/api/auth/login', '/api/auth/me', '/api/auth/logout'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Clonar la request añadiendo withCredentials: true.
  // Esto le indica al browser que incluya las cookies (incluida la Cookie
  // HttpOnly de sesión) en requests cross-origin.
  // Sin esto, el browser omite las cookies en requests a otros dominios/puertos.
  const reqWithCredentials = req.clone({ withCredentials: true });

  return next(reqWithCredentials).pipe(
    catchError(error => {
      const is401 = error.status === 401;
      const isExcluded = AUTH_URLS_EXCLUDED_FROM_REDIRECT.some(url =>
        req.url.includes(url)
      );

      if (is401 && !isExcluded && !environment.allowUnauthenticatedPreview) {
        // La sesión expiró o la cookie es inválida.
        // Redirigimos a login para que el usuario se autentique nuevamente.
        router.navigate(['/login'], {
          // Guardamos la URL actual para redirigir de vuelta después del login.
          queryParams: { returnUrl: router.url },
        });
      }

      // Siempre re-lanzamos el error para que los llamadores puedan manejarlo
      // si lo necesitan (mostrar un mensaje, etc.).
      return throwError(() => error);
    })
  );
};
