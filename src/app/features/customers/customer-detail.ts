import {
  afterNextRender,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, map, merge, of, startWith, Subject, switchMap } from 'rxjs';
import { CustomersService } from './customers.service';
import { Customer, CustomerOverview, LoadState } from './customer.models';
import { customerError, customerId, isMissingCustomer } from './customer-errors';
import { CUSTOMER_COPY } from './customer.copy';
import { ArchiveCustomer } from './archive-customer';
import { PageHeader } from '../../shared/ui/page-header';
import { LoadingIndicator } from '../../shared/ui/loading-indicator';
import { ErrorMessage } from '../../shared/ui/error-message';
import { StatusBadge } from '../../shared/ui/status-badge';

@Component({
  selector: 'app-customer-detail',
  imports: [RouterLink, ArchiveCustomer, PageHeader, LoadingIndicator, ErrorMessage, StatusBadge],
  templateUrl: './customer-detail.html',
  styleUrl: './customer-detail.scss',
})
export class CustomerDetail {
  protected readonly copy = CUSTOMER_COPY;
  private readonly service = inject(CustomersService);
  private readonly route = inject(ActivatedRoute);
  private readonly reload = new Subject<void>();
  private readonly destroyRef = inject(DestroyRef);
  readonly state = signal<LoadState<CustomerOverview>>({ status: 'loading' });
  private readonly injector = inject(Injector);
  private readonly confirmationElement = viewChild<ElementRef<HTMLElement>>('confirmationMessage');
  readonly confirmation = signal('');

  constructor() {
    const confirmation = inject(Router).currentNavigation()?.extras.state?.['customerConfirmation'];
    this.confirmation.set(
      confirmation === 'created'
        ? this.copy.created
        : confirmation === 'updated'
          ? this.copy.updated
          : '',
    );
    let firstNavigation = true;
    merge(this.route.paramMap, this.reload.pipe(map(() => this.route.snapshot.paramMap)))
      .pipe(
        switchMap((params) => {
          if (!firstNavigation) this.confirmation.set('');
          firstNavigation = false;
          const id = customerId(params.get('id'));
          if (id === null)
            return of<LoadState<CustomerOverview>>({
              status: 'error',
              message: 'Dieser Kunde wurde nicht gefunden.',
              notFound: true,
            });
          return this.service.overview(id).pipe(
            map((data) => ({ status: 'loaded', data }) as LoadState<CustomerOverview>),
            catchError((error) =>
              of<LoadState<CustomerOverview>>({
                status: 'error',
                message: customerError(error),
                notFound: isMissingCustomer(error),
              }),
            ),
            startWith<LoadState<CustomerOverview>>({ status: 'loading' }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));
  }
  retry() {
    this.reload.next();
  }
  archived(customer: Customer) {
    this.state.update((current) =>
      current.status === 'loaded'
        ? { status: 'loaded', data: { ...current.data, customer } }
        : current,
    );
    this.confirmation.set(this.copy.archiveSuccess);
    afterNextRender(() => this.confirmationElement()?.nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
