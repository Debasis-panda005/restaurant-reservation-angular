import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Dashboard } from './customer/dashboard/dashboard';
import { RestaurantList } from './customer/restaurant-list/restaurant-list';
import { RestaurantDetails } from './customer/restaurant-details/restaurant-details';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: 'register',
    component: Register
  },
  {
    path: 'customer',
    redirectTo: 'customer/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'customer/dashboard',
    component: Dashboard
  },
  {
    path: 'customer/restaurants',
    component: RestaurantList
  },
  {
    path: 'customer/favorites',
    loadComponent: () =>
      import('./customer/favorites/favorites').then(
        (m) => m.default || m.Favorites
      )
  },
  {
    path: 'customer/restaurants/:id/menu',
    loadComponent: () =>
      import('./customer/restaurant-menu/restaurant-menu').then(
        (m) => m.RestaurantMenu
      )
  },
  {
    path: 'customer/restaurants/:id',
    component: RestaurantDetails
  },
  {
    path: 'customer/reservations',
    loadComponent: () =>
      import('./customer/my-reservations/my-reservations').then(
        (m) => m.MyReservations
      )
  },
  {
    path: 'customer/reservations/:id/reschedule',
    loadComponent: () =>
      import('./customer/reschedule-reservation/reschedule-reservation').then(
        (m) => m.default || m.RescheduleReservation
      )
  },
  {
    path: 'customer/reservations/:id/review',
    loadComponent: () =>
      import('./customer/restaurant-review/restaurant-review').then(
        (m) => m.default || m.RestaurantReview
      )
  },
  {
    path: 'customer/my-reservations',
    redirectTo: 'customer/reservations',
    pathMatch: 'full'
  },
  {
    path: 'customer/reservation-pass/:id',
    loadComponent: () =>
      import('./customer/qr-reservation-pass/qr-reservation-pass').then(
        (m) => m.QrReservationPass
      )
  },
  {
    path: 'customer/queue',
    loadComponent: () =>
      import('./customer/queue-status/queue-status').then(
        (m) => m.QueueStatus
      )
  },
  {
    path: 'customer/notifications',
    loadComponent: () =>
      import('./customer/notifications/notifications').then(
        (m) => m.Notifications
      )
  }
];