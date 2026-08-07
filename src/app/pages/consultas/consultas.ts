import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate, query } from '@angular/animations';

@Component({
  selector: 'app-consultas',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './consultas.html',
  styleUrl: './consultas.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('tabAnimation', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(12px)' }),
          animate('200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class Consultas {
  getTabKey(outlet: RouterOutlet): string {
    return outlet?.isActivated ? (outlet.activatedRoute?.routeConfig?.path || '') : '';
  }
}
