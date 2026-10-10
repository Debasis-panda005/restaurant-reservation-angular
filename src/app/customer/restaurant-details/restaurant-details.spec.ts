import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { RestaurantDetails } from './restaurant-details';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { Table } from '../../core/models/table.model';
import { Reservation } from '../../core/models/reservation.model';

describe('RestaurantDetails', () => {
  let component: RestaurantDetails;
  let fixture: ComponentFixture<RestaurantDetails>;
  let reservationService: ReservationService;
  let restaurantService: RestaurantService;
  let reviewService: ReviewService;
  let favoriteService: FavoriteService;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantDetails],
      providers: [
        provideRouter([]),
        RestaurantService,
        ReservationService,
        ReviewService,
        FavoriteService,
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

    const mockCreatedReservation: Reservation = {
      id: 9999,
      customerId: 1,
      restaurantId: 1,
      tableId: 102,
      tableNumber: 'T-02',
      seatingType: 'AC',
      restaurantName: 'Spice Symphony Bistro',
      date: component.bookingDate,
      time: '19:30',
      guests: 2,
      status: 'CONFIRMED',
    };
    vi.spyOn(reservationService, 'createReservation').mockReturnValue(of(mockCreatedReservation));

    component.submitReservation();

    expect(component.bookingSuccess).toBe(true);
    expect(component.createdReservation).toBeTruthy();
    expect(component.createdReservation?.tableId).toBe(102);
    expect(component.createdReservation?.tableNumber).toBe('T-02');
    expect(component.createdReservation?.seatingType).toBe('AC');
    expect(component.createdReservation?.status).toBe('CONFIRMED');
    expect(availableTable.available).toBe(false);
  });

  it('should handle reservation submission failure by displaying error and not showing confirmation modal', () => {
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

    vi.spyOn(reservationService, 'createReservation').mockReturnValue(
      throwError(() => ({ status: 401, statusText: 'Unauthorized' }))
    );

    component.submitReservation();

    expect(component.bookingSuccess).toBe(false);
    expect(component.createdReservation).toBeNull();
    expect(component.isSubmittingReservation).toBe(false);
    expect(component.errorMessage).toContain('Unable to confirm reservation');
  });

  it('should prevent duplicate submission when already submitting', () => {
    const createSpy = vi.spyOn(reservationService, 'createReservation');
    component.isSubmittingReservation = true;

    component.submitReservation();

    expect(createSpy).not.toHaveBeenCalled();
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

  it('should toggle favorite status in restaurant details', () => {
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
    component.checkFavoriteStatus(1);

    const initialFavorite = component.isFavoriteRestaurant;
    component.toggleFavorite();
    expect(component.isFavoriteRestaurant).toBe(!initialFavorite);
  });

  it('should dynamically generate 30-minute time slots including 01:30 PM for restaurant operating hours', () => {
    component.restaurant = {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries',
      rating: 4.8,
      openingTime: '11:00:00',
      closingTime: '22:30:00',
    };

    component.generateTimeSlots(component.restaurant);

    expect(component.timeSlots.length).toBeGreaterThan(15);
    expect(component.timeSlots).toContain('11:00 AM');
    expect(component.timeSlots).toContain('12:00 PM');
    expect(component.timeSlots).toContain('12:30 PM');
    expect(component.timeSlots).toContain('01:00 PM');
    expect(component.timeSlots).toContain('01:30 PM');
    expect(component.timeSlots).toContain('02:00 PM');
    expect(component.timeSlots).toContain('10:00 PM');
  });

  it('should ensure CANCELLED reservations (such as RES-7 at 13:30 on 2026-11-05) do NOT block table availability', () => {
    component.restaurant = {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries',
      rating: 4.8,
      openingTime: '11:00:00',
      closingTime: '22:30:00',
    };

    component.rawTables = [
      { id: 3, restaurantId: 1, tableNumber: 'T-01', capacity: 4, seatingType: 'WINDOW', available: true },
      { id: 4, restaurantId: 1, tableNumber: 'T-02', capacity: 2, seatingType: 'OUTDOOR', available: true },
    ];
    component.tables = component.rawTables.map((t) => ({ ...t }));

    // Mock CANCELLED reservation RES-7 matching MySQL state
    component.existingReservations = [
      {
        id: 7,
        customerId: 1,
        restaurantId: 1,
        tableId: 3,
        tableNumber: 'T-01',
        date: '2026-11-05',
        time: '13:30:00',
        guests: 2,
        status: 'CANCELLED',
      },
    ];

    component.bookingDate = '2026-11-05';
    component.bookingTime = '01:30 PM';
    component.updateTableAvailability();

    const tableT01 = component.tables.find((t) => t.id === 3);
    expect(tableT01).toBeDefined();
    expect(tableT01?.available).toBe(true);

    // Should allow selecting Table T-01
    component.selectTable(tableT01!);
    expect(component.selectedTable?.id).toBe(3);
    expect(component.errorMessage).toBe('');
  });

  it('should ensure CONFIRMED reservations DO block conflicting table availability', () => {
    component.restaurant = {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries',
      rating: 4.8,
      openingTime: '11:00:00',
      closingTime: '22:30:00',
    };

    component.rawTables = [
      { id: 3, restaurantId: 1, tableNumber: 'T-01', capacity: 4, seatingType: 'WINDOW', available: true },
      { id: 4, restaurantId: 1, tableNumber: 'T-02', capacity: 2, seatingType: 'OUTDOOR', available: true },
    ];
    component.tables = component.rawTables.map((t) => ({ ...t }));

    // Mock CONFIRMED reservation on Table T-01 at 07:30 PM
    component.existingReservations = [
      {
        id: 6,
        customerId: 1,
        restaurantId: 1,
        tableId: 3,
        tableNumber: 'T-01',
        date: '2026-10-31',
        time: '19:30:00',
        guests: 2,
        status: 'CONFIRMED',
      },
    ];

    component.bookingDate = '2026-10-31';
    component.bookingTime = '07:30 PM';
    component.updateTableAvailability();

    const tableT01 = component.tables.find((t) => t.id === 3);
    const tableT02 = component.tables.find((t) => t.id === 4);

    expect(tableT01?.available).toBe(false);
    expect(tableT02?.available).toBe(true);

    // Attempting to select occupied Table T-01 should fail
    component.selectTable(tableT01!);
    expect(component.selectedTable).toBeNull();
    expect(component.errorMessage).toContain('occupied');

    // Selecting Table T-02 should succeed
    component.selectTable(tableT02!);
    expect(component.selectedTable?.id).toBe(4);
  });

  it('should recompute table availability when switching date or time', () => {
    component.restaurant = {
      id: 1,
      name: 'Spice Symphony Bistro',
      location: 'Bhubaneswar, Odisha',
      cuisine: 'North Indian & Mughlai',
      description: 'Authentic royal curries',
      rating: 4.8,
    };

    component.rawTables = [
      { id: 3, restaurantId: 1, tableNumber: 'T-01', capacity: 4, seatingType: 'WINDOW', available: true },
    ];
    component.tables = component.rawTables.map((t) => ({ ...t }));

    component.existingReservations = [
      {
        id: 10,
        customerId: 1,
        restaurantId: 1,
        tableId: 3,
        date: '2026-10-15',
        time: '19:30:00',
        guests: 2,
        status: 'CONFIRMED',
      },
    ];

    // At 2026-10-15 07:30 PM, table 3 is occupied
    component.bookingDate = '2026-10-15';
    component.bookingTime = '07:30 PM';
    component.updateTableAvailability();
    expect(component.tables[0].available).toBe(false);

    // When time changes to 08:00 PM, table becomes available
    component.onTimeChange('08:00 PM');
    expect(component.tables[0].available).toBe(true);

    // When date changes to another date, table is available
    component.existingReservations = []; // simulated reload
    component.onDateChange('2026-11-05');
    expect(component.tables[0].available).toBe(true);
  });
});
