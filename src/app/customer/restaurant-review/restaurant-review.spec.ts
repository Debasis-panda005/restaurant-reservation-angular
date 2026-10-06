import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { RestaurantReview } from './restaurant-review';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';

describe('RestaurantReview', () => {
  let component: RestaurantReview;
  let fixture: ComponentFixture<RestaurantReview>;
  let reservationService: ReservationService;
  let restaurantService: RestaurantService;
  let reviewService: ReviewService;
  let authService: AuthService;
  let router: Router;

  const mockRestaurant1: Restaurant = {
    id: 1,
    name: 'Spice Symphony Bistro',
    location: 'Bhubaneswar, Odisha',
    cuisine: 'North Indian & Mughlai',
    description: 'Authentic royal curries and tandoor specials.',
    rating: 4.8,
    tagline: 'Imperial Flavors & Royal Dining',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
  };

  const mockRestaurant2: Restaurant = {
    id: 2,
    name: 'Coastal Breeze Seafood & Grill',
    location: 'Puri Beach Road',
    cuisine: 'Seafood & Coastal Odia',
    description: 'Fresh seafood delicacies with scenic outdoor dining.',
    rating: 4.6,
    tagline: 'Artisanal Coastal Gastronomy',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947',
  };

  const mockRestaurant3: Restaurant = {
    id: 3,
    name: 'Urban Hearth Fine Dine',
    location: 'Saheed Nagar, Bhubaneswar',
    cuisine: 'Multi-Cuisine & Italian',
    description: 'Intimate, modern ambience with wood-fired artisanal pizzas.',
    rating: 4.7,
    tagline: 'Contemporary European Craft',
    imageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantReview],
      providers: [
        provideRouter([]),
        ReservationService,
        RestaurantService,
        ReviewService,
        AuthService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1003',
              },
            },
            paramMap: of({
              get: (key: string) => '1003',
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantReview);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    restaurantService = TestBed.inject(RestaurantService);
    reviewService = TestBed.inject(ReviewService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
      id: 1,
      name: 'Debasis Panda',
      email: 'debasis@example.com',
      phone: '9876543210',
      role: 'CUSTOMER',
    });
  });

  it('1. should create and load review component', () => {
    expect(component).toBeTruthy();
  });

  it('2. should allow review for COMPLETED reservation from Restaurant 1 (Spice Symphony Bistro)', () => {
    const resR1: Reservation = {
      id: 1003,
      customerId: 1,
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(resR1));
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant1));
    vi.spyOn(reviewService, 'hasReviewedReservation').mockReturnValue(of(false));

    component.loadReservationAndCheckEligibility(1003);

    expect(component.isLoading).toBe(false);
    expect(component.errorState).toBe('NONE');
    expect(component.reservation?.restaurantId).toBe(1);
    expect(component.restaurant?.name).toBe('Spice Symphony Bistro');
  });

  it('3. should allow review for COMPLETED reservation from Restaurant 2 (Coastal Breeze Seafood & Grill)', () => {
    const resR2: Reservation = {
      id: 1008,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-09-25',
      time: '19:00',
      guests: 4,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(resR2));
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant2));
    vi.spyOn(reviewService, 'hasReviewedReservation').mockReturnValue(of(false));

    component.loadReservationAndCheckEligibility(1008);

    expect(component.isLoading).toBe(false);
    expect(component.errorState).toBe('NONE');
    expect(component.reservation?.restaurantId).toBe(2);
    expect(component.restaurant?.name).toBe('Coastal Breeze Seafood & Grill');
  });

  it('4. should allow review for COMPLETED reservation from Restaurant 3 (Urban Hearth Fine Dine)', () => {
    const resR3: Reservation = {
      id: 1006,
      customerId: 1,
      restaurantId: 3,
      tableId: 302,
      date: '2026-09-10',
      time: '20:00',
      guests: 2,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(resR3));
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant3));
    vi.spyOn(reviewService, 'hasReviewedReservation').mockReturnValue(of(false));

    component.loadReservationAndCheckEligibility(1006);

    expect(component.isLoading).toBe(false);
    expect(component.errorState).toBe('NONE');
    expect(component.reservation?.restaurantId).toBe(3);
    expect(component.restaurant?.name).toBe('Urban Hearth Fine Dine');
  });

  it('5. should allow review regardless of table ID (including newly added tables)', () => {
    const resCustomTable: Reservation = {
      id: 2001,
      customerId: 1,
      restaurantId: 1,
      tableId: 999, // Custom / newly added table
      date: '2026-09-22',
      time: '21:00',
      guests: 2,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(resCustomTable));
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant1));
    vi.spyOn(reviewService, 'hasReviewedReservation').mockReturnValue(of(false));

    component.loadReservationAndCheckEligibility(2001);

    expect(component.errorState).toBe('NONE');
    expect(component.reservation?.tableId).toBe(999);
  });

  it('6. should NOT allow review for CONFIRMED reservation across any restaurant', () => {
    const confirmedRes: Reservation = {
      id: 1001,
      customerId: 1,
      restaurantId: 1,
      tableId: 102,
      date: '2026-09-30',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(confirmedRes));

    component.loadReservationAndCheckEligibility(1001);

    expect(component.errorState).toBe('NOT_COMPLETED');
    expect(component.errorMessage).toContain(
      'Please complete your dining experience before leaving a review.'
    );
  });

  it('7. should NOT allow review for PENDING reservation across any restaurant', () => {
    const pendingRes: Reservation = {
      id: 1002,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-10-02',
      time: '20:00',
      guests: 2,
      status: 'PENDING',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(pendingRes));

    component.loadReservationAndCheckEligibility(1002);

    expect(component.errorState).toBe('NOT_COMPLETED');
  });

  it('8. should NOT allow review for CANCELLED reservation across any restaurant', () => {
    const cancelledRes: Reservation = {
      id: 1005,
      customerId: 1,
      restaurantId: 3,
      tableId: 301,
      date: '2026-09-15',
      time: '18:30',
      guests: 2,
      status: 'CANCELLED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(cancelledRes));

    component.loadReservationAndCheckEligibility(1005);

    expect(component.errorState).toBe('CANCELLED');
    expect(component.errorMessage).toContain(
      'Reviews are available only after completed dining experiences.'
    );
  });

  it('9. should handle invalid reservation id', () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(undefined));

    component.loadReservationAndCheckEligibility(9999);

    expect(component.errorState).toBe('NOT_FOUND');
    expect(component.errorMessage).toBe('Reservation Not Found');
  });

  it('10. should handle unauthorized reservation (different customer)', () => {
    const unauthorizedRes: Reservation = {
      id: 1003,
      customerId: 99, // Logged in user is 1
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(unauthorizedRes));

    component.loadReservationAndCheckEligibility(1003);

    expect(component.errorState).toBe('UNAUTHORIZED');
    expect(component.errorMessage).toBe('Reservation Not Found');
  });

  it('11. should select rating between 1 and 5 and update rating labels', () => {
    component.setRating(5);
    expect(component.selectedRating).toBe(5);
    expect(component.currentRatingLabel).toBe('Excellent');

    component.setRating(4);
    expect(component.selectedRating).toBe(4);
    expect(component.currentRatingLabel).toBe('Very Good');

    component.setRating(3);
    expect(component.selectedRating).toBe(3);
    expect(component.currentRatingLabel).toBe('Good');

    component.setRating(2);
    expect(component.selectedRating).toBe(2);
    expect(component.currentRatingLabel).toBe('Fair');

    component.setRating(1);
    expect(component.selectedRating).toBe(1);
    expect(component.currentRatingLabel).toBe('Poor');
  });

  it('12. should reject rating below 1', () => {
    component.reservation = {
      id: 1003,
      customerId: 1,
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };
    component.selectedRating = 0;
    component.comment = 'Exceptional food and royal service.';

    component.submitReview();

    expect(component.validationError).toBe('Please select a star rating between 1 and 5.');
    expect(component.isSubmitted).toBe(false);
  });

  it('13. should enforce minimum comment length of 10 characters', () => {
    component.reservation = {
      id: 1003,
      customerId: 1,
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };
    component.selectedRating = 5;
    component.comment = 'Too short';

    component.submitReview();

    expect(component.validationError).toBe('Please write at least 10 characters.');
    expect(component.isSubmitted).toBe(false);
  });

  it('14. should enforce maximum comment length of 500 characters', () => {
    component.reservation = {
      id: 1003,
      customerId: 1,
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };
    component.selectedRating = 5;
    component.comment = 'A'.repeat(501);

    component.submitReview();

    expect(component.validationError).toBe('Review comment cannot exceed 500 characters.');
    expect(component.isSubmitted).toBe(false);
  });

  it('15. should submit review for Restaurant 2 associating with restaurantId: 2', () => {
    const resR2: Reservation = {
      id: 1008,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-09-25',
      time: '19:00',
      guests: 4,
      status: 'COMPLETED',
    };
    component.reservation = resR2;
    component.restaurant = mockRestaurant2;
    component.selectedRating = 5;
    component.comment = 'Superb coastal seafood and attentive service by the seaside.';

    const createSpy = vi.spyOn(reviewService, 'createReview').mockReturnValue(
      of({
        id: 7778,
        restaurantId: 2,
        customerId: 1,
        reservationId: 1008,
        rating: 5,
        comment: 'Superb coastal seafood and attentive service by the seaside.',
        createdAt: '2026-10-06',
        customerName: 'Debasis Panda',
      })
    );

    component.submitReview();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 2,
        reservationId: 1008,
        rating: 5,
      })
    );
    expect(component.isSubmitted).toBe(true);
    expect(component.submittedReview?.restaurantId).toBe(2);
  });

  it('16. should submit review for Restaurant 3 associating with restaurantId: 3', () => {
    const resR3: Reservation = {
      id: 1006,
      customerId: 1,
      restaurantId: 3,
      tableId: 302,
      date: '2026-09-10',
      time: '20:00',
      guests: 2,
      status: 'COMPLETED',
    };
    component.reservation = resR3;
    component.restaurant = mockRestaurant3;
    component.selectedRating = 4;
    component.comment = 'Wood-fired gourmet pizza with wonderful European ambience.';

    const createSpy = vi.spyOn(reviewService, 'createReview').mockReturnValue(
      of({
        id: 7779,
        restaurantId: 3,
        customerId: 1,
        reservationId: 1006,
        rating: 4,
        comment: 'Wood-fired gourmet pizza with wonderful European ambience.',
        createdAt: '2026-10-06',
        customerName: 'Debasis Panda',
      })
    );

    component.submitReview();

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 3,
        reservationId: 1006,
        rating: 4,
      })
    );
    expect(component.isSubmitted).toBe(true);
    expect(component.submittedReview?.restaurantId).toBe(3);
  });

  it('17. should prevent duplicate review for already reviewed reservation', () => {
    const res: Reservation = {
      id: 1004,
      customerId: 1,
      restaurantId: 2,
      tableId: 202,
      date: '2026-09-12',
      time: '20:30',
      guests: 2,
      status: 'COMPLETED',
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(res));
    vi.spyOn(reviewService, 'hasReviewedReservation').mockReturnValue(of(true));

    component.loadReservationAndCheckEligibility(1004);

    expect(component.errorState).toBe('ALREADY_REVIEWED');
    expect(component.errorMessage).toContain(
      'You have already shared your experience for this reservation.'
    );
  });
});
