import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `<section class="panel" [attr.aria-label]="heading()">
    @if (eyebrow()) {
      <span class="eyebrow">{{ eyebrow() }}</span>
    }
    <h2>{{ heading() }}</h2>
    <p class="intro">{{ description() }}</p>
    <ng-content />
  </section>`,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin-top: 16px;
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly eyebrow = input('');
}
