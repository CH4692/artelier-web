import { Component, input } from '@angular/core';

@Component({
  selector: 'app-workspace-header',
  template: `<header>
    <span class="current-page" aria-live="polite">{{ title() }}</span>
    <div class="account-controls">
      <ng-content select="[account-controls]" />
      <span class="workspace-tag">Workshop workspace</span>
    </div>
  </header>`,
  styles: `
    :host {
      display: block;
    }
    header {
      min-height: 82px;
      padding: var(--space-3) 48px;
      border-bottom: 1px solid var(--color-border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      font-size: 13px;
    }
    .current-page {
      font-weight: 600;
      color: var(--color-text);
    }
    .account-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      min-width: 0;
      max-width: 100%;
    }
    .workspace-tag {
      border: 1px solid var(--color-border);
      border-radius: 24px;
      padding: 7px 13px;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    @media (max-width: 800px) {
      header {
        min-height: 64px;
        padding: var(--space-3) 24px;
      }
    }
    @media (max-width: 450px) {
      .workspace-tag {
        display: none;
      }
    }
  `,
})
export class WorkspaceHeader {
  readonly title = input.required<string>();
}
