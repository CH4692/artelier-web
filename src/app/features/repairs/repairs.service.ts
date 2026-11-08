import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { responseTotal } from '../instruments/instrument-errors';
import {
  Repair,
  RepairCreate,
  RepairDetailData,
  RepairFilter,
  RepairPage,
  RepairStatus,
  RepairUpdate,
} from './repair.models';
@Injectable({ providedIn: 'root' })
export class RepairsService {
  private readonly api = inject(ApiService);
  list(filter: RepairFilter) {
    const params: Record<string, string | number | boolean> = {
      status: filter.status,
      include_archived: filter.include_archived,
      offset: filter.offset,
      limit: 25,
    };
    if (filter.customer_id !== null) params['customer_id'] = filter.customer_id;
    return this.api
      .getResponse<Repair[]>('repairs', params)
      .pipe(
        map(
          (response) =>
            ({
              repairs: response.body ?? [],
              total: responseTotal(response.headers.get('X-Total-Count')),
            }) as RepairPage,
        ),
      );
  }
  get(id: number) {
    return this.api.get<RepairDetailData>(`repairs/${id}`);
  }
  create(data: RepairCreate) {
    return this.api.post<Repair>('repairs', data);
  }
  update(id: number, data: RepairUpdate) {
    return this.api.patch<Repair>(`repairs/${id}`, data);
  }
  changeStatus(id: number, status: RepairStatus) {
    return this.api.patch<Repair>(`repairs/${id}/status`, { status });
  }
}
