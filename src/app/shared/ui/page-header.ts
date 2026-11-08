import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
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
  readonly heading = input.required<string>();
  readonly eyebrow = input('');
  readonly description = input('');
}
