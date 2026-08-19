import { Component, CUSTOM_ELEMENTS_SCHEMA, ChangeDetectorRef, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ClienteService } from '../../../services/cliente/cliente.service';
import { Cliente } from '../../../models/clientes.model';
import { SepulturaService } from '../../../services/sepultura/sepultura.service';
import { Sepultura, CrearSepulturaDto } from '../../../models/sepulturas.model';
import { MascotaService } from '../../../services/mascota/mascota.service';
import { Mascota, CrearMascotaDto } from '../../../models/mascotas.model';
import { ContratoService } from '../../../services/contrato/contrato.service';
import { Contrato, CrearContratoDto } from '../../../models/contratos.model';
import { TipoSepulturaService, TipoSepultura } from '../../../services/tipo-sepultura/tipo-sepultura.service';
import { LookupService, FormaPago, Encargado } from '../../../services/lookup/lookup.service';
import { ContactoService } from '../../../services/contacto/contacto.service';
import { ObservacionClienteService, ObservacionCliente } from '../../../services/observacion-cliente/observacion-cliente.service';
import { AuthService } from '../../../services/auth/auth.service';
import { DashboardStatsService, NotificationType } from '../../../services/dashboard-stats/dashboard-stats.service';
import { nextAmount, roundCashTotalChile } from '../../../lib/renewal';
import { validate, format, clean } from 'rut.js';

export interface SepulturaConDatos extends Sepultura {
  mascotas: Mascota[];
  contratos: Contrato[];
}

