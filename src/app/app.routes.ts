import { UI_DE } from './shared/i18n/ui.de';
import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Sign in | Artelier',
    canActivate: [loginGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'access-denied',
    title: 'Access denied | Artelier',
    canActivate: [authGuard],
    loadComponent: () => import('./features/auth/access-denied').then((m) => m.AccessDenied),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.dashboard} | Artelier`,
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.customers} | Artelier`,
    loadComponent: () => import('./features/customers/customers').then((m) => m.Customers),
  },
  {
    path: 'instruments',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.instruments} | Artelier`,
    loadComponent: () => import('./features/instruments/instruments').then((m) => m.Instruments),
  },
  {
    path: 'repairs',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.repairs} | Artelier`,
    loadComponent: () => import('./features/repairs/repairs').then((m) => m.Repairs),
  },
  {
    path: '**',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.shell.notFound} | Artelier`,
    loadComponent: () => import('./shared/ui/not-found').then((m) => m.NotFound),
  },
];
