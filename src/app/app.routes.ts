import { Routes } from '@angular/router';
import { STAFF_ADMIN_ROUTES } from './features/staff-admin/staff-admin.routes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./auth/register/register').then((m) => m.Register),
  },
  {
    path: 'customer',
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard, roleGuard],
    data: { roles: ['CUSTOMER'] },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./customer/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'restaurants',
        loadComponent: () =>
          import('./customer/restaurant-list/restaurant-list').then(
            (m) => m.RestaurantList
          ),
      },
      {
        path: 'restaurants/:id',
        loadComponent: () =>
          import('./customer/restaurant-details/restaurant-details').then(
            (m) => m.RestaurantDetails
          ),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./customer/my-reservations/my-reservations').then(
            (m) => m.MyReservations
          ),
      },
      {
        path: 'my-reservations',
        pathMatch: 'full',
        redirectTo: 'reservations',
      },
      {
        path: 'queue',
        loadComponent: () =>
          import('./customer/queue-status/queue-status').then(
            (m) => m.QueueStatus
          ),
      },
    ],
  },
  {
    path: 'staff',
    children: STAFF_ADMIN_ROUTES,
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
