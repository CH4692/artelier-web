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
    path: 'customers/new',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Kunde anlegen | Artelier',
    loadComponent: () =>
      import('./features/customers/customer-editor').then((m) => m.CustomerEditor),
  },
  {
    path: 'customers/:id/edit',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'], edit: true },
    title: 'Kundendaten bearbeiten | Artelier',
    loadComponent: () =>
      import('./features/customers/customer-editor').then((m) => m.CustomerEditor),
  },
  {
    path: 'customers/:id',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Kundendetails | Artelier',
    loadComponent: () =>
      import('./features/customers/customer-detail').then((m) => m.CustomerDetail),
  },
  {
    path: 'customers',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.customers} | Artelier`,
    loadComponent: () => import('./features/customers/customers').then((m) => m.Customers),
  },
  {
    path: 'instruments/new',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Instrument anlegen | Artelier',
    loadComponent: () =>
      import('./features/instruments/instrument-editor').then((m) => m.InstrumentEditor),
  },
  {
    path: 'instruments/:id/edit',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'], edit: true },
    title: 'Instrument bearbeiten | Artelier',
    loadComponent: () =>
      import('./features/instruments/instrument-editor').then((m) => m.InstrumentEditor),
  },
  {
    path: 'instruments/:id',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Instrumentendetails | Artelier',
    loadComponent: () =>
      import('./features/instruments/instrument-detail').then((m) => m.InstrumentDetail),
  },
  {
    path: 'instruments',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: `${UI_DE.navigation.instruments} | Artelier`,
    loadComponent: () => import('./features/instruments/instruments').then((m) => m.Instruments),
  },
  {
    path: 'repairs/new',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Neuer Reparaturauftrag | Artelier',
    loadComponent: () => import('./features/repairs/repair-editor').then((m) => m.RepairEditor),
  },
  {
    path: 'repairs/:id/edit',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'], edit: true },
    title: 'Auftrag bearbeiten | Artelier',
    loadComponent: () => import('./features/repairs/repair-editor').then((m) => m.RepairEditor),
  },
  {
    path: 'repairs/:id',
    canActivate: [authGuard],
    data: { roles: ['admin', 'employee'] },
    title: 'Auftragsdetails | Artelier',
    loadComponent: () => import('./features/repairs/repair-detail').then((m) => m.RepairDetail),
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
