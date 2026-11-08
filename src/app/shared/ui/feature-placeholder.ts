import { Component, input } from '@angular/core';
import { PageHeader } from './page-header';
import { EmptyState } from './empty-state';

@Component({
  selector: 'app-feature-placeholder',
  imports: [PageHeader, EmptyState],
  template: `
    <app-page-header eyebrow="Werkstatt" [heading]="heading()" [description]="description()" />
    <app-empty-state
      eyebrow="In Vorbereitung"
      [heading]="heading() + ' – demnächst verfügbar'"
      description="Dieser Bereich wird noch eingerichtet. Die Werkzeuge zur Verwaltung Ihrer Daten folgen."
    />
  `,
  styles: `
    app-empty-state {
      margin-top: var(--space-6);
    }
  `,
})
export class FeaturePlaceholder {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
