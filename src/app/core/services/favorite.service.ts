import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Favorite } from '../models/favorite.model';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private favorites: Favorite[] = [
    {
      id: 1,
      customerId: 1,
      restaurantId: 1, // Spice Symphony Bistro initially saved for Customer 1
      createdAt: '2026-09-15'
    },
    {
      id: 2,
      customerId: 2,
      restaurantId: 3, // Urban Hearth Fine Dine saved for Customer 2
      createdAt: '2026-09-20'
    }
  ];

  /**
   * Get all favorites for a specific customer.
   */
  getFavoritesByCustomerId(customerId: number): Observable<Favorite[]> {
    const list = this.favorites.filter((f) => f.customerId === customerId);
    return of([...list]);
  }

  /**
   * Check whether a restaurant is favorited by a specific customer.
   */
  isFavorite(customerId: number, restaurantId: number): Observable<boolean> {
    const exists = this.favorites.some(
      (f) => f.customerId === customerId && f.restaurantId === restaurantId
    );
    return of(exists);
  }

  /**
   * Add a restaurant to customer favorites. Prevents duplicates.
   */
  addFavorite(customerId: number, restaurantId: number): Observable<Favorite> {
    const existing = this.favorites.find(
      (f) => f.customerId === customerId && f.restaurantId === restaurantId
    );
    if (existing) {
      return of(existing);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newFavorite: Favorite = {
      id: Math.floor(1000 + Math.random() * 9000),
      customerId: customerId,
      restaurantId: restaurantId,
      createdAt: todayStr
    };

    this.favorites.push(newFavorite);
    return of(newFavorite);
  }

  /**
   * Remove a restaurant from customer favorites.
   */
  removeFavorite(customerId: number, restaurantId: number): Observable<void> {
    this.favorites = this.favorites.filter(
      (f) => !(f.customerId === customerId && f.restaurantId === restaurantId)
    );
    return of(void 0);
  }

  /**
   * Toggle favorite state for a customer.
   * Returns true if newly added, false if removed.
   */
  toggleFavorite(customerId: number, restaurantId: number): Observable<boolean> {
    const existingIndex = this.favorites.findIndex(
      (f) => f.customerId === customerId && f.restaurantId === restaurantId
    );

    if (existingIndex > -1) {
      this.favorites.splice(existingIndex, 1);
      return of(false);
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      const newFavorite: Favorite = {
        id: Math.floor(1000 + Math.random() * 9000),
        customerId: customerId,
        restaurantId: restaurantId,
        createdAt: todayStr
      };
      this.favorites.push(newFavorite);
      return of(true);
    }
  }

  /**
   * Get the total favorite count for a customer.
   */
  getFavoriteCount(customerId: number): Observable<number> {
    const count = this.favorites.filter((f) => f.customerId === customerId).length;
    return of(count);
  }
}
