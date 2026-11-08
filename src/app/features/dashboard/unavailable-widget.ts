import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
@Component({
  selector: 'app-unavailable-widget',
  imports: [RouterLink],
  template: `<section class="panel" [attr.aria-labelledby]="widgetId()">
    <h2 [id]="widgetId()">{{ heading() }}</h2>
    <p class="notice"><span aria-hidden="true">◷ </span>Übersicht derzeit nicht verfügbar</p>
    <p>{{ description() }}</p>
    <a routerLink="/repairs" [queryParams]="{ view: 'open' }">Offene Aufträge prüfen →</a>
  </section>`,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    h2 {
      font-size: var(--text-lg);
      margin-top: 0;
    }
    .notice {
      font-weight: var(--weight-medium);
      color: var(--color-warning);
    }
    p {
      overflow-wrap: anywhere;
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: var(--control-height);
    }
  `,
})
export class UnavailableWidget {
  readonly widgetId = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
