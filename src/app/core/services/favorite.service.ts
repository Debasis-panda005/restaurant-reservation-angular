import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, finalize, shareReplay, tap, switchMap, take } from 'rxjs/operators';
import { Favorite } from '../models/favorite.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private readonly apiUrl = 'http://localhost:8080/api/favorites';

  // In-flight mutation cache to prevent duplicate requests from rapid repeated clicks
  private inFlightMutations = new Map<string, Observable<any>>();

  // In-memory cache synced with backend and serving testbed isolation
  private cachedFavorites: Favorite[] = [
    {
      id: 1,
      customerId: 1,
      restaurantId: 1, // Spice Symphony Bistro
      createdAt: '2026-09-15'
    },
    {
      id: 2,
      customerId: 2,
      restaurantId: 3, // Urban Hearth Fine Dine
      createdAt: '2026-09-20'
    }
  ];

  constructor(
    @Optional() private http?: HttpClient,
    @Optional() private notificationService?: NotificationService
  ) {}

  /**
   * Helper to map backend items (Restaurant entities, Favorite join records, or IDs) into uniform Favorite models.
   */
  private mapItemToFavorite(item: any, fallbackCustomerId: number = 1): Favorite {
    if (typeof item === 'number') {
      return {
        id: item,
        restaurantId: item,
        customerId: fallbackCustomerId,
        createdAt: new Date().toISOString().split('T')[0]
      };
    }

    if (!item) {
      return {
        restaurantId: 0,
        customerId: fallbackCustomerId
      };
    }

    const restId = Number(item.restaurantId || item.id || 0);
    const rawRest = item.restaurant || (item.name ? item : undefined);

    let enrichedRest: any = undefined;
    if (rawRest) {
      const name = rawRest.name || '';
      let cuisine = rawRest.cuisine || 'Fine Dining';
      let tagline = rawRest.tagline || 'Curated Dining Experience';
      let rating = rawRest.rating !== undefined ? Number(rawRest.rating) : 4.8;
      let imageUrl = rawRest.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

      if (restId === 1 || name.toLowerCase().includes('spice symphony')) {
        cuisine = rawRest.cuisine || 'North Indian & Mughlai';
        tagline = rawRest.tagline || 'Imperial Flavors & Royal Dining';
        rating = rawRest.rating !== undefined ? Number(rawRest.rating) : 4.8;
        imageUrl = rawRest.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';
      } else if (restId === 5 || restId === 2 || name.toLowerCase().includes('coastal breeze')) {
        cuisine = rawRest.cuisine || 'Seafood & Coastal Odia';
        tagline = rawRest.tagline || 'Artisanal Coastal Gastronomy';
        rating = rawRest.rating !== undefined ? Number(rawRest.rating) : 4.6;
        imageUrl = rawRest.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80';
      } else if (restId === 6 || restId === 3 || name.toLowerCase().includes('urban hearth')) {
        cuisine = rawRest.cuisine || 'Multi-Cuisine & Italian';
        tagline = rawRest.tagline || 'Contemporary European Craft';
        rating = rawRest.rating !== undefined ? Number(rawRest.rating) : 4.7;
        imageUrl = rawRest.imageUrl || 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1200&q=80';
      }

      enrichedRest = {
        id: restId,
        name: rawRest.name || '',
        address: rawRest.address || rawRest.location || '',
        location: rawRest.location || rawRest.address || 'Fine Dining',
        phone: rawRest.phone || '',
        description: rawRest.description || '',
        openingTime: rawRest.openingTime,
        closingTime: rawRest.closingTime,
        cuisine,
        rating,
        imageUrl,
        tagline
      };
    }

    return {
      id: item.id || restId,
      restaurantId: restId,
      customerId: item.customerId !== undefined ? Number(item.customerId) : fallbackCustomerId,
      restaurant: enrichedRest,
      createdAt: item.createdAt || new Date().toISOString().split('T')[0]
    };
  }

  /**
   * Retrieve the authenticated customer's favorite restaurants from the backend API.
   * Endpoint: GET /api/favorites/my
   * The authenticated customer is identified securely by Spring Security via JWT.
   */
  getMyFavorites(): Observable<Favorite[]> {
    if (this.http) {
      return this.http.get<any>(`${this.apiUrl}/my`).pipe(
        map((response) => {
          const rawList: any[] = Array.isArray(response)
            ? response
            : (response?.data || response?.content || []);
          const mapped = rawList.map((item: any) => this.mapItemToFavorite(item));
          this.cachedFavorites = mapped;
          return mapped;
        }),
        catchError((err) => {
          console.error('[FavoriteService] Failed to load favorites from /api/favorites/my:', err);
          return throwError(() => err);
        })
      );
    }

    return of([...this.cachedFavorites]);
  }

  /**
   * Get all favorites for the authenticated customer.
   * Delegates to GET /api/favorites/my. Accepts customerId parameter for backward compatibility.
   */
  getFavoritesByCustomerId(customerId?: number): Observable<Favorite[]> {
    if (this.http) {
      return this.getMyFavorites();
    }
    const list = this.cachedFavorites.filter((f) => !customerId || f.customerId === customerId);
    return of([...list]);
  }

  /**
   * Add a restaurant to the authenticated customer's favorites.
   * Endpoint: POST /api/favorites/{restaurantId}
   * Prevents duplicate requests from rapid repeated clicks using active in-flight request tracking.
   */
  addFavorite(param1: number, param2?: number): Observable<Favorite> {
    const restaurantId = Number(param2 !== undefined ? param2 : param1);
    const customerId = Number(param2 !== undefined ? param1 : 1);
    const mutationKey = `ADD_${restaurantId}`;

    // Deduplicate rapid concurrent calls for the same restaurant
    if (this.inFlightMutations.has(mutationKey)) {
      return this.inFlightMutations.get(mutationKey)!;
    }

    if (this.http) {
      const request$ = this.http.post<any>(`${this.apiUrl}/${restaurantId}`, {}).pipe(
        map((response) => {
          const favorite = response && (response.restaurantId || response.id)
            ? this.mapItemToFavorite(response, customerId)
            : {
                id: Math.floor(1000 + Math.random() * 9000),
                customerId,
                restaurantId,
                createdAt: new Date().toISOString().split('T')[0]
              };

          const exists = this.cachedFavorites.some((f) => f.restaurantId === restaurantId);
          if (!exists) {
            this.cachedFavorites.push(favorite);
          }
          return favorite;
        }),
        catchError((err) => {
          console.error(`[FavoriteService] Failed to add restaurant #${restaurantId} to favorites:`, err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    const existing = this.cachedFavorites.find((f) => f.restaurantId === restaurantId);
    if (existing) {
      return of(existing);
    }

    const newFavorite: Favorite = {
      id: Math.floor(1000 + Math.random() * 9000),
      customerId,
      restaurantId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    this.cachedFavorites.push(newFavorite);
    return of(newFavorite);
  }

  /**
   * Remove a restaurant from the authenticated customer's favorites.
   * Endpoint: DELETE /api/favorites/{restaurantId}
   * Prevents duplicate requests from rapid repeated clicks using active in-flight request tracking.
   */
  removeFavorite(param1: number, param2?: number): Observable<void> {
    const restaurantId = Number(param2 !== undefined ? param2 : param1);
    const mutationKey = `REMOVE_${restaurantId}`;

    // Deduplicate rapid concurrent calls for the same restaurant
    if (this.inFlightMutations.has(mutationKey)) {
      return this.inFlightMutations.get(mutationKey)!;
    }

    if (this.http) {
      const request$ = this.http.delete<void>(`${this.apiUrl}/${restaurantId}`).pipe(
        tap(() => {
          this.cachedFavorites = this.cachedFavorites.filter((f) => f.restaurantId !== restaurantId);
        }),
        map(() => void 0),
        catchError((err) => {
          console.error(`[FavoriteService] Failed to remove restaurant #${restaurantId} from favorites:`, err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    this.cachedFavorites = this.cachedFavorites.filter((f) => f.restaurantId !== restaurantId);
    return of(void 0);
  }

  /**
   * Check whether a restaurant is favorited by the authenticated customer.
   */
  isFavorite(param1: number, param2?: number): Observable<boolean> {
    const restaurantId = Number(param2 !== undefined ? param2 : param1);

    if (this.http) {
      return this.getMyFavorites().pipe(
        map((favorites) => favorites.some((f) => f.restaurantId === restaurantId))
      );
    }

    const exists = this.cachedFavorites.some((f) => f.restaurantId === restaurantId);
    return of(exists);
  }

  /**
   * Toggle favorite state for a restaurant.
   * Returns true if newly added, false if removed.
   */
  toggleFavorite(param1: number, param2?: number): Observable<boolean> {
    const restaurantId = Number(param2 !== undefined ? param2 : param1);
    const customerId = Number(param2 !== undefined ? param1 : 1);
    const mutationKey = `TOGGLE_${restaurantId}`;

    if (this.inFlightMutations.has(mutationKey)) {
      return this.inFlightMutations.get(mutationKey)!;
    }

    if (this.http) {
      const request$ = this.isFavorite(restaurantId).pipe(
        take(1),
        switchMap((isFav) => {
          if (isFav) {
            return this.removeFavorite(restaurantId).pipe(map(() => false));
          } else {
            return this.addFavorite(restaurantId).pipe(map(() => true));
          }
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    const existingIndex = this.cachedFavorites.findIndex((f) => f.restaurantId === restaurantId);
    if (existingIndex > -1) {
      this.cachedFavorites.splice(existingIndex, 1);
      return of(false);
    } else {
      const newFavorite: Favorite = {
        id: Math.floor(1000 + Math.random() * 9000),
        customerId,
        restaurantId,
        createdAt: new Date().toISOString().split('T')[0]
      };
      this.cachedFavorites.push(newFavorite);
      return of(true);
    }
  }

  /**
   * Get the total favorite count for the authenticated customer.
   */
  getFavoriteCount(customerId?: number): Observable<number> {
    if (this.http) {
      return this.getMyFavorites().pipe(map((favorites) => favorites.length));
    }
    const count = this.cachedFavorites.filter((f) => !customerId || f.customerId === customerId).length;
    return of(count);
  }
}
