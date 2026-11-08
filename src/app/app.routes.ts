import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard | Artelier',
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'customers',
    title: 'Customers | Artelier',
    loadComponent: () => import('./features/customers/customers').then((m) => m.Customers),
  },
  {
    path: 'instruments',
    title: 'Instruments | Artelier',
    loadComponent: () => import('./features/instruments/instruments').then((m) => m.Instruments),
  },
  {
    path: 'repairs',
    title: 'Repairs | Artelier',
    loadComponent: () => import('./features/repairs/repairs').then((m) => m.Repairs),
  },
  {
    path: '**',
    title: 'Page not found | Artelier',
    loadComponent: () => import('./shared/ui/not-found').then((m) => m.NotFound),
  },
];
