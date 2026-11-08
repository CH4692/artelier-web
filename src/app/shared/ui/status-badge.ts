import { Component, input } from '@angular/core';

export type StatusTone = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [attr.data-tone]="tone()"><ng-content /></span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      padding: var(--space-1) var(--space-2);
      border: 1px solid currentColor;
      border-radius: var(--radius-sm);
      font-size: var(--text-xs);
      font-weight: var(--weight-medium);
      line-height: var(--leading-body);
    }
    [data-tone='success'] {
      color: var(--color-success);
      background: var(--color-success-surface);
    }
    [data-tone='warning'] {
      color: var(--color-warning);
      background: var(--color-warning-surface);
    }
    [data-tone='error'] {
      color: var(--color-error);
      background: var(--color-error-surface);
    }
    [data-tone='info'] {
      color: var(--color-info);
      background: var(--color-info-surface);
    }
  `,
})
export class StatusBadge {
  readonly tone = input<StatusTone>('info');
}
