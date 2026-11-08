import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Customer, CustomerInput, CustomerOverview, CustomerPage } from './customer.models';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly api = inject(ApiService);
  list(q: string, offset: number, limit: number, includeArchived: boolean) {
    return this.api
      .getResponse<Customer[]>('customers', { q, offset, limit, include_archived: includeArchived })
      .pipe(
        map((response): CustomerPage => {
          const header = response.headers.get('X-Total-Count');
          const total =
            header !== null && /^\d+$/.test(header) && Number.isSafeInteger(Number(header))
              ? Number(header)
              : null;
          return { customers: response.body ?? [], total };
        }),
      );
  }
  get(id: number) {
    return this.api.get<Customer>(`customers/${id}`);
  }
  overview(id: number) {
    return this.api.get<CustomerOverview>(`customers/${id}/overview?include_archived=true`);
  }
  create(data: CustomerInput) {
    return this.api.post<Customer>('customers', data);
  }
  update(id: number, data: Partial<CustomerInput>) {
    return this.api.patch<Customer>(`customers/${id}`, data);
  }
  archive(id: number) {
    return this.api.patch<Customer>(`customers/${id}/archive`, { is_archived: true });
  }
}
