import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `<span class="eyebrow">404 / Page not found</span>
    <h1>A little off-key.</h1>
    <p class="intro">We couldn't find that page. Your workshop is just a click away.</p>
    <a routerLink="/dashboard">Return to dashboard →</a>`,
})
export class NotFound {}
