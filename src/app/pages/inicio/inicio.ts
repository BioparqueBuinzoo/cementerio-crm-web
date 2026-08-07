import { Component, ChangeDetectorRef, OnInit, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DashboardStatsService, VencimientoItem } from '../../services/dashboard-stats/dashboard-stats.service';
import { ClienteService } from '../../services/cliente/cliente.service';
import { SepulturaService } from '../../services/sepultura/sepultura.service';
import { validate, format, clean } from 'rut.js';
import { nextAmount } from '../../lib/renewal';

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
    { label: 'Clientes',   value: 0, icon: 'users',    route: '/asis/clientes' },
    { label: 'Sepulturas', value: 0, icon: 'grid',     route: '/asis/sepulturas' },
    { label: 'Mascotas',   value: 0, icon: 'paw',      route: '/asis/mascotas' },
    { label: 'Por vencer', value: 0, icon: 'alert',    route: '/asis/contratos-por-vencer' },
    { label: 'Vencidas',   value: 0, icon: 'x-circle', route: '/asis/contratos-vencidos' },
  ];

  // Por vencer panel
  pvData:       VencimientoItem[]  = [];
  pvTotal       = 0;
  pvPage        = 1;
  pvTotalPages  = 1;
  pvLoading     = false;
  readonly pvLimit = 10;

  // Vencidas panel
  vdData:       VencimientoItem[]  = [];
  vdTotal       = 0;
  vdPage        = 1;
  vdTotalPages  = 1;
  vdLoading     = false;
  readonly vdLimit = 10;

  exportando = { pv: false, vd: false };

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
        this.stats[3].value = res.porVencer;
        this.cdr.markForCheck();
      },
    });
    this.loadPorVencer(1);
    this.loadVencidas(1);
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
      this.modalVisible = false;
      this.router.navigate(['/asis/clientes', id]);
    } catch (e: any) {
      this.errorMsg = e?.error?.error ?? 'Error al crear el cliente';
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
    }
  }

  loadPorVencer(page: number): void {
    this.pvLoading = true;
    this.statsService.loadVencimientos('por-vencer', page, this.pvLimit).subscribe({
      next: res => {
        this.pvData      = res.data;
        this.pvTotal     = res.total;
        this.pvPage      = res.page;
        this.pvTotalPages = res.totalPages;
        this.pvLoading   = false;
        if (page === 1) this.stats[3].value = res.total;
        this.cdr.markForCheck();
      },
    });
  }

  loadVencidas(page: number): void {
    this.vdLoading = true;
    this.statsService.loadVencimientos('vencidas', page, this.vdLimit).subscribe({
      next: res => {
        this.vdData       = res.data;
        this.vdTotal      = res.total;
        this.vdPage       = res.page;
        this.vdTotalPages = res.totalPages;
        this.vdLoading    = false;
        if (page === 1) this.stats[4].value = res.total;
        this.cdr.markForCheck();
      },
    });
  }

  /** Visible page numbers with null = ellipsis */
  pageNums(cur: number, total: number): (number | null)[] {
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (cur > 3) pages.push(null);
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push(null);
    pages.push(total);
    return pages;
  }

  exportarExcel(tipo: 'por-vencer' | 'vencidas'): void {
    const key = tipo === 'por-vencer' ? 'pv' : 'vd';
    this.exportando[key] = true;
    this.statsService.exportarVencimientos(tipo).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = tipo === 'por-vencer' ? 'contratos-por-vencer.csv' : 'contratos-vencidos.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando[key] = false;
        this.cdr.markForCheck();
      },
      error: () => { this.exportando[key] = false; this.cdr.markForCheck(); },
    });
  }

  formatDias(dias: number): string {
    const abs = Math.abs(dias);
    if (abs === 0) return 'Hoy';
    return dias > 0 ? `${abs}d` : `${abs}d atrás`;
  }

  formatCLP(value: number): string {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value ?? 0);
  }

  proximoPago(valor: number): string {
    return this.formatCLP(nextAmount(valor));
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    return `${d}/${m}/${y}`;
  }
}
