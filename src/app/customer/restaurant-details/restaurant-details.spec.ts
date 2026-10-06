import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RestaurantDetails } from './restaurant-details';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ReviewService } from '../../core/services/review.service';
import { Table } from '../../core/models/table.model';

describe('RestaurantDetails', () => {
  let component: RestaurantDetails;
  let fixture: ComponentFixture<RestaurantDetails>;
  let reservationService: ReservationService;
  let restaurantService: RestaurantService;
  let reviewService: ReviewService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantDetails],
      providers: [
        provideRouter([]),
        RestaurantService,
        ReservationService,
        ReviewService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1',
              },
            },
            paramMap: of({
              get: (key: string) => '1',
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDetails);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    restaurantService = TestBed.inject(RestaurantService);
    reviewService = TestBed.inject(ReviewService);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reviews and calculate average rating from ReviewService for Restaurant 1', () => {
    component.loadRestaurantDetails(1);
    expect(component.reviews.length).toBeGreaterThan(0);
    expect(component.averageRating).toBeGreaterThan(0);
    expect(component.reviewCount).toBeGreaterThan(0);
    expect(component.reviews.every((r) => r.restaurantId === 1)).toBe(true);
  });

  it('should load independent reviews, rating, and review count for Restaurant 2', () => {
    component.loadRestaurantDetails(2);
    expect(component.reviews.length).toBeGreaterThan(0);
    expect(component.averageRating).toBeGreaterThan(0);
    expect(component.reviewCount).toBeGreaterThan(0);
    expect(component.reviews.every((r) => r.restaurantId === 2)).toBe(true);
    // Ensure no Restaurant 1 reviews are present
    expect(component.reviews.some((r) => r.restaurantId === 1)).toBe(false);
  });

  it('should load independent reviews, rating, and review count for Restaurant 3', () => {
    component.loadRestaurantDetails(3);
    expect(component.reviews.length).toBeGreaterThan(0);
    expect(component.averageRating).toBeGreaterThan(0);
    expect(component.reviewCount).toBeGreaterThan(0);
    expect(component.reviews.every((r) => r.restaurantId === 3)).toBe(true);
    // Ensure no Restaurant 1 or 2 reviews are present
    expect(component.reviews.some((r) => r.restaurantId !== 3)).toBe(false);
  });

  it('should gracefully handle empty reviews state for a venue with no reviews', () => {
    component.loadRestaurantDetails(999);
    expect(component.reviews.length).toBe(0);
    expect(component.averageRating).toBe(0);
    expect(component.reviewCount).toBe(0);
  });

  it('should calculate rating percentage accurately', () => {
    component.reviewCount = 10;
    component.ratingDistribution = { 5: 6, 4: 3, 3: 1, 2: 0, 1: 0 };

    expect(component.getRatingPercentage(5)).toBe(60);
    expect(component.getRatingPercentage(4)).toBe(30);
    expect(component.getRatingPercentage(3)).toBe(10);
    expect(component.getRatingPercentage(2)).toBe(0);
  });

  it('should correctly determine if a star should be filled', () => {
    component.averageRating = 4.7; // Rounds to 5
    expect(component.isStarFilled(5)).toBe(true);
    expect(component.isStarFilled(4)).toBe(true);

    component.averageRating = 3.2; // Rounds to 3
    expect(component.isStarFilled(3)).toBe(true);
    expect(component.isStarFilled(4)).toBe(false);
  });

  it('should not allow selecting an occupied table', () => {
    const occupiedTable: Table = {
      id: 999,
      restaurantId: 1,
      tableNumber: 'T-99',
      capacity: 4,
      seatingType: 'INDOOR',
      available: false,
    };

    component.selectTable(occupiedTable);
    expect(component.selectedTable).toBeNull();
    expect(component.errorMessage).toContain('occupied');
  });

  it('should allow selecting an available table', () => {
    const availableTable: Table = {
      id: 101,
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 4,
      seatingType: 'WINDOW',
      available: true,
    };

    component.selectTable(availableTable);
    expect(component.selectedTable).toEqual(availableTable);
    expect(component.errorMessage).toBe('');
  });

  it('should create a reservation when valid form is submitted', () => {
    const availableTable: Table = {
      id: 102,
      restaurantId: 1,
      tableNumber: 'T-02',
      capacity: 4,
      seatingType: 'AC',
      available: true,
    };

    component.selectTable(availableTable);
    component.bookingDate = component.minDate || '2026-10-06';
    component.bookingTime = '19:30';
    component.guestsCount = 2;

    component.submitReservation();

    expect(component.bookingSuccess).toBe(true);
    expect(component.createdReservation).toBeTruthy();
    expect(component.createdReservation?.tableId).toBe(102);
    expect(component.createdReservation?.status).toBe('CONFIRMED');
    expect(availableTable.available).toBe(false);
  });

  it('should navigate to digital menu on viewMenu', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.restaurant = {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries',
      rating: 4.8,
      tagline: 'Imperial Flavors',
      imageUrl: '',
    };

    component.viewMenu();
    expect(navSpy).toHaveBeenCalledWith(['/customer/restaurants', 1, 'menu']);
  });
});
