import { UI_DE } from './shared/i18n/ui.de';
import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { SessionState } from './core/auth/session-state';
import { LoadingIndicator } from './shared/ui/loading-indicator';
import { AccountControls } from './shared/ui/account-controls';
import { WorkspaceHeader } from './shared/ui/workspace-header';
import { NavigationItem } from './shared/ui/navigation-item';

@Component({
  imports: [
    RouterOutlet,
    RouterLink,
    NavigationItem,
    WorkspaceHeader,
    AccountControls,
    LoadingIndicator,
  ],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
  host: { '(keydown.escape)': 'closeMenu()' },
})
export class App {
  protected readonly copy = UI_DE;
  protected readonly session = inject(SessionState);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly mainContent = viewChild<ElementRef<HTMLElement>>('mainContent');
  private readonly router = inject(Router);
  protected readonly pageTitle = signal<string>(UI_DE.navigation.dashboard);

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
      this.menuButton()?.nativeElement.focus();
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
    { path: '/dashboard', label: UI_DE.navigation.dashboard, symbol: '◫' },
    { path: '/customers', label: UI_DE.navigation.customers, symbol: '◎' },
    { path: '/instruments', label: UI_DE.navigation.instruments, symbol: '♮' },
    { path: '/repairs', label: UI_DE.navigation.repairs, symbol: '◇' },
  ];
}
