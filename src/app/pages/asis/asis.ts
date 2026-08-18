import { DOCUMENT } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { versionService } from '../../services/version.service';
import { AuthService } from '../../services/auth/auth.service';
import { DashboardStatsService } from '../../services/dashboard-stats/dashboard-stats.service';

@Component({
  selector: 'app-asis',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './asis.html',
  styleUrl: './asis.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})

export class Asis {
  readonly isSidebarOpen = signal(true);
  readonly isMobile = signal(false);
  readonly profileImageFailed = signal(false);

  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly statsService = inject(DashboardStatsService);

  readonly appVersion = versionService.getVersion();
  readonly porVencerCount = signal(0);
  readonly vencidosCount = signal(0);

  constructor() {
    this.statsService.loadIfNeeded().subscribe(res => this.porVencerCount.set(res.porVencer));
    this.statsService.loadVencimientos('vencidas', 1, 1).subscribe(res => this.vencidosCount.set(res.total));

    const mediaQuery = this.document.defaultView?.matchMedia('(max-width: 900px)');
    if (mediaQuery) {
      const syncLayout = (matches: boolean) => {
        this.isMobile.set(matches);
        this.isSidebarOpen.set(!matches);
      };
      const onBreakpointChange = (event: MediaQueryListEvent) => syncLayout(event.matches);
      syncLayout(mediaQuery.matches);
      mediaQuery.addEventListener('change', onBreakpointChange);
      this.destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', onBreakpointChange));
    }

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => this.closeSidebarOnMobile());
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update(open => !open);
  }

  closeSidebarOnMobile(): void {
    if (this.isMobile()) this.isSidebarOpen.set(false);
  }

  onShellKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') this.closeSidebarOnMobile();
  }

  getUserRoleDisplay(): string {
    const roles = this.auth.userRoles();
    if (roles.length === 0) return 'Sin rol';
    return roles.join(', ');
  }

  onProfileImageError(): void {
    this.profileImageFailed.set(true);
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }
}
