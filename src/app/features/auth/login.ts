import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { safeReturnUrl } from '../../core/auth/return-url';

@Component({
  host: { lang: 'en' },
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <section class="panel login" aria-labelledby="login-heading">
      <span class="eyebrow">Artelier · Workshop workspace</span>
      <h1 id="login-heading">Welcome back.</h1>
      <p class="intro">Sign in to your workshop.</p>
      @if (expired) {
        <p role="status">Your session has expired. Please sign in again.</p>
      }
      @if (auth.session.restorationFailed()) {
        <p role="status">We couldn't check your existing session. Please try signing in.</p>
      }
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate [attr.aria-busy]="pending()">
        <div class="field">
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="username"
            inputmode="email"
            required
            maxlength="320"
            [readOnly]="pending()"
            [attr.aria-invalid]="invalid('email')"
            [attr.aria-describedby]="invalid('email') ? 'email-error' : null"
          />
          @if (invalid('email')) {
            <p id="email-error" class="field-error">Enter a valid email address.</p>
          }
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            required
            maxlength="1024"
            [readOnly]="pending()"
            [attr.aria-invalid]="invalid('password')"
            [attr.aria-describedby]="invalid('password') ? 'password-error' : null"
          />
          @if (invalid('password')) {
            <p id="password-error" class="field-error">
              Enter your password (up to 1024 characters).
            </p>
          }
        </div>
        @if (error()) {
          <p class="field-error" role="alert">{{ error() }}</p>
        }
        <button type="submit" [disabled]="pending()" [attr.aria-busy]="pending()">
          {{ pending() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </section>
  `,
  styles: `
    .login {
      width: 100%;
      max-width: 30rem;
      margin: var(--space-7) auto;
    }
    .field {
      margin: var(--space-5) 0;
    }
    button {
      width: 100%;
    }
    .field-error {
      margin-bottom: 0;
    }
  `,
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly expired = this.route.snapshot.queryParamMap.get('reason') === 'session-expired';
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(1024)],
    }),
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.form.controls.password.reset());
  }

  invalid(field: 'email' | 'password') {
    const control = this.form.controls[field];
    return control.touched && control.invalid;
  }

  submit() {
    if (this.pending()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.pending.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email, password)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.pending.set(false);
          this.form.controls.password.reset();
        }),
      )
      .subscribe({
        next: () => {
          const destination = this.auth.session.workshopAccess()
            ? safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'))
            : '/access-denied';
          void this.router.navigateByUrl(destination, { replaceUrl: true });
        },
        error: (error: unknown) => {
          const status = error instanceof HttpErrorResponse ? error.status : 0;
          this.error.set(
            status === 401
              ? 'Email or password is incorrect.'
              : status === 429
                ? 'Too many sign-in attempts. Please wait and try again.'
                : 'Sign-in could not be completed. Please try again.',
          );
        },
      });
  }
}
