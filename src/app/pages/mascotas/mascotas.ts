import { Component, OnInit, computed, signal, inject, viewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MascotaService } from '../../services/mascota/mascota.service';

@Component({
  selector: 'app-mascotas',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './mascotas.html',
  styleUrl: './mascotas.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Mascotas implements OnInit {
  private readonly mascotaService = inject(MascotaService);
  private readonly router = inject(Router);
  readonly tableWrapperRef = viewChild<ElementRef<HTMLElement>>('tableWrapper');
  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('mascotasContainer');

  readonly mascotas   = this.mascotaService.mascotas;
  readonly loading    = this.mascotaService.loading;
  readonly error      = this.mascotaService.error;
  readonly page       = this.mascotaService.page;
  readonly totalPages = this.mascotaService.totalPages;
  readonly total      = this.mascotaService.total;

  readonly nombreInput = signal('');
  readonly filtersOpen = signal(true);
  readonly especieFilter = signal('');
  readonly sexoFilter = signal('');

  readonly pageNumbers = computed<(number | null)[]>(() => {
    const total = this.totalPages();
    const cur   = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (cur > 3) pages.push(null);
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  });

  ngOnInit(): void {
    this.mascotaService.getAll();
  }

  buscar(): void {
    this.loadFiltered(1);
  }

  limpiar(): void {
    this.nombreInput.set('');
    this.loadFiltered(1);
  }

  toggleFilters(): void { this.filtersOpen.update(open => !open); }

  applyFilters(): void { this.loadFiltered(1); }

  clearFilters(): void {
    this.especieFilter.set('');
    this.sexoFilter.set('');
    this.loadFiltered(1);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscar();
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.scrollContentToTop();
    this.loadFiltered(newPage);
  }

  private scrollContentToTop(): void {
    const wrapper = this.tableWrapperRef()?.nativeElement;
    const container = this.containerRef()?.nativeElement;
    if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retry(): void {
    this.loadFiltered(this.page());
  }

  irACliente(idCliente: number | null | undefined): void {
    if (idCliente) this.router.navigate(['/asis/clientes', idCliente]);
  }

  formatFecha(value: string | null | undefined): string {
    if (!value) return '—';
    const [y, m, d] = (value as string).split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }

  private loadFiltered(page: number): void {
    void this.mascotaService.getAll(
      page, 20, undefined, this.nombreInput().trim() || undefined,
      this.especieFilter(), this.sexoFilter(), undefined
    );
  }
}
