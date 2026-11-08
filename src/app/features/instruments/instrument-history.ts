import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { ErrorMessage } from '../../shared/ui/error-message';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { StatusBadge, StatusTone } from '../../shared/ui/status-badge';
import { HistoryPage, InstrumentState, RepairStatus } from './instrument.models';
import { InstrumentsService } from './instruments.service';
import { instrumentError } from './instrument-errors';
import { INSTRUMENT_COPY } from './instrument.copy';

@Component({
  selector: 'app-instrument-history',
  imports: [RouterLink, DatePipe, ErrorMessage, LoadingIndicator, StatusBadge],
  templateUrl: './instrument-history.html',
  styleUrl: './instrument-history.scss',
})
export class InstrumentHistoryView {
  readonly instrumentId = input.required<number>();
  protected readonly copy = INSTRUMENT_COPY;
  private readonly service = inject(InstrumentsService);
  private readonly requests = new Subject<{ id: number; offset: number }>();
  readonly state = signal<InstrumentState<HistoryPage>>({ status: 'loading' });
  readonly offset = signal(0);
  constructor() {
    merge(toObservable(this.instrumentId).pipe(map((id) => ({ id, offset: 0 }))), this.requests)
      .pipe(
        switchMap((query) => {
          this.offset.set(query.offset);
          return this.service.history(query.id, query.offset).pipe(
            map((data) => ({ status: 'loaded', data }) as InstrumentState<HistoryPage>),
            catchError((error) =>
              of<InstrumentState<HistoryPage>>({
                status: 'error',
                message: instrumentError(error),
                notFound: false,
              }),
            ),
            startWith<InstrumentState<HistoryPage>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }
  retry() {
    this.requests.next({ id: this.instrumentId(), offset: this.offset() });
  }
  page(delta: number) {
    this.requests.next({
      id: this.instrumentId(),
      offset: Math.max(0, this.offset() + delta * 25),
    });
  }
  nextPage(data: HistoryPage) {
    return data.total === null
      ? data.history.repair_orders.length === 25
      : this.offset() + 25 < data.total;
  }
  pageNumber() {
    return Math.floor(this.offset() / 25) + 1;
  }
  tone(status: RepairStatus): StatusTone {
    return status === 'completed' || status === 'ready_for_pickup'
      ? 'success'
      : status === 'awaiting_approval' || status === 'awaiting_materials'
        ? 'warning'
        : 'info';
  }
}
