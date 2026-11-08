import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  map,
  of,
  switchMap,
  finalize,
  Subject,
  merge,
  startWith,
  takeUntil,
  skip,
} from 'rxjs';
import { CustomersService } from './customers.service';
import { Customer, CustomerInput, LoadState } from './customer.models';
import { customerError, customerId, isMissingCustomer } from './customer-errors';
import { nameValidators, emailValidators, phoneValidator } from './customer.validators';
import { CUSTOMER_COPY } from './customer.copy';
import { PageHeader } from '../../shared/ui/page-header';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { ErrorMessage } from '../../shared/ui/error-message';

@Component({
  selector: 'app-customer-editor',
  imports: [ReactiveFormsModule, RouterLink, PageHeader, LoadingIndicator, ErrorMessage],
  templateUrl: './customer-editor.html',
  styleUrl: './customer-editor.scss',
})
export class CustomerEditor {
  protected readonly copy = CUSTOMER_COPY;
  private readonly service = inject(CustomersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  readonly editing = this.route.snapshot.data['edit'] === true;
  readonly fields = ['first_name', 'last_name', 'email', 'phone'] as const;
  readonly state = signal<LoadState<Customer | null>>({ status: 'loading' });
  readonly pending = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    first_name: new FormControl('', { nonNullable: true, validators: nameValidators }),
    last_name: new FormControl('', { nonNullable: true, validators: nameValidators }),
    email: new FormControl('', { nonNullable: true, validators: emailValidators }),
    phone: new FormControl('', { nonNullable: true, validators: phoneValidator }),
  });

  constructor() {
    merge(this.route.paramMap, this.reload.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          this.error.set('');
          if (!this.editing)
            return of<LoadState<Customer | null>>({ status: 'loaded', data: null });
          const id = customerId(params.get('id'));
          if (id === null)
            return of<LoadState<Customer | null>>({
              status: 'error',
              message: 'Dieser Kunde wurde nicht gefunden.',
              notFound: true,
            });
          return this.service.get(id).pipe(
            map((data) => ({ status: 'loaded', data }) as LoadState<Customer | null>),
            catchError((error) =>
              of<LoadState<Customer | null>>({
                status: 'error',
                message: customerError(error),
                notFound: isMissingCustomer(error),
              }),
            ),
            startWith<LoadState<Customer | null>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => {
        this.state.set(state);
        if (state.status === 'loaded')
          this.form.reset({
            first_name: state.data?.first_name ?? '',
            last_name: state.data?.last_name ?? '',
            email: state.data?.email ?? '',
            phone: state.data?.phone ?? '',
          });
      });
  }
  load() {
    this.reload.next();
  }
  fieldError(field: (typeof this.fields)[number]): string {
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return '';
    if (control.hasError('server')) return 'Bitte prüfen Sie diese Angabe.';
    if (control.hasError('required')) return 'Bitte geben Sie einen Namen ein.';
    if (control.hasError('maxlength'))
      return `Maximal ${field === 'email' ? 254 : field === 'phone' ? 64 : 100} Zeichen erlaubt.`;
    return field === 'phone'
      ? 'Bitte geben Sie 3–15 Ziffern mit optionaler internationaler Vorwahl ein.'
      : 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
  }
  submit() {
    if (this.pending() || this.state().status !== 'loaded') return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const state = this.state();
    if (state.status !== 'loaded') return;
    const raw = this.form.getRawValue();
    const data: CustomerInput = {
      first_name: raw.first_name.trim(),
      last_name: raw.last_name.trim(),
      email: raw.email.trim() || null,
      phone: raw.phone.trim() || null,
    };
    this.pending.set(true);
    this.error.set('');
    const request = state.data
      ? this.service.update(state.data.id, data)
      : this.service.create(data);
    request
      .pipe(
        takeUntil(this.route.paramMap.pipe(skip(1))),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (customer) => {
          void this.router.navigate(['/customers', customer.id], {
            state: { customerConfirmation: this.editing ? 'updated' : 'created' },
          });
        },
        error: (error: unknown) => {
          this.error.set(customerError(error));
          if (
            error instanceof HttpErrorResponse &&
            error.status === 422 &&
            Array.isArray(error.error?.detail)
          ) {
            for (const detail of error.error.detail) {
              const field = Array.isArray(detail?.loc) ? detail.loc[detail.loc.length - 1] : null;
              if (this.fields.includes(field))
                this.form.controls[field as (typeof this.fields)[number]].setErrors({
                  server: true,
                });
            }
          }
        },
      });
  }
}
