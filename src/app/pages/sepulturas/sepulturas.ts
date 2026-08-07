import { Component, OnInit, computed, signal, inject, viewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SepulturaService } from '../../services/sepultura/sepultura.service';

@Component({
  selector: 'app-sepulturas',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './sepulturas.html',
  styleUrl: './sepulturas.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Sepulturas implements OnInit {
  private readonly sepulturaService = inject(SepulturaService);
  private readonly router = inject(Router);
  readonly tableWrapperRef = viewChild<ElementRef<HTMLElement>>('tableWrapper');
  private readonly containerRef = viewChild<ElementRef<HTMLElement>>('sepulturasContainer');

  readonly sepulturas  = this.sepulturaService.sepulturas;
  readonly loading     = this.sepulturaService.loading;
  readonly error       = this.sepulturaService.error;
  readonly page        = this.sepulturaService.page;
  readonly totalPages  = this.sepulturaService.totalPages;
  readonly total       = this.sepulturaService.total;

  readonly fichaInput = signal('');

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
    this.sepulturaService.getAll();
  }

  buscar(): void {
    this.sepulturaService.getAll(1, 20, undefined, undefined, this.fichaInput().trim() || undefined);
  }

  limpiar(): void {
    this.fichaInput.set('');
    this.sepulturaService.getAll();
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscar();
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.scrollContentToTop();
    this.sepulturaService.getAll(newPage, 20, undefined, undefined, this.fichaInput().trim() || undefined);
  }

  private scrollContentToTop(): void {
    const wrapper = this.tableWrapperRef()?.nativeElement;
    const container = this.containerRef()?.nativeElement;
    if (wrapper) wrapper.scrollTo({ top: 0, behavior: 'smooth' });
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }

  retry(): void {
    this.sepulturaService.getAll(this.page());
  }

  irACliente(idCliente: number): void {
    this.router.navigate(['/asis/clientes', idCliente]);
  }
}
