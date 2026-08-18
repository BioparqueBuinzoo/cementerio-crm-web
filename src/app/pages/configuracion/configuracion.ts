import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { AsisUsersService } from '../../services/asis-users/asis-users.service';
import { DashboardStatsService } from '../../services/dashboard-stats/dashboard-stats.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Configuracion implements OnInit {
  readonly auth = inject(AuthService);
  private readonly asisUsersService = inject(AsisUsersService);
  private readonly statsService = inject(DashboardStatsService);

  readonly totalUsuarios = signal<number | null>(null);
  readonly smtpConfigured = signal<boolean | null>(null);

  ngOnInit(): void {
    this.statsService.getNotificationStatus().subscribe({
      next: (res) => this.smtpConfigured.set(res.smtpConfigured),
      error: () => { /* el chip de estado simplemente no se muestra si falla */ },
    });
    if (this.auth.isAdmin()) {
      this.asisUsersService.getAll()
        .then((usuarios) => this.totalUsuarios.set(usuarios.length))
        .catch(() => { /* el chip de conteo simplemente no se muestra si falla */ });
    }
  }
}
