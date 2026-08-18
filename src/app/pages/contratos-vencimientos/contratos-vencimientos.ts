import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  DashboardStatsService,
  type NotificationBatch,
  type NotificationType,
  type VencimientoItem,
} from '../../services/dashboard-stats/dashboard-stats.service';

@Component({
  selector: 'app-contratos-vencimientos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contratos-vencimientos.html',
  styleUrls: [
    '../contratos-por-vencer/contratos-por-vencer.css',
    './contratos-vencimientos.css',
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ContratosVencimientos implements OnInit, OnDestroy {
  private readonly statsService = inject(DashboardStatsService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private batchTimer: number | null = null;

  readonly notificationType = this.route.snapshot.data['notificationType'] as NotificationType;
  readonly isExpired = this.notificationType === 'vencidas';
  readonly limit = 25;
  readonly periodDays = 30;
  lastGlobalNotification: { date: string; detail: string } | null = null;

  data: VencimientoItem[] = [];
  total = 0;
  page = 1;
  totalPages = 1;
  loading = false;
  notificationLoadingId: number | null = null;
  massNotificationLoading = false;
  notificationMessage = '';
  notificationError = '';
  activeBatch: NotificationBatch | null = null;

  totalAmount = 0;
  overviewLoading = true;

  ngOnInit(): void {
    this.load(1);
    this.loadLastGlobalNotification();
  }

  private loadLastGlobalNotification(): void {
    this.statsService.getLatestMassBatch().subscribe({
      next: batch => {
        this.lastGlobalNotification = batch ? this.toGlobalNotificationSummary(batch) : null;
        this.cdr.markForCheck();
      },
    });
  }

  private toGlobalNotificationSummary(batch: NotificationBatch): { date: string; detail: string } {
    const when = new Date(batch.completedAt ?? batch.createdAt);
    const date = when.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
    const detail = batch.status === 'queued' || batch.status === 'processing'
      ? `Enviando… ${batch.sentCount}/${batch.recipientCount} destinatario(s)`
      : `${batch.recipientCount} destinatario(s)`;
    return { date, detail };
  }

  ngOnDestroy(): void { this.clearBatchTimer(); }

  load(page: number): void {
    this.loading = true;
    this.statsService.loadVencimientos(this.notificationType, page, this.limit).subscribe({
      next: res => {
        this.data = res.data;
        this.total = res.total;
        this.totalAmount = res.totalAmount;
        this.page = res.page;
        this.totalPages = res.totalPages;
        this.loading = false;
        this.overviewLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  async notifyIndividual(item: VencimientoItem, event: Event): Promise<void> {
    event.stopPropagation();
    if (this.notificationLoadingId !== null || this.massNotificationLoading) return;
    const confirmed = window.confirm(
      `¿Enviar aviso a ${item.nombre_cliente} por la ficha N° ${item.numero_ficha}?`,
    );
    if (!confirmed) return;

    this.notificationLoadingId = item.id_sepultura;
    this.clearNotificationStatus();
    try {
      const batch = await firstValueFrom(
        this.statsService.queueIndividualNotification(this.notificationType, item.id_sepultura),
      );
      this.notificationMessage = 'Notificación agregada a la cola de envío.';
      this.watchBatch(batch);
    } catch (error) {
      this.notificationError = this.errorMessage(error);
    } finally {
      this.notificationLoadingId = null;
      this.cdr.markForCheck();
    }
  }

  async notifyAll(): Promise<void> {
    if (this.massNotificationLoading || this.notificationLoadingId !== null) return;
    this.massNotificationLoading = true;
    this.clearNotificationStatus();
    try {
      const summary = await firstValueFrom(this.statsService.notificationSummary(this.notificationType));
      if (!summary.smtpConfigured) {
        this.notificationError = 'El SMTP todavía no está configurado en el servidor del CRM.';
        return;
      }
      if (summary.destinatarios === 0) {
        this.notificationError = 'No hay destinatarios con correo válido para notificar.';
        return;
      }
      const confirmed = window.confirm(
        `Se enviará un correo a ${summary.destinatarios} destinatario(s), agrupando ${summary.sepulturas} sepultura(s). ¿Deseas continuar?`,
      );
      if (!confirmed) return;

      const batch = await firstValueFrom(this.statsService.queueMassNotification(this.notificationType));
      this.notificationMessage = `Lote creado para ${batch.recipientCount} destinatario(s).`;
      this.lastGlobalNotification = this.toGlobalNotificationSummary(batch);
      this.watchBatch(batch);
    } catch (error) {
      this.notificationError = this.errorMessage(error);
    } finally {
      this.massNotificationLoading = false;
      this.cdr.markForCheck();
    }
  }

  private static readonly MAX_BATCH_POLL_RETRIES = 5;

  private watchBatch(batch: NotificationBatch, failedAttempts = 0): void {
    this.activeBatch = batch;
    this.clearBatchTimer();
    if (batch.status === 'completed' || batch.status === 'completed_with_errors') return;
    this.batchTimer = window.setTimeout(async () => {
      try {
        const updated = await firstValueFrom(this.statsService.getNotificationBatch(batch.id));
        this.activeBatch = updated;
        if (updated.status === 'completed') {
          this.notificationMessage = `Envío finalizado: ${updated.sentCount} correo(s) enviado(s).`;
        } else if (updated.status === 'completed_with_errors') {
          this.notificationError = `Envío finalizado con ${updated.failedCount} error(es) y ${updated.skippedCount} omitido(s).`;
        }
        if (updated.scope === 'masiva' && (updated.status === 'completed' || updated.status === 'completed_with_errors')) {
          this.lastGlobalNotification = this.toGlobalNotificationSummary(updated);
        }
        this.cdr.markForCheck();
        this.watchBatch(updated);
      } catch (error) {
        // Reintenta ante un error transitorio (red, backend momentáneamente caído) en vez
        // de abandonar el seguimiento de un envío que puede seguir en curso.
        if (failedAttempts < ContratosVencimientos.MAX_BATCH_POLL_RETRIES) {
          this.watchBatch(batch, failedAttempts + 1);
          return;
        }
        this.notificationError = this.errorMessage(error);
        this.cdr.markForCheck();
      }
    }, 1500);
  }

  private clearBatchTimer(): void {
    if (this.batchTimer !== null) window.clearTimeout(this.batchTimer);
    this.batchTimer = null;
  }

  private clearNotificationStatus(): void {
    this.clearBatchTimer();
    this.activeBatch = null;
    this.notificationMessage = '';
    this.notificationError = '';
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return 'No fue posible solicitar el envío. Intenta nuevamente.';
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
    const absolute = Math.abs(days);
    if (absolute === 0) return 'Hoy';
    return days > 0 ? `En ${absolute} día${absolute === 1 ? '' : 's'}` : `Hace ${absolute} día${absolute === 1 ? '' : 's'}`;
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
}
