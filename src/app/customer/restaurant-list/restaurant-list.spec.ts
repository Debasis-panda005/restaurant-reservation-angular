import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RestaurantList } from './restaurant-list';
import { RestaurantService } from '../../core/services/restaurant.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';

describe('RestaurantList', () => {
  let component: RestaurantList;
  let fixture: ComponentFixture<RestaurantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantList],
      providers: [provideRouter([]), RestaurantService, FavoriteService, AuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load restaurants on initialization', () => {
    expect(component.restaurants.length).toBeGreaterThan(0);
    expect(component.filteredRestaurants.length).toBeGreaterThan(0);
  });

  it('should filter restaurants by search query', () => {
    component.searchQuery = 'Spice';
    component.filterRestaurants();
    expect(component.filteredRestaurants.length).toBe(1);
    expect(component.filteredRestaurants[0].name).toContain('Spice');
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

    const restId = 3;
    const initialStatus = component.isFavorite(restId);
    component.toggleFavorite(restId, fakeEvent);

    expect(fakeEvent.stopPropagation).toHaveBeenCalled();
    expect(component.isFavorite(restId)).toBe(!initialStatus);
  });
});

