import { Component, OnInit, computed, signal, inject, viewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ClienteService } from '../../services/cliente/cliente.service';
import { clean, format } from 'rut.js';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Clientes implements OnInit {
  private readonly clienteService = inject(ClienteService);
  private readonly router = inject(Router);
  readonly tableWrapperRef        = viewChild<ElementRef<HTMLElement>>('tableWrapper');
  private readonly clientesContainerRef = viewChild<ElementRef<HTMLElement>>('clientesContainer');

  readonly clientes    = this.clienteService.clientes;
  readonly loading     = this.clienteService.loading;
  readonly error       = this.clienteService.error;
  readonly page        = this.clienteService.page;
  readonly totalPages  = this.clienteService.totalPages;
  readonly total       = this.clienteService.total;

  readonly showCreateForm = signal<boolean>(false);
  readonly buscarInput    = signal('');
  readonly emailEstado    = signal('todos');
  readonly comunaFilter   = signal('');
  exportando = false;

  private readonly nuevoClienteVacio = {
    rut: '', nombre: '', apellido1: '', apellido2: '',
    direccion: '', comuna: '', ciudad: '', telefono: '', celular: '', email: '',
  };
  readonly nuevoClienteForm  = signal({ ...this.nuevoClienteVacio });
  readonly creandoCliente    = signal(false);
  readonly crearClienteErrorMsg = signal('');

  readonly nuevoClienteFormValido = computed(() => {
    const f = this.nuevoClienteForm();
    return !!f.rut.trim() && !!f.nombre.trim() && !!f.apellido1.trim() && !!f.email.trim();
  });

  readonly displayedClientes = computed(() =>
    this.clientes().map(c => ({
      ...c,
      nombre_completo: `${c.nombre} ${c.apellido1} ${c.apellido2}`.trim(),
    }))
  );

  /** Returns page numbers to render, with null as ellipsis placeholder. */
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
    this.clienteService.getAllClientes();
  }

  onBuscarInput(value: string): void {
    const esRut = /^[\d.\-kK]+$/.test(value.trim());
    if (esRut) {
      const cleaned = clean(value);
      this.buscarInput.set(cleaned.length > 0 ? format(cleaned) : value);
    } else {
      this.buscarInput.set(value);
    }
  }

  buscar(): void {
    const v = this.buscarInput().trim();
    if (!v) { this.loadFiltered(1); return; }
    const esRut = /^[\d.\-kK]+$/.test(v);
    esRut
      ? this.loadFiltered(1, v)
      : this.loadFiltered(1, undefined, v);
  }

  limpiar(): void {
    this.buscarInput.set('');
    this.loadFiltered(1);
  }

  applyFilters(): void { this.loadFiltered(1); }

  clearFilters(): void {
    this.emailEstado.set('todos');
    this.comunaFilter.set('');
    this.loadFiltered(1);
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.buscar();
  }

  toggleCreateForm(): void {
    const abriendo = !this.showCreateForm();
    if (abriendo) {
      this.nuevoClienteForm.set({ ...this.nuevoClienteVacio });
      this.crearClienteErrorMsg.set('');
    }
    this.showCreateForm.set(abriendo);
  }

  updateNuevoCliente(campo: keyof typeof this.nuevoClienteVacio, valor: string): void {
    this.nuevoClienteForm.update(f => ({ ...f, [campo]: valor }));
  }

  onRutInput(value: string): void {
    const cleaned = clean(value);
    this.updateNuevoCliente('rut', cleaned.length > 0 ? format(cleaned) : value);
  }

  async crearCliente(): Promise<void> {
    if (!this.nuevoClienteFormValido() || this.creandoCliente()) return;
    this.creandoCliente.set(true);
    this.crearClienteErrorMsg.set('');
    try {
      await this.clienteService.create(this.nuevoClienteForm());
      this.showCreateForm.set(false);
      this.loadFiltered(1);
    } catch (e: any) {
      this.crearClienteErrorMsg.set(e?.error?.error ?? 'Error al crear el cliente');
    } finally {
      this.creandoCliente.set(false);
    }
  }

  changePage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages()) return;
    this.scrollContentToTop();
    this.loadFiltered(newPage);
  }

  retry(): void {
    this.loadFiltered(this.page());
  }

  private loadFiltered(page: number, rut?: string, nombre?: string): void {
    const value = this.buscarInput().trim();
    const searchRut = rut ?? (value && /^[\d.\-kK]+$/.test(value) ? value : undefined);
    const searchName = nombre ?? (value && !searchRut ? value : undefined);
    void this.clienteService.getAllClientes(
      page, 20, searchRut, searchName, this.emailEstado(), this.comunaFilter().trim()
    );
  }

  irAFicha(id: number): void {
    this.router.navigate(['/asis/clientes', id]);
  }

  exportar(): void {
    this.exportando = true;
    this.clienteService.exportar().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clientes-pda.csv';
        a.click();
        URL.revokeObjectURL(url);
        this.exportando = false;
      },
      error: () => { this.exportando = false; },
    });
  }

  private scrollContentToTop(): void {
    this.tableWrapperRef()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    this.clientesContainerRef()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
