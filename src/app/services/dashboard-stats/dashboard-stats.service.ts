import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  totalClientes: number;
  totalSepulturas: number;
  totalMascotas: number;
  porVencer: number;
  contratosActivos: number;
}

export type TipoActividad =
  | 'cliente_creado'
  | 'sepultura_creada'
  | 'mascota_creada'
  | 'contrato_creado'
  | 'contrato_renovado';

export interface ActividadItem {
  tipo: TipoActividad;
  refId: number;
  fecha: string;
  soloFecha: boolean;
}

export interface VencimientoItem {
  id_sepultura: number;
  numero_ficha: string;
  tipo: string;
  id_cliente: number;
  nombre_cliente: string;
  fecha_vencimiento: string;
  dias_restantes: number;
  valor_renovacion: number;
}

export interface VencimientosPaginados {
  data: VencimientoItem[];
  total: number;
  totalAmount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type NotificationType = 'por-vencer' | 'vencidas';

export interface NotificationSummary {
  sepulturas: number;
  destinatarios: number;
  omitidasSinEmailValido: number;
  smtpConfigured: boolean;
}

export interface NotificationBatch {
  id: string;
  notificationType: NotificationType;
  scope: 'individual' | 'masiva';
  status: 'queued' | 'processing' | 'completed' | 'completed_with_errors';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  createdAt: string;
  completedAt: string | null;
}

const EMPTY_STATS: DashboardStats = { totalClientes: 0, totalSepulturas: 0, totalMascotas: 0, porVencer: 0, contratosActivos: 0 };
const EMPTY_PAGE: VencimientosPaginados = { data: [], total: 0, totalAmount: 0, page: 1, limit: 20, totalPages: 0 };

@Injectable({ providedIn: 'root' })
export class DashboardStatsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/api/stats`;
  private cachedStats: DashboardStats | null = null;

  readonly loading = signal(false);
  readonly loadingVencimientos = signal(false);

  loadIfNeeded(): Observable<DashboardStats> {
    if (this.cachedStats !== null) return of(this.cachedStats);
    this.loading.set(true);
    return this.http.get<DashboardStats>(this.url).pipe(
      tap(data => { this.cachedStats = data; this.loading.set(false); }),
      catchError(() => { this.loading.set(false); return of(EMPTY_STATS); }),
    );
  }

  loadVencimientos(tipo: 'por-vencer' | 'vencidas' | 'activos', page: number, limit: number): Observable<VencimientosPaginados> {
    this.loadingVencimientos.set(true);
    return this.http.get<VencimientosPaginados>(
      `${this.url}/vencimientos?tipo=${tipo}&page=${page}&limit=${limit}`
    ).pipe(
      tap(() => this.loadingVencimientos.set(false)),
      catchError(() => { this.loadingVencimientos.set(false); return of(EMPTY_PAGE); }),
    );
  }

  getNotificationStatus(): Observable<{ smtpConfigured: boolean; cooldownHours: number }> {
    return this.http.get<{ smtpConfigured: boolean; cooldownHours: number }>(
      `${this.url}/vencimientos/notificaciones/estado`,
    );
  }

  notificationSummary(tipo: NotificationType): Observable<NotificationSummary> {
    return this.http.get<NotificationSummary>(
      `${this.url}/vencimientos/notificaciones/resumen?tipo=${tipo}`,
    );
  }

  queueIndividualNotification(tipo: NotificationType, sepulturaId: number): Observable<NotificationBatch> {
    return this.http.post<NotificationBatch>(`${this.url}/vencimientos/notificaciones`, {
      requestKey: crypto.randomUUID(),
      notificationType: tipo,
      scope: 'individual',
      sepulturaId,
    });
  }

  queueMassNotification(tipo: NotificationType): Observable<NotificationBatch> {
    return this.http.post<NotificationBatch>(`${this.url}/vencimientos/notificaciones`, {
      requestKey: crypto.randomUUID(),
      notificationType: tipo,
      scope: 'masiva',
    });
  }

  getLastSentForClient(clienteId: number): Observable<{ lastSent: string | null; canSend: boolean }> {
    return this.http.get<{ lastSent: string | null; canSend: boolean }>(
      `${this.url}/vencimientos/notificaciones/ultimo-enviado/${clienteId}`,
    );
  }

  getNotificationBatch(id: string): Observable<NotificationBatch> {
    return this.http.get<NotificationBatch>(
      `${this.url}/vencimientos/notificaciones/lotes/${encodeURIComponent(id)}`,
    );
  }

  getNotificationPreview(): Observable<{ subject: string; html: string }> {
    return this.http.get<{ subject: string; html: string }>(
      `${this.url}/vencimientos/notificaciones/vista-previa`,
    );
  }

  getLatestMassBatch(): Observable<NotificationBatch | null> {
    return this.http.get<NotificationBatch | null>(
      `${this.url}/vencimientos/notificaciones/lotes/masivo/ultimo`,
    );
  }

  sendTestEmail(to: string): Observable<{ messageId: string; to: string }> {
    return this.http.post<{ messageId: string; to: string }>(
      `${this.url}/vencimientos/notificaciones/prueba`,
      { to },
    );
  }

  getActividadReciente(limit = 10): Observable<ActividadItem[]> {
    return this.http.get<ActividadItem[]>(`${this.url}/actividad-reciente?limit=${limit}`).pipe(
      catchError(() => of([])),
    );
  }

  exportarVencimientos(tipo: 'por-vencer' | 'vencidas' | 'activos'): Observable<Blob> {
    return this.http.get(
      `${this.url}/vencimientos/export?tipo=${tipo}`,
      { responseType: 'blob' }
    );
  }

  getCached(): DashboardStats | null { return this.cachedStats; }
  invalidate(): void { this.cachedStats = null; }
}
