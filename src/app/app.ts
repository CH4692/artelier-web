import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { WorkspaceHeader } from './shared/ui/workspace-header';
import { NavigationItem } from './shared/ui/navigation-item';

@Component({
  imports: [RouterOutlet, RouterLink, NavigationItem, WorkspaceHeader],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: { '(keydown.escape)': 'closeMenu()' },
})
export class App {
  private readonly menuButton = viewChild.required<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly router = inject(Router);
  protected readonly pageTitle = signal('Dashboard');

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        let route = this.router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;
        this.pageTitle.set((route.title ?? 'Artelier').split(' | ')[0]);
        this.menuOpen.set(false);
        this.mainContent()?.nativeElement.focus();
      });
  }

  protected closeMenu() {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.menuButton().nativeElement.focus();
    }
  }

  protected selectNavigation() {
    this.menuOpen.set(false);
    this.mainContent()?.nativeElement.focus();
  }

  protected readonly menuOpen = signal(false);
  protected toggleMenu() {
    this.menuOpen.update((open) => !open);
  }
  protected readonly navigation = [
    { path: '/dashboard', label: 'Dashboard', symbol: '◫' },
    { path: '/customers', label: 'Customers', symbol: '◎' },
    { path: '/instruments', label: 'Instruments', symbol: '♮' },
    { path: '/repairs', label: 'Repairs', symbol: '◇' },
  ];
}
