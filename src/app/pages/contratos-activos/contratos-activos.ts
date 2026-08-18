import { ChangeDetectorRef, Component, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DashboardStatsService, type VencimientoItem } from '../../services/dashboard-stats/dashboard-stats.service';

@Component({
  selector: 'app-contratos-activos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contratos-activos.html',
  styleUrls: [
    '../contratos-por-vencer/contratos-por-vencer.css',
    '../contratos-vencimientos/contratos-vencimientos.css',
    './contratos-activos.css',
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContratosActivos implements OnInit {
  private readonly statsService = inject(DashboardStatsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  readonly limit = 25;

  data: VencimientoItem[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  totalAmount = 0;
  loading = false;
  exportando = false;

  ngOnInit(): void { this.load(1); }

  load(page: number): void {
    this.loading = true;
    this.statsService.loadVencimientos('activos', page, this.limit).subscribe({
      next: res => {
        this.data = res.data;
        this.total = res.total;
        this.totalAmount = res.totalAmount;
        this.page = res.page;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  pageNums(): (number | null)[] {
    const total = this.totalPages, current = this.page;
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
    const pages: (number | null)[] = [1];
    if (current > 3) pages.push(null);
    for (let value = Math.max(2, current - 1); value <= Math.min(total - 1, current + 1); value++) pages.push(value);
    if (current < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  }

  formatDays(days: number): string {
    if (days <= 0) return 'Hoy';
    return `En ${days} día${days === 1 ? '' : 's'}`;
  }

  formatDate(date: string): string {
    if (!date) return '—';
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
    }).format(value ?? 0);
  }

  goToClient(id: number): void { void this.router.navigate(['/asis/clientes', id]); }

  exportar(): void {
    this.exportando = true;
    this.statsService.exportarVencimientos('activos').subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'contratos-activos.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando = false;
        this.cdr.markForCheck();
      },
      error: () => { this.exportando = false; this.cdr.markForCheck(); },
    });
  }
}
