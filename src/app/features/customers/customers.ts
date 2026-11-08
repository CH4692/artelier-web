import { UI_DE } from '../../shared/i18n/ui.de';
import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-customers',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    [heading]="copy.navigation.customers"
    description="Ihre Kunden und ihre Kontaktdaten im Überblick."
  />`,
})
export class Customers {
  protected readonly copy = UI_DE;
}
