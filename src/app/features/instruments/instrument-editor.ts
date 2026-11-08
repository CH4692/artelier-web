import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  finalize,
  map,
  merge,
  of,
  skip,
  startWith,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { CustomerSelect } from '../customers/customer-select';
import { PageHeader } from '../../shared/ui/page-header';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { ErrorMessage } from '../../shared/ui/error-message';
import {
  Instrument,
  InstrumentInput,
  InstrumentState,
  InstrumentType,
  Ownership,
} from './instrument.models';
import { InstrumentsService } from './instruments.service';
import { instrumentError, instrumentId } from './instrument-errors';
import { INSTRUMENT_COPY } from './instrument.copy';
import { manufactureYear, optionalCustomerId, positiveMeasurement } from './instrument.validators';

@Component({
  selector: 'app-instrument-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CustomerSelect,
    PageHeader,
    LoadingIndicator,
    ErrorMessage,
  ],
  templateUrl: './instrument-editor.html',
  styleUrl: './instrument-editor.scss',
})
export class InstrumentEditor {
  protected readonly copy = INSTRUMENT_COPY;
  readonly types = Object.entries(INSTRUMENT_COPY.types);
  readonly ownerships = Object.entries(INSTRUMENT_COPY.ownerships);
  readonly textFields = ['maker', 'identification_number'] as const;
  private readonly service = inject(InstrumentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  readonly editing = this.route.snapshot.data['edit'] === true;
  readonly state = signal<InstrumentState<Instrument | null>>({ status: 'loading' });
  readonly error = signal('');
  readonly pending = signal(false);
  readonly type = signal<InstrumentType | ''>('');
  readonly ownership = signal<Ownership>('unassigned');
  readonly form = new FormGroup({
    type: new FormControl<InstrumentType | ''>('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^(violin|viola|cello|double_bass|bow)$/),
      ],
    }),
    ownership: new FormControl<Ownership>('unassigned', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(/^(customer|workshop|unassigned)$/)],
    }),
    maker: new FormControl('', { nonNullable: true }),
    identification_number: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    year_of_manufacture: new FormControl<number | null>(null, manufactureYear),
    body_length_mm: new FormControl<number | null>(null, positiveMeasurement),
    bow_weight_g: new FormControl<number | null>(null, positiveMeasurement),
    customer_id: new FormControl<number | null>(null, optionalCustomerId),
  });
  constructor() {
    this.form.controls.type.valueChanges.pipe(takeUntilDestroyed()).subscribe((type) => {
      this.type.set(type);
      if (type === 'bow') this.form.controls.body_length_mm.setValue(null);
      else this.form.controls.bow_weight_g.setValue(null);
    });
    this.form.controls.ownership.valueChanges.pipe(takeUntilDestroyed()).subscribe((ownership) => {
      this.ownership.set(ownership);
      if (ownership !== 'customer') this.form.controls.customer_id.setValue(null);
    });
    merge(this.route.paramMap, this.reload.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          this.error.set('');
          if (!this.editing)
            return of<InstrumentState<Instrument | null>>({ status: 'loaded', data: null });
          const id = instrumentId(params.get('id'));
          if (id === null)
            return of<InstrumentState<Instrument | null>>({
              status: 'error',
              message: 'Instrument nicht gefunden.',
              notFound: true,
            });
          return this.service.get(id).pipe(
            map((data) => ({ status: 'loaded', data }) as InstrumentState<Instrument | null>),
            catchError((error) =>
              of<InstrumentState<Instrument | null>>({
                status: 'error',
                message: instrumentError(error),
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              }),
            ),
            startWith<InstrumentState<Instrument | null>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        if (state.status === 'loaded') {
          const data = state.data;
          this.form.reset(
            {
              type: data?.type ?? '',
              ownership: data?.ownership ?? 'unassigned',
              maker: data?.maker ?? '',
              identification_number: data?.identification_number ?? '',
              notes: data?.notes ?? '',
              year_of_manufacture: data?.year_of_manufacture ?? null,
              body_length_mm: data?.body_length_mm ?? null,
              bow_weight_g: data?.bow_weight_g ?? null,
              customer_id: data?.customer_id ?? null,
            },
            { emitEvent: false },
          );
          this.type.set(data?.type ?? '');
          this.ownership.set(data?.ownership ?? 'unassigned');
        }
      });
  }
  retry() {
    this.reload.next();
  }
  fieldError(field: keyof InstrumentInput) {
    const control = this.form.controls[field];
    if (!control.touched || !control.invalid) return '';
    if (control.hasError('server')) return 'Bitte prüfen Sie diese Angabe.';
    if (control.hasError('year'))
      return 'Bitte geben Sie ein ganzzahliges Baujahr zwischen 1 und 9999 ein.';
    if (control.hasError('measurement'))
      return 'Bitte geben Sie eine endliche Zahl größer als null ein.';
    if (field === 'customer_id') return 'Bitte wählen Sie einen vorhandenen Kunden aus.';
    return 'Bitte wählen Sie einen gültigen Wert aus.';
  }
  submit() {
    if (this.pending() || this.state().status !== 'loaded') return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const current = this.state();
    if (current.status !== 'loaded') return;
    const raw = this.form.getRawValue();
    if (!raw.type) return;
    const data: InstrumentInput = {
      ...raw,
      type: raw.type,
      maker: raw.maker || null,
      identification_number: raw.identification_number || null,
      notes: raw.notes || null,
      customer_id: raw.ownership === 'customer' ? raw.customer_id : null,
      body_length_mm: raw.type === 'bow' ? null : raw.body_length_mm,
      bow_weight_g: raw.type === 'bow' ? raw.bow_weight_g : null,
    };
    this.pending.set(true);
    this.error.set('');
    const request = current.data
      ? this.service.update(current.data.id, data)
      : this.service.create(data);
    request
      .pipe(
        takeUntil(this.route.paramMap.pipe(skip(1))),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (instrument) => {
          void this.router.navigate(['/instruments', instrument.id], {
            state: { instrumentConfirmation: this.editing ? 'updated' : 'created' },
          });
        },
        error: (error: unknown) => {
          this.error.set(instrumentError(error));
          if (
            error instanceof HttpErrorResponse &&
            error.status === 422 &&
            Array.isArray(error.error?.detail)
          ) {
            for (const item of error.error.detail) {
              const field = Array.isArray(item?.loc) ? item.loc.at(-1) : null;
              if (typeof field === 'string' && Object.hasOwn(this.form.controls, field))
                this.form.controls[field as keyof InstrumentInput].setErrors({ server: true });
            }
          }
        },
      });
  }
}
