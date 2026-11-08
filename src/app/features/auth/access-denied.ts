import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountControls } from '../../shared/ui/account-controls';

@Component({
  host: { lang: 'en' },
  selector: 'app-access-denied',
  imports: [AccountControls, RouterLink],
  template: `<section class="panel">
    <span class="eyebrow">Access denied</span>
    <h1>This workspace isn't available to your account.</h1>
    <p>
      Your account does not have permission for the requested action. Contact your workshop
      administrator if you need access.
    </p>
    <a routerLink="/dashboard">Return to dashboard</a>
    <app-account-controls />
  </section>`,
  styles: `
    app-account-controls {
      display: block;
      margin-top: var(--space-5);
    }
  `,
})
export class AccessDenied {}
