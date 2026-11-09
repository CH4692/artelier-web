import { ScrollableTable } from '../../shared/ui/scrollable-table';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, map, of, startWith, Subject, switchMap, merge } from 'rxjs';
import { PageHeader } from '../../shared/ui/page-header';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { StatusBadge } from '../../shared/ui/status-badge';
import { ErrorMessage } from '../../shared/ui/error-message';
import { EmptyState } from '../../shared/ui/empty-state';
import { CustomerPage, LoadState } from './customer.models';
import { CustomersService } from './customers.service';
import { customerError } from './customer-errors';
import { CUSTOMER_COPY } from './customer.copy';

@Component({
  selector: 'app-customers',
  imports: [
    ScrollableTable,
    RouterLink,
    ReactiveFormsModule,
    PageHeader,
    LoadingIndicator,
    StatusBadge,
    ErrorMessage,
    EmptyState,
  ],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class Customers {
  protected readonly copy = CUSTOMER_COPY;
  private readonly service = inject(CustomersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly reload = new Subject<void>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly state = signal<LoadState<CustomerPage>>({ status: 'loading' });
  readonly offset = signal(0);
  readonly includeArchived = signal(false);
  readonly term = signal('');
  readonly pageSize = 25;

  constructor() {
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => value.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q.length <= 200 && q !== this.term()) this.navigate({ q: q || null, offset: null });
      });
    merge(this.route.queryParamMap, this.reload.pipe(map(() => this.route.snapshot.queryParamMap)))
      .pipe(
        switchMap((params) => {
          const rawOffset = Number(params.get('offset') ?? 0);
          this.offset.set(Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0);
          this.includeArchived.set(params.get('include_archived') === 'true');
          this.term.set((params.get('q') ?? '').trim());
          this.search.setValue(this.term(), { emitEvent: false });
          if (this.term().length > 200)
            return of<LoadState<CustomerPage>>({
              status: 'error',
              message: 'Die Suche darf höchstens 200 Zeichen enthalten.',
              notFound: false,
            });
          return this.service
            .list(this.term(), this.offset(), this.pageSize, this.includeArchived())
            .pipe(
              map((data) => ({ status: 'loaded', data }) as LoadState<CustomerPage>),
              catchError((error) =>
                of<LoadState<CustomerPage>>({
                  status: 'error',
                  message: customerError(error),
                  notFound: false,
                }),
              ),
              startWith<LoadState<CustomerPage>>({ status: 'loading' }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }

  retry() {
    this.reload.next();
  }
  setArchived(include: boolean) {
    this.navigate({
      q: this.search.value.trim() || null,
      include_archived: include ? 'true' : null,
      offset: null,
    });
  }
  clearSearch() {
    this.search.setValue('');
    this.navigate({ q: null, offset: null });
  }
  page(delta: number) {
    this.navigate({ offset: Math.max(0, this.offset() + delta * this.pageSize) || null });
  }
  pageNumber() {
    return Math.floor(this.offset() / this.pageSize) + 1;
  }
  hasNext(data: CustomerPage) {
    return data.total === null
      ? data.customers.length === this.pageSize
      : this.offset() + this.pageSize < data.total;
  }
  private navigate(params: Record<string, string | number | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }
}
