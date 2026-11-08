import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { Customer, CustomerPage, LoadState } from './customer.models';
import { CustomersService } from './customers.service';
import { customerError } from './customer-errors';

/** Explicit selection: typing a query never silently changes the customer ID. */
@Component({
  selector: 'app-customer-select',
  imports: [ReactiveFormsModule],
  templateUrl: './customer-select.html',
  styleUrl: './customer-select.scss',
})
export class CustomerSelect {
  readonly selectedId = input<number | null>(null);
  readonly disabled = input(false);
  readonly inputId = input('customer-picker');
  readonly selectionChange = output<number | null>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly open = signal(false);
  readonly selected = signal<LoadState<Customer | null>>({ status: 'loaded', data: null });
  readonly results = signal<LoadState<CustomerPage>>({ status: 'loading' });
  readonly offset = signal(0);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly service = inject(CustomersService);
  private readonly lookup = new Subject<{ q: string; offset: number }>();
  private readonly reloadSelection = new Subject<number | null>();

  constructor() {
    merge(toObservable(this.selectedId), this.reloadSelection)
      .pipe(
        switchMap((id) =>
          id === null
            ? of<LoadState<Customer | null>>({ status: 'loaded', data: null })
            : this.service.get(id).pipe(
                map((data) => ({ status: 'loaded', data }) as LoadState<Customer | null>),
                catchError((error) =>
                  of<LoadState<Customer | null>>({
                    status: 'error',
                    message: customerError(error),
                    notFound: false,
                  }),
                ),
                startWith<LoadState<Customer | null>>({ status: 'loading' }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.selected.set(state));
    merge(
      this.lookup,
      this.search.valueChanges.pipe(
        debounceTime(300),
        map((q) => ({ q: q.trim(), offset: 0 })),
      ),
    )
      .pipe(
        switchMap((query) => {
          this.offset.set(query.offset);
          if (query.q.length > 200)
            return of<LoadState<CustomerPage>>({
              status: 'error',
              message: 'Die Suche darf höchstens 200 Zeichen enthalten.',
              notFound: false,
            });
          return this.service.list(query.q, query.offset, 10, true).pipe(
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
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.results.set(state));
  }
  show() {
    if (!this.disabled()) {
      this.open.set(true);
      this.lookup.next({ q: this.search.value.trim(), offset: 0 });
    }
  }
  choose(id: number | null) {
    if (!this.disabled()) {
      this.selectionChange.emit(id);
      this.open.set(false);
      this.trigger()?.nativeElement.focus();
    }
  }
  retry() {
    this.lookup.next({ q: this.search.value.trim(), offset: this.offset() });
  }
  retrySelected() {
    this.reloadSelection.next(this.selectedId());
  }
  page(delta: number) {
    this.lookup.next({
      q: this.search.value.trim(),
      offset: Math.max(0, this.offset() + delta * 10),
    });
  }
  hasNext(page: CustomerPage) {
    return page.total === null ? page.customers.length === 10 : this.offset() + 10 < page.total;
  }
}
