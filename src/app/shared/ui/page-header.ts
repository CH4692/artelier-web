import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  host: { '[class.compact]': 'compact()' },
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    :host(.compact) h1 {
      font-size: clamp(1.75rem, 3vw, 2.25rem);
      margin: var(--space-2) 0;
    }
    :host(.compact) .intro {
      font-size: var(--text-base);
      margin: 0;
    }
  `,
  template: `<header>
    @if (eyebrow()) {
      <span class="eyebrow">{{ eyebrow() }}</span>
    }
    <h1>{{ heading() }}</h1>
    @if (description()) {
      <p class="intro">{{ description() }}</p>
    }
    <ng-content />
  </header>`,
})
export class PageHeader {
  readonly compact = input(false);
  readonly heading = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
}
