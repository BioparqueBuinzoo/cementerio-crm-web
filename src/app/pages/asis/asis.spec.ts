import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../services/auth/auth.service';
import { Asis } from './asis';

describe('Asis responsive shell', () => {
  const user = signal({
    id: 'user-1',
    email: 'persona@example.com',
    name: 'Persona Cementerio',
    pictureUrl: 'https://example.com/profile.jpg',
    management: 'Gerencia de Operaciones',
    roles: ['admin'],
    views: ['dashboard'],
    appStatus: 'active' as const,
  });
  const roles = signal(['admin']);
  const logout = vi.fn();

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: '(max-width: 900px)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    TestBed.configureTestingModule({
      imports: [Asis],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { currentUser: user.asReadonly(), userRoles: roles.asReadonly(), logout },
        },
      ],
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('abre y cierra la navegación móvil sin perder el perfil', () => {
    const fixture = TestBed.createComponent(Asis);
    fixture.detectChanges();

    const aside = fixture.nativeElement.querySelector('aside') as HTMLElement;
    expect(aside.classList.contains('sidebar-collapsed')).toBe(true);
    expect(aside.hasAttribute('inert')).toBe(true);

    fixture.componentInstance.toggleSidebar();
    fixture.detectChanges();

    expect(aside.classList.contains('sidebar-collapsed')).toBe(false);
    expect(fixture.nativeElement.querySelector('.sidebar-backdrop')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.user-avatar img')?.getAttribute('src'))
      .toBe('https://example.com/profile.jpg');
    expect(fixture.nativeElement.textContent).toContain('Gerencia de Operaciones');

    fixture.componentInstance.onShellKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(aside.classList.contains('sidebar-collapsed')).toBe(true);
    expect(fixture.nativeElement.querySelector('.sidebar-backdrop')).toBeNull();
  });
});
