import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
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
