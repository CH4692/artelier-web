import { Component, input } from '@angular/core';
import { PageHeader } from './page-header';
import { EmptyState } from './empty-state';

@Component({
  selector: 'app-feature-placeholder',
  imports: [PageHeader, EmptyState],
  template: `
    <app-page-header eyebrow="Your workshop" [heading]="heading()" [description]="description()" />
    <app-empty-state
      eyebrow="Coming into tune"
      [heading]="'A space for ' + heading().toLowerCase()"
      description="This workspace is ready for its next chapter. Tools and records will appear here as Artelier grows."
    />
  `,
  styles: `
    app-empty-state {
      margin-top: 32px;
    }
  `,
})
export class FeaturePlaceholder {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
