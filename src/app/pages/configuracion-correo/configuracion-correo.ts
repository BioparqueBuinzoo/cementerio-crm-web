import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { DashboardStatsService, NotificationBatch, TestNotificationType } from '../../services/dashboard-stats/dashboard-stats.service';

@Component({
  selector: 'app-configuracion-correo',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './configuracion-correo.html',
  styleUrl: './configuracion-correo.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ConfiguracionCorreo implements OnInit {
  private readonly statsService = inject(DashboardStatsService);
  private readonly sanitizer = inject(DomSanitizer);

  // Estado SMTP
  readonly loadingCorreo = signal(false);
  readonly smtpConfigured = signal(false);
  readonly cooldownHours = signal<number | null>(null);
  readonly correoError = signal('');

  // Vista previa del correo
  previewType: TestNotificationType = 'por-vencer';
  readonly previewLoading = signal(false);
  readonly previewHtml = signal<SafeHtml | null>(null);
  readonly previewError = signal('');

  // Última notificación masiva
  readonly latestBatchLoading = signal(false);
  readonly latestBatch = signal<NotificationBatch | null>(null);
  readonly latestBatchError = signal('');

  // Envío de correo de prueba (usa el mismo tipo que se está previsualizando)
  testEmailTo = '';
  readonly testEmailSending = signal(false);
  readonly testEmailResult = signal('');
  readonly testEmailError = signal('');

  // Notificaciones automáticas
  readonly autoNotifLoading = signal(false);
  readonly autoNotifSaving = signal(false);
  readonly autoNotif30Dias = signal(false);
  readonly autoNotifVenceHoy = signal(false);
  readonly autoNotifVencidoRecordatorio = signal(false);
  readonly autoNotifSendTime = signal('09:00');
  readonly autoNotifLastRun = signal<string | null>(null);
  readonly autoNotifError = signal('');

  ngOnInit(): void {
    this.cargarEstadoCorreo();
    this.cargarPreview();
    this.cargarUltimoLote();
    this.cargarAutoNotificaciones();
  }

  private cargarAutoNotificaciones(): void {
    this.autoNotifLoading.set(true);
    this.statsService.getAutoNotificationSettings().subscribe({
      next: (res) => {
        this.autoNotif30Dias.set(res.enabled30Dias);
        this.autoNotifVenceHoy.set(res.enabledVenceHoy);
        this.autoNotifVencidoRecordatorio.set(res.enabledVencidoRecordatorio);
        this.autoNotifSendTime.set(res.sendTime);
        this.autoNotifLastRun.set(res.lastRunDate);
        this.autoNotifLoading.set(false);
      },
      error: () => {
        this.autoNotifError.set('No se pudo obtener el estado de las notificaciones automáticas.');
        this.autoNotifLoading.set(false);
      },
    });
  }

  toggleAutoNotificaciones(tipo: '30Dias' | 'VenceHoy' | 'VencidoRecordatorio'): void {
    if (this.autoNotifSaving()) return;
    const enabled30Dias = tipo === '30Dias' ? !this.autoNotif30Dias() : this.autoNotif30Dias();
    const enabledVenceHoy = tipo === 'VenceHoy' ? !this.autoNotifVenceHoy() : this.autoNotifVenceHoy();
    const enabledVencidoRecordatorio = tipo === 'VencidoRecordatorio' ? !this.autoNotifVencidoRecordatorio() : this.autoNotifVencidoRecordatorio();
    this.autoNotifSaving.set(true);
    this.autoNotifError.set('');
    this.statsService.setAutoNotificationEnabled(enabled30Dias, enabledVenceHoy, enabledVencidoRecordatorio, this.autoNotifSendTime()).subscribe({
      next: (res) => {
        this.autoNotif30Dias.set(res.enabled30Dias);
        this.autoNotifVenceHoy.set(res.enabledVenceHoy);
        this.autoNotifVencidoRecordatorio.set(res.enabledVencidoRecordatorio);
        this.autoNotifSendTime.set(res.sendTime);
        this.autoNotifLastRun.set(res.lastRunDate);
        this.autoNotifSaving.set(false);
      },
      error: () => {
        this.autoNotifError.set('No se pudo actualizar la configuración. Intenta nuevamente.');
        this.autoNotifSaving.set(false);
      },
    });
  }

  cambiarHoraNotificaciones(event: Event): void {
    const sendTime = (event.target as HTMLInputElement).value;
    if (!sendTime || this.autoNotifSaving()) return;
    this.autoNotifSaving.set(true);
    this.autoNotifError.set('');
    this.statsService.setAutoNotificationEnabled(this.autoNotif30Dias(), this.autoNotifVenceHoy(), this.autoNotifVencidoRecordatorio(), sendTime).subscribe({
      next: (res) => {
        this.autoNotifSendTime.set(res.sendTime);
        this.autoNotifSaving.set(false);
      },
      error: () => {
        this.autoNotifError.set('No se pudo actualizar la hora de envío. Intenta nuevamente.');
        this.autoNotifSaving.set(false);
      },
    });
  }

  private cargarEstadoCorreo(): void {
    this.loadingCorreo.set(true);
    this.statsService.getNotificationStatus().subscribe({
      next: (res) => {
        this.smtpConfigured.set(res.smtpConfigured);
        this.cooldownHours.set(res.cooldownHours);
        this.loadingCorreo.set(false);
      },
      error: () => {
        this.correoError.set('No se pudo obtener el estado de las notificaciones por correo.');
        this.loadingCorreo.set(false);
      },
    });
  }

  cambiarTipoPreview(tipo: TestNotificationType): void {
    this.previewType = tipo;
    this.cargarPreview();
  }

  nombrePreviewType(): string {
    switch (this.previewType) {
      case 'por-vencer': return 'Por vencer (30 días)';
      case 'vencidas': return 'Vencida (recordatorio semanal)';
      case 'vence-hoy': return 'Vence hoy / Paga hoy';
    }
  }

  private cargarPreview(): void {
    this.previewLoading.set(true);
    this.previewError.set('');
    this.statsService.getNotificationPreview(this.previewType).subscribe({
      next: (res) => {
        this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(res.html));
        this.previewLoading.set(false);
      },
      error: () => {
        this.previewError.set('No se pudo generar la vista previa del correo.');
        this.previewLoading.set(false);
      },
    });
  }

  private cargarUltimoLote(): void {
    this.latestBatchLoading.set(true);
    this.statsService.getLatestMassBatch().subscribe({
      next: (batch) => {
        this.latestBatch.set(batch);
        this.latestBatchLoading.set(false);
      },
      error: () => {
        this.latestBatchError.set('No se pudo obtener la última notificación masiva.');
        this.latestBatchLoading.set(false);
      },
    });
  }

  enviarCorreoPrueba(): void {
    const to = this.testEmailTo.trim();
    if (!to) return;
    this.testEmailSending.set(true);
    this.testEmailResult.set('');
    this.testEmailError.set('');
    this.statsService.sendTestEmail(to, this.previewType).subscribe({
      next: () => {
        this.testEmailResult.set(`Correo de prueba enviado a ${to}.`);
        this.testEmailSending.set(false);
      },
      error: (err) => {
        this.testEmailError.set(err?.error?.error ?? 'No se pudo enviar el correo de prueba.');
        this.testEmailSending.set(false);
      },
    });
  }

  formatFechaHora(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
