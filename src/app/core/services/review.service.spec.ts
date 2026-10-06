import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { ReviewService } from './review.service';
import { RestaurantService } from './restaurant.service';
import { Review } from '../models/review.model';

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
});
