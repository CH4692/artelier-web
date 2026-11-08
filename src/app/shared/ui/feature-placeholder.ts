import { Component, input } from '@angular/core';

@Component({
  selector: 'app-feature-placeholder',
  template: `
    <span class="eyebrow">Your workshop</span>
    <h1>{{ heading() }}</h1>
    <p class="intro">{{ description() }}</p>
    <section class="panel" style="margin-top: 32px" aria-label="Feature status">
      <span class="eyebrow">Coming into tune</span>
      <h2 style="margin-top: 16px">A space for {{ heading().toLowerCase() }}</h2>
      <p class="intro">
        This workspace is ready for its next chapter. Tools and records will appear here as Artelier
        grows.
      </p>
    </section>
  `,
})
export class FeaturePlaceholder {
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
}
