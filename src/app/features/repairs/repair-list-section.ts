import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, map, of, startWith, Subject, switchMap } from 'rxjs';
import { ErrorMessage } from '../../shared/ui/error-message';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { InstrumentState } from '../instruments/instrument.models';
import { RepairsService } from './repairs.service';
import { RepairPage, RepairStatus } from './repair.models';
import { REPAIR_STATUSES } from './repair.copy';
import { repairError } from './repair-errors';
@Component({
  selector: 'app-repair-list-section',
  imports: [DatePipe, RouterLink, ErrorMessage, LoadingIndicator, StatusBadge],
  templateUrl: './repair-list-section.html',
  styleUrl: './repairs.scss',
})
export class RepairListSection {
  readonly status = input.required<RepairStatus>();
  readonly customerId = input<number | null>(null);
  readonly includeArchived = input(false);
  readonly labels = REPAIR_STATUSES;
  readonly state = signal<InstrumentState<RepairPage>>({ status: 'loading' });
  readonly offset = signal(0);
  private readonly service = inject(RepairsService);
  private readonly request = new Subject<number>();
  constructor() {
    const filters = combineLatest([
      toObservable(this.status),
      toObservable(this.customerId),
      toObservable(this.includeArchived),
    ]);
    filters
      .pipe(
        switchMap(([status, customer_id, include_archived]) =>
          this.request.pipe(
            startWith(0),
            switchMap((offset) => {
              this.offset.set(offset);
              return this.service.list({ status, customer_id, include_archived, offset }).pipe(
                map((data) => ({ status: 'loaded', data }) as InstrumentState<RepairPage>),
                catchError((error) =>
                  of<InstrumentState<RepairPage>>({
                    status: 'error',
                    message: repairError(error),
                    notFound: false,
                  }),
                ),
                startWith<InstrumentState<RepairPage>>({ status: 'loading' }),
              );
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }
  retry() {
    this.request.next(this.offset());
  }
  page(delta: number) {
    this.request.next(Math.max(0, this.offset() + delta * 25));
  }
  hasNext(data: RepairPage) {
    return data.total === null ? data.repairs.length === 25 : this.offset() + 25 < data.total;
  }
  pageNumber() {
    return Math.floor(this.offset() / 25) + 1;
  }
}
