import { FormsModule } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/ui/page-header';
import { CustomerSelect } from '../customers/customer-select';
import { instrumentId } from '../instruments/instrument-errors';
import { RepairListSection } from './repair-list-section';
import { OPEN_STATUSES, CLOSED_STATUSES, REPAIR_STATUSES } from './repair.copy';
import { RepairStatus } from './repair.models';
@Component({
  selector: 'app-repairs',
  imports: [FormsModule, RouterLink, PageHeader, CustomerSelect, RepairListSection],
  templateUrl: './repairs.html',
  styleUrl: './repairs.scss',
})
export class Repairs {
  readonly labels = REPAIR_STATUSES;
  readonly view = signal('open');
  readonly status = signal<RepairStatus | ''>('');
  readonly customerId = signal<number | null>(null);
  readonly includeArchived = signal(false);
  readonly invalid = signal(false);
  readonly available = computed(() => (this.view() === 'closed' ? CLOSED_STATUSES : OPEN_STATUSES));
  readonly visible = computed(() =>
    this.status() ? [this.status() as RepairStatus] : this.available(),
  );
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = params.get('view') ?? 'open';
      const status = params.get('status') ?? '';
      const customer = params.get('customer_id');
      const archived = params.get('archived');
      const values = view === 'closed' ? CLOSED_STATUSES : OPEN_STATUSES;
      this.invalid.set(
        !['open', 'closed'].includes(view) ||
          (!!status && !values.includes(status as RepairStatus)) ||
          (customer !== null && instrumentId(customer) === null) ||
          (archived !== null && !['true', 'false'].includes(archived)),
      );
      this.view.set(view);
      this.status.set(status as RepairStatus | '');
      this.customerId.set(instrumentId(customer));
      this.includeArchived.set(archived === 'true');
    });
  }
  setView(view: string) {
    this.navigate({ view, status: null });
  }
  setStatus(status: string) {
    this.navigate({ status: status || null });
  }
  setCustomer(id: number | null) {
    this.navigate({ customer_id: id });
  }
  setArchived(value: boolean) {
    this.navigate({ archived: value || null });
  }
  reset() {
    void this.router.navigate(['/repairs']);
  }
  private navigate(queryParams: Record<string, string | number | boolean | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
