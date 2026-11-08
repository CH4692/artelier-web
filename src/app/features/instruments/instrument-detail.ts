import { skip, takeUntil } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { Customer, LoadState } from '../customers/customer.models';
import { CustomersService } from '../customers/customers.service';
import { customerError } from '../customers/customer-errors';
import { PageHeader } from '../../shared/ui/page-header';
import { ErrorMessage } from '../../shared/ui/error-message';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { Instrument, InstrumentState } from './instrument.models';
import { InstrumentsService } from './instruments.service';
import { instrumentError, instrumentId } from './instrument-errors';
import { InstrumentHistoryView } from './instrument-history';
import { INSTRUMENT_COPY } from './instrument.copy';

@Component({
  selector: 'app-instrument-detail',
  imports: [
    RouterLink,
    PageHeader,
    ErrorMessage,
    LoadingIndicator,
    StatusBadge,
    InstrumentHistoryView,
  ],
  templateUrl: './instrument-detail.html',
  styleUrl: './instrument-detail.scss',
})
export class InstrumentDetail {
  protected readonly copy = INSTRUMENT_COPY;
  private readonly service = inject(InstrumentsService);
  private readonly customers = inject(CustomersService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  private readonly urls = new Set<string>();
  readonly state = signal<InstrumentState<Instrument>>({ status: 'loading' });
  readonly customer = signal<LoadState<Customer | null>>({ status: 'loaded', data: null });
  readonly confirmation = signal('');
  readonly qrPending = signal(false);
  readonly qrError = signal('');
  constructor() {
    const confirmation =
      inject(Router).currentNavigation()?.extras.state?.['instrumentConfirmation'];
    this.confirmation.set(
      confirmation === 'created'
        ? 'Das Instrument wurde angelegt.'
        : confirmation === 'updated'
          ? 'Die Instrumentendaten wurden gespeichert.'
          : '',
    );
    let first = true;
    const records = merge(
      this.route.paramMap,
      this.reload.pipe(map(() => this.route.snapshot.paramMap)),
    ).pipe(
      switchMap((params) => {
        if (!first) this.confirmation.set('');
        first = false;
        this.qrError.set('');
        const id = instrumentId(params.get('id'));
        this.state.set({ status: 'loading' });
        this.customer.set({ status: 'loaded', data: null });
        if (id === null) {
          this.state.set({
            status: 'error',
            message: 'Instrument nicht gefunden.',
            notFound: true,
          });
          return of<LoadState<Customer | null>>({ status: 'loaded', data: null });
        }
        return this.service.get(id).pipe(
          switchMap((instrument) => {
            this.state.set({ status: 'loaded', data: instrument });
            if (instrument.customer_id === null)
              return of<LoadState<Customer | null>>({ status: 'loaded', data: null });
            return this.customers.get(instrument.customer_id).pipe(
              map((data) => ({ status: 'loaded', data }) as LoadState<Customer | null>),
              catchError((error) =>
                of<LoadState<Customer | null>>({
                  status: 'error',
                  message: customerError(error),
                  notFound: false,
                }),
              ),
              startWith<LoadState<Customer | null>>({ status: 'loading' }),
            );
          }),
          catchError((error) => {
            this.state.set({
              status: 'error',
              message: instrumentError(error),
              notFound: error instanceof HttpErrorResponse && error.status === 404,
            });
            return of<LoadState<Customer | null>>({ status: 'loaded', data: null });
          }),
        );
      }),
    );
    records.pipe(takeUntilDestroyed()).subscribe((customer) => this.customer.set(customer));
    this.destroyRef.onDestroy(() => this.urls.forEach((url) => URL.revokeObjectURL(url)));
  }
  retry() {
    this.reload.next();
  }
  downloadQr() {
    const state = this.state();
    if (this.qrPending() || state.status !== 'loaded') return;
    this.qrPending.set(true);
    this.qrError.set('');
    this.service
      .qr(state.data.id)
      .pipe(
        takeUntil(this.route.paramMap.pipe(skip(1))),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.qrPending.set(false)),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.urls.add(url);
          const link = document.createElement('a');
          link.href = url;
          link.download = `instrument-${state.data.id}.svg`;
          link.click();
          setTimeout(() => {
            URL.revokeObjectURL(url);
            this.urls.delete(url);
          }, 1000);
        },
        error: () =>
          this.qrError.set(
            'Der QR-Code konnte nicht geladen werden. Bitte versuchen Sie es erneut oder prüfen Sie die QR-Konfiguration.',
          ),
      });
  }
}
