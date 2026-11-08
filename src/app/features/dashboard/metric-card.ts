import { Component, computed, input, output } from '@angular/core';
import { StatusBadge, StatusTone } from '../../shared/ui/status-badge';
import { UI_DE } from '../../shared/i18n/ui.de';
import { MetricState } from './dashboard.service';

export interface MetricDefinition {
  key: string;
  title: string;
  label: string;
  empty: string;
  hint: string;
  tone: StatusTone;
}

@Component({
  selector: 'app-metric-card',
  imports: [StatusBadge],
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.scss',
})
export class MetricCard {
  readonly metric = input.required<MetricDefinition>();
  readonly state = input.required<MetricState>();
  readonly retry = output<void>();
  readonly showRetry = input(true);
  protected readonly displayValue = computed(() => {
    const state = this.state();
    return state.status === 'available' ? state.value : state.previousValue;
  });
  protected readonly copy = UI_DE.dashboard;
}
