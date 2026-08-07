import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { versionService } from '../../services/version.service';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-asis',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './asis.html',
  styleUrl: './asis.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class Asis {
  // Signal para que el toggle del sidebar actualice la vista en zoneless
  readonly isSidebarOpen = signal(true);

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly appVersion = versionService.getVersion();

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.isSidebarOpen.set(false));
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  getUserRoleDisplay(): string {
    const roles = this.auth.userRoles();
    if (roles.length === 0) return 'Sin rol';
    return roles.join(', ');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}