import { Routes } from '@angular/router';
import { StaffLayout } from './components/staff-layout/staff-layout';
import { authGuard } from '../../core/guards/auth.guard';
import { roleGuard } from '../../core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: '',
    component: StaffLayout,
    canActivate: [authGuard, roleGuard],
    canActivateChild: [authGuard, roleGuard],
    data: { roles: ['STAFF', 'ADMIN'] },
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/staff-dashboard/staff-dashboard').then(
            (m) => m.StaffDashboard
          ),
      },
      {
        path: 'tables',
        loadComponent: () =>
          import('./pages/table-management/table-management').then(
            (m) => m.TableManagement
          ),
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./pages/reservation-list/reservation-list').then(
            (m) => m.ReservationList
          ),
      },
      {
        path: 'reservations/:id',
        loadComponent: () =>
          import('./pages/reservation-detail/reservation-detail').then(
            (m) => m.ReservationDetail
          ),
      },
      {
        path: 'queue',
        loadComponent: () =>
          import('./pages/queue-management/queue-management').then(
            (m) => m.QueueManagement
          ),
      },
    ],
  },
];

export const STAFF_ADMIN_ROUTES = routes;
