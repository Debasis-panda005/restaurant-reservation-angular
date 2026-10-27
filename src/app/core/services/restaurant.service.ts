import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Restaurant } from '../models/restaurant.model';
import { Table } from '../models/table.model';

@Injectable({
  providedIn: 'root'
})
export class RestaurantService {
  private mockRestaurants: Restaurant[] = [
    {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries, tandoor specials, and traditional delicacies in an elegant setting.',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Coastal Breeze Seafood & Grill',
      location: 'Puri Beach Road',
      cuisine: 'Seafood & Coastal Odia',
      description: 'Fresh seafood delicacies with scenic outdoor, rooftop, and sea breeze dining.',
      rating: 4.6
    },
    {
      id: 3,
      name: 'Urban Hearth Fine Dine',
      location: 'Saheed Nagar, Bhubaneswar',
      cuisine: 'Multi-Cuisine & Italian',
      description: 'Cozy, modern ambience with wood-fired pizzas, gourmet pastas, and desserts.',
      rating: 4.7
    }
  ];

  private mockTables: Table[] = [
    { id: 101, restaurantId: 1, tableNumber: 'T-01', capacity: 2, seatingType: 'WINDOW', available: true },
    { id: 102, restaurantId: 1, tableNumber: 'T-02', capacity: 4, seatingType: 'AC', available: true },
    { id: 103, restaurantId: 1, tableNumber: 'T-03', capacity: 4, seatingType: 'INDOOR', available: false },
    { id: 104, restaurantId: 1, tableNumber: 'T-04', capacity: 6, seatingType: 'OUTDOOR', available: true },
    { id: 105, restaurantId: 1, tableNumber: 'T-05', capacity: 8, seatingType: 'ROOFTOP', available: true },
    { id: 201, restaurantId: 2, tableNumber: 'CB-01', capacity: 2, seatingType: 'ROOFTOP', available: true },
    { id: 202, restaurantId: 2, tableNumber: 'CB-02', capacity: 4, seatingType: 'OUTDOOR', available: true },
    { id: 203, restaurantId: 2, tableNumber: 'CB-03', capacity: 6, seatingType: 'WINDOW', available: false },
    { id: 301, restaurantId: 3, tableNumber: 'UH-01', capacity: 2, seatingType: 'AC', available: true },
    { id: 302, restaurantId: 3, tableNumber: 'UH-02', capacity: 4, seatingType: 'WINDOW', available: true }
  ];

  /**
   * Get the list of all restaurants.
   */
  getRestaurants(): Observable<Restaurant[]> {
    return of(this.mockRestaurants);
  }

  /**
   * Get restaurant details by id.
   */
  getRestaurantById(id: number): Observable<Restaurant | undefined> {
    const restaurant = this.mockRestaurants.find(r => r.id === id);
    return of(restaurant);
  }

  /**
   * Get available and booked tables for a specific restaurant.
   */
  getTablesByRestaurantId(restaurantId: number): Observable<Table[]> {
    const tables = this.mockTables.filter(t => t.restaurantId === restaurantId);
    return of(tables);
  }
}
