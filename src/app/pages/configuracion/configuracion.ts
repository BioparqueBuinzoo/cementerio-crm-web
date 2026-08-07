import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AuthService } from '../../services/auth/auth.service';
import { AsisUsersService } from '../../services/asis-users/asis-users.service';
import { DashboardStatsService } from '../../services/dashboard-stats/dashboard-stats.service';
import { AsisUser } from '../../models/asis-users.model';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Configuracion implements OnInit {
  readonly auth = inject(AuthService);
  private readonly asisUsersService = inject(AsisUsersService);
  private readonly statsService = inject(DashboardStatsService);

  readonly loadingUsuarios = signal(false);
  readonly usuarios = signal<AsisUser[]>([]);
  readonly usuariosError = signal('');

  readonly loadingCorreo = signal(false);
  readonly smtpConfigured = signal(false);
  readonly cooldownHours = signal<number | null>(null);
  readonly correoError = signal('');

  ngOnInit(): void {
    this.cargarEstadoCorreo();
    if (this.auth.isAdmin()) {
      this.cargarUsuarios();
    }
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

  private cargarUsuarios(): void {
    this.loadingUsuarios.set(true);
    this.asisUsersService.getAll()
      .then((usuarios) => this.usuarios.set(usuarios))
      .catch(() => this.usuariosError.set('No se pudo obtener la lista de usuarios.'))
      .finally(() => this.loadingUsuarios.set(false));
  }

  nombreUsuario(u: AsisUser): string {
    return u.name?.trim() || u.email;
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
