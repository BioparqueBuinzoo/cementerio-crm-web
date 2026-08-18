import { Component, ChangeDetectorRef, OnInit, inject, signal, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardStatsService, ActividadItem, TipoActividad } from '../../services/dashboard-stats/dashboard-stats.service';
import { ClienteService } from '../../services/cliente/cliente.service';
import { SepulturaService } from '../../services/sepultura/sepultura.service';
import { AuthService } from '../../services/auth/auth.service';
import { validate, format, clean } from 'rut.js';

interface NuevoClienteForm {
  rut: string; nombre: string; apellido1: string; apellido2: string;
  direccion: string; comuna: string; ciudad: string;
  telefono: string; celular: string; email: string;
}

const FORM_VACIO: NuevoClienteForm = {
  rut: '', nombre: '', apellido1: '', apellido2: '',
  direccion: '', comuna: '', ciudad: '',
  telefono: '', celular: '', email: '',
};

const ACTIVIDAD_ICONOS: Record<TipoActividad, string> = {
  cliente_creado: 'user-plus',
  sepultura_creada: 'grid',
  mascota_creada: 'paw',
  contrato_creado: 'file-text',
  contrato_renovado: 'check-circle',
};

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterModule, FormsModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Inicio implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly sepulturaService = inject(SepulturaService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  get greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  get greetingName(): string {
    const name = this.auth.currentUser()?.name?.trim();
    return name?.split(/\s+/)[0] || 'equipo';
  }

  get fechaHoy(): string {
    const formatted = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  // Modal buscar cliente por RUT
  modalBuscarVisible = false;
  buscarRut = '';
  buscarRutError = '';
  buscarError = '';
  buscando = false;

  // Modal buscar cliente por nombre
  modalBuscarNombreVisible = false;
  buscarNombre = '';
  buscarNombreError = '';
  buscarNombreResultados: { id: number; nombre: string; apellido1: string; apellido2: string; rut: string }[] = [];
  buscandoNombre = false;

  // Expandir/colapsar las 3 opciones de búsqueda dentro de "Acciones rápidas"
  buscarClienteExpandido = false;
  toggleBuscarCliente(): void {
    this.buscarClienteExpandido = !this.buscarClienteExpandido;
  }

  abrirBuscarCliente(): void {
    this.buscarRut = '';
    this.buscarRutError = '';
    this.buscarError = '';
    this.modalBuscarVisible = true;
  }

  cerrarBuscarCliente(): void { this.modalBuscarVisible = false; }

  abrirBuscarNombre(): void {
    this.buscarNombre = '';
    this.buscarNombreError = '';
    this.buscarNombreResultados = [];
    this.modalBuscarNombreVisible = true;
  }

  cerrarBuscarNombre(): void { this.modalBuscarNombreVisible = false; }

  // Modal buscar sepultura por ficha
  modalBuscarFichaVisible = false;
  buscarFicha = '';
  buscarFichaError = '';
  buscarFichaResultados: { id: number; numero_ficha: string; tipo: string; estado: string; id_cliente: number }[] = [];
  buscandoFicha = false;

  abrirBuscarFicha(): void {
    this.buscarFicha = '';
    this.buscarFichaError = '';
    this.buscarFichaResultados = [];
    this.modalBuscarFichaVisible = true;
  }

  cerrarBuscarFicha(): void { this.modalBuscarFichaVisible = false; }

  async buscarSepulturaPorFicha(): Promise<void> {
    const ficha = this.buscarFicha.trim();
    if (!ficha) { this.buscarFichaError = 'Ingresa un número de ficha'; return; }
    this.buscandoFicha = true;
    this.buscarFichaError = '';
    this.buscarFichaResultados = [];
    try {
      const resultados = await this.sepulturaService.findByNumeroFicha(ficha);
      if (!resultados.length) {
        this.buscarFichaError = `No se encontró ninguna ficha con el número "${ficha}"`;
        return;
      }
      if (resultados.length === 1) {
        this.modalBuscarFichaVisible = false;
        this.router.navigate(['/asis/clientes', resultados[0].id_cliente]);
        return;
      }
      this.buscarFichaResultados = resultados.map(s => ({
        id: s.id, numero_ficha: s.numero_ficha, tipo: s.tipo, estado: s.estado, id_cliente: s.id_cliente,
      }));
    } catch {
      this.buscarFichaError = 'Error al buscar';
    } finally {
      this.buscandoFicha = false;
      this.cdr.markForCheck();
    }
  }

  irAFicha(id_cliente: number): void {
    this.modalBuscarFichaVisible = false;
    this.router.navigate(['/asis/clientes', id_cliente]);
  }

  async buscarClientePorNombre(): Promise<void> {
    const termino = this.buscarNombre.trim();
    if (!termino) { this.buscarNombreError = 'Ingresa un nombre para buscar'; return; }
    this.buscandoNombre = true;
    this.buscarNombreError = '';
    this.buscarNombreResultados = [];
    try {
      await this.clienteService.getAllClientes(1, 10, undefined, termino);
      const resultados = this.clienteService.clientes();
      if (!resultados.length) {
        this.buscarNombreError = `No se encontró ningún cliente con "${termino}"`;
        return;
      }
      this.buscarNombreResultados = resultados.map(c => ({
        id: c.id, nombre: c.nombre, apellido1: c.apellido1, apellido2: c.apellido2 ?? '', rut: c.rut,
      }));
    } catch {
      this.buscarNombreError = 'Error al buscar';
    } finally {
      this.buscandoNombre = false;
      this.cdr.markForCheck();
    }
  }

  irACliente(id: number): void {
    this.modalBuscarNombreVisible = false;
    this.router.navigate(['/asis/clientes', id]);
  }

  onBuscarRutInput(value: string): void {
    const cleaned = clean(value);
    this.buscarRut = cleaned.length > 0 ? format(cleaned) : value;
    this.buscarRutError = '';
  }

  onBuscarRutBlur(): void {
    if (!this.buscarRut) { this.buscarRutError = ''; return; }
    if (!validate(this.buscarRut)) {
      this.buscarRutError = 'RUT inválido';
    }
  }

  async buscarCliente(): Promise<void> {
    if (!this.buscarRut || !validate(this.buscarRut)) {
      this.buscarRutError = 'RUT inválido';
      return;
    }
    this.buscando = true;
    this.buscarError = '';
    try {
      await this.clienteService.getAllClientes(1, 1, this.buscarRut);
      const resultado = this.clienteService.clientes();
      if (!resultado.length) {
        this.buscarError = `No se encontró ningún cliente con el RUT ${this.buscarRut}`;
        return;
      }
      this.modalBuscarVisible = false;
      this.router.navigate(['/asis/clientes', resultado[0].id]);
    } catch {
      this.buscarError = 'Error al buscar el cliente';
    } finally {
      this.buscando = false;
      this.cdr.markForCheck();
    }
  }

  // Modal crear cliente
  modalVisible = false;
  saving = false;
  errorMsg = '';
  rutError = '';
  form: NuevoClienteForm = { ...FORM_VACIO };

  stats = [
    { label: 'Clientes',          value: 0, icon: 'users',     route: '/asis/clientes' as string | null,           hint: 'Total registrados' },
    { label: 'Sepulturas',        value: 0, icon: 'grid',      route: '/asis/sepulturas' as string | null,         hint: 'Total registradas' },
    { label: 'Mascotas',          value: 0, icon: 'paw',       route: '/asis/mascotas' as string | null,           hint: 'Total registradas' },
    { label: 'Contratos activos', value: 0, icon: 'file-text', route: '/asis/contratos-activos' as string | null, hint: 'Contratos vigentes' },
  ];

  // Estado de contratos (activos vigentes / por vencer / vencidos)
  // "Activos" aquí es el subconjunto de contratosActivos que NO está por vencer
  // (vence en más de 30 días) — así los tres segmentos no se solapan y suman el total general.
  pvTotal = 0;
  vdTotal = 0;
  activosTotal = 0;

  // true hasta que las dos fuentes (stats + vencidas) respondan — evita que el
  // usuario vea los números pasar de 0 al valor real (skeleton en su lugar).
  readonly contratosLoading = signal(true);
  private statsLoaded = false;
  private vencidasLoaded = false;

  private get totalGeneral(): number {
    return this.pvTotal + this.vdTotal + this.activosTotal;
  }

  get pvPercent(): number {
    const total = this.totalGeneral;
    return total > 0 ? Math.round((this.pvTotal / total) * 100) : 0;
  }

  get vdPercent(): number {
    const total = this.totalGeneral;
    return total > 0 ? Math.round((this.vdTotal / total) * 100) : 0;
  }

  get activosPercent(): number {
    const total = this.totalGeneral;
    return total > 0 ? Math.max(0, 100 - this.pvPercent - this.vdPercent) : 0;
  }

  // Actividad reciente
  readonly loadingActividad = signal(false);
  readonly actividad = signal<ActividadItem[]>([]);

  constructor(
    private cdr: ChangeDetectorRef,
    public statsService: DashboardStatsService,
  ) {}

  ngOnInit(): void {
    this.statsService.loadIfNeeded().subscribe({
      next: res => {
        this.stats[0].value = res.totalClientes;
        this.stats[1].value = res.totalSepulturas;
        this.stats[2].value = res.totalMascotas;
        this.stats[3].value = res.contratosActivos;
        this.pvTotal = res.porVencer;
        this.activosTotal = Math.max(0, res.contratosActivos - res.porVencer);
        this.statsLoaded = true;
        this.checkContratosLoaded();
        this.cdr.markForCheck();
      },
    });
    this.loadVencidasTotal();
    this.cargarActividad();
  }

  private checkContratosLoaded(): void {
    if (this.statsLoaded && this.vencidasLoaded) this.contratosLoading.set(false);
  }

  private loadVencidasTotal(): void {
    this.statsService.loadVencimientos('vencidas', 1, 1).subscribe({
      next: res => {
        this.vdTotal = res.total;
        this.vencidasLoaded = true;
        this.checkContratosLoaded();
        this.cdr.markForCheck();
      },
    });
  }

  private cargarActividad(): void {
    this.loadingActividad.set(true);
    this.statsService.getActividadReciente(8).subscribe({
      next: items => {
        this.actividad.set(items);
        this.loadingActividad.set(false);
      },
      error: () => this.loadingActividad.set(false),
    });
  }

  actividadIcono(tipo: TipoActividad): string {
    return ACTIVIDAD_ICONOS[tipo];
  }

  actividadDescripcion(item: ActividadItem): string {
    switch (item.tipo) {
      case 'cliente_creado':    return `Se creó cliente #${item.refId}`;
      case 'sepultura_creada':  return `Se creó sepultura #${item.refId}`;
      case 'mascota_creada':    return 'Nueva mascota asociada';
      case 'contrato_creado':   return `Se creó contrato #${item.refId}`;
      case 'contrato_renovado': return `Contrato #${item.refId} fue renovado`;
    }
  }

  actividadTiempo(item: ActividadItem): string {
    const fecha = new Date(item.fecha);
    const diffMs = Date.now() - fecha.getTime();
    const diffDias = Math.floor(diffMs / 86_400_000);

    if (item.soloFecha) {
      if (diffDias <= 0) return 'Hoy';
      if (diffDias === 1) return 'Ayer';
      return `Hace ${diffDias} días`;
    }

    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'Recién';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffDias === 0) return fecha.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;
    return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  }

  abrirModal(): void {
    this.form = { ...FORM_VACIO };
    this.errorMsg = '';
    this.rutError = '';
    this.modalVisible = true;
  }

  cerrarModal(): void {
    this.modalVisible = false;
  }

  onRutBlur(): void {
    if (!this.form.rut) { this.rutError = ''; return; }
    if (!validate(this.form.rut)) {
      this.rutError = 'RUT inválido';
    }
  }

  onRutInput(value: string): void {
    const cleaned = clean(value);
    this.form.rut = cleaned.length > 0 ? format(cleaned) : value;
    this.rutError = '';
  }

  get rutInvalido(): boolean {
    return !!this.form.rut && !validate(this.form.rut);
  }

  async guardar(): Promise<void> {
    if (!this.form.rut || !this.form.nombre || !this.form.apellido1) return;
    if (!validate(this.form.rut)) { this.rutError = 'RUT inválido'; return; }
    this.saving = true;
    this.errorMsg = '';
    try {
      const id = await this.clienteService.create(this.form);
      this.statsService.invalidate();
      this.modalVisible = false;
      this.router.navigate(['/asis/clientes', id]);
    } catch (e: any) {
      this.errorMsg = e?.error?.error ?? 'Error al crear el cliente';
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
    }
  }
}
