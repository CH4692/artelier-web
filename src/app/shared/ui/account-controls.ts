import { UI_DE } from '../i18n/ui.de';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-account-controls',
  template: `
    <div class="account">
      <span class="identity">{{ auth.session.user()?.email }}</span>
      <button type="button" (click)="logout()" [disabled]="pending()" [attr.aria-busy]="pending()">
        {{ pending() ? copy.loggingOut : copy.logout }}
      </button>
    </div>
    @if (error()) {
      <p class="field-error" role="alert">{{ error() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
    }
    .account {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: var(--space-3);
    }
    .identity {
      overflow-wrap: anywhere;
      min-width: 0;
      max-width: 20rem;
      font-size: var(--text-sm);
    }
    .field-error {
      max-width: 24rem;
      font-size: var(--text-sm);
    }
  `,
})
export class AccountControls {
  protected readonly copy = UI_DE.account;
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly pending = signal(false);
  readonly error = signal('');

  logout() {
    if (this.pending()) return;
    this.pending.set(true);
    this.error.set('');
    this.auth
      .logout()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate(['/login'], { replaceUrl: true });
        },
        error: () => this.error.set(this.copy.logoutError),
      });
  }
}
