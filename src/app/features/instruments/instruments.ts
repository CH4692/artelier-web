import { UI_DE } from '../../shared/i18n/ui.de';
import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-instruments',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    [heading]="copy.navigation.instruments"
    description="Ein Platz für jedes Instrument und seine Geschichte."
  />`,
})
export class Instruments {
  protected readonly copy = UI_DE;
}
