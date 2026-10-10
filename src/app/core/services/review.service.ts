import { Injectable, Optional } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Review } from '../models/review.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(@Optional() private notificationService?: NotificationService) {}
  private reviews: Review[] = [
    // Restaurant 1: Spice Symphony Bistro
    {
      id: 1,
      restaurantId: 1,
      customerId: 2,
      reservationId: 901,
      rating: 5,
      comment: 'Exquisite imperial dining. The Rogan Josh and saffron biryani were prepared to perfection.',
      customerName: 'Ananya Sharma',
      createdAt: '2026-09-24'
    },
    {
      id: 2,
      restaurantId: 1,
      customerId: 3,
      reservationId: 902,
      rating: 5,
      comment: 'Beautiful ambience and an attentive, courteous staff. Perfect for intimate family dinners.',
      customerName: 'Vikramaditya Roy',
      createdAt: '2026-09-28'
    },
    {
      id: 3,
      restaurantId: 1,
      customerId: 4,
      reservationId: 903,
      rating: 4,
      comment: 'The tandoor delicacies were outstanding. Delicate balance of aromatic spices and royal heritage.',
      customerName: 'Priya Sen',
      createdAt: '2026-10-01'
    },
    {
      id: 4,
      restaurantId: 1,
      customerId: 5,
      reservationId: 908,
      rating: 5,
      comment: 'The Dal Makhani Imperial and garlic naan were extraordinary. One of the finest dining spots in the city.',
      customerName: 'Kabir Mehta',
      createdAt: '2026-10-03'
    },
    {
      id: 5,
      restaurantId: 1,
      customerId: 1,
      reservationId: 1009,
      rating: 5,
      comment: 'Magnificent banquet and royal service. The slow-cooked dum curries were deeply fragrant and memorable.',
      customerName: 'Debasis Panda',
      createdAt: '2026-09-19'
    },

    // Restaurant 2: Coastal Breeze Seafood & Grill
    {
      id: 6,
      restaurantId: 2,
      customerId: 2,
      reservationId: 904,
      rating: 5,
      comment: 'The ocean view paired with fresh grilled crab and lobster was nothing short of extraordinary.',
      customerName: 'Rohan Mukherjee',
      createdAt: '2026-09-18'
    },
    {
      id: 7,
      restaurantId: 2,
      customerId: 3,
      reservationId: 905,
      rating: 4,
      comment: 'The food was excellent and the service was attentive. The coastal crab curry is a must-try.',
      customerName: 'Sunita Patnaik',
      createdAt: '2026-09-22'
    },
    {
      id: 8,
      restaurantId: 2,
      customerId: 1,
      reservationId: 1004,
      rating: 5,
      comment: 'Exemplary coastal dining. The grilled prawns and seaside views made our evening truly memorable.',
      customerName: 'Debasis Panda',
      createdAt: '2026-09-13'
    },
    {
      id: 9,
      restaurantId: 2,
      customerId: 6,
      reservationId: 909,
      rating: 4,
      comment: 'Fresh seafood delicacies with scenic outdoor rooftop seating overlooking the coastline. Highly recommended.',
      customerName: 'Tanvi Mohanty',
      createdAt: '2026-09-29'
    },
    {
      id: 10,
      restaurantId: 2,
      customerId: 7,
      reservationId: 911,
      rating: 5,
      comment: 'The Pomfret Besara and tender coconut mocktail were sensational. Sublime coastal gastronomy.',
      customerName: 'Alok Tripathy',
      createdAt: '2026-10-04'
    },

    // Restaurant 3: Urban Hearth Fine Dine
    {
      id: 11,
      restaurantId: 3,
      customerId: 4,
      reservationId: 906,
      rating: 5,
      comment: 'Wood-fired artisanal truffle pizza with aged wine. Sublime atmosphere and bespoke service.',
      customerName: 'Arjun Verma',
      createdAt: '2026-09-25'
    },
    {
      id: 12,
      restaurantId: 3,
      customerId: 5,
      reservationId: 907,
      rating: 4,
      comment: 'Handmade pasta cooked al dente with rich mushroom sauce. Romantic, elegant fine dining.',
      customerName: 'Meera Das',
      createdAt: '2026-09-29'
    },
    {
      id: 13,
      restaurantId: 3,
      customerId: 1,
      reservationId: 1007,
      rating: 5,
      comment: 'The artisanal wood-fired pizza and classic tiramisu were divine. Impeccable European craft and service.',
      customerName: 'Debasis Panda',
      createdAt: '2026-09-03'
    },
    {
      id: 14,
      restaurantId: 3,
      customerId: 8,
      reservationId: 910,
      rating: 5,
      comment: 'Intimate and modern ambience. The risotto and smoked salmon carpaccio were world-class.',
      customerName: 'Siddharth Rao',
      createdAt: '2026-10-02'
    },
    {
      id: 15,
      restaurantId: 3,
      customerId: 9,
      reservationId: 912,
      rating: 4,
      comment: 'Exceptional wine pairing and courteous hospitality. A quintessential fine dining European experience.',
      customerName: 'Kavita Chawla',
      createdAt: '2026-10-05'
    }
  ];

  private getMatchingReviews(restaurantId: number): Review[] {
    const id = Number(restaurantId);
    return this.reviews.filter(
      (r) =>
        r.restaurantId === id ||
        (id === 5 && r.restaurantId === 2) ||
        (id === 6 && r.restaurantId === 3)
    );
  }

  /**
   * Get all reviews for a specific restaurant.
   */
  getReviewsByRestaurantId(restaurantId: number): Observable<Review[]> {
    const id = Number(restaurantId);
    const list = this.getMatchingReviews(id).map((r) => ({
      ...r,
      restaurantId: id
    }));
    // Sort newest first
    const sorted = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return of(sorted);
  }

  /**
   * Get a review associated with a specific reservation.
   */
  getReviewByReservationId(reservationId: number): Observable<Review | undefined> {
    const review = this.reviews.find((r) => r.reservationId === reservationId);
    return of(review);
  }

  /**
   * Check whether a reservation has already been reviewed.
   */
  hasReviewedReservation(reservationId: number): Observable<boolean> {
    const exists = this.reviews.some((r) => r.reservationId === reservationId);
    return of(exists);
  }

  /**
   * Create and store a new review for a completed reservation.
   * Enforces 1-5 rating range, 10-500 char comment, and prevents duplicate reviews.
   */
  createReview(review: Review): Observable<Review> {
    if (!review.rating || review.rating < 1 || review.rating > 5) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    const trimmedComment = (review.comment || '').trim();
    if (trimmedComment.length < 10) {
      throw new Error('Review comment must be at least 10 characters.');
    }

    if (trimmedComment.length > 500) {
      throw new Error('Review comment cannot exceed 500 characters.');
    }

    const alreadyReviewed = this.reviews.some((r) => r.reservationId === review.reservationId);
    if (alreadyReviewed) {
      throw new Error('This reservation has already been reviewed.');
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const newReview: Review = {
      ...review,
      id: review.id || Math.floor(1000 + Math.random() * 9000),
      createdAt: review.createdAt || todayStr,
      comment: trimmedComment
    };

    this.reviews.push(newReview);

    if (this.notificationService) {
      this.notificationService.addNotification({
        id: 0,
        customerId: newReview.customerId,
        type: 'REVIEW_SUBMITTED',
        title: 'Review Submitted',
        message: 'Thank you for sharing your dining experience.',
        reservationId: newReview.reservationId,
        restaurantId: newReview.restaurantId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false
      }).subscribe();
    }

    return of(newReview);
  }

  /**
   * Calculate average rating for a restaurant rounded to one decimal place.
   */
  getRestaurantRating(restaurantId: number): Observable<number> {
    const list = this.getMatchingReviews(restaurantId);
    if (list.length === 0) {
      return of(0);
    }
    const sum = list.reduce((acc, r) => acc + r.rating, 0);
    const avg = Math.round((sum / list.length) * 10) / 10;
    return of(avg);
  }

  /**
   * Get total review count for a restaurant.
   */
  getReviewCount(restaurantId: number): Observable<number> {
    const count = this.getMatchingReviews(restaurantId).length;
    return of(count);
  }

  /**
   * Get distribution of ratings (count of 5-star, 4-star, 3-star, etc.)
   */
  getRatingDistribution(restaurantId: number): Observable<{ [rating: number]: number }> {
    const distribution: { [rating: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    const list = this.getMatchingReviews(restaurantId);
    list.forEach((r) => {
      const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
      distribution[rounded] = (distribution[rounded] || 0) + 1;
    });
    return of(distribution);
  }
}
