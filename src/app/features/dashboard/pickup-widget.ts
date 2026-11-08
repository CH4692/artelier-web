import { DatePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { ErrorMessage } from '../../shared/ui/error-message';
import { StatusBadge } from '../../shared/ui/status-badge';
import { INSTRUMENT_COPY } from '../instruments/instrument.copy';
import { REPAIR_STATUSES } from '../repairs/repair.copy';
import { repairError } from '../repairs/repair-errors';
import { DashboardService } from './dashboard.service';
import { PickupState } from './dashboard.models';
@Component({
  selector: 'app-pickup-widget',
  imports: [DatePipe, RouterLink, LoadingIndicator, ErrorMessage, StatusBadge],
  templateUrl: './pickup-widget.html',
  styleUrl: './pickup-widget.scss',
})
export class PickupWidget {
  readonly refreshKey = input(0);
  readonly state = signal<PickupState>({ status: 'loading' });
  readonly pending = signal(false);
  readonly types = INSTRUMENT_COPY.types;
  readonly statuses = REPAIR_STATUSES;
  private readonly service = inject(DashboardService);
  private readonly reload = new Subject<void>();
  constructor() {
    merge(toObservable(this.refreshKey), this.reload)
      .pipe(
        switchMap(() => {
          this.pending.set(true);
          return this.service.pickup().pipe(
            map((data) => ({ status: 'loaded', data }) as PickupState),
            catchError((error) =>
              of<PickupState>({ status: 'error', message: repairError(error) }),
            ),
            startWith<PickupState>({ status: 'loading' }),
            finalize(() => this.pending.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }
  refresh() {
    if (!this.pending()) this.reload.next();
  }
}
