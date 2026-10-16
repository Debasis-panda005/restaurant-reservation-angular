import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Favorites } from './favorites';
import { FavoriteService } from '../../core/services/favorite.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';

describe('Favorites Component', () => {
  let component: Favorites;
  let fixture: ComponentFixture<Favorites>;
  let favoriteService: FavoriteService;
  let restaurantService: RestaurantService;
  let authService: AuthService;
  let router: Router;

  const mockRestaurant: Restaurant = {
    id: 1,
    name: 'Spice Symphony Bistro',
    cuisine: 'Modern Indian Fine Dining',
    location: 'Mayfair, London',
    rating: 4.9,
    description: 'An elevated sensory exploration of traditional spices crafted with modern culinary precision.',
    openingTime: '17:00:00',
    closingTime: '23:30:00',
    phone: '+44 20 7946 0912',
    tagline: 'Sensory Indian Gastronomy',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
  };

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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the favorites component', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should load customer favorites on init', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      of([{ id: 1, customerId: 1, restaurantId: 1, createdAt: '2026-10-01' }])
    );
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
    expect(component.favoriteRestaurants.length).toBe(1);
    expect(component.favoriteRestaurants[0].name).toBe('Spice Symphony Bistro');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Spice Symphony Bistro');
    expect(compiled.querySelector('.directory-restaurant-card')).toBeTruthy();
  });

  it('should render restaurants directly when backend returns populated restaurant entities', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      of([{ id: 1, customerId: 1, restaurantId: 1, restaurant: mockRestaurant, createdAt: '2026-10-01' }])
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.favoriteRestaurants.length).toBe(1);
    expect(component.favoriteRestaurants[0].name).toBe('Spice Symphony Bistro');
  });

  it('should display empty state when customer has zero favorites', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(of([]));

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(false);
    expect(component.favoriteRestaurants.length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Your Favorites Are Waiting');
    expect(compiled.querySelector('.favorites-empty-card')).toBeTruthy();
  });

  it('should display error state when loading favorites fails with 401 Unauthorized', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      throwError(() => ({ status: 401, message: 'Unauthorized' }))
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toContain('session has expired');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unable to Load Favorites');
    expect(compiled.textContent).toContain('session has expired');
  });

  it('should display error state when loading favorites fails with 500 Server Error', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Server Error' }))
    );

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toContain('server error occurred');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unable to Load Favorites');
  });

  it('should allow retrying to load favorites when Try Again button is clicked', () => {
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Server Error' }))
    );

    fixture.detectChanges();

    const loadSpy = vi.spyOn(component, 'loadFavorites');
    const compiled = fixture.nativeElement as HTMLElement;
    const retryBtn = compiled.querySelector('.favorites-empty-card .btn-gold') as HTMLButtonElement;
    expect(retryBtn).toBeTruthy();
    retryBtn.click();

    expect(loadSpy).toHaveBeenCalled();
  });

  it('should optimistically remove a favorite when heart is clicked', () => {
    component.favoriteRestaurants = [{ ...mockRestaurant }];
    fixture.detectChanges();

    const removeSpy = vi.spyOn(favoriteService, 'removeFavorite').mockReturnValue(of(void 0));
    const fakeEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(fakeEvent, 'stopPropagation');

    component.removeFavorite(1, fakeEvent);

    expect(stopSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalledWith(1, 1);
    expect(component.favoriteRestaurants.length).toBe(0);
    expect(component.feedbackMessage).toContain('removed from favorites');
  });

  it('should roll back removed restaurant if backend DELETE rejects operation', () => {
    component.favoriteRestaurants = [{ ...mockRestaurant }];
    fixture.detectChanges();

    vi.spyOn(favoriteService, 'removeFavorite').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Internal Server Error' }))
    );

    component.removeFavorite(1);

    // Rollback ensures restaurant is restored
    expect(component.favoriteRestaurants.length).toBe(1);
    expect(component.favoriteRestaurants[0].id).toBe(1);
    expect(component.feedbackMessage).toContain('Server error occurred');
  });

  it('should prevent duplicate remove requests while remove action is in progress', () => {
    component.favoriteRestaurants = [{ ...mockRestaurant }];
    component.removingIds.add(1);

    const removeSpy = vi.spyOn(favoriteService, 'removeFavorite');
    component.removeFavorite(1);

    expect(removeSpy).not.toHaveBeenCalled();
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
});
