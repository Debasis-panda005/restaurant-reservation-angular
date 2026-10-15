import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ReviewService } from './review.service';
import { RestaurantService } from './restaurant.service';
import { Review } from '../models/review.model';
import { Reservation } from '../models/reservation.model';

describe('ReviewService', () => {
  let service: ReviewService;
  let restaurantService: RestaurantService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReviewService, RestaurantService]
    });
    service = TestBed.inject(ReviewService);
    restaurantService = TestBed.inject(RestaurantService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('1. should verify every existing restaurant can load reviews', async () => {
    const restaurants = await firstValueFrom(restaurantService.getRestaurants());
    expect(restaurants.length).toBeGreaterThanOrEqual(3);

    for (const rest of restaurants) {
      const reviews = await firstValueFrom(service.getReviewsByRestaurantId(rest.id));
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews.every((r) => r.restaurantId === rest.id)).toBe(true);
    }
  });

  it('2. should verify every existing restaurant can calculate rating independently', async () => {
    const restaurants = await firstValueFrom(restaurantService.getRestaurants());

    for (const rest of restaurants) {
      const rating = await firstValueFrom(service.getRestaurantRating(rest.id));
      expect(rating).toBeGreaterThanOrEqual(1);
      expect(rating).toBeLessThanOrEqual(5);
      expect(rating.toString()).toMatch(/^\d+(\.\d)?$/);
    }
  });

  it('3. should verify every existing restaurant can calculate review count', async () => {
    const restaurants = await firstValueFrom(restaurantService.getRestaurants());

    for (const rest of restaurants) {
      const count = await firstValueFrom(service.getReviewCount(rest.id));
      expect(count).toBeGreaterThan(0);
    }
  });

  it('4. should ensure restaurant-specific filtering works strictly', async () => {
    const r1Reviews = await firstValueFrom(service.getReviewsByRestaurantId(1));
    const r2Reviews = await firstValueFrom(service.getReviewsByRestaurantId(2));
    const r3Reviews = await firstValueFrom(service.getReviewsByRestaurantId(3));

    expect(r1Reviews.every((r) => r.restaurantId === 1)).toBe(true);
    expect(r2Reviews.every((r) => r.restaurantId === 2)).toBe(true);
    expect(r3Reviews.every((r) => r.restaurantId === 3)).toBe(true);
  });

  it('5. should ensure reviews from Restaurant A do not appear on Restaurant B or C', async () => {
    const r1Reviews = await firstValueFrom(service.getReviewsByRestaurantId(1));
    const r2Reviews = await firstValueFrom(service.getReviewsByRestaurantId(2));
    const r3Reviews = await firstValueFrom(service.getReviewsByRestaurantId(3));

    const r1Ids = new Set(r1Reviews.map((r) => r.id));
    const r2Ids = new Set(r2Reviews.map((r) => r.id));
    const r3Ids = new Set(r3Reviews.map((r) => r.id));

    // Sets must be mutually disjoint
    r1Ids.forEach((id) => {
      expect(r2Ids.has(id)).toBe(false);
      expect(r3Ids.has(id)).toBe(false);
    });

    r2Ids.forEach((id) => {
      expect(r1Ids.has(id)).toBe(false);
      expect(r3Ids.has(id)).toBe(false);
    });
  });

  it('6-8. should allow creating reviews for completed reservations across all restaurants', async () => {
    // Review for Restaurant 1
    const rev1: Review = {
      id: 991,
      restaurantId: 1,
      customerId: 1,
      reservationId: 1003,
      rating: 5,
      comment: 'Exquisite flavours and courteous royal service.',
      createdAt: '2026-10-06',
      customerName: 'Debasis Panda',
    };
    const created1 = await firstValueFrom(service.createReview(rev1));
    expect(created1.restaurantId).toBe(1);

    // Review for Restaurant 2
    const rev2: Review = {
      id: 992,
      restaurantId: 2,
      customerId: 1,
      reservationId: 1008,
      rating: 4,
      comment: 'Fresh seafood with wonderful coastal breeze ambience.',
      createdAt: '2026-10-06',
      customerName: 'Debasis Panda',
    };
    const created2 = await firstValueFrom(service.createReview(rev2));
    expect(created2.restaurantId).toBe(2);

    // Review for Restaurant 3
    const rev3: Review = {
      id: 993,
      restaurantId: 3,
      customerId: 1,
      reservationId: 1006,
      rating: 5,
      comment: 'Intimate setting with outstanding European craft dishes.',
      createdAt: '2026-10-06',
      customerName: 'Debasis Panda',
    };
    const created3 = await firstValueFrom(service.createReview(rev3));
    expect(created3.restaurantId).toBe(3);

    // Confirm each appears ONLY under its respective restaurant
    const r1Reviews = await firstValueFrom(service.getReviewsByRestaurantId(1));
    const r2Reviews = await firstValueFrom(service.getReviewsByRestaurantId(2));
    const r3Reviews = await firstValueFrom(service.getReviewsByRestaurantId(3));

    expect(r1Reviews.some((r) => r.id === 991)).toBe(true);
    expect(r2Reviews.some((r) => r.id === 991)).toBe(false);
    expect(r3Reviews.some((r) => r.id === 991)).toBe(false);

    expect(r2Reviews.some((r) => r.id === 992)).toBe(true);
    expect(r1Reviews.some((r) => r.id === 992)).toBe(false);

    expect(r3Reviews.some((r) => r.id === 993)).toBe(true);
    expect(r1Reviews.some((r) => r.id === 993)).toBe(false);
  });

  it('13. should prevent duplicate reviews for the same reservation id across any restaurant', async () => {
    const duplicateRev: Review = {
      id: 9996,
      restaurantId: 1,
      customerId: 2,
      reservationId: 901, // Already exists in Restaurant 1
      rating: 5,
      comment: 'Duplicate review attempt for existing reservation.',
      createdAt: '2026-10-06',
    };

    expect(() => service.createReview(duplicateRev)).toThrowError(
      'This reservation has already been reviewed.'
    );
  });

  it('14-18. should correctly accept ratings 1, 2, 3, 4, 5 stars and retain their values', async () => {
    for (let stars = 1; stars <= 5; stars++) {
      const review: Review = {
        id: 7000 + stars,
        restaurantId: 2,
        customerId: 1,
        reservationId: 7000 + stars,
        rating: stars,
        comment: `Testing rating of ${stars} stars with sufficient character length.`,
        createdAt: '2026-10-06',
      };

      const created = await firstValueFrom(service.createReview(review));
      expect(created.rating).toBe(stars);
    }
  });

  it('19. should update restaurant rating and review count after a new review without affecting other restaurants', async () => {
    const beforeCountR1 = await firstValueFrom(service.getReviewCount(1));
    const beforeCountR2 = await firstValueFrom(service.getReviewCount(2));

    const newRevR1: Review = {
      id: 8888,
      restaurantId: 1,
      customerId: 1,
      reservationId: 8888,
      rating: 5,
      comment: 'Royal culinary presentation and marvelous dessert.',
      createdAt: '2026-10-06',
    };

    await firstValueFrom(service.createReview(newRevR1));

    const afterCountR1 = await firstValueFrom(service.getReviewCount(1));
    const afterCountR2 = await firstValueFrom(service.getReviewCount(2));

    expect(afterCountR1).toBe(beforeCountR1 + 1);
    expect(afterCountR2).toBe(beforeCountR2); // R2 remains unaffected!
  });

  it('should return 0 rating for restaurant with no reviews', async () => {
    const avg = await firstValueFrom(service.getRestaurantRating(9999));
    expect(avg).toBe(0);
  });

  it('should return rating distribution breakdown', async () => {
    const dist = await firstValueFrom(service.getRatingDistribution(1));
    expect(dist[5]).toBeDefined();
    expect(dist[4]).toBeDefined();
    expect(dist[3]).toBeDefined();
    expect(dist[2]).toBeDefined();
    expect(dist[1]).toBeDefined();
  });

  it('20. should reject missing rating or rating below 1', () => {
    const rev: Review = {
      id: 9101,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9101,
      rating: 0,
      comment: 'Valid comment length with great dishes.',
      createdAt: '2026-10-11',
    };
    expect(() => service.createReview(rev)).toThrowError(
      'Rating must be an integer between 1 and 5.'
    );
  });

  it('21. should reject rating greater than 5', () => {
    const rev: Review = {
      id: 9102,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9102,
      rating: 6,
      comment: 'Valid comment length with great dishes.',
      createdAt: '2026-10-11',
    };
    expect(() => service.createReview(rev)).toThrowError(
      'Rating must be an integer between 1 and 5.'
    );
  });

  it('22. should reject comment shorter than 10 characters', () => {
    const rev: Review = {
      id: 9103,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9103,
      rating: 5,
      comment: 'Great',
      createdAt: '2026-10-11',
    };
    expect(() => service.createReview(rev)).toThrowError(
      'Review comment must be at least 10 characters.'
    );
  });

  it('23. should reject whitespace-only comment', () => {
    const rev: Review = {
      id: 9104,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9104,
      rating: 5,
      comment: '              ',
      createdAt: '2026-10-11',
    };
    expect(() => service.createReview(rev)).toThrowError(
      'Review comment must be at least 10 characters.'
    );
  });

  it('24. should reject comment longer than 500 characters', () => {
    const rev: Review = {
      id: 9105,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9105,
      rating: 5,
      comment: 'A'.repeat(501),
      createdAt: '2026-10-11',
    };
    expect(() => service.createReview(rev)).toThrowError(
      'Review comment cannot exceed 500 characters.'
    );
  });

  it('25. should trim leading and trailing whitespace from comment before storing', async () => {
    const rev: Review = {
      id: 9106,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9106,
      rating: 5,
      comment: '   Delicious culinary presentation and friendly staff.   ',
      createdAt: '2026-10-11',
    };
    const created = await firstValueFrom(service.createReview(rev));
    expect(created.comment).toBe('Delicious culinary presentation and friendly staff.');
  });

  it('26. should validate reservation eligibility correctly via validateEligibility method', () => {
    const validReservation: Reservation = {
      id: 9201,
      customerId: 1,
      restaurantId: 1,
      tableId: 1,
      date: '2026-10-01',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };

    // 1. Valid reservation
    const r1 = service.validateEligibility(validReservation, 1);
    expect(r1.valid).toBe(true);

    // 2. Missing reservation
    const r2 = service.validateEligibility(null, 1);
    expect(r2.valid).toBe(false);
    expect(r2.error).toBe('Reservation not found.');

    // 3. Different customer (ownership violation)
    const r3 = service.validateEligibility(validReservation, 99);
    expect(r3.valid).toBe(false);
    expect(r3.error).toBe('You may only review your own reservations.');

    // 4. Incomplete reservation (CONFIRMED)
    const confirmedRes: Reservation = { ...validReservation, status: 'CONFIRMED' };
    const r4 = service.validateEligibility(confirmedRes, 1);
    expect(r4.valid).toBe(false);
    expect(r4.error).toBe('Only completed reservations are eligible for review.');

    // 5. Incomplete reservation (CANCELLED)
    const cancelledRes: Reservation = { ...validReservation, status: 'CANCELLED' };
    const r5 = service.validateEligibility(cancelledRes, 1);
    expect(r5.valid).toBe(false);
    expect(r5.error).toBe('Only completed reservations are eligible for review.');
  });

  it('27. should reject review in service layer when reservation belongs to another customer', () => {
    const resOtherUser: Reservation = {
      id: 9301,
      customerId: 99,
      restaurantId: 1,
      tableId: 1,
      date: '2026-10-01',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED',
    };

    const rev: Review = {
      id: 9301,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9301,
      rating: 5,
      comment: 'Attempting to review someone else booking.',
      createdAt: '2026-10-11',
    };

    expect(() => service.createReview(rev, resOtherUser)).toThrowError(
      'You may only review your own reservations.'
    );
  });

  it('28. should reject review in service layer when reservation is not COMPLETED', () => {
    const resConfirmed: Reservation = {
      id: 9302,
      customerId: 1,
      restaurantId: 1,
      tableId: 1,
      date: '2026-10-01',
      time: '19:00',
      guests: 2,
      status: 'CONFIRMED',
    };

    const rev: Review = {
      id: 9302,
      restaurantId: 1,
      customerId: 1,
      reservationId: 9302,
      rating: 5,
      comment: 'Attempting to review confirmed booking prematurely.',
      createdAt: '2026-10-11',
    };

    expect(() => service.createReview(rev, resConfirmed)).toThrowError(
      'Only completed reservations are eligible for review.'
    );
  });

  describe('with HttpClient provided', () => {
    let httpService: ReviewService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ReviewService,
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });
      httpService = TestBed.inject(ReviewService);
      httpMock = TestBed.inject(HttpTestingController);
      httpService.setForceHttp(true);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('29. should fetch reviews from backend API for restaurant 1', async () => {
      const mockBackendReviews = [
        {
          id: 101,
          restaurantId: 1,
          customerId: 2,
          reservationId: 501,
          rating: 5,
          comment: 'Outstanding royal banquet and flavours.',
          createdAt: '2026-10-10',
          customerName: 'Aarav Patel',
          customerDisplayName: 'Aarav Patel'
        }
      ];

      const fetchPromise = firstValueFrom(httpService.getReviewsByRestaurantId(1));

      const req = httpMock.expectOne('http://localhost:8080/api/restaurants/1/reviews');
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendReviews);

      const reviews = await fetchPromise;
      expect(reviews.length).toBe(1);
      expect(reviews[0].comment).toBe('Outstanding royal banquet and flavours.');
      expect(reviews[0].rating).toBe(5);
      expect(reviews[0].restaurantId).toBe(1);
    });

    it('30. should map restaurant 2 to backend restaurant 5 when fetching reviews', async () => {
      const fetchPromise = firstValueFrom(httpService.getReviewsByRestaurantId(2));

      const req = httpMock.expectOne('http://localhost:8080/api/restaurants/5/reviews');
      expect(req.request.method).toBe('GET');
      req.flush([]);

      const reviews = await fetchPromise;
      expect(reviews.length).toBeGreaterThan(0);
      expect(reviews.every(r => r.restaurantId === 2)).toBe(true);
    });

    it('31. should fetch rating summary from backend API', async () => {
      const mockSummary = {
        restaurantId: 1,
        averageRating: 4.8,
        reviewCount: 25,
        ratingDistribution: { 5: 20, 4: 5, 3: 0, 2: 0, 1: 0 }
      };

      const ratingPromise = firstValueFrom(httpService.getRestaurantRating(1));
      const req = httpMock.expectOne('http://localhost:8080/api/restaurants/1/reviews/summary');
      expect(req.request.method).toBe('GET');
      req.flush(mockSummary);

      const rating = await ratingPromise;
      expect(rating).toBe(4.8);
    });

    it('32. should submit review via POST http://localhost:8080/api/reviews', async () => {
      const newReview: Review = {
        id: 0,
        restaurantId: 1,
        customerId: 1,
        reservationId: 8888,
        rating: 5,
        comment: 'Exquisite slow-cooked Mughlai cuisine and courteous service.',
        createdAt: '2026-10-11',
      };

      const mockResponse = {
        id: 777,
        restaurantId: 1,
        customerId: 1,
        reservationId: 8888,
        rating: 5,
        comment: 'Exquisite slow-cooked Mughlai cuisine and courteous service.',
        createdAt: '2026-10-11',
        customerName: 'John Doe',
        customerDisplayName: 'John Doe'
      };

      const submitPromise = firstValueFrom(httpService.createReview(newReview));

      const req = httpMock.expectOne('http://localhost:8080/api/reviews');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        reservationId: 8888,
        rating: 5,
        comment: 'Exquisite slow-cooked Mughlai cuisine and courteous service.'
      });
      req.flush(mockResponse);

      const created = await submitPromise;
      expect(created.id).toBe(777);
      expect(created.customerName).toBe('John Doe');
    });

    it('33. should check if reservation is reviewed via API', async () => {
      const checkPromise = firstValueFrom(httpService.hasReviewedReservation(5555));

      const req = httpMock.expectOne('http://localhost:8080/api/reservations/5555/reviewed');
      expect(req.request.method).toBe('GET');
      req.flush({ reviewed: true });

      const isReviewed = await checkPromise;
      expect(isReviewed).toBe(true);
    });
  });
});
