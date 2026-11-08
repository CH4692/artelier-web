import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import {
  HistoryPage,
  Instrument,
  InstrumentFilters,
  InstrumentHistory,
  InstrumentInput,
  InstrumentPage,
} from './instrument.models';
import { responseTotal } from './instrument-errors';
@Injectable({ providedIn: 'root' })
export class InstrumentsService {
  private readonly api = inject(ApiService);
  list(filters: InstrumentFilters) {
    const params: Record<string, string | number | boolean> = {
      q: filters.q,
      offset: filters.offset,
      limit: filters.limit,
      include_archived: filters.include_archived,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    };
    if (filters.type) params['type'] = filters.type;
    if (filters.ownership) params['ownership'] = filters.ownership;
    return this.api
      .getResponse<Instrument[]>('instruments', params)
      .pipe(
        map(
          (response) =>
            ({
              instruments: response.body ?? [],
              total: responseTotal(response.headers.get('X-Total-Count')),
            }) as InstrumentPage,
        ),
      );
  }
  get(id: number) {
    return this.api.get<Instrument>(`instruments/${id}`);
  }
  create(data: InstrumentInput) {
    return this.api.post<Instrument>('instruments', data);
  }
  update(id: number, data: Partial<InstrumentInput>) {
    return this.api.patch<Instrument>(`instruments/${id}`, data);
  }
  history(id: number, offset: number, limit = 25) {
    return this.api
      .getResponse<InstrumentHistory>(`instruments/${id}/history`, { offset, limit })
      .pipe(
        map((response) => {
          if (!response.body) throw new Error('Missing instrument history response');
          return {
            history: response.body,
            total: responseTotal(response.headers.get('X-Total-Count')),
          } as HistoryPage;
        }),
      );
  }
  qr(id: number) {
    return this.api.getBlob(`instruments/${id}/qr-code.svg`);
  }
}
