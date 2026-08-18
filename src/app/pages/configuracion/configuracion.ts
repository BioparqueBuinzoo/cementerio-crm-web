import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../services/auth/auth.service';
import { AsisUsersService } from '../../services/asis-users/asis-users.service';
import { DashboardStatsService, NotificationBatch, TestNotificationType } from '../../services/dashboard-stats/dashboard-stats.service';
import { AppAccessStatus, AsisRole, AsisUser } from '../../models/asis-users.model';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Configuracion implements OnInit {
  readonly auth = inject(AuthService);
  private readonly asisUsersService = inject(AsisUsersService);
  private readonly statsService = inject(DashboardStatsService);
  private readonly sanitizer = inject(DomSanitizer);

  // Usuarios
  readonly loadingUsuarios = signal(false);
  readonly usuarios = signal<AsisUser[]>([]);
  readonly usuariosError = signal('');
  readonly roles = signal<AsisRole[]>([]);
  readonly savingUserId = signal<number | null>(null);
  readonly userActionError = signal('');

  // Estado SMTP
  readonly loadingCorreo = signal(false);
  readonly smtpConfigured = signal(false);
  readonly cooldownHours = signal<number | null>(null);
  readonly correoError = signal('');

  // Vista previa del correo
  readonly previewLoading = signal(false);
  readonly previewHtml = signal<SafeHtml | null>(null);
  readonly previewError = signal('');

  // Última notificación masiva
  readonly latestBatchLoading = signal(false);
  readonly latestBatch = signal<NotificationBatch | null>(null);
  readonly latestBatchError = signal('');

  // Envío de correo de prueba
  testEmailTo = '';
  testEmailType: TestNotificationType = 'vence-hoy';
  readonly testEmailSending = signal(false);
  readonly testEmailResult = signal('');
  readonly testEmailError = signal('');

  // Notificaciones automáticas
  readonly autoNotifLoading = signal(false);
  readonly autoNotifSaving = signal(false);
  readonly autoNotif30Dias = signal(false);
  readonly autoNotifVenceHoy = signal(false);
  readonly autoNotifSendTime = signal('09:00');
  readonly autoNotifLastRun = signal<string | null>(null);
  readonly autoNotifError = signal('');

  ngOnInit(): void {
    this.cargarEstadoCorreo();
    this.cargarPreview();
    this.cargarUltimoLote();
    this.cargarAutoNotificaciones();
    if (this.auth.isAdmin()) {
      this.cargarUsuarios();
      this.cargarRoles();
    }
  }

  private cargarAutoNotificaciones(): void {
    this.autoNotifLoading.set(true);
    this.statsService.getAutoNotificationSettings().subscribe({
      next: (res) => {
        this.autoNotif30Dias.set(res.enabled30Dias);
        this.autoNotifVenceHoy.set(res.enabledVenceHoy);
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

  toggleAutoNotificaciones(tipo: '30Dias' | 'VenceHoy'): void {
    if (this.autoNotifSaving()) return;
    const enabled30Dias = tipo === '30Dias' ? !this.autoNotif30Dias() : this.autoNotif30Dias();
    const enabledVenceHoy = tipo === 'VenceHoy' ? !this.autoNotifVenceHoy() : this.autoNotifVenceHoy();
    this.autoNotifSaving.set(true);
    this.autoNotifError.set('');
    this.statsService.setAutoNotificationEnabled(enabled30Dias, enabledVenceHoy, this.autoNotifSendTime()).subscribe({
      next: (res) => {
        this.autoNotif30Dias.set(res.enabled30Dias);
        this.autoNotifVenceHoy.set(res.enabledVenceHoy);
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
    this.statsService.setAutoNotificationEnabled(this.autoNotif30Dias(), this.autoNotifVenceHoy(), sendTime).subscribe({
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

  private cargarPreview(): void {
    this.previewLoading.set(true);
    this.statsService.getNotificationPreview().subscribe({
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
    this.statsService.sendTestEmail(to, this.testEmailType).subscribe({
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

  private cargarUsuarios(): void {
    this.loadingUsuarios.set(true);
    this.asisUsersService.getAll()
      .then((usuarios) => this.usuarios.set(usuarios))
      .catch(() => this.usuariosError.set('No se pudo obtener la lista de usuarios.'))
      .finally(() => this.loadingUsuarios.set(false));
  }

  private cargarRoles(): void {
    this.asisUsersService.getRoles()
      .then((roles) => this.roles.set(roles))
      .catch(() => { /* el selector de rol simplemente queda vacío si esto falla */ });
  }

  nombreRol(codigo: string): string {
    return this.roles().find((r) => r.code === codigo)?.name ?? codigo;
  }

  cambiarRol(usuario: AsisUser, codigo: string): void {
    if (!codigo || usuario.roles[0] === codigo) return;
    this.actualizarUsuario(usuario, { roles: [codigo] });
  }

  cambiarEstado(usuario: AsisUser, estado: AppAccessStatus): void {
    if (usuario.app_status === estado) return;
    this.actualizarUsuario(usuario, { status: estado });
  }

  private actualizarUsuario(usuario: AsisUser, patch: { status?: AppAccessStatus; roles?: string[] }): void {
    this.savingUserId.set(usuario.id);
    this.userActionError.set('');
    this.asisUsersService.updateUser(usuario.id, patch)
      .then((actualizado) => {
        this.usuarios.update((lista) => lista.map((u) => (u.id === actualizado.id ? actualizado : u)));
      })
      .catch(() => this.userActionError.set(`No se pudo actualizar a ${this.nombreUsuario(usuario)}.`))
      .finally(() => this.savingUserId.set(null));
  }

  nombreUsuario(u: AsisUser): string {
    return u.name?.trim() || u.email;
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  formatFechaHora(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CL', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
