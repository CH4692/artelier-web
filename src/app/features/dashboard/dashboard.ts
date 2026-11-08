import { PickupWidget } from './pickup-widget';
import { UnavailableWidget } from './unavailable-widget';
import { RouterLink } from '@angular/router';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../shared/ui/page-header';
import { UI_DE } from '../../shared/i18n/ui.de';
import { DashboardService, MetricState } from './dashboard.service';
import { MetricCard, MetricDefinition } from './metric-card';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, MetricCard, PickupWidget, UnavailableWidget],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  host: { lang: 'de' },
})
export class Dashboard {
  protected readonly copy = UI_DE.dashboard;
  private readonly service = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  readonly refreshKey = signal(0);
  readonly ready = signal<MetricState>({ status: 'loading' });
  protected readonly unavailable: MetricState = { status: 'unavailable' };
  protected readonly metrics: readonly MetricDefinition[] = [
    { key: 'open', ...this.copy.open, tone: 'info' },
    { key: 'ready', ...this.copy.ready, tone: 'success' },
    { key: 'overdue', ...this.copy.overdue, tone: 'error' },
    { key: 'upcoming', ...this.copy.upcoming, tone: 'warning' },
  ];

  private inFlight = false;

  constructor() {
    this.loadReady();
  }

  refreshAll() {
    this.loadReady();
    this.refreshKey.update((value) => value + 1);
  }

  loadReady() {
    // Prevent duplicate refreshes; the constructor starts the first request.
    if (this.inFlight) return;
    this.inFlight = true;
    const current = this.ready();
    const previousValue = current.status === 'available' ? current.value : current.previousValue;
    this.ready.set({ status: 'loading', previousValue });
    this.service
      .readyForPickupCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.inFlight = false;
          this.ready.set(state.status === 'available' ? state : { ...state, previousValue });
        },
        error: () => {
          this.inFlight = false;
          this.ready.set({ status: 'error', previousValue });
        },
      });
  }
}
