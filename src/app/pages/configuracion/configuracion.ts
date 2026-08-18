import { Component, inject, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth.service';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Configuracion {
  readonly auth = inject(AuthService);
}
