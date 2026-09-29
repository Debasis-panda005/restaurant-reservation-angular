import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';
import { Dashboard } from './customer/dashboard/dashboard';
import { RestaurantList } from './customer/restaurant-list/restaurant-list';
import { RestaurantDetails } from './customer/restaurant-details/restaurant-details';
import { MyReservations } from './customer/my-reservations/my-reservations';
import { QueueStatus } from './customer/queue-status/queue-status';

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
    path: 'customer/dashboard',
    component: Dashboard
  },
  {
    path: 'customer/restaurants',
    component: RestaurantList
  },
  {
    path: 'customer/restaurants/:id',
    component: RestaurantDetails
  },
  {
    path: 'customer/reservations',
    component: MyReservations
  },
  {
    path: 'customer/my-reservations',
    redirectTo: 'customer/reservations',
    pathMatch: 'full'
  },
  {
    path: 'customer/queue',
    component: QueueStatus
  }
];