import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Favorites } from './favorites';
import { FavoriteService } from '../../core/services/favorite.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';

describe('Favorites Component', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;
  let favoriteService: FavoriteService;
  let restaurantService: RestaurantService;
  let authService: AuthService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Favorites],
      providers: [
        provideRouter([]),
        FavoriteService,
        RestaurantService,
        ReviewService,
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Favorites);
    component = fixture.componentInstance;
    favoriteService = TestBed.inject(FavoriteService);
    restaurantService = TestBed.inject(RestaurantService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the favorites component', () => {
    expect(component).toBeTruthy();
  });

  it('should load customer favorites on init', () => {
    expect(component.isLoading).toBe(false);
    expect(component.favoriteRestaurants.length).toBeGreaterThan(0);
    expect(component.favoriteRestaurants[0].name).toBe('Spice Symphony Bistro');
  });

  it('should optimistically remove a favorite when heart is clicked', () => {
    const initialCount = component.favoriteRestaurants.length;
    const targetRest = component.favoriteRestaurants[0];

    const fakeEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(fakeEvent, 'stopPropagation');

    component.removeFavorite(targetRest.id, fakeEvent);

    expect(stopSpy).toHaveBeenCalled();
    expect(component.favoriteRestaurants.length).toBe(initialCount - 1);
    expect(component.favoriteRestaurants.some((r) => r.id === targetRest.id)).toBe(false);
    expect(component.feedbackMessage).toContain('removed from favorites');
  });

  it('should navigate to restaurant details when viewRestaurant is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.viewRestaurant(1);
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/restaurants', 1]);
  });

  it('should navigate to reservation when reserveTable is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const fakeEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(fakeEvent, 'stopPropagation');

    component.reserveTable(2, fakeEvent);
    expect(stopSpy).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/restaurants', 2]);
  });

  it('should navigate to restaurants directory when exploreRestaurants is called', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.exploreRestaurants();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/restaurants']);
  });

  it('should handle customer with zero favorites gracefully', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(of([]));
    component.loadFavorites();

    expect(component.isLoading).toBe(false);
    expect(component.favoriteRestaurants.length).toBe(0);
  });

  it('should safely skip deleted or missing restaurants without crashing', () => {
    // Return a favorite pointing to non-existent restaurant 9999
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      of([{ id: 99, customerId: 1, restaurantId: 9999, createdAt: '2026-10-01' }])
    );
    component.loadFavorites();

    expect(component.isLoading).toBe(false);
    expect(component.favoriteRestaurants.length).toBe(0);
  });
});
