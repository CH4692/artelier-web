import { applyApiValidation } from '../../core/api/form-validation';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
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
import { PageHeader } from '../../shared/ui/page-header';
import { ErrorMessage } from '../../shared/ui/error-message';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { CustomerSelect } from '../customers/customer-select';
import { instrumentId } from '../instruments/instrument-errors';
import { InstrumentState } from '../instruments/instrument.models';
import { InstrumentSelect } from './instrument-select';
import { RepairDetailData, RepairUpdate } from './repair.models';
import { REPAIR_FIELDS } from './repair.copy';
import { RepairsService } from './repairs.service';
import { repairError } from './repair-errors';
import {
  dateValidator,
  descriptionValidator,
  notesValidator,
  requiredReference,
} from './repair.validators';
@Component({
  selector: 'app-repair-editor',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    ErrorMessage,
    LoadingIndicator,
    CustomerSelect,
    InstrumentSelect,
  ],
  templateUrl: './repair-editor.html',
  styleUrl: './repairs.scss',
})
export class RepairEditor {
  private readonly service = inject(RepairsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  readonly editing = this.route.snapshot.data['edit'] === true;
  readonly fields = REPAIR_FIELDS;
  readonly state = signal<InstrumentState<RepairDetailData | null>>({ status: 'loading' });
  readonly pending = signal(false);
  readonly error = signal('');
  readonly customerId = signal<number | null>(null);
  readonly instrumentId = signal<number | null>(null);
  readonly form = new FormGroup({
    customer_id: new FormControl<number | null>(null, this.editing ? [] : requiredReference),
    instrument_id: new FormControl<number | null>(null, this.editing ? [] : requiredReference),
    work_description: new FormControl('', { nonNullable: true, validators: descriptionValidator }),
    expected_completion_date: new FormControl('', { nonNullable: true, validators: dateValidator }),
    internal_notes: new FormControl('', { nonNullable: true, validators: notesValidator }),
  });
  constructor() {
    this.form.controls.customer_id.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      this.customerId.set(id);
      this.form.controls.instrument_id.setValue(null);
    });
    this.form.controls.instrument_id.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.instrumentId.set(id));
    merge(this.route.paramMap, this.reload.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          this.error.set('');
          if (!this.editing)
            return of<InstrumentState<RepairDetailData | null>>({ status: 'loaded', data: null });
          const id = instrumentId(params.get('id'));
          if (id === null)
            return of<InstrumentState<RepairDetailData | null>>({
              status: 'error',
              message: 'Auftrag nicht gefunden.',
              notFound: true,
            });
          return this.service.get(id).pipe(
            map((data) => ({ status: 'loaded', data }) as InstrumentState<RepairDetailData | null>),
            catchError((error) =>
              of<InstrumentState<RepairDetailData | null>>({
                status: 'error',
                message: repairError(error),
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              }),
            ),
            startWith<InstrumentState<RepairDetailData | null>>({ status: 'loading' }),
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
              customer_id: data?.customer_id ?? null,
              instrument_id: data?.instrument_id ?? null,
              work_description: data?.work_description ?? '',
              expected_completion_date: data?.expected_completion_date ?? '',
              internal_notes: data?.internal_notes ?? '',
            },
            { emitEvent: false },
          );
          this.customerId.set(data?.customer_id ?? null);
          this.instrumentId.set(data?.instrument_id ?? null);
        }
      });
  }
  retry() {
    this.reload.next();
  }
  fieldError(field: keyof RepairEditor['form']['controls']) {
    const c = this.form.controls[field];
    if (!c.touched || !c.invalid) return '';
    if (c.hasError('server')) return 'Bitte prüfen Sie diese Angabe.';
    if (field === 'work_description')
      return 'Bitte geben Sie eine Arbeitsbeschreibung mit 1 bis 10.000 Zeichen ein.';
    if (field === 'internal_notes')
      return 'Interne Notizen dürfen höchstens 10.000 Zeichen enthalten.';
    if (field === 'expected_completion_date') return 'Bitte geben Sie ein gültiges Datum ein.';
    return 'Bitte treffen Sie eine Auswahl aus den vorhandenen Datensätzen.';
  }
  submit() {
    if (this.pending() || this.state().status !== 'loaded') return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const current = this.state();
    if (current.status !== 'loaded') return;
    const raw = this.form.getRawValue();
    const data: RepairUpdate = {
      work_description: raw.work_description.trim(),
      expected_completion_date: raw.expected_completion_date || null,
      internal_notes: raw.internal_notes.trim() || null,
    };
    if (!this.editing && (raw.customer_id === null || raw.instrument_id === null)) return;
    const request = current.data
      ? this.service.update(current.data.id, data)
      : this.service.create({
          ...data,
          customer_id: raw.customer_id!,
          instrument_id: raw.instrument_id!,
        });
    this.pending.set(true);
    this.error.set('');
    request
      .pipe(
        takeUntil(this.route.paramMap.pipe(skip(1))),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.pending.set(false)),
      )
      .subscribe({
        next: (repair) => {
          void this.router.navigate(['/repairs', repair.id], {
            state: { repairConfirmation: this.editing ? 'updated' : 'created' },
          });
        },
        error: (error: unknown) => {
          this.error.set(repairError(error));
          applyApiValidation(this.form, error);
        },
      });
  }
}
