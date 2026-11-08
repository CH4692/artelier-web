import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PageHeader } from '../../shared/ui/page-header';
import { UI_DE } from '../../shared/i18n/ui.de';
import { DashboardService, MetricState } from './dashboard.service';
import { MetricCard, MetricDefinition } from './metric-card';

@Component({
  selector: 'app-dashboard',
  imports: [PageHeader, MetricCard],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  host: { lang: 'de' },
})
export class Dashboard {
  protected readonly copy = UI_DE.dashboard;
  private readonly service = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  readonly ready = signal<MetricState>({ status: 'loading' });
  protected readonly unavailable: MetricState = { status: 'unavailable' };
  protected readonly metrics: readonly MetricDefinition[] = [
    { key: 'open', ...this.copy.open, tone: 'info' },
    { key: 'ready', ...this.copy.ready, tone: 'success' },
    { key: 'overdue', ...this.copy.overdue, tone: 'error' },
    { key: 'upcoming', ...this.copy.upcoming, tone: 'warning' },
  ];

  constructor() {
    this.loadReady();
  }

  loadReady() {
    // Prevent duplicate refreshes; the constructor starts the first request.
    if (this.inFlight) return;
    this.inFlight = true;
    this.ready.set({ status: 'loading' });
    this.service
      .readyForPickupCount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (state) => {
          this.inFlight = false;
          this.ready.set(state);
        },
        error: () => {
          this.inFlight = false;
          this.ready.set({ status: 'error' });
        },
      });
  }
  private inFlight = false;
}
