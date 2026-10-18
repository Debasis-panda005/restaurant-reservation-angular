
import { Routes } from '@angular/router';
import { STAFF_ADMIN_ROUTES } from './features/staff-admin/staff-admin.routes';

export const routes: Routes = [
  {
    path: 'staff',
    children: STAFF_ADMIN_ROUTES,
  },
  {
    path: '',
    redirectTo: 'staff/dashboard',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'staff/dashboard',
  },
];
