import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RestaurantList } from './restaurant-list';
import { RestaurantService } from '../../core/services/restaurant.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';

describe('RestaurantList', () => {
  let component: RestaurantList;
  let fixture: ComponentFixture<RestaurantList>;
  let restaurantService: RestaurantService;
  let favoriteService: FavoriteService;

  const mockRestaurants: Restaurant[] = [
    {
      id: 1,
      name: 'Spice Symphony Bistro',
      address: 'Bhubaneswar, Odisha',
      location: 'Bhubaneswar, Odisha',
      phone: '9876543210',
      cuisine: 'North Indian & Mughlai',
      description: 'An elegant dining destination serving Indian cuisine and signature dishes in a premium atmosphere.',
      openingTime: '11:00:00',
      closingTime: '22:30:00',
      rating: 4.8,
      tagline: 'Imperial Flavors & Royal Dining',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 5,
      name: 'Coastal Breeze Seafood & Grill',
      address: 'Puri, Odisha',
      location: 'Puri, Odisha',
      phone: '9876543211',
      cuisine: 'Seafood & Coastal Odia',
      description: 'A coastal restaurant specializing in seafood, grilled dishes, and regional flavors.',
      openingTime: '11:30:00',
      closingTime: '22:00:00',
      rating: 4.6,
      tagline: 'Artisanal Coastal Gastronomy',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 6,
      name: 'Urban Hearth Fine Dine',
      address: 'Cuttack, Odisha',
      location: 'Cuttack, Odisha',
      phone: '9876543212',
      cuisine: 'Multi-Cuisine & Italian',
      description: 'A contemporary fine-dining restaurant offering a comfortable atmosphere and a diverse menu.',
      openingTime: '12:00:00',
      closingTime: '23:00:00',
      rating: 4.7,
      tagline: 'Contemporary European Craft',
      imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=800&q=80'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantList],
      providers: [provideRouter([]), RestaurantService, FavoriteService, AuthService],
    }).compileComponents();

    restaurantService = TestBed.inject(RestaurantService);
    favoriteService = TestBed.inject(FavoriteService);
    vi.spyOn(restaurantService, 'getRestaurants').mockReturnValue(of(mockRestaurants));
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(of([]));

    fixture = TestBed.createComponent(RestaurantList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load restaurants on initialization', () => {
    expect(component.isLoading).toBe(false);
    expect(component.restaurants.length).toBe(3);
    expect(component.filteredRestaurants.length).toBe(3);
  });

  it('should filter restaurants by search query matching name or city', () => {
    component.searchQuery = 'Spice';
    component.filterRestaurants();
    expect(component.filteredRestaurants.length).toBe(1);
    expect(component.filteredRestaurants[0].name).toContain('Spice');

    component.searchQuery = 'Puri';
    component.filterRestaurants();
    expect(component.filteredRestaurants.length).toBe(1);
    expect(component.filteredRestaurants[0].name).toContain('Coastal Breeze');
  });

  it('should filter restaurants by cuisine', () => {
    component.selectedCuisine = 'Seafood & Coastal Odia';
    component.filterRestaurants();
    expect(component.filteredRestaurants.length).toBe(1);
    expect(component.filteredRestaurants[0].cuisine).toBe('Seafood & Coastal Odia');
  });

  it('should toggle favorite status of a restaurant', () => {
    const fakeEvent = new MouseEvent('click');
    vi.spyOn(fakeEvent, 'stopPropagation');
    vi.spyOn(favoriteService, 'toggleFavorite').mockReturnValue(of(true));

    const restId = 5;
    component.toggleFavorite(restId, fakeEvent);

    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isFavorite(restId)).toBe(true);
    expect(component.favoriteFeedbackMessage).toContain('added to favorites');
  });

  it('should invoke favoriteService.toggleFavorite with correct restaurant ID and prevent duplicate clicks', () => {
    const fakeEvent = new MouseEvent('click');
    const toggleSpy = vi.spyOn(favoriteService, 'toggleFavorite').mockReturnValue(of(true));

    const restId = 6;
    component.toggleFavorite(restId, fakeEvent);

    expect(toggleSpy).toHaveBeenCalledWith(1, 6);
    expect(component.isFavorite(6)).toBe(true);

    // Concurrent click should be ignored while in-flight
    component.togglingFavoriteIds.add(6);
    component.toggleFavorite(restId, fakeEvent);
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it('should rollback favorite status and display error when toggle fails', () => {
    const fakeEvent = new MouseEvent('click');
    vi.spyOn(favoriteService, 'toggleFavorite').mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    const restId = 5;
    expect(component.isFavorite(restId)).toBe(false);
    component.toggleFavorite(restId, fakeEvent);

    // Rollback ensures state remains false
    expect(component.isFavorite(restId)).toBe(false);
    expect(component.favoriteFeedbackMessage).toContain('Unable to update favorites');
  });

  it('should handle error when API call fails and display diagnostic error message', () => {
    vi.spyOn(restaurantService, 'getRestaurants').mockReturnValue(
      throwError(() => new Error('Connection refused'))
    );

    component.loadRestaurants();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Unable to connect to the restaurant concierge');
  });
});