@Component({
  selector: 'app-cliente-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './cliente-detalle.html',
  styleUrl: './cliente-detalle.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ClienteDetalle {

  readonly id = input.required<number>();

  private readonly cdr                  = inject(ChangeDetectorRef);
  private readonly clienteService      = inject(ClienteService);
  private readonly sepulturaService    = inject(SepulturaService);
  private readonly mascotaService      = inject(MascotaService);
  private readonly contratoService     = inject(ContratoService);
  private readonly tipoSepulturaService = inject(TipoSepulturaService);
  private readonly lookupService         = inject(LookupService);
  private readonly contactoService       = inject(ContactoService);
  private readonly observacionService    = inject(ObservacionClienteService);
  private readonly authService           = inject(AuthService);
  private readonly dashboardStatsService = inject(DashboardStatsService);
  private readonly router                = inject(Router);

  readonly cliente             = signal<Cliente | null>(null);
  readonly sepulturasConDatos  = signal<SepulturaConDatos[]>([]);
  readonly contactos           = signal<Cliente[]>([]);
  readonly observaciones       = signal<ObservacionCliente[]>([]);
  readonly loading             = signal<boolean>(false);
  readonly error               = signal<string | null>(null);

  // Observaciones
  nuevaObservacion = '';
  savingObservacion = false;
  observacionErrorMsg = '';
  eliminandoObservacionId: number | null = null;

  // Modal descuento especial de renovación
  modalDescuentoVisible = false;
  savingDescuento = false;
  descuentoErrorMsg = '';
  descuentoSepId: number | null = null;
  descuentoContratoId: number | null = null;
  descuentoPorcentaje: number | null = null;

  // Modal contrato
  modalContratoVisible = false;
  savingContrato = false;
  loadingContrato = false;
  contratoErrorMsg = '';
  contratoSepId: number | null = null;
  formasPago: FormaPago[] = [];
  encargados: Encargado[] = [];
  contratoForm: Omit<CrearContratoDto, 'id_sepultura'> = {
    fecha_pago: '', fecha_vencimiento: '', valor_renovacion: 0,
    forma_pago: '', numero_comprobante: '', id_receptor: 0, id_pagador: 0,
  };
  montoContratoStr = '';
  montoEditContratoStr = '';

  // Modal nueva mascota
  modalMascotaVisible = false;
  savingMascota = false;
  loadingMascota = false;
  mascotaErrorMsg = '';
  mascotaSepId: number | null = null;
  mascotaForm: Omit<CrearMascotaDto, 'id_sepultura'> = {
    nombre: '', especie: '', raza: '', sexo: 'Macho',
    fecha_nacimiento: null, fecha_muerte: '', causa_muerte: '',
    fecha_sepultacion: '', estado: 'EN SEPULTURA', observaciones: '', encargado: '',
  };

  // Modal editar cliente
  modalEditClienteVisible = false;
  savingEditCliente = false;
  editClienteErrorMsg = '';
  editClienteForm: {
    nombre: string; apellido1: string; apellido2: string;
    direccion: string; comuna: string; ciudad: string;
    telefono: string; celular: string; email: string;
  } = { nombre: '', apellido1: '', apellido2: '', direccion: '', comuna: '', ciudad: '', telefono: '', celular: '', email: '' };

  abrirModalEditCliente(): void {
    const c = this.cliente();
    if (!c) return;
    this.editClienteForm = {
      nombre: c.nombre ?? '', apellido1: c.apellido1 ?? '', apellido2: c.apellido2 ?? '',
      direccion: c.direccion ?? '', comuna: c.comuna ?? '', ciudad: c.ciudad ?? '',
      telefono: c.telefono ?? '', celular: c.celular ?? '', email: c.email ?? '',
    };
    this.editClienteErrorMsg = '';
    this.modalEditClienteVisible = true;
    this.cdr.markForCheck();
  }

  cerrarModalEditCliente(): void { this.modalEditClienteVisible = false; this.cdr.markForCheck(); }

  async guardarEditCliente(): Promise<void> {
    const c = this.cliente();
    if (!c || !this.editClienteForm.nombre || !this.editClienteForm.apellido1) return;
    this.savingEditCliente = true;
    this.editClienteErrorMsg = '';
    try {
      await this.clienteService.update(c.id, this.editClienteForm);
      const actualizado = await this.clienteService.getClienteById(c.id);
      if (actualizado) this.cliente.set(actualizado);
      this.modalEditClienteVisible = false;
    } catch (e: any) {
      this.editClienteErrorMsg = e?.error?.error ?? 'Error al actualizar el cliente';
    } finally {
      this.savingEditCliente = false;
      this.cdr.markForCheck();
    }
  }

  async guardarObservacion(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente || !this.nuevaObservacion.trim()) return;
    this.savingObservacion = true;
    this.observacionErrorMsg = '';
    try {
      const usuario = this.authService.currentUser()?.name ?? this.authService.currentUser()?.email ?? 'Sistema';
      await this.observacionService.create(cliente.id, this.nuevaObservacion.trim(), usuario);
      const obs = await this.observacionService.getByClienteId(cliente.id);
      this.observaciones.set(obs);
      this.nuevaObservacion = '';
    } catch (e: any) {
      this.observacionErrorMsg = e?.error?.error ?? 'Error al guardar la observación';
    } finally {
      this.savingObservacion = false;
      this.cdr.markForCheck();
    }
  }

  async eliminarObservacion(id: number): Promise<void> {
    const cliente = this.cliente();
    if (!cliente) return;
    if (!confirm('¿Estás seguro de que deseas eliminar esta observación?')) return;
    this.eliminandoObservacionId = id;
    try {
      await this.observacionService.remove(cliente.id, id);
      this.observaciones.set(this.observaciones().filter(o => o.id !== id));
    } catch {
      // silencioso
    } finally {
      this.eliminandoObservacionId = null;
      this.cdr.markForCheck();
    }
  }

  // Modal editar sepultura
  modalEditSepVisible = false;
  savingEditSep = false;
  editSepErrorMsg = '';
  editingSepId: number | null = null;
  editSepForm: { numero_ficha: string; ubicacion_vieja: string; ubicacion_nueva: string; tipo: string; encargado: string; observaciones: string } = {
    numero_ficha: '', ubicacion_vieja: '', ubicacion_nueva: '', tipo: '', encargado: '', observaciones: '',
  };

  async abrirModalEditSep(sep: SepulturaConDatos): Promise<void> {
    this.editingSepId = sep.id;
    this.editSepForm = {
      numero_ficha: sep.numero_ficha ?? '',
      ubicacion_vieja: sep.ubicacion_vieja ?? '',
      ubicacion_nueva: sep.ubicacion_nueva ?? '',
      tipo: sep.tipo ?? '',
      encargado: (sep as any).encargado ?? '',
      observaciones: sep.observaciones ?? '',
    };
    this.editSepErrorMsg = '';
    this.modalEditSepVisible = true;
    this.cdr.markForCheck();
    if (!this.encargados.length) {
      this.encargados = await this.lookupService.getEncargados();
      this.cdr.markForCheck();
    }
  }

  cerrarModalEditSep(): void { this.modalEditSepVisible = false; this.cdr.markForCheck(); }

  async guardarEditSep(): Promise<void> {
    if (!this.editingSepId) return;
    this.savingEditSep = true;
    this.editSepErrorMsg = '';
    try {
      await this.sepulturaService.update(this.editingSepId, this.editSepForm);
      this.sepulturasConDatos.set(
        this.sepulturasConDatos().map(s =>
          s.id === this.editingSepId ? { ...s, ...this.editSepForm } : s
        )
      );
      this.modalEditSepVisible = false;
    } catch (e: any) {
      this.editSepErrorMsg = e?.error?.error ?? 'Error al actualizar la sepultura';
    } finally {
      this.savingEditSep = false;
      this.cdr.markForCheck();
    }
  }

  // Modal editar contrato
  modalEditContratoVisible = false;
  savingEditContrato = false;
  editContratoErrorMsg = '';
  editingContratoId: number | null = null;
  editingContratoSepId: number | null = null;
  editContratoForm: { valor_renovacion: number; fecha_pago: string; fecha_vencimiento: string; forma_pago: string; numero_comprobante: string } = {
    valor_renovacion: 0, fecha_pago: '', fecha_vencimiento: '', forma_pago: '', numero_comprobante: '',
  };

  abrirModalEditContrato(contrato: Contrato, sepId: number): void {
    this.editingContratoId = contrato.id;
    this.editingContratoSepId = sepId;
    this.editContratoForm = {
      valor_renovacion: contrato.valor_renovacion,
      fecha_pago: (contrato.fecha_pago as string)?.split('T')[0] ?? '',
      fecha_vencimiento: (contrato.fecha_vencimiento as string)?.split('T')[0] ?? '',
      forma_pago: contrato.forma_pago ?? '',
      numero_comprobante: contrato.numero_comprobante ?? '',
    };
    this.montoEditContratoStr = contrato.valor_renovacion > 0 ? this.formatCLP(contrato.valor_renovacion) : '';
    this.editContratoErrorMsg = '';
    this.modalEditContratoVisible = true;
    this.cdr.markForCheck();
  }

  cerrarModalEditContrato(): void { this.modalEditContratoVisible = false; this.cdr.markForCheck(); }

  async guardarEditContrato(): Promise<void> {
    if (!this.editingContratoId || !this.editingContratoSepId) return;
    this.savingEditContrato = true;
    this.editContratoErrorMsg = '';
    try {
      await this.contratoService.update(this.editingContratoId, this.editContratoForm);
      const actualizadas = this.sepulturasConDatos().map(async (sep) => {
        if (sep.id !== this.editingContratoSepId) return sep;
        const contratos = await this.contratoService.getByIdSepultura(sep.id);
        return { ...sep, contratos };
      });
      this.sepulturasConDatos.set(await Promise.all(actualizadas));
      this.modalEditContratoVisible = false;
    } catch (e: any) {
      this.editContratoErrorMsg = e?.error?.error ?? 'Error al actualizar el contrato';
    } finally {
      this.savingEditContrato = false;
      this.cdr.markForCheck();
    }
  }

  // Modal editar mascota
  modalEditMascotaVisible = false;
  savingEditMascota = false;
  editMascotaErrorMsg = '';
  editMascotaId: number | null = null;
  editMascotaSepId: number | null = null;
  editMascotaForm: Omit<CrearMascotaDto, 'id_sepultura'> = {
    nombre: '', especie: '', raza: '', sexo: 'Macho',
    fecha_nacimiento: null, fecha_muerte: '', causa_muerte: '',
    fecha_sepultacion: '', estado: 'EN SEPULTURA', observaciones: '', encargado: '',
  };

  async abrirModalEditMascota(mascota: Mascota, idSepultura: number): Promise<void> {
    this.editMascotaId = mascota.id;
    this.editMascotaSepId = idSepultura;
    this.editMascotaForm = {
      nombre: mascota.nombre,
      especie: mascota.especie,
      raza: mascota.raza ?? '',
      sexo: mascota.sexo ?? 'Macho',
      fecha_nacimiento: mascota.fecha_nacimiento ?? null,
      fecha_muerte: (mascota.fecha_muerte as string)?.split('T')[0] ?? '',
      causa_muerte: mascota.causa_muerte ?? '',
      fecha_sepultacion: (mascota.fecha_sepultacion as string)?.split('T')[0] ?? '',
      estado: mascota.estado ?? 'EN SEPULTURA',
      observaciones: mascota.observaciones ?? '',
      encargado: mascota.encargado ?? '',
    };
    this.editMascotaErrorMsg = '';
    this.modalEditMascotaVisible = true;
    this.cdr.markForCheck();
    if (!this.encargados.length) {
      this.encargados = await this.lookupService.getEncargados();
      this.cdr.markForCheck();
    }
  }

  cerrarModalEditMascota(): void { this.modalEditMascotaVisible = false; this.cdr.markForCheck(); }

  async guardarEditMascota(): Promise<void> {
    if (!this.editMascotaId || !this.editMascotaSepId) return;
    if (!this.editMascotaForm.nombre || !this.editMascotaForm.especie) return;
    this.savingEditMascota = true;
    this.editMascotaErrorMsg = '';
    try {
      await this.mascotaService.update(this.editMascotaId, this.editMascotaForm);
      const actualizadas = this.sepulturasConDatos().map(async (sep) => {
        if (sep.id !== this.editMascotaSepId) return sep;
        const mascotas = await this.mascotaService.getByIdSepultura(sep.id);
        return { ...sep, mascotas: mascotas ?? [] };
      });
      this.sepulturasConDatos.set(await Promise.all(actualizadas));
      this.modalEditMascotaVisible = false;
    } catch (e: any) {
      this.editMascotaErrorMsg = e?.error?.error ?? 'Error al actualizar la mascota';
    } finally {
      this.savingEditMascota = false;
      this.cdr.markForCheck();
    }
  }

  contactosExpanded = true;
  sepulturasExpanded = true;
  fichasExpanded = new Set<number>();

  toggleFicha(id: number): void {
    if (this.fichasExpanded.has(id)) {
      this.fichasExpanded.delete(id);
    } else {
      this.fichasExpanded.add(id);
    }
    this.cdr.markForCheck();
  }

  isFichaExpanded(id: number): boolean {
    return this.fichasExpanded.has(id);
  }

  sepulturasVisibles(): SepulturaConDatos[] {
    return this.sepulturasConDatos().filter(
      sep => this.estadoEfectivo(sep).css !== 'terminado',
    );
  }

  // Modal nuevo contacto
  modalContactoVisible = false;
  savingContacto = false;
  contactoErrorMsg = '';
  contactoRutError = '';
  contactoModo: 'nuevo' | 'buscar' = 'nuevo';
  contactoForm: {
    rut: string; nombre: string; apellido1: string; apellido2: string;
    direccion: string; comuna: string; ciudad: string;
    telefono: string; celular: string; email: string;
  } = { rut: '', nombre: '', apellido1: '', apellido2: '', direccion: '', comuna: '', ciudad: '', telefono: '', celular: '', email: '' };

  abrirModalContacto(): void {
    this.contactoForm = { rut: '', nombre: '', apellido1: '', apellido2: '', direccion: '', comuna: '', ciudad: '', telefono: '', celular: '', email: '' };
    this.contactoErrorMsg = '';
    this.contactoRutError = '';
    this.contactoModo = 'nuevo';
    this.modalContactoVisible = true;
    this.cdr.markForCheck();
  }

  cerrarModalContacto(): void { this.modalContactoVisible = false; this.cdr.markForCheck(); }

  onContactoRutBlur(): void {
    if (!this.contactoForm.rut) { this.contactoRutError = ''; return; }
    if (!validate(this.contactoForm.rut)) {
      this.contactoRutError = 'RUT inválido';
    } else {
      this.contactoForm.rut = format(this.contactoForm.rut);
      this.contactoRutError = '';
    }
  }

  onContactoRutInput(value: string): void {
    const cleaned = clean(value);
    this.contactoForm.rut = cleaned.length > 0 ? format(cleaned) : value;
    this.contactoRutError = '';
  }

  async guardarContacto(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente) return;

    if (!this.contactoForm.rut || !validate(this.contactoForm.rut)) {
      this.contactoRutError = 'RUT inválido'; return;
    }
    if (!this.contactoForm.nombre || !this.contactoForm.apellido1) return;

    this.savingContacto = true;
    this.contactoErrorMsg = '';
    try {
      // Crear el cliente contacto y vincularlo en una sola operación atómica
      await this.contactoService.addNuevo(cliente.id, this.contactoForm);
      this.dashboardStatsService.invalidate();
      const contactosActualizados = await this.contactoService.getByClienteId(cliente.id);
      this.contactos.set(contactosActualizados);
      this.modalContactoVisible = false;
    } catch (e: any) {
      this.contactoErrorMsg = e?.error?.error ?? 'Error al crear el contacto';
    } finally {
      this.savingContacto = false;
      this.cdr.markForCheck();
    }
  }

  async eliminarContacto(idContacto: number): Promise<void> {
    const cliente = this.cliente();
    if (!cliente) return;
    try {
      await this.contactoService.remove(cliente.id, idContacto);
      this.contactos.set(this.contactos().filter(c => c.id !== idContacto));
      this.cdr.markForCheck();
    } catch (e: any) {
      // Silencioso — en producción se podría mostrar un toast
    }
  }

  nombreContacto(c: Cliente): string {
    return [c.nombre, c.apellido1, c.apellido2].filter(Boolean).join(' ');
  }

  // Modal nueva sepultura
  modalSepVisible = false;
  savingSep = false;
  loadingModal = false;
  sepErrorMsg = '';
  tiposSepultura: TipoSepultura[] = [];
  sepForm: Omit<CrearSepulturaDto, 'id_cliente'> = {
    numero_ficha: '', tipo: '', ubicacion_vieja: '',
    ubicacion_nueva: '', estado: 'En uso', encargado: '', observaciones: '',
  };

  private loadToken = 0;

  constructor() {
    effect(async () => {
      const id = this.id();
      if (!id) return;
      // Evita que una navegación rápida entre fichas deje datos de un cliente
      // anterior sobrescribiendo los de la ficha que el usuario ya está viendo.
      const token = ++this.loadToken;

      try {
        this.loading.set(true);
        this.error.set(null);
        this.fichasExpanded.clear();

        const cliente = await this.clienteService.getClienteById(id);
        if (token !== this.loadToken) return;
        if (!cliente) {
          this.error.set('No se encontró el cliente');
          return;
        }
        this.cliente.set(cliente);
        void this.loadLastSent();

        const [sepulturas, contactos, observaciones] = await Promise.all([
          this.sepulturaService.getByClienteId(cliente.id),
          this.contactoService.getByClienteId(cliente.id).catch(() => [] as Cliente[]),
          this.observacionService.getByClienteId(cliente.id).catch(() => [] as ObservacionCliente[]),
        ]);
        if (token !== this.loadToken) return;

        this.contactos.set(contactos);
        this.observaciones.set(observaciones);

        if (!sepulturas?.length) {
          this.sepulturasConDatos.set([]);
          return;
        }

        // Cargamos mascotas y contratos de cada sepultura en paralelo
        const sepulturasConDatos = await Promise.all(
          sepulturas.map(async (sep) => {
            const [mascotas, contratos] = await Promise.all([
              this.mascotaService.getByIdSepultura(sep.id),
              this.contratoService.getByIdSepultura(sep.id),
            ]);
            return { ...sep, mascotas: mascotas ?? [], contratos };
          }),
        );
        if (token !== this.loadToken) return;

        this.sepulturasConDatos.set(sepulturasConDatos);
      } catch {
        if (token === this.loadToken) this.error.set('Error al cargar los datos del cliente');
      } finally {
        if (token === this.loadToken) this.loading.set(false);
      }
    });
  }

  get nombreCompleto(): string {
    const c = this.cliente();
    if (!c) return '';
    return [c.nombre, c.apellido1, c.apellido2].filter(Boolean).join(' ');
  }

  formatCLP(value: number, decimals = 0): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  formatMontoRenovacion(value: number): string {
    return this.formatCLP(value);
  }

  esVencido(fecha: string): boolean {
    return this.diasHastaVencimiento(fecha) < 0;
  }

  diasHastaVencimiento(fecha: string): number {
    if (!fecha) return 0;
    const fechaLocal = new Date(`${fecha.split('T')[0]}T00:00:00`);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.round((fechaLocal.getTime() - hoy.getTime()) / 86_400_000);
  }

  estadoContrato(fechaVencimiento: string): 'vigente' | 'por-vencer' | 'vencido' {
    const dias = this.diasHastaVencimiento(fechaVencimiento);
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'por-vencer';
    return 'vigente';
  }

  detalleVigencia(fechaVencimiento: string): string {
    const dias = this.diasHastaVencimiento(fechaVencimiento);
    if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${dias === -1 ? '' : 's'}`;
    if (dias === 0) return 'Vence hoy';
    return `Vence en ${dias} día${dias === 1 ? '' : 's'}`;
  }

  tieneMoraProlongada(fechaVencimiento: string): boolean {
    return this.diasHastaVencimiento(fechaVencimiento) < -365;
  }

  origenPago(formaPago: string | null | undefined): 'Portal Flow' | 'Registro manual' {
    return (formaPago ?? '').toLowerCase().includes('flow') ? 'Portal Flow' : 'Registro manual';
  }

  get esRenovacionContrato(): boolean {
    if (!this.contratoSepId) return false;
    return Boolean(this.sepulturasConDatos().find(s => s.id === this.contratoSepId)?.contratos.length);
  }

  get montoBaseRenovacion(): number {
    if (!this.contratoSepId) return 0;
    const sep = this.sepulturasConDatos().find(s => s.id === this.contratoSepId);
    return this.ultimoContrato(sep?.contratos ?? [])?.valor_renovacion ?? 0;
  }

  /** Descuento especial del contrato que se está renovando (null = recargo normal del 6%). */
  get descuentoRenovacion(): number | null {
    if (!this.contratoSepId) return null;
    const sep = this.sepulturasConDatos().find(s => s.id === this.contratoSepId);
    return this.ultimoContrato(sep?.contratos ?? [])?.descuento_renovacion_porcentaje ?? null;
  }

  get montoTotalRenovacion(): number {
    const total = nextAmount(this.montoBaseRenovacion, this.descuentoRenovacion);
    return this.esPagoEfectivo() ? roundCashTotalChile(total) : total;
  }

  puedeAplicarDescuento(): boolean {
    return this.authService.hasAnyRole(['admin', 'jefecemenerio']);
  }

  puedeEliminarCliente(): boolean {
    return this.authService.hasAnyRole(['admin', 'jefecemenerio']);
  }

  // Zona de peligro: eliminar cliente (soft delete, admin/jefecemenerio)
  modalEliminarClienteVisible = false;
  eliminandoCliente = false;
  eliminarClienteErrorMsg = '';

  abrirModalEliminarCliente(): void {
    if (!this.puedeEliminarCliente()) return;
    this.eliminarClienteErrorMsg = '';
    this.modalEliminarClienteVisible = true;
  }

  cerrarModalEliminarCliente(): void {
    if (this.eliminandoCliente) return;
    this.modalEliminarClienteVisible = false;
    this.cdr.markForCheck();
  }

  async confirmarEliminarCliente(): Promise<void> {
    const c = this.cliente();
    if (!c || !this.puedeEliminarCliente()) return;
    this.eliminandoCliente = true;
    this.eliminarClienteErrorMsg = '';
    try {
      await this.clienteService.eliminar(c.id);
      await this.router.navigate(['/asis/clientes']);
    } catch (e: any) {
      this.eliminarClienteErrorMsg = e?.error?.error ?? 'Error al eliminar el cliente';
      this.eliminandoCliente = false;
      this.cdr.markForCheck();
    }
  }

  private esPagoEfectivo(): boolean {
    return this.contratoForm.forma_pago.trim().toLocaleLowerCase('es-CL').includes('efectivo');
  }

  onFormaPagoRenovacionChange(formaPago: string): void {
    this.contratoForm.forma_pago = formaPago;
    this.montoContratoStr = this.montoBaseRenovacion > 0 ? this.formatMontoRenovacion(this.montoTotalRenovacion) : '';
  }

  puedeRenovarContrato(contratos: Contrato[]): boolean {
    const ultimo = this.ultimoContrato(contratos);
    return ultimo !== null && this.estadoContrato(ultimo.fecha_vencimiento as unknown as string) !== 'vigente';
  }

  private fechaLocalISO(fecha = new Date()): string {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Contrato más reciente por fecha_vencimiento */
  ultimoContrato(contratos: Contrato[]): Contrato | null {
    if (!contratos.length) return null;
    return [...contratos].sort((a, b) =>
      new Date(b.fecha_vencimiento).getTime() - new Date(a.fecha_vencimiento).getTime()
    )[0];
  }

  /** Historial: todos excepto el más reciente */
  historialContratos(contratos: Contrato[]): Contrato[] {
    if (contratos.length <= 1) return [];
    const ultimo = this.ultimoContrato(contratos)!;
    return [...contratos]
      .filter(c => c.id !== ultimo.id)
      .sort((a, b) => new Date(b.fecha_vencimiento).getTime() - new Date(a.fecha_vencimiento).getTime());
  }

  /**
   * Calcula el estado visual efectivo de la sepultura combinando
   * su campo `estado` con la vigencia del contrato más reciente.
   *
   * - Terminado                       → { label: 'Terminado',              css: 'terminado' }
   * - En uso + contrato vigente       → { label: 'En uso',                 css: 'en-uso' }
   * - Sin contratos                   → { label: 'Sin contrato',            css: 'sin-contrato' }
   * - Activa + contrato vencido       → { label: 'Pendiente renovación',   css: 'pendiente' }
   * - Cualquier otro estado           → muestra el valor tal cual
   */
  async abrirModalContrato(idSepultura: number): Promise<void> {
    this.contratoSepId = idSepultura;
    const hoy = new Date();
    const fechaPago = this.fechaLocalISO(hoy);

    const sep = this.sepulturasConDatos().find(s => s.id === idSepultura);
    const ultimo = sep ? this.ultimoContrato(sep.contratos) : null;
    const montoSugerido = ultimo ? nextAmount(ultimo.valor_renovacion, ultimo.descuento_renovacion_porcentaje) : 0;

    this.contratoForm = {
      fecha_pago: fechaPago,
      fecha_vencimiento: ultimo ? this.sumarAnualidad(ultimo.fecha_vencimiento) : '',
      valor_renovacion: montoSugerido,
      forma_pago: '', numero_comprobante: '', id_receptor: 0,
      id_pagador: this.cliente()?.id ?? 0,
    };
    if (!ultimo) this.onFechaPagoChange(fechaPago);
    this.montoContratoStr = montoSugerido > 0 ? this.formatCLP(montoSugerido) : '';
    this.contratoErrorMsg = '';
    this.loadingContrato = true;
    this.modalContratoVisible = true;
    this.cdr.markForCheck();
    try {
      const formas = await this.lookupService.getFormasPago();
      this.formasPago = formas;
      this.contratoForm.forma_pago = formas[0]?.nombre ?? '';
      this.montoContratoStr = montoSugerido > 0 ? this.formatMontoRenovacion(this.montoTotalRenovacion) : '';
    } catch (e: any) {
      this.contratoErrorMsg = e?.error?.error ?? 'Error al cargar los datos del formulario';
    } finally {
      this.loadingContrato = false;
      this.cdr.markForCheck();
    }
  }

  cerrarModalContrato(): void { this.modalContratoVisible = false; this.cdr.markForCheck(); }

  abrirModalDescuento(idSepultura: number, contrato: Contrato): void {
    this.descuentoSepId = idSepultura;
    this.descuentoContratoId = contrato.id;
    this.descuentoPorcentaje = contrato.descuento_renovacion_porcentaje;
    this.descuentoErrorMsg = '';
    this.modalDescuentoVisible = true;
    this.cdr.markForCheck();
  }

  cerrarModalDescuento(): void { this.modalDescuentoVisible = false; this.cdr.markForCheck(); }

  async guardarDescuento(): Promise<void> {
    if (!this.descuentoContratoId) return;
    const porcentaje = this.descuentoPorcentaje;
    if (porcentaje !== null && (!Number.isFinite(porcentaje) || porcentaje < 0 || porcentaje > 100)) {
      this.descuentoErrorMsg = 'Ingresa un porcentaje entre 0 y 100, o deja vacío para quitar el descuento.';
      return;
    }
    this.savingDescuento = true;
    this.descuentoErrorMsg = '';
    try {
      await this.contratoService.setDescuento(this.descuentoContratoId, porcentaje);
      const sepId = this.descuentoSepId;
      if (sepId) {
        const contratos = await this.contratoService.getByIdSepultura(sepId);
        this.sepulturasConDatos.update((lista) =>
          lista.map((sep) => (sep.id === sepId ? { ...sep, contratos } : sep)));
      }
      this.modalDescuentoVisible = false;
    } catch (e: any) {
      this.descuentoErrorMsg = e?.error?.error ?? 'Error al guardar el descuento';
    } finally {
      this.savingDescuento = false;
      this.cdr.markForCheck();
    }
  }

  confirmacionRenovacionVisible = false;

  solicitarGuardarContrato(): void {
    if (!this.esRenovacionContrato) {
      void this.guardarContrato();
      return;
    }
    if (!this.contratoForm.forma_pago || !this.contratoForm.numero_comprobante.trim()) {
      this.contratoErrorMsg = 'Selecciona el medio de pago e ingresa el número de boleta.';
      return;
    }
    this.confirmacionRenovacionVisible = true;
    this.cdr.markForCheck();
  }

  cancelarConfirmacionRenovacion(): void {
    this.confirmacionRenovacionVisible = false;
    this.cdr.markForCheck();
  }

  async confirmarRenovacion(): Promise<void> {
    this.confirmacionRenovacionVisible = false;
    await this.guardarContrato();
  }

  async guardarContrato(): Promise<void> {
    if (!this.contratoSepId) return;
    if (this.esRenovacionContrato) {
      if (!this.contratoForm.forma_pago || !this.contratoForm.numero_comprobante.trim()) {
        this.contratoErrorMsg = 'Selecciona el medio de pago e ingresa el número de boleta.';
        return;
      }
      const fechaPago = this.fechaLocalISO();
      this.contratoForm.fecha_pago = fechaPago;
      const sep = this.sepulturasConDatos().find(s => s.id === this.contratoSepId);
      const ultimo = sep ? this.ultimoContrato(sep.contratos) : null;
      if (!ultimo) {
        this.contratoErrorMsg = 'No se encontró el contrato anterior para calcular la renovación.';
        return;
      }
      this.contratoForm.fecha_vencimiento = this.sumarAnualidad(ultimo.fecha_vencimiento);
    }
    if (!this.contratoForm.fecha_pago || !this.contratoForm.fecha_vencimiento || !this.contratoForm.valor_renovacion) return;
    this.savingContrato = true;
    this.contratoErrorMsg = '';
    try {
      await this.contratoService.create({
        ...this.contratoForm,
        id_sepultura: this.contratoSepId,
        id_receptor: Number(this.contratoForm.id_receptor),
        id_pagador: Number(this.contratoForm.id_pagador),
        valor_renovacion: Number(this.contratoForm.valor_renovacion),
      });
      this.dashboardStatsService.invalidate();
      // Recargar contratos de esa sepultura
      const actualizadas = this.sepulturasConDatos().map(async (sep) => {
        if (sep.id !== this.contratoSepId) return sep;
        const contratos = await this.contratoService.getByIdSepultura(sep.id);
        return { ...sep, contratos };
      });
      this.sepulturasConDatos.set(await Promise.all(actualizadas));
      this.modalContratoVisible = false;
    } catch (e: any) {
      this.contratoErrorMsg = e?.error?.error ?? 'Error al guardar el contrato';
    } finally {
      this.savingContrato = false;
      this.cdr.markForCheck();
    }
  }

  onFechaPagoChange(fecha: string): void {
    if (!fecha) return;
    const [year, month, day] = fecha.split('-').map(Number);
    const targetYear = year + 1;
    const lastDay = new Date(Date.UTC(targetYear, month, 0)).getUTCDate();
    const expiration = new Date(Date.UTC(targetYear, month - 1, Math.min(day, lastDay)));
    this.contratoForm.fecha_vencimiento = expiration.toISOString().slice(0, 10);
  }

  private sumarAnualidad(fecha: string | Date): string {
    const value = typeof fecha === 'string' ? fecha.slice(0, 10) : this.fechaLocalISO(fecha);
    const [year, month, day] = value.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year + 1, month, 0)).getUTCDate();
    return `${year + 1}-${String(month).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
  }

  get tituloModalContrato(): string {
    if (!this.contratoSepId) return 'Generar nuevo contrato';
    const sep = this.sepulturasConDatos().find(s => s.id === this.contratoSepId);
    return sep?.contratos?.length ? 'Renovar contrato' : 'Generar nuevo contrato';
  }

  async abrirModalMascota(idSepultura: number): Promise<void> {
    this.mascotaSepId = idSepultura;
    this.mascotaForm = {
      nombre: '', especie: '', raza: '', sexo: 'Macho',
      fecha_nacimiento: null, fecha_muerte: '', causa_muerte: '',
      fecha_sepultacion: '', estado: 'EN SEPULTURA', observaciones: '', encargado: '',
    };
    this.mascotaErrorMsg = '';
    this.loadingMascota = true;
    this.modalMascotaVisible = true;
    this.cdr.markForCheck();
    try {
      if (!this.encargados.length) {
        this.encargados = await this.lookupService.getEncargados();
      }
    } finally {
      this.loadingMascota = false;
      this.cdr.markForCheck();
    }
  }

  cerrarModalMascota(): void { this.modalMascotaVisible = false; this.cdr.markForCheck(); }

  async guardarMascota(): Promise<void> {
    if (!this.mascotaSepId || !this.mascotaForm.nombre || !this.mascotaForm.especie || !this.mascotaForm.fecha_muerte || !this.mascotaForm.fecha_sepultacion) return;
    this.savingMascota = true;
    this.mascotaErrorMsg = '';
    try {
      await this.mascotaService.create({ ...this.mascotaForm, id_sepultura: this.mascotaSepId });
      this.dashboardStatsService.invalidate();
      // Recargar mascotas de esa sepultura
      const actualizadas = this.sepulturasConDatos().map(async (sep) => {
        if (sep.id !== this.mascotaSepId) return sep;
        const mascotas = await this.mascotaService.getByIdSepultura(sep.id);
        return { ...sep, mascotas: mascotas ?? [] };
      });
      this.sepulturasConDatos.set(await Promise.all(actualizadas));
      this.modalMascotaVisible = false;
    } catch (e: any) {
      this.mascotaErrorMsg = e?.error?.error ?? 'Error al crear la mascota';
    } finally {
      this.savingMascota = false;
      this.cdr.markForCheck();
    }
  }

  // Modal marcar terminado
  modalTerminadoVisible = false;
  terminandoSepId: number | null = null;
  terminadoComentario = '';
  savingTerminado = false;
  terminadoErrorMsg = '';

  abrirModalTerminado(idSepultura: number): void {
    this.terminandoSepId = idSepultura;
    this.terminadoComentario = '';
    this.terminadoErrorMsg = '';
    this.modalTerminadoVisible = true;
    this.cdr.markForCheck();
  }

  cerrarModalTerminado(): void { this.modalTerminadoVisible = false; this.cdr.markForCheck(); }

  async confirmarTerminado(): Promise<void> {
    if (!this.terminandoSepId) return;
    this.savingTerminado = true;
    this.terminadoErrorMsg = '';
    try {
      const payload: Record<string, unknown> = { estado: 'TERMINADO' };
      if (this.terminadoComentario.trim()) payload['observaciones'] = this.terminadoComentario.trim();
      await this.sepulturaService.update(this.terminandoSepId, payload as any);
      const actualizadas = this.sepulturasConDatos().map(async (sep) => {
        if (sep.id !== this.terminandoSepId) return sep;
        const [mascotas, contratos] = await Promise.all([
          this.mascotaService.getByIdSepultura(sep.id),
          this.contratoService.getByIdSepultura(sep.id),
        ]);
        return { ...sep, estado: 'TERMINADO', observaciones: (payload['observaciones'] as string) ?? sep.observaciones, mascotas: mascotas ?? [], contratos };
      });
      this.sepulturasConDatos.set(await Promise.all(actualizadas));
      this.modalTerminadoVisible = false;
    } catch (e: any) {
      this.terminadoErrorMsg = e?.error?.error ?? 'Error al actualizar la sepultura';
    } finally {
      this.savingTerminado = false;
      this.cdr.markForCheck();
    }
  }

  async abrirModalSep(): Promise<void> {
    this.sepForm = { numero_ficha: '', tipo: '', ubicacion_vieja: '', ubicacion_nueva: '', estado: 'En uso', encargado: '', observaciones: '' };
    this.sepErrorMsg = '';
    this.loadingModal = true;
    this.modalSepVisible = true;
    this.cdr.markForCheck();
    try {
      const [tipos, nextFicha] = await Promise.all([
        this.tipoSepulturaService.getAll(),
        this.sepulturaService.getNextFicha(),
      ]);
      this.tiposSepultura = tipos;
      this.sepForm.numero_ficha = String(nextFicha);
      this.sepForm.tipo = tipos[0]?.nombre ?? '';
      if (!this.encargados.length) {
        this.encargados = await this.lookupService.getEncargados();
      }
    } finally {
      this.loadingModal = false;
      this.cdr.markForCheck();
    }
  }

  cerrarModalSep(): void { this.modalSepVisible = false; this.cdr.markForCheck(); }

  async guardarSepultura(): Promise<void> {
    if (!this.sepForm.numero_ficha || !this.sepForm.tipo) return;
    const cliente = this.cliente();
    if (!cliente) return;

    this.savingSep = true;
    this.sepErrorMsg = '';
    try {
      await this.sepulturaService.create({ ...this.sepForm, id_cliente: cliente.id });
      this.dashboardStatsService.invalidate();
      // Recargar sepulturas del cliente
      const sepulturas = await this.sepulturaService.getByClienteId(cliente.id);
      if (sepulturas?.length) {
        const actualizadas = await Promise.all(
          sepulturas.map(async (sep) => {
            const [mascotas, contratos] = await Promise.all([
              this.mascotaService.getByIdSepultura(sep.id),
              this.contratoService.getByIdSepultura(sep.id),
            ]);
            return { ...sep, mascotas: mascotas ?? [], contratos };
          }),
        );
        this.sepulturasConDatos.set(actualizadas);
      }
      this.modalSepVisible = false;
    } catch (e: any) {
      this.sepErrorMsg = e?.error?.error ?? 'Error al crear la sepultura';
    } finally {
      this.savingSep = false;
      this.cdr.markForCheck();
    }
  }

  private formatFechaPdf(fecha: string | null | undefined): string {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }

  readonly generandoPdf = signal(false);

  async descargarPdf(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente || this.generandoPdf()) return;
    this.generandoPdf.set(true);

    try {
    // jspdf/jspdf-autotable pesan ~560kB con sus dependencias (html2canvas) — se
    // cargan solo al pedir el PDF, no en el bundle de la página de detalle.
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF();
    const margin = 14;
    const verde: [number, number, number] = [27, 67, 50];
    const verdeClaro: [number, number, number] = [240, 253, 244];
    const gris: [number, number, number] = [107, 125, 112];
    const textoOscuro: [number, number, number] = [17, 27, 20];

    // ── Cabecera ─────────────────────────────────────
    doc.setFillColor(...verde);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('ASIS — Cementerio Bioparque Buinzoo', margin, 14);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ficha de cliente · Generado el ${new Date().toLocaleDateString('es-CL')}`, margin, 24);

    let y = 44;

    // ── Datos del cliente ─────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...verde);
    doc.text('Datos del cliente', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [],
      body: [
        ['Nombre completo', this.nombreCompleto],
        ['RUT',            cliente.rut || '—'],
        ['Dirección',      cliente.direccion || '—'],
        ['Comuna',         cliente.comuna || '—'],
        ['Ciudad',         cliente.ciudad || '—'],
        ['Teléfono',       cliente.telefono || '—'],
        ['Celular',        cliente.celular || '—'],
        ['Email',          cliente.email || '—'],
        ['Fecha creación', this.formatFechaPdf(cliente.fecha_creacion as unknown as string)],
      ],
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 48, fillColor: [246,249,247], textColor: [107,125,112] },
        1: { textColor: textoOscuro },
      },
      styles: { fontSize: 9, cellPadding: 4 },
      theme: 'plain',
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ── Sepulturas ────────────────────────────────────
    for (const sep of this.sepulturasConDatos()) {
      if (y > 255) { doc.addPage(); y = 14; }

      const ef = this.estadoEfectivo(sep);

      // Encabezado de sepultura
      doc.setFillColor(...verdeClaro);
      doc.roundedRect(margin, y, 210 - margin * 2, 9, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...verde);
      doc.text(`Sepultura  ·  Ficha #${sep.numero_ficha}  ·  ${sep.tipo}  ·  ${ef.label}`, margin + 3, y + 6);
      y += 14;

      // Info de sepultura
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [],
        body: [
          ['Ubic. anterior', sep.ubicacion_vieja || '—', 'Ubic. actual', sep.ubicacion_nueva || '—'],
          ['Observaciones', { content: sep.observaciones || '—', colSpan: 3 }],
        ],
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 42, fillColor: [246,249,247], textColor: [107,125,112] },
          2: { fontStyle: 'bold', cellWidth: 42, fillColor: [246,249,247], textColor: [107,125,112] },
        },
        styles: { fontSize: 8.5, cellPadding: 3 },
        theme: 'plain',
      });
      y = (doc as any).lastAutoTable.finalY + 5;

      // Contratos
      if (sep.contratos.length) {
        if (y > 248) { doc.addPage(); y = 14; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...gris);
        doc.text('CONTRATOS', margin, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [['F. Pago', 'F. Vencimiento', 'Monto', 'Forma de pago', 'N° Comprobante']],
          body: sep.contratos
            .sort((a, b) => new Date(b.fecha_vencimiento).getTime() - new Date(a.fecha_vencimiento).getTime())
            .map(c => [
              this.formatFechaPdf(c.fecha_pago),
              this.formatFechaPdf(c.fecha_vencimiento),
              this.formatCLP(c.valor_renovacion),
              c.forma_pago || '—',
              c.numero_comprobante || '—',
            ]),
          headStyles: { fillColor: verde, textColor: [255,255,255], fontSize: 7.5, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3 },
          theme: 'striped',
          alternateRowStyles: { fillColor: [248,250,248] },
        });
        y = (doc as any).lastAutoTable.finalY + 5;
      }

      // Mascotas
      if (sep.mascotas.length) {
        if (y > 248) { doc.addPage(); y = 14; }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...gris);
        doc.text('MASCOTAS', margin, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [['Nombre', 'Especie', 'Raza', 'Sexo', 'F. Muerte', 'F. Sepultación', 'Estado']],
          body: sep.mascotas.map(m => [
            m.nombre,
            m.especie,
            m.raza || '—',
            m.sexo || '—',
            this.formatFechaPdf(m.fecha_muerte),
            this.formatFechaPdf(m.fecha_sepultacion),
            m.estado,
          ]),
          headStyles: { fillColor: verde, textColor: [255,255,255], fontSize: 7.5, fontStyle: 'bold' },
          styles: { fontSize: 8, cellPadding: 3 },
          theme: 'striped',
          alternateRowStyles: { fillColor: [248,250,248] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      y += 3;
    }

    // ── Pie de página ────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 160);
      doc.text('ASIS — Cementerio Bioparque Buinzoo', margin, 290);
      doc.text(`Pág. ${i} de ${totalPages}`, 210 - margin, 290, { align: 'right' });
    }

    const rutLimpio = (cliente.rut ?? String(cliente.id)).replace(/\./g, '').replace('-', '_');
    doc.save(`ficha_${rutLimpio}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      this.generandoPdf.set(false);
    }
  }

  estadoEfectivo(sep: SepulturaConDatos): { label: string; css: string } {
    const raw = (sep.estado ?? '').toLowerCase().trim();

    if (raw.includes('terminado') || raw.includes('terminada')) {
      return { label: 'Terminado', css: 'terminado' };
    }

    if (sep.contratos.length === 0) {
      return { label: 'Sin contrato', css: 'sin-contrato' };
    }

    if (raw.includes('uso') || raw.includes('activo') || raw.includes('activa') || raw.includes('vigente')) {
      const tieneVigente = sep.contratos.some(c => !this.esVencido(c.fecha_vencimiento));
      return tieneVigente
        ? { label: 'Activo',                css: 'en-uso'   }
        : { label: 'Pendiente renovación', css: 'pendiente' };
    }

    // Estado genérico no reconocido: mostrar como viene
    return { label: sep.estado ?? '—', css: raw.replace(/\s+/g, '-') };
  }

  // ── Handlers de monto CLP ────────────────────────────────────────────────

  onMontoContratoInput(value: string): void {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    this.contratoForm['valor_renovacion'] = isNaN(num) ? 0 : num;
  }

  onMontoContratoBlur(): void {
    const v = this.contratoForm['valor_renovacion'];
    this.montoContratoStr = v > 0 ? this.formatCLP(v) : '';
    this.cdr.markForCheck();
  }

  onMontoEditContratoInput(value: string): void {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    this.editContratoForm.valor_renovacion = isNaN(num) ? 0 : num;
  }

  onMontoEditContratoBlur(): void {
    const v = this.editContratoForm.valor_renovacion;
    this.montoEditContratoStr = v > 0 ? this.formatCLP(v) : '';
    this.cdr.markForCheck();
  }

  // ── Notificación de renovación por ficha ─────────────────────────────────

  readonly lastSent = signal<string | null>(null);
  notifyingSepulturaId: number | null = null;
  notifiedSepulturaId: number | null = null;
  notifyMessage = '';
  notifyError = '';

  async loadLastSent(): Promise<void> {
    const cliente = this.cliente();
    if (!cliente) return;
    try {
      const res = await firstValueFrom(this.dashboardStatsService.getLastSentForClient(cliente.id));
      if (this.id() !== cliente.id) return; // la navegación cambió de cliente mientras esto cargaba
      this.lastSent.set(res.lastSent ? new Date(res.lastSent).toLocaleString('es-CL') : null);
    } catch {
      // silencioso — el estado de "Último envío" simplemente no se actualiza
    } finally {
      this.cdr.markForCheck();
    }
  }

  /** Notifica por correo la renovación de una ficha (sepultura) puntual. */
  async notifyFicha(sep: SepulturaConDatos, uc: Contrato): Promise<void> {
    if (this.notifyingSepulturaId !== null) return;
    const estado = this.estadoContrato(uc.fecha_vencimiento as unknown as string);
    if (estado === 'vigente') return;
    const tipo: NotificationType = estado === 'vencido' ? 'vencidas' : 'por-vencer';
    if (!confirm(`¿Enviar aviso de renovación por la ficha N° ${sep.numero_ficha}?`)) return;

    this.notifyingSepulturaId = sep.id;
    this.notifiedSepulturaId = sep.id;
    this.notifyMessage = '';
    this.notifyError = '';
    try {
      await firstValueFrom(this.dashboardStatsService.queueIndividualNotification(tipo, sep.id));
      this.notifyMessage = 'Notificación agregada a la cola de envío.';
      await this.loadLastSent();
    } catch (error) {
      const code = error instanceof HttpErrorResponse ? error.error?.code : undefined;
      const message = error instanceof HttpErrorResponse && typeof error.error?.error === 'string'
        ? error.error.error
        : 'No fue posible solicitar el envío. Intenta nuevamente.';
      // El cooldown de 24h es una regla de negocio esperada, no una falla —
      // se muestra con el estilo informativo, no con el de error.
      if (code === 'CLIENT_NOTIFICATION_COOLDOWN') {
        this.notifyMessage = message;
      } else {
        this.notifyError = message;
      }
    } finally {
      this.notifyingSepulturaId = null;
      this.cdr.markForCheck();
    }
  }
}
