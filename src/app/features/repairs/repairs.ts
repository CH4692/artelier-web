import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-repairs',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    heading="Repairs"
    description="A clear view of the care and craft in your workshop."
  />`,
})
export class Repairs {}
