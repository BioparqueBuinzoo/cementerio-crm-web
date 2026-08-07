# Despliegue a producción

Este proyecto comparte servidor (`buinzoo-webs`) con `cementerio-crm-api`, `cementerio-pay-api`, `cementerio-pay-web`, `buinpass-backend`, `buinpass-frontend` y `personalServices`, y sigue el mismo patrón operativo: releases inmutables, PM2 y un runner autohospedado exclusivo para producción. Se publica bajo `crm.parquedeasis.cl`, con Apache actuando solo de gateway (reverse proxy) hacia este frontend (`/`) y hacia `cementerio-crm-api` (`/api`).

## ⚠️ Antes del primer despliegue con este pipeline

Este proyecto **ya está corriendo en producción** (desplegado hasta ahora vía Jenkins, no vía GitHub Actions). Antes de activar `deploy-production.yml` por primera vez:

1. Verificar cómo está corriendo hoy el proceso actual (`pm2 list`, `systemctl status`, o el job de Jenkins) y su nombre exacto — puede no llamarse `cementerio-crm-web`.
2. Decidir con el equipo si este pipeline **reemplaza** ese despliegue (recomendado) o convive con él — nunca deben quedar dos procesos escuchando en el puerto `4200` a la vez.
3. Si se reemplaza: detener/deshabilitar el job de Jenkins y el proceso anterior antes de correr el primer `deploy` de este workflow.
4. Confirmar con `ss -ltnp` que, al momento del corte, el puerto **4200** queda libre.

## 1. Cómo se sirve

- El build de Angular (`dist/asis/browser/`) se sirve con el paquete `serve` (`serve -s dist/asis/browser -l 4200`) gestionado por PM2 — no es un `DocumentRoot` estático de Apache. El nombre interno del proyecto Angular es `asis` (ver `angular.json` → `outputPath`), aunque el repo se llama `cementerio-crm-web`.
- `src/environments/environment.production.ts` trae `apiUrl: ''` y URLs relativas (`/api/...`), es decir, el frontend asume que la API vive en el mismo origen — correcto para el proxy Apache (`/api` → `cementerio-crm-api`). No requiere cambios.
- Apache proxya `/` hacia `127.0.0.1:4200` (este frontend) y `/api` hacia `127.0.0.1:3100` (`cementerio-crm-api`).
- El `redirectUri` de Azure AD en `environment.production.ts` está fijado a `https://crm.parquedeasis.cl` — si el dominio de producción cambia, hay que actualizar tanto ese archivo como el App Registration de Azure.

## 2. Runner autohospedado

Etiqueta exclusiva:

```text
cementerio-crm-web-production
```

Carpeta en el servidor (una carpeta y un registro por repo — no reutilizar el runner de otro proyecto):

```text
/opt/actions-runner-cementerio-crm-web/actions-runner
```

Pasos de instalación:

```bash
sudo mkdir -p /opt/actions-runner-cementerio-crm-web/actions-runner
sudo chown -R ubuntu:ubuntu /opt/actions-runner-cementerio-crm-web
cd /opt/actions-runner-cementerio-crm-web/actions-runner
curl -o actions-runner-linux-x64-2.336.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.336.0/actions-runner-linux-x64-2.336.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.336.0.tar.gz
rm actions-runner-linux-x64-2.336.0.tar.gz

./config.sh --url https://github.com/BioparqueBuinzoo/cementerio-crm-web \
  --token <TOKEN_DE_REGISTRO> \
  --name cementerio-crm-web-runner \
  --labels cementerio-crm-web-production \
  --work _work

sudo ./svc.sh install ubuntu
sudo ./svc.sh start
```

El token se genera en GitHub: repo → Settings → Actions → Runners → New self-hosted runner (pestaña **Linux**). Expira ~1 hora.

## 3. Estructura de releases

| Elemento           | Valor                                                        |
| ------------------ | ------------------------------------------------------------ |
| Aplicación PM2     | `cementerio-crm-web`                                          |
| Modo               | `fork`, 1 instancia (`serve -s dist/asis/browser -l 4200`)    |
| Releases           | `/opt/servicios/cementerio-crm-web/releases`                  |
| Enlace activo      | `/opt/servicios/cementerio-crm-web/current`                   |
| Puerto healthcheck | `4200` (`GET /`)                                              |

Preparar antes del primer despliegue:

```bash
sudo mkdir -p /opt/servicios/cementerio-crm-web/releases
sudo chown -R ubuntu:ubuntu /opt/servicios/cementerio-crm-web
sudo chmod 750 /opt/servicios/cementerio-crm-web
```

## 4. Apache (gateway compartido con `cementerio-crm-api`)

Config en `/etc/apache2/sites-available/crm.parquedeasis.cl.conf`:

```apache
<VirtualHost *:80>
    ServerName crm.parquedeasis.cl

    ProxyPreserveHost On
    ProxyPass        /api  http://127.0.0.1:3100/api
    ProxyPassReverse /api  http://127.0.0.1:3100/api
    ProxyPass        /     http://127.0.0.1:4200/
    ProxyPassReverse /     http://127.0.0.1:4200/

    ErrorLog  ${APACHE_LOG_DIR}/crm_parquedeasis_error.log
    CustomLog ${APACHE_LOG_DIR}/crm_parquedeasis_access.log combined
</VirtualHost>
```

Este vhost es el mismo que declara `cementerio-crm-api/DEPLOYMENT.md` — un único archivo de configuración cubre ambos proyectos, no crear uno duplicado. Si ya existe (del despliegue por Jenkins), solo confirmar que sigue apuntando a estos mismos puertos.

```bash
sudo a2ensite crm.parquedeasis.cl
sudo apache2ctl configtest
sudo systemctl reload apache2
```

## 5. GitHub Environment `production`

Variables:

- `DEPLOY_BASE_PATH` = `/opt/servicios/cementerio-crm-web`
- `NODE_BIN_PATH` = ruta absoluta al directorio `bin` de Node en el servidor (ej. `/home/ubuntu/.nvm/versions/node/v22.x.x/bin`)
- `SMTP_PORT`, `SMTP_SECURE` (opcionales, default `587`/`false`)

Secrets (reutilizar los mismos que los demás proyectos si aplica):

- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `DEPLOY_NOTIFICATION_TO`

Restringir el Environment a tags `v*.*.*`.

## 6. Flujo de despliegue

1. Actualizar `version` en `package.json`.
2. Mergear a `main` y esperar CI verde.
3. Crear y publicar el tag `vX.Y.Z` coincidente con `package.json`.
4. El job `build` valida el tag, corre test/build/audit y empaqueta `dist`, `ecosystem.config.cjs`, `package.json`, `package-lock.json` y `scripts`.
5. El job `deploy` (runner autohospedado) extrae la release, instala `serve` con `npm install --omit=dev`, activa la release con PM2 y valida `GET /`. Rollback automático si falla.
6. El job `notify` envía un correo de confirmación por SMTP.

## 7. Archivos de referencia

- `DEPLOYMENT.md`: este documento.
- `.github/workflows/ci.yml` / `deploy-production.yml`.
- `.github/actionlint.yaml`: etiqueta del runner.
- `ecosystem.config.cjs`: ejecución PM2 (`serve`).
- `scripts/send-deployment-email.mjs`: notificación SMTP de despliegue.
