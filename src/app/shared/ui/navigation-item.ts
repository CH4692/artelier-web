import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navigation-item',
  imports: [RouterLink, RouterLinkActive],
  template: `<a
    (click)="selected.emit()"
    [routerLink]="path()"
    routerLinkActive="active"
    ariaCurrentWhenActive="page"
  >
    <span aria-hidden="true">{{ symbol() }}</span
    >{{ label() }}
  </a>`,
  styles: `
    :host {
      display: block;
    }
    a {
      padding: 13px 14px;
      border-radius: var(--radius-control);
      text-decoration: none;
      color: var(--color-nav-text);
      display: flex;
      align-items: center;
      gap: 13px;
      font-size: 14px;
    }
    a span {
      width: 20px;
      font-size: 21px;
    }
    a:hover {
      background: var(--color-nav-hover);
    }
    a.active {
      color: var(--color-surface);
      background: var(--color-nav-active);
    }
  `,
})
export class NavigationItem {
  readonly selected = output<void>();
  readonly path = input.required<string>();
  readonly label = input.required<string>();
  readonly symbol = input('');
}
