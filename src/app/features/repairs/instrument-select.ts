import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { Instrument, InstrumentPage, InstrumentState } from '../instruments/instrument.models';
import { InstrumentsService } from '../instruments/instruments.service';
import { INSTRUMENT_COPY } from '../instruments/instrument.copy';
import { instrumentError } from '../instruments/instrument-errors';
@Component({
  selector: 'app-instrument-select',
  imports: [ReactiveFormsModule],
  templateUrl: './instrument-select.html',
  styleUrl: '../customers/customer-select.scss',
})
export class InstrumentSelect {
  readonly customerId = input<number | null>(null);
  readonly selectedId = input<number | null>(null);
  readonly disabled = input(false);
  readonly selectionChange = output<number | null>();
  readonly search = new FormControl('', { nonNullable: true });
  readonly labels = INSTRUMENT_COPY.types;
  readonly selected = signal<InstrumentState<Instrument | null>>({ status: 'loaded', data: null });
  readonly results = signal<InstrumentState<InstrumentPage>>({
    status: 'loaded',
    data: { instruments: [], total: 0 },
  });
  readonly offset = signal(0);
  readonly open = signal(false);
  private readonly service = inject(InstrumentsService);
  private readonly requests = new Subject<{ q: string; offset: number }>();
  private readonly selectedRetry = new Subject<number | null>();
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  constructor() {
    merge(toObservable(this.selectedId), this.selectedRetry)
      .pipe(
        switchMap((id) =>
          id === null
            ? of<InstrumentState<Instrument | null>>({ status: 'loaded', data: null })
            : this.service.get(id).pipe(
                map((data) => ({ status: 'loaded', data }) as InstrumentState<Instrument | null>),
                catchError((error) =>
                  of<InstrumentState<Instrument | null>>({
                    status: 'error',
                    message: instrumentError(error),
                    notFound: false,
                  }),
                ),
                startWith<InstrumentState<Instrument | null>>({ status: 'loading' }),
              ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.selected.set(state));
    toObservable(this.customerId)
      .pipe(
        switchMap((customerId) => {
          this.search.setValue('', { emitEvent: false });
          this.offset.set(0);
          this.open.set(false);
          if (customerId === null)
            return of<InstrumentState<InstrumentPage>>({
              status: 'loaded',
              data: { instruments: [], total: 0 },
            });
          return merge(
            this.requests,
            this.search.valueChanges.pipe(
              debounceTime(300),
              map((q) => ({ q: q.trim(), offset: 0 })),
            ),
          ).pipe(
            switchMap((query) => {
              this.offset.set(query.offset);
              if (query.q.length > 200)
                return of<InstrumentState<InstrumentPage>>({
                  status: 'error',
                  message: 'Die Suche darf höchstens 200 Zeichen enthalten.',
                  notFound: false,
                });
              return this.service
                .list({
                  q: query.q,
                  customer_id: customerId,
                  type: '',
                  ownership: '',
                  include_archived: true,
                  offset: query.offset,
                  limit: 10,
                  sort_by: 'id',
                  sort_order: 'asc',
                })
                .pipe(
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
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.results.set(state));
  }
  show() {
    if (!this.disabled() && this.customerId() !== null) {
      this.open.set(true);
      this.requests.next({ q: this.search.value.trim(), offset: 0 });
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
    this.requests.next({ q: this.search.value.trim(), offset: this.offset() });
  }
  retrySelected() {
    this.selectedRetry.next(this.selectedId());
  }
  page(delta: number) {
    this.requests.next({
      q: this.search.value.trim(),
      offset: Math.max(0, this.offset() + delta * 10),
    });
  }
  hasNext(data: InstrumentPage) {
    return data.total === null ? data.instruments.length === 10 : this.offset() + 10 < data.total;
  }
}
