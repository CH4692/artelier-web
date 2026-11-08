import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, map, merge, of, Subject, switchMap } from 'rxjs';
import { PageHeader } from '../../shared/ui/page-header';
import { ErrorMessage } from '../../shared/ui/error-message';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { Customer } from '../customers/customer.models';
import { CustomersService } from '../customers/customers.service';
import { Instrument, InstrumentState } from '../instruments/instrument.models';
import { instrumentId } from '../instruments/instrument-errors';
import { InstrumentsService } from '../instruments/instruments.service';
import { INSTRUMENT_COPY } from '../instruments/instrument.copy';
import { Repair, RepairDetailData } from './repair.models';
import { RepairsService } from './repairs.service';
import { REPAIR_STATUSES } from './repair.copy';
import { repairError } from './repair-errors';
import { RepairStatusEditor } from './repair-status-editor';
@Component({
  selector: 'app-repair-detail',
  imports: [
    DatePipe,
    RouterLink,
    PageHeader,
    ErrorMessage,
    LoadingIndicator,
    StatusBadge,
    RepairStatusEditor,
  ],
  templateUrl: './repair-detail.html',
  styleUrl: './repairs.scss',
})
export class RepairDetail {
  readonly labels = REPAIR_STATUSES;
  readonly types = INSTRUMENT_COPY.types;
  readonly state = signal<InstrumentState<RepairDetailData>>({ status: 'loading' });
  readonly customer = signal<Customer | null>(null);
  readonly instrument = signal<Instrument | null>(null);
  readonly relationsPending = signal(false);
  readonly customerError = signal(false);
  readonly instrumentError = signal(false);
  readonly confirmation = signal('');
  private readonly service = inject(RepairsService);
  private readonly customers = inject(CustomersService);
  private readonly instruments = inject(InstrumentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  constructor() {
    const confirm = inject(Router).currentNavigation()?.extras.state?.['repairConfirmation'];
    this.confirmation.set(
      confirm === 'created'
        ? 'Der Reparaturauftrag wurde angelegt.'
        : confirm === 'updated'
          ? 'Die Auftragsdaten wurden gespeichert.'
          : '',
    );
    let first = true;
    merge(this.route.paramMap, this.reload.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          if (!first) this.confirmation.set('');
          first = false;
          this.state.set({ status: 'loading' });
          this.customer.set(null);
          this.instrument.set(null);
          this.customerError.set(false);
          this.instrumentError.set(false);
          this.relationsPending.set(false);
          const id = instrumentId(params.get('id'));
          if (id === null) {
            this.state.set({ status: 'error', message: 'Auftrag nicht gefunden.', notFound: true });
            return of(null);
          }
          return this.service.get(id).pipe(
            switchMap((repair) => {
              this.state.set({ status: 'loaded', data: repair });
              this.relationsPending.set(true);
              return forkJoin({
                customer:
                  repair.customer_id === null
                    ? of(null)
                    : this.customers.get(repair.customer_id).pipe(
                        catchError(() => {
                          this.customerError.set(true);
                          return of(null);
                        }),
                      ),
                instrument: this.instruments.get(repair.instrument_id).pipe(
                  catchError(() => {
                    this.instrumentError.set(true);
                    return of(null);
                  }),
                ),
              });
            }),
            catchError((error) => {
              this.state.set({
                status: 'error',
                message: repairError(error),
                notFound: error instanceof HttpErrorResponse && error.status === 404,
              });
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((relations) => {
        this.customer.set(relations?.customer ?? null);
        this.instrument.set(relations?.instrument ?? null);
        this.relationsPending.set(false);
      });
  }
  retry() {
    this.reload.next();
  }
  statusSaved(repair: Repair) {
    const current = this.state();
    if (current.status === 'loaded' && current.data.id === repair.id)
      this.state.set({ status: 'loaded', data: { ...current.data, ...repair } });
  }
}
