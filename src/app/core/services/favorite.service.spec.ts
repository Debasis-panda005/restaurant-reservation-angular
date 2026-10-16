import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { FavoriteService } from './favorite.service';
import { Favorite } from '../models/favorite.model';

describe('FavoriteService', () => {
  describe('Local / Testbed Isolation mode (without HttpClient)', () => {
    let service: FavoriteService;

    beforeEach(() => {
      service = new FavoriteService();
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should retrieve favorites for a specific customer', async () => {
      const favorites = await firstValueFrom(service.getFavoritesByCustomerId(1));
      expect(favorites.length).toBeGreaterThan(0);
      expect(favorites.every((f) => f.customerId === 1)).toBe(true);
    });

    it('should guarantee customer privacy and isolation in local cache', async () => {
      const favsCustomer1 = await firstValueFrom(service.getFavoritesByCustomerId(1));
      const favsCustomer2 = await firstValueFrom(service.getFavoritesByCustomerId(2));

      expect(favsCustomer1.every((f) => f.customerId === 1)).toBe(true);
      expect(favsCustomer2.every((f) => f.customerId === 2)).toBe(true);

      const hasOverlap = favsCustomer1.some((f1) =>
        favsCustomer2.some((f2) => f1.restaurantId === f2.restaurantId)
      );
      expect(hasOverlap).toBe(false);
    });

    it('should return empty list for customer without favorites in local cache', async () => {
      const favorites = await firstValueFrom(service.getFavoritesByCustomerId(9999));
      expect(favorites).toEqual([]);
    });

    it('should check if a restaurant is favorited in local cache', async () => {
      const isFav = await firstValueFrom(service.isFavorite(1, 1));
      expect(isFav).toBe(true);

      const notFav = await firstValueFrom(service.isFavorite(1, 999));
      expect(notFav).toBe(false);
    });

    it('should add a new favorite successfully in local cache', async () => {
      const added = await firstValueFrom(service.addFavorite(1, 2));
      expect(added).toBeTruthy();
      expect(added.customerId).toBe(1);
      expect(added.restaurantId).toBe(2);

      const isFav = await firstValueFrom(service.isFavorite(1, 2));
      expect(isFav).toBe(true);
    });

    it('should prevent duplicate favorites when adding an existing favorite in local cache', async () => {
      const initialFavs = await firstValueFrom(service.getFavoritesByCustomerId(1));
      const initialCount = initialFavs.length;

      const existingFav = await firstValueFrom(service.addFavorite(1, 1));
      expect(existingFav).toBeTruthy();
      expect(existingFav.restaurantId).toBe(1);

      const favs = await firstValueFrom(service.getFavoritesByCustomerId(1));
      expect(favs.length).toBe(initialCount);
      const matches = favs.filter((f) => f.restaurantId === 1);
      expect(matches.length).toBe(1);
    });

    it('should remove a favorite successfully in local cache', async () => {
      await firstValueFrom(service.addFavorite(1, 4));
      await firstValueFrom(service.removeFavorite(1, 4));

      const isFav = await firstValueFrom(service.isFavorite(1, 4));
      expect(isFav).toBe(false);
    });

    it('should toggle favorite on and off in local cache', async () => {
      const result1 = await firstValueFrom(service.toggleFavorite(1, 5));
      expect(result1).toBe(true); // Added

      const result2 = await firstValueFrom(service.toggleFavorite(1, 5));
      expect(result2).toBe(false); // Removed

      const finalStatus = await firstValueFrom(service.isFavorite(1, 5));
      expect(finalStatus).toBe(false);
    });

    it('should return the accurate count of favorites in local cache', async () => {
      const initialCount = await firstValueFrom(service.getFavoriteCount(1));
      expect(initialCount).toBeGreaterThan(0);

      await firstValueFrom(service.addFavorite(1, 6));
      const newCount = await firstValueFrom(service.getFavoriteCount(1));
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe('HTTP Backend API Integration mode (with HttpClient)', () => {
    let service: FavoriteService;
    let httpTesting: HttpTestingController;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          FavoriteService
        ]
      });
      service = TestBed.inject(FavoriteService);
      httpTesting = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpTesting.verify();
    });

    it('should retrieve authenticated customer favorites from GET /api/favorites/my', () => {
      const mockBackendResponse = [
        {
          id: 10,
          customerId: 1,
          restaurantId: 1,
          createdAt: '2026-10-01'
        },
        {
          id: 11,
          customerId: 1,
          restaurantId: 2,
          createdAt: '2026-10-02'
        }
      ];

      let result: Favorite[] | undefined;
      service.getMyFavorites().subscribe((favs) => {
        result = favs;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendResponse);

      expect(result).toBeDefined();
      expect(result?.length).toBe(2);
      expect(result?.[0].restaurantId).toBe(1);
      expect(result?.[1].restaurantId).toBe(2);
    });

    it('should support backend response returning full Restaurant entities directly', () => {
      const mockRestaurantsResponse = [
        {
          id: 3,
          name: 'Urban Hearth Fine Dine',
          cuisine: 'Contemporary European',
          location: 'Mayfair, London',
          rating: 4.8
        }
      ];

      let result: Favorite[] | undefined;
      service.getMyFavorites().subscribe((favs) => {
        result = favs;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush(mockRestaurantsResponse);

      expect(result).toBeDefined();
      expect(result?.length).toBe(1);
      expect(result?.[0].restaurantId).toBe(3);
      expect(result?.[0].restaurant?.name).toBe('Urban Hearth Fine Dine');
    });

    it('should handle empty favorites response from GET /api/favorites/my', () => {
      let result: Favorite[] | undefined;
      service.getMyFavorites().subscribe((favs) => {
        result = favs;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush([]);

      expect(result).toEqual([]);
    });

    it('should propagate HTTP 401 Unauthorized error from GET /api/favorites/my', () => {
      let errorCaught: any;
      service.getMyFavorites().subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush({ message: 'Full authentication is required' }, { status: 401, statusText: 'Unauthorized' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(401);
    });

    it('should propagate HTTP 403 Forbidden error from GET /api/favorites/my', () => {
      let errorCaught: any;
      service.getMyFavorites().subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush({ message: 'Access Denied' }, { status: 403, statusText: 'Forbidden' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(403);
    });

    it('should propagate HTTP 404 Not Found error from GET /api/favorites/my', () => {
      let errorCaught: any;
      service.getMyFavorites().subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush({ message: 'Resource not found' }, { status: 404, statusText: 'Not Found' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(404);
    });

    it('should propagate HTTP 500 Internal Server Error from GET /api/favorites/my', () => {
      let errorCaught: any;
      service.getMyFavorites().subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(500);
    });

    it('should send POST request to /api/favorites/{restaurantId} when adding favorite', () => {
      let addedFavorite: Favorite | undefined;
      service.addFavorite(5).subscribe((fav) => {
        addedFavorite = fav;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/5');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({});
      req.flush({ id: 99, restaurantId: 5, createdAt: '2026-10-16' });

      expect(addedFavorite).toBeDefined();
      expect(addedFavorite?.restaurantId).toBe(5);
    });

    it('should deduplicate rapid concurrent addFavorite calls for the same restaurant', () => {
      let callCount = 0;
      service.addFavorite(5).subscribe(() => callCount++);
      service.addFavorite(5).subscribe(() => callCount++);

      // Only ONE HTTP request should be sent
      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/5');
      req.flush({ id: 99, restaurantId: 5 });

      expect(callCount).toBe(2);
    });

    it('should send DELETE request to /api/favorites/{restaurantId} when removing favorite', () => {
      let completed = false;
      service.removeFavorite(5).subscribe(() => {
        completed = true;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/5');
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(completed).toBe(true);
    });

    it('should deduplicate rapid concurrent removeFavorite calls for the same restaurant', () => {
      let callCount = 0;
      service.removeFavorite(5).subscribe(() => callCount++);
      service.removeFavorite(5).subscribe(() => callCount++);

      // Only ONE HTTP request should be sent
      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/5');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(callCount).toBe(2);
    });

    it('should check isFavorite status via backend GET /api/favorites/my', () => {
      let isFav: boolean | undefined;
      service.isFavorite(2).subscribe((res) => {
        isFav = res;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush([{ restaurantId: 2 }, { restaurantId: 4 }]);

      expect(isFav).toBe(true);
    });

    it('should return false for isFavorite when restaurant is not in list', () => {
      let isFav: boolean | undefined;
      service.isFavorite(999).subscribe((res) => {
        isFav = res;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush([{ restaurantId: 2 }, { restaurantId: 4 }]);

      expect(isFav).toBe(false);
    });

    it('should calculate accurate favorite count via GET /api/favorites/my', () => {
      let count: number | undefined;
      service.getFavoriteCount().subscribe((c) => {
        count = c;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/favorites/my');
      req.flush([{ restaurantId: 1 }, { restaurantId: 2 }, { restaurantId: 3 }]);

      expect(count).toBe(3);
    });
  });
});
