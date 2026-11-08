import { inject, Injectable } from '@angular/core';
import { catchError, concat, forkJoin, map, of, switchMap } from 'rxjs';
import { CustomersService } from '../customers/customers.service';
import { InstrumentsService } from '../instruments/instruments.service';
import { Repair } from '../repairs/repair.models';
import { responseTotal } from '../instruments/instrument-errors';
import { PickupEntry, PickupSnapshot } from './dashboard.models';
import { ApiService } from '../../core/api/api.service';

export type MetricState =
  | { status: 'available'; value: number }
  | { status: 'loading' | 'unavailable' | 'error'; previousValue?: number };

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  private readonly customers = inject(CustomersService);
  private readonly instruments = inject(InstrumentsService);

  /** Emit the server page before optional names; a failed lookup never hides an order. */
  pickup() {
    return this.api
      .getResponse<Repair[]>('repairs', {
        status: 'ready_for_pickup',
        offset: 0,
        limit: 5,
        include_archived: false,
      })
      .pipe(
        switchMap((response) => {
          const repairs = response.body ?? [];
          const entries: PickupEntry[] = repairs.map((repair) => ({
            repair,
            customer: null,
            instrument: null,
            customerUnavailable: false,
            instrumentUnavailable: false,
          }));
          const snapshot: PickupSnapshot = {
            entries,
            total: responseTotal(response.headers.get('X-Total-Count')),
            relationsPending: entries.length > 0,
          };
          if (!entries.length) return of(snapshot);
          const customerIds = [
            ...new Set(
              repairs.flatMap((repair) =>
                repair.customer_id === null ? [] : [repair.customer_id],
              ),
            ),
          ];
          const instrumentIds = [...new Set(repairs.map((repair) => repair.instrument_id))];
          const customers = customerIds.length
            ? forkJoin(
                customerIds.map((id) =>
                  this.customers.get(id).pipe(
                    map((data) => ({ id, data })),
                    catchError(() => of({ id, data: null })),
                  ),
                ),
              )
            : of([]);
          const instruments = forkJoin(
            instrumentIds.map((id) =>
              this.instruments.get(id).pipe(
                map((data) => ({ id, data })),
                catchError(() => of({ id, data: null })),
              ),
            ),
          );
          return concat(
            of(snapshot),
            forkJoin({ customers, instruments }).pipe(
              map((relations) => ({
                ...snapshot,
                relationsPending: false,
                entries: entries.map((entry) => {
                  const customer =
                    relations.customers.find((item) => item.id === entry.repair.customer_id)
                      ?.data ?? null;
                  const instrument =
                    relations.instruments.find((item) => item.id === entry.repair.instrument_id)
                      ?.data ?? null;
                  return {
                    ...entry,
                    customer,
                    instrument,
                    customerUnavailable: entry.repair.customer_id !== null && customer === null,
                    instrumentUnavailable: instrument === null,
                  };
                }),
              })),
            ),
          );
        }),
      );
  }

  /** Use the server's filtered total, never the size of a paginated response. */
  readyForPickupCount() {
    return this.api
      .getResponse<readonly Repair[]>('repairs', {
        status: 'ready_for_pickup',
        limit: 1,
      })
      .pipe(
        map((response): MetricState => {
          const total = response.headers.get('X-Total-Count');
          if (total === null || !/^\d+$/.test(total) || !Number.isSafeInteger(Number(total))) {
            return { status: 'unavailable' };
          }
          return { status: 'available', value: Number(total) };
        }),
      );
  }
}
