/* global console, process */

import nodemailer from 'nodemailer';
import path from 'node:path';

const requiredKeys = [
  'SMTP_HOST',
  'SMTP_FROM',
  'DEPLOY_NOTIFICATION_TO',
  'DEPLOY_VERSION',
  'DEPLOY_SHA',
  'DEPLOY_RUN_URL',
];

for (const key of requiredKeys) {
  if (!process.env[key]?.trim()) {
    throw new Error(`Falta configurar ${key}`);
  }
}

const port = Number(process.env.SMTP_PORT ?? '587');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('SMTP_PORT debe ser un puerto válido');
}

const secureValue = (process.env.SMTP_SECURE ?? 'false').toLowerCase();
if (!['true', 'false'].includes(secureValue)) {
  throw new Error('SMTP_SECURE debe ser true o false');
}

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const version = process.env.DEPLOY_VERSION;
const sha = process.env.DEPLOY_SHA;
const runUrl = process.env.DEPLOY_RUN_URL;
const actor = process.env.DEPLOY_ACTOR ?? 'GitHub Actions';
const commitUrl = process.env.DEPLOY_COMMIT_URL ?? runUrl;
const shortSha = sha.slice(0, 7);
const deployedAt = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
}).format(new Date());

const safe = {
  actor: escapeHtml(actor),
  commitUrl: escapeHtml(commitUrl),
  deployedAt: escapeHtml(deployedAt),
  runUrl: escapeHtml(runUrl),
  shortSha: escapeHtml(shortSha),
  version: escapeHtml(version),
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: secureValue === 'true',
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
    : undefined,
});

await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: process.env.DEPLOY_NOTIFICATION_TO,
  subject: `✅ Producción | cementerio-crm-web v${version} desplegado`,
  text: [
    `cementerio-crm-web ${version} fue desplegado correctamente en producción.`,
    `Commit: ${shortSha}`,
    `Ejecutado por: ${actor}`,
    `Fecha: ${deployedAt} (America/Santiago)`,
    'Aplicación: operativa',
    `Ejecución: ${runUrl}`,
  ].join('\n'),
  html: `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;padding:0;background:#f2f5f3;color:#25332c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f5f3;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe7e2;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(23,48,36,.08);">
                <tr>
                  <td style="padding:22px 26px;background:#1f2925;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td valign="middle">
                          <img src="cid:buinzoo-logo" width="190" alt="Bioparque Buinzoo" style="display:block;width:190px;max-width:100%;height:auto;border:0;">
                        </td>
                        <td align="right" valign="middle">
                          <img src="cid:github-logo" width="92" alt="GitHub" style="display:block;width:92px;max-width:100%;height:auto;border:0;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:36px 28px 18px;">
                    <div style="display:inline-block;padding:7px 13px;border-radius:999px;background:#edf7dd;color:#456519;font-size:12px;font-weight:700;letter-spacing:.08em;">PRODUCCIÓN</div>
                    <div style="margin:20px auto 14px;width:54px;height:54px;line-height:54px;border-radius:50%;background:#e7f5ed;color:#18794e;font-size:30px;font-weight:700;">✓</div>
                    <h1 style="margin:0;color:#1f2925;font-size:27px;line-height:1.25;">Despliegue exitoso</h1>
                    <p style="margin:10px 0 0;color:#66756d;font-size:15px;line-height:1.6;">cementerio-crm-web fue actualizado correctamente y superó su verificación de salud.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 28px 24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f9f8;border:1px solid #e5ebe7;border-radius:12px;">
                      <tr><td style="padding:13px 18px;color:#69776f;font-size:14px;border-bottom:1px solid #e5ebe7;">Servicio</td><td align="right" style="padding:13px 18px;font-size:14px;font-weight:700;border-bottom:1px solid #e5ebe7;">cementerio-crm-web</td></tr>
                      <tr><td style="padding:13px 18px;color:#69776f;font-size:14px;border-bottom:1px solid #e5ebe7;">Versión</td><td align="right" style="padding:13px 18px;font-size:14px;font-weight:700;border-bottom:1px solid #e5ebe7;">v${safe.version}</td></tr>
                      <tr><td style="padding:13px 18px;color:#69776f;font-size:14px;border-bottom:1px solid #e5ebe7;">Commit</td><td align="right" style="padding:13px 18px;font-size:14px;font-weight:700;border-bottom:1px solid #e5ebe7;"><a href="${safe.commitUrl}" style="color:#24292f;text-decoration:underline;">${safe.shortSha}</a></td></tr>
                      <tr><td style="padding:13px 18px;color:#69776f;font-size:14px;border-bottom:1px solid #e5ebe7;">Ejecutado por</td><td align="right" style="padding:13px 18px;font-size:14px;font-weight:700;border-bottom:1px solid #e5ebe7;">${safe.actor}</td></tr>
                      <tr><td style="padding:13px 18px;color:#69776f;font-size:14px;">Fecha</td><td align="right" style="padding:13px 18px;font-size:14px;font-weight:700;">${safe.deployedAt}</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 26px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr><td style="padding:8px 0;color:#25332c;font-size:14px;"><span style="color:#18794e;font-weight:700;">✓</span>&nbsp; Aplicación operativa</td></tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 28px 36px;">
                    <a href="${safe.runUrl}" style="display:inline-block;padding:13px 22px;border-radius:9px;background:#24292f;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">Ver ejecución en GitHub</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:20px 28px;background:#f7f9f8;color:#718078;font-size:12px;line-height:1.6;">
                    Informática Bioparque Buinzoo TI<br>Mensaje automático; no responder.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
  attachments: [
    {
      filename: 'buinzoo-logo.png',
      path: path.join(import.meta.dirname, 'assets', 'buinzoo-logo.png'),
      cid: 'buinzoo-logo',
    },
    {
      filename: 'github-lockup-white.png',
      path: path.join(import.meta.dirname, 'assets', 'github-lockup-white.png'),
      cid: 'github-logo',
    },
  ],
});

console.log(`Notificación de despliegue ${version} enviada correctamente`);
