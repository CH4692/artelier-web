import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-indicator',
  template: `<p role="status" aria-live="polite">
    <span class="spinner" aria-hidden="true"></span>{{ label() }}
  </p>`,
  styles: `
    p {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--color-muted);
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid var(--color-border);
      border-top-color: var(--color-accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `,
})
export class LoadingIndicator {
  readonly label = input('Loading…');
}
