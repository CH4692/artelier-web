import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeader } from './page-header';

@Component({
  host: { lang: 'en' },
  selector: 'app-not-found',
  imports: [RouterLink, PageHeader],
  template: `<app-page-header
      eyebrow="404 / Page not found"
      heading="A little off-key."
      description="We couldn't find that page. Your workshop is just a click away."
    />
    <a routerLink="/dashboard">Return to dashboard →</a>`,
})
export class NotFound {}
