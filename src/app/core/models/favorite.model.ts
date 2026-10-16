import { Restaurant } from './restaurant.model';

export interface Favorite {
  id?: number;
  customerId?: number;
  restaurantId: number;
  restaurant?: Restaurant;
  createdAt?: string;
}
