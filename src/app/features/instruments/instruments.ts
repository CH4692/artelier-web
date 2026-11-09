import { ScrollableTable } from '../../shared/ui/scrollable-table';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { InstrumentsService } from './instruments.service';
import { InstrumentFilters, InstrumentPage, InstrumentState } from './instrument.models';
import { instrumentError } from './instrument-errors';
import { INSTRUMENT_COPY } from './instrument.copy';
import { PageHeader } from '../../shared/ui/page-header';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { ErrorMessage } from '../../shared/ui/error-message';
import { EmptyState } from '../../shared/ui/empty-state';
import { StatusBadge } from '../../shared/ui/status-badge';
@Component({
  selector: 'app-instruments',
  imports: [
    ScrollableTable,
    RouterLink,
    ReactiveFormsModule,
    PageHeader,
    LoadingIndicator,
    ErrorMessage,
    EmptyState,
    StatusBadge,
  ],
  templateUrl: './instruments.html',
  styleUrl: './instruments.scss',
})
export class Instruments {
  protected readonly copy = INSTRUMENT_COPY;
  readonly types = Object.entries(INSTRUMENT_COPY.types);
  readonly ownerships = Object.entries(INSTRUMENT_COPY.ownerships);
  private readonly service = inject(InstrumentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly filters = signal<InstrumentFilters>({
    q: '',
    type: '',
    ownership: '',
    include_archived: false,
    offset: 0,
    limit: 25,
    sort_by: 'id',
    sort_order: 'asc',
  });
  readonly state = signal<InstrumentState<InstrumentPage>>({ status: 'loading' });
  readonly sorts = [
    ['id', 'Instrumentennummer'],
    ['identification_number', 'Kennnummer'],
    ['type', 'Typ'],
    ['maker', 'Hersteller'],
    ['year_of_manufacture', 'Baujahr'],
    ['customer_id', 'Kundennummer'],
    ['ownership', 'Eigentum'],
  ];
  constructor() {
    this.search.valueChanges
      .pipe(
        debounceTime(300),
        map((q) => q.trim()),
        takeUntilDestroyed(),
      )
      .subscribe((q) => {
        if (q.length <= 200 && q !== this.filters().q)
          this.navigate({ q: q || null, offset: null });
      });
    merge(this.route.queryParamMap, this.reload.pipe(map(() => this.route.snapshot.queryParamMap)))
      .pipe(
        switchMap((params) => {
          const offset = Number(params.get('offset') ?? 0);
          const filters: InstrumentFilters = {
            q: (params.get('q') ?? '').trim(),
            type: params.get('type') ?? '',
            ownership: params.get('ownership') ?? '',
            include_archived: params.get('include_archived') === 'true',
            offset: Number.isSafeInteger(offset) && offset >= 0 ? offset : 0,
            limit: 25,
            sort_by: params.get('sort_by') ?? 'id',
            sort_order: params.get('sort_order') ?? 'asc',
          };
          this.filters.set(filters);
          this.search.setValue(filters.q, { emitEvent: false });
          if (
            filters.q.length > 200 ||
            (filters.type && !this.types.some(([key]) => key === filters.type)) ||
            (filters.ownership && !this.ownerships.some(([key]) => key === filters.ownership)) ||
            !this.sorts.some(([key]) => key === filters.sort_by) ||
            !['asc', 'desc'].includes(filters.sort_order)
          )
            return of<InstrumentState<InstrumentPage>>({
              status: 'error',
              message: 'Die Suchfilter sind ungültig. Bitte setzen Sie die Filter zurück.',
              notFound: false,
            });
          return this.service.list(filters).pipe(
            map((data) => ({ status: 'loaded', data }) as InstrumentState<InstrumentPage>),
            catchError((error) =>
              of<InstrumentState<InstrumentPage>>({
                status: 'error',
                message: instrumentError(error),
                notFound: false,
              }),
            ),
            startWith<InstrumentState<InstrumentPage>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.state.set(state));
  }
  retry() {
    this.reload.next();
  }
  changeFilter(key: string, value: string | boolean) {
    this.navigate({ q: this.search.value.trim() || null, [key]: value || null, offset: null });
  }
  reset() {
    this.search.setValue('', { emitEvent: false });
    void this.router.navigate(['/instruments']);
  }
  page(delta: number) {
    this.navigate({ offset: Math.max(0, this.filters().offset + 25 * delta) || null });
  }
  pageNumber() {
    return Math.floor(this.filters().offset / 25) + 1;
  }
  nextPage(data: InstrumentPage) {
    return data.total === null
      ? data.instruments.length === 25
      : this.filters().offset + 25 < data.total;
  }
  private navigate(queryParams: Record<string, string | number | boolean | null>) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }
}
