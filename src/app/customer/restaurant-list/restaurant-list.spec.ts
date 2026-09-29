import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RestaurantList } from './restaurant-list';
import { RestaurantService } from '../../core/services/restaurant.service';

describe('RestaurantList', () => {
  let component: RestaurantList;
  let fixture: ComponentFixture<RestaurantList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantList],
      providers: [provideRouter([]), RestaurantService],
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
});
