import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';

export type MetricState =
  | { status: 'available'; value: number }
  | { status: 'loading' | 'unavailable' | 'error'; previousValue?: number };

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  /** Use the server's filtered total, never the size of a paginated response. */
  readyForPickupCount() {
    return this.api
      .getResponse<readonly unknown[]>('repairs', {
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
