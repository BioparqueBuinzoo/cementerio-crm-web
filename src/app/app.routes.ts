import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  {
    path: 'asis',
    loadComponent: () => import('./pages/asis/asis').then(m => m.Asis),
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./pages/inicio/inicio').then(m => m.Inicio) },
      {
        path: 'consultas',
        loadComponent: () => import('./pages/consultas/consultas').then(m => m.Consultas),
        children: [
          { path: '', redirectTo: '/asis/contratos-por-vencer', pathMatch: 'full' },
          { path: 'sepulturas-por-vencer', redirectTo: '/asis/contratos-por-vencer' },
          { path: 'sepulturas-recien-vencidas', redirectTo: '/asis/contratos-vencidos' },
          { path: 'sepulturas-vencidas', redirectTo: '/asis/contratos-vencidos' },
          { path: 'clientes-sin-rut', redirectTo: '/asis/clientes' },
          { path: 'clientes-rut-duplicados', redirectTo: '/asis/clientes' },
        ],
      },
      { path: 'clientes',
        canActivate: [authGuard],
        children: [
          { path: '', loadComponent: () => import('./pages/clientes/clientes').then(m => m.Clientes) },
          { path: ':id', loadComponent: () => import('./pages/clientes/cliente-detalle/cliente-detalle').then(m => m.ClienteDetalle) },
        ],
      },
      { path: 'sepulturas', canActivate: [authGuard], loadComponent: () => import('./pages/sepulturas/sepulturas').then(m => m.Sepulturas) },
      { path: 'mascotas', canActivate: [authGuard], loadComponent: () => import('./pages/mascotas/mascotas').then(m => m.Mascotas) },
      {
        path: 'contratos-por-vencer',
        canActivate: [authGuard],
        data: { notificationType: 'por-vencer' },
        loadComponent: () => import('./pages/contratos-vencimientos/contratos-vencimientos').then(m => m.ContratosVencimientos),
      },
      {
        path: 'contratos-vencidos',
        canActivate: [authGuard],
        data: { notificationType: 'vencidas' },
        loadComponent: () => import('./pages/contratos-vencimientos/contratos-vencimientos').then(m => m.ContratosVencimientos),
      },
      {
        path: 'contratos-activos',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/contratos-activos/contratos-activos').then(m => m.ContratosActivos),
      },
      {
        path: 'contratos-online',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/contratos-online/contratos-online').then(m => m.ContratosOnline),
      },
      {
        path: 'configuracion',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/configuracion/configuracion').then(m => m.Configuracion),
      },
    ],
  },
  { path: '', redirectTo: 'asis', pathMatch: 'full' },
  { path: '**', redirectTo: 'asis' },
];
