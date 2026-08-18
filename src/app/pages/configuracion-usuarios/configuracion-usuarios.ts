import { Component, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';
import { AsisUsersService } from '../../services/asis-users/asis-users.service';
import { AppAccessStatus, AsisRole, AsisUser } from '../../models/asis-users.model';

@Component({
  selector: 'app-configuracion-usuarios',
  standalone: true,
  imports: [FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './configuracion-usuarios.html',
  styleUrl: './configuracion-usuarios.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ConfiguracionUsuarios implements OnInit {
  readonly auth = inject(AuthService);
  private readonly asisUsersService = inject(AsisUsersService);

  readonly loadingUsuarios = signal(false);
  readonly usuarios = signal<AsisUser[]>([]);
  readonly usuariosError = signal('');
  readonly roles = signal<AsisRole[]>([]);
  readonly rolesLoaded = signal(false);
  readonly savingUserId = signal<number | null>(null);
  readonly userActionError = signal('');
  readonly pendingRoles = signal<Record<number, string>>({});

  ngOnInit(): void {
    if (this.auth.isAdmin()) {
      this.cargarUsuarios();
      this.cargarRoles();
    }
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
      .catch(() => { /* el selector de rol simplemente queda vacío si esto falla */ })
      .finally(() => this.rolesLoaded.set(true));
  }

  nombreRol(codigo: string): string {
    return this.roles().find((r) => r.code === codigo)?.name ?? codigo;
  }

  cambiarRol(usuario: AsisUser, codigo: string): void {
    if (!codigo || usuario.roles[0] === codigo) {
      this.pendingRoles.update((pending) => { const next = { ...pending }; delete next[usuario.id]; return next; });
      return;
    }
    this.pendingRoles.update((pending) => ({ ...pending, [usuario.id]: codigo }));
  }

  aplicarRol(usuario: AsisUser): void {
    const codigo = this.pendingRoles()[usuario.id];
    if (!codigo || this.savingUserId() !== null) return;
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
        if (patch.roles) this.pendingRoles.update((pending) => { const next = { ...pending }; delete next[actualizado.id]; return next; });
      })
      .catch((err) => {
        const detail = err?.error?.error || err?.error?.code;
        this.userActionError.set(detail
          ? `No se pudo actualizar a ${this.nombreUsuario(usuario)}: ${detail}.`
          : `No se pudo actualizar a ${this.nombreUsuario(usuario)}.`);
      })
      .finally(() => this.savingUserId.set(null));
  }

  nombreUsuario(u: AsisUser): string {
    return u.name?.trim() || u.email;
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}
