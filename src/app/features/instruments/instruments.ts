import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-instruments',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    heading="Instruments"
    description="Every instrument has a story. Keep yours close at hand."
  />`,
})
export class Instruments {}
