import { Component } from '@angular/core';
import { FeaturePlaceholder } from '../../shared/ui/feature-placeholder';

@Component({
  selector: 'app-customers',
  imports: [FeaturePlaceholder],
  template: `<app-feature-placeholder
    heading="Customers"
    description="A thoughtful place for the people behind every instrument."
  />`,
})
export class Customers {}
