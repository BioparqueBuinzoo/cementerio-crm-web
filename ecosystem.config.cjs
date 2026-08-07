/* global __dirname, module */

// Sirve el build estático (dist/) generado por `ng build`. No requiere un
// servidor Node propio: usa el paquete `serve` en modo SPA (fallback a
// index.html para las rutas de Angular Router) en el puerto 4200.
module.exports = {
  apps: [
    {
      name: 'cementerio-crm-web',
      script: './node_modules/serve/build/main.js',
      args: '-s dist/asis/browser -l 4200',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
