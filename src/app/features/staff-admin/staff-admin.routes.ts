import { Routes } from '@angular/router';
import { StaffLayout } from './components/staff-layout/staff-layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/staff-login/staff-login').then((m) => m.StaffLogin),
  },
  {
    path: '',
    component: StaffLayout,
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
