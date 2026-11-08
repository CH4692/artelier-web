import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-message',
  template: `<div class="panel" role="alert">
    <h2>{{ heading() }}</h2>
    <p>{{ message() }}</p>
    <ng-content />
  </div>`,
  styles: `
    .panel {
      border-inline-start: 4px solid var(--color-error);
    }
    p {
      margin-bottom: 0;
    }
  `,
})
export class ErrorMessage {
  readonly heading = input('Something went wrong');
  readonly message = input.required<string>();
}
