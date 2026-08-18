# Cementerio CRM Web

Frontend del panel administrativo (CRM) de **Parque de Asís**, construido con Angular (standalone components, signals, sin Zone.js). Consume la API de [`cementerio-crm-api`](https://github.com/BioparqueBuinzoo/cementerio-crm-api).

Producción: `https://crm.parquedeasis.cl` (ver [DEPLOYMENT.md](./DEPLOYMENT.md)).

## Arquitectura

```
src/app/
├── app.routes.ts              Rutas, todas bajo /asis excepto /login
├── services/                  Un servicio HTTP por dominio (Cliente, Contrato, Sepultura, Auth…)
├── lib/                       reicon.ts (web component de íconos SVG), renewal.ts (cálculo de renovación)
└── pages/
    ├── login/                 Login vía Microsoft Entra (MSAL) + intercambio con el backend
    ├── inicio/                 Dashboard
    ├── clientes/                Listado + ficha de cliente (contratos, mascotas, sepulturas, renovación)
    ├── sepulturas/, mascotas/    Listados dedicados
    ├── contratos-*/              Vistas de contratos (activos, vencidos, por vencer, online, vencimientos)
    ├── configuracion/            Landing de Configuración
    ├── configuracion-correo/     Estado SMTP, vista previa de correo, notificaciones automáticas
    └── configuracion-usuarios/   Gestión de usuarios y roles (solo admin)
```

### Autenticación

Login vía Microsoft Entra ID (MSAL), sin backend propio de identidad — el token de Entra se intercambia con `cementerio-crm-api`, que a su vez delega en `personalServices` (IAM). Ver `docs/AUTENTICACION-IAM.md` en `cementerio-crm-api` para el flujo completo.

`environment.allowUnauthenticatedPreview` es un bypass **solo de desarrollo** para previsualizar pantallas sin login real — debe estar en `false` en `environment.production.ts`.

### Cálculo de renovación

`src/app/lib/renewal.ts` calcula el monto de la próxima renovación (recargo del 6% + descuento especial opcional + redondeo legal para pagos en efectivo). La misma fórmula está replicada en `cementerio-crm-api` y `cementerio-pay-api` — no hay un paquete compartido entre los tres repos, así que un cambio en la fórmula de negocio debe aplicarse en los tres a la vez. Los tres comparten los mismos casos de prueba de referencia (ver `renewal.spec.ts`).

## Instalación

```bash
npm install
```

## Configuración

`src/environments/environment.ts` (desarrollo) apunta a `http://localhost:3100`. `environment.production.ts` usa rutas relativas (`/api/...`), asumiendo que Apache hace de reverse proxy hacia `cementerio-crm-api` en el mismo dominio.

## Desarrollo

```bash
npm start
```

Queda disponible en `http://localhost:4200`.

## Scripts

| Script | Descripción |
| --- | --- |
| `npm start` | `ng serve`, recarga en caliente |
| `npm run build` | Build de producción a `dist/asis` |
| `npm test` | Tests unitarios (Vitest vía Angular) |
| `npm run watch` | Build en modo desarrollo con watch |

## Producción

El despliegue real a `crm.parquedeasis.cl` se hace vía GitHub Actions (tags `vX.Y.Z`), con releases inmutables servidas como estáticos detrás de Apache. Ver **[DEPLOYMENT.md](./DEPLOYMENT.md)** para la infraestructura completa.
