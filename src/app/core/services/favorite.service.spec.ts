import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { FavoriteService } from './favorite.service';

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FavoriteService]
    });
    service = TestBed.inject(FavoriteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve favorites for a specific customer', async () => {
    const favorites = await firstValueFrom(service.getFavoritesByCustomerId(1));
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites.every((f) => f.customerId === 1)).toBe(true);
  });

  it('should guarantee customer privacy and isolation', async () => {
    const favsCustomer1 = await firstValueFrom(service.getFavoritesByCustomerId(1));
    const favsCustomer2 = await firstValueFrom(service.getFavoritesByCustomerId(2));

    expect(favsCustomer1.every((f) => f.customerId === 1)).toBe(true);
    expect(favsCustomer2.every((f) => f.customerId === 2)).toBe(true);

    const hasOverlap = favsCustomer1.some((f1) =>
      favsCustomer2.some((f2) => f1.restaurantId === f2.restaurantId)
    );
    // Initially Customer 1 has restaurant 1, Customer 2 has restaurant 3
    expect(hasOverlap).toBe(false);
  });

  it('should return empty list for customer without favorites', async () => {
    const favorites = await firstValueFrom(service.getFavoritesByCustomerId(9999));
    expect(favorites).toEqual([]);
  });

  it('should check if a restaurant is favorited', async () => {
    const isFav = await firstValueFrom(service.isFavorite(1, 1));
    expect(isFav).toBe(true);

    const notFav = await firstValueFrom(service.isFavorite(1, 999));
    expect(notFav).toBe(false);
  });

  it('should add a new favorite successfully', async () => {
    const added = await firstValueFrom(service.addFavorite(1, 2));
    expect(added).toBeTruthy();
    expect(added.customerId).toBe(1);
    expect(added.restaurantId).toBe(2);

    const isFav = await firstValueFrom(service.isFavorite(1, 2));
    expect(isFav).toBe(true);
  });

  it('should prevent duplicate favorites when adding an existing favorite', async () => {
    // Restaurant 1 is already in Customer 1's favorites
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

  it('should remove a favorite successfully', async () => {
    await firstValueFrom(service.addFavorite(1, 4));
    await firstValueFrom(service.removeFavorite(1, 4));

    const isFav = await firstValueFrom(service.isFavorite(1, 4));
    expect(isFav).toBe(false);
  });

  it('should toggle favorite on and off', async () => {
    // Restaurant 5 is not saved initially for customer 1
    const result1 = await firstValueFrom(service.toggleFavorite(1, 5));
    expect(result1).toBe(true); // Added

    // Toggling again should remove it
    const result2 = await firstValueFrom(service.toggleFavorite(1, 5));
    expect(result2).toBe(false); // Removed

    const finalStatus = await firstValueFrom(service.isFavorite(1, 5));
    expect(finalStatus).toBe(false);
  });

  it('should return the accurate count of favorites for a customer', async () => {
    const initialCount = await firstValueFrom(service.getFavoriteCount(1));
    expect(initialCount).toBeGreaterThan(0);

    await firstValueFrom(service.addFavorite(1, 6));
    const newCount = await firstValueFrom(service.getFavoriteCount(1));
    expect(newCount).toBe(initialCount + 1);
  });
});
