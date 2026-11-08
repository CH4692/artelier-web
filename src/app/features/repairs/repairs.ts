import { UI_DE } from '../../shared/i18n/ui.de';
import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-repairs',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    [heading]="copy.navigation.repairs"
    description="Ihre Reparaturaufträge und die Arbeit in der Werkstatt."
  />`,
})
export class Repairs {
  protected readonly copy = UI_DE;
}
