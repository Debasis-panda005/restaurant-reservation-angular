import { Component, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Review } from '../../core/models/review.model';

export type ReviewErrorState =
  | 'NONE'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'NOT_COMPLETED'
  | 'CANCELLED'
  | 'ALREADY_REVIEWED'
  | 'API_ERROR';

@Component({
  selector: 'app-restaurant-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-review.html',
  styleUrl: './restaurant-review.css',
})
export class RestaurantReview implements OnInit {
  reservationId: number = 0;
  reservation: Reservation | null = null;
  restaurant: Restaurant | null = null;
  unreadNotificationsCount: number = 0;

  isLoading: boolean = true;
  errorState: ReviewErrorState = 'NONE';
  errorMessage: string = '';

  // Form State
  selectedRating: number = 0;
  hoverRating: number = 0;
  comment: string = '';
  validationError: string = '';
  isSubmitting: boolean = false;
  isSubmitted: boolean = false;
  submittedReview: Review | null = null;

  // Star Rating Labels
  readonly ratingLabels: { [key: number]: string } = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent',
  };

  readonly stars: number[] = [1, 2, 3, 4, 5];
  isMobileMenuOpen: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    @Optional() private notificationService?: NotificationService,
    @Optional() private cdr?: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUnreadCount();
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;

      if (!idParam || isNaN(id)) {
        this.setErrorState('NOT_FOUND', 'Reservation Not Found');
        this.isLoading = false;
        this.cdr?.markForCheck();
        return;
      }

      this.reservationId = id;
      this.loadReservationAndCheckEligibility(id);
    });
  }

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
        this.cdr?.markForCheck();
      },
    });
  }

  loadReservationAndCheckEligibility(resId: number): void {
    this.isLoading = true;
    this.errorState = 'NONE';
    this.errorMessage = '';
    this.cdr?.markForCheck();

    const currentUser = this.authService.getCurrentUser();
    const currentCustomerId = currentUser ? currentUser.id : 1;

    this.reservationService.getReservationById(resId).subscribe({
      next: (res) => {
        if (!res) {
          this.setErrorState('NOT_FOUND', 'Reservation Not Found');
          this.isLoading = false;
          this.cdr?.markForCheck();
          return;
        }

        // Ownership verification
        if (Number(res.customerId) !== Number(currentCustomerId)) {
          this.setErrorState('UNAUTHORIZED', 'Reservation Not Found');
          this.isLoading = false;
          this.cdr?.markForCheck();
          return;
        }

        this.reservation = res;

        // Status verification
        if (res.status === 'CANCELLED') {
          this.setErrorState(
            'CANCELLED',
            'Reviews are available only after completed dining experiences.'
          );
          this.isLoading = false;
          this.cdr?.markForCheck();
          return;
        }

        if (res.status === 'CONFIRMED' || res.status === 'PENDING') {
          this.setErrorState(
            'NOT_COMPLETED',
            'Please complete your dining experience before leaving a review.'
          );
          this.isLoading = false;
          this.cdr?.markForCheck();
          return;
        }

        if (res.status !== 'COMPLETED') {
          this.setErrorState(
            'NOT_COMPLETED',
            'Reviews are available only after completed dining experiences.'
          );
          this.isLoading = false;
          this.cdr?.markForCheck();
          return;
        }

        // Check if already reviewed via API
        this.reviewService.hasReviewedReservation(resId).subscribe({
          next: (alreadyReviewed) => {
            if (alreadyReviewed) {
              this.setErrorState(
                'ALREADY_REVIEWED',
                'You have already shared your experience for this reservation.'
              );
              this.isLoading = false;
              this.cdr?.markForCheck();
              return;
            }

            // Load Restaurant Details
            this.restaurantService.getRestaurantById(res.restaurantId).subscribe({
              next: (rest) => {
                this.restaurant = rest || this.buildFallbackRestaurant(res);
                this.isLoading = false;
                this.cdr?.markForCheck();
              },
              error: () => {
                this.restaurant = this.buildFallbackRestaurant(res);
                this.isLoading = false;
                this.cdr?.markForCheck();
              },
            });
          },
          error: (err) => {
            console.error('[RestaurantReview] Failed to check review status:', err);
            this.setErrorState(
              'API_ERROR',
              'Unable to verify dining review status with the server. Please check your connection and retry.'
            );
            this.isLoading = false;
            this.cdr?.markForCheck();
          },
        });
      },
      error: (err) => {
        console.error('[RestaurantReview] Failed to load reservation:', err);
        const status = err?.status;
        if (status === 403) {
          this.setErrorState('UNAUTHORIZED', 'You are not authorized to view or review this reservation.');
        } else if (status === 404) {
          this.setErrorState('NOT_FOUND', 'Reservation Not Found');
        } else {
          this.setErrorState(
            'API_ERROR',
            'Unable to retrieve reservation details from the server. Please check your connection and retry.'
          );
        }
        this.isLoading = false;
        this.cdr?.markForCheck();
      },
    });
  }

  private buildFallbackRestaurant(res: Reservation): Restaurant {
    return {
      id: res.restaurantId,
      name: res.restaurantName || `Restaurant #${res.restaurantId}`,
      location: 'Bhubaneswar, Odisha',
      cuisine: 'Fine Dining & Gourmet',
      description: 'Curated dining experience with artisanal preparations.',
      openingTime: '11:00:00',
      closingTime: '23:00:00',
      rating: 4.8,
      tagline: 'Imperial Flavors & Royal Dining',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
    };
  }

  retryLoading(): void {
    if (this.reservationId) {
      this.loadReservationAndCheckEligibility(this.reservationId);
    }
  }

  setRating(star: number): void {
    if (star >= 1 && star <= 5) {
      this.selectedRating = star;
      this.validationError = '';
      this.cdr?.markForCheck();
    }
  }

  setHoverRating(star: number): void {
    this.hoverRating = star;
    this.cdr?.markForCheck();
  }

  clearHoverRating(): void {
    this.hoverRating = 0;
    this.cdr?.markForCheck();
  }

  get currentRatingLabel(): string {
    const star = this.hoverRating || this.selectedRating;
    return this.ratingLabels[star] || '';
  }

  submitReview(): void {
    this.validationError = '';

    if (!this.selectedRating || this.selectedRating < 1 || this.selectedRating > 5) {
      this.validationError = 'Please select a star rating between 1 and 5.';
      this.cdr?.markForCheck();
      return;
    }

    const trimmed = (this.comment || '').trim();
    if (trimmed.length === 0) {
      this.validationError = 'Please provide a comment for your review.';
      this.cdr?.markForCheck();
      return;
    }
    if (trimmed.length < 10) {
      this.validationError = 'Please write at least 10 characters.';
      this.cdr?.markForCheck();
      return;
    }

    if (trimmed.length > 500) {
      this.validationError = 'Review comment cannot exceed 500 characters.';
      this.cdr?.markForCheck();
      return;
    }

    if (!this.reservation || this.reservation.status !== 'COMPLETED') {
      this.validationError = 'Only completed dining reservations can be reviewed.';
      this.cdr?.markForCheck();
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : this.reservation.customerId;
    const customerName = currentUser ? currentUser.name : 'Debasis Panda';

    this.isSubmitting = true;
    this.cdr?.markForCheck();

    const newReviewData: Review = {
      id: Math.floor(1000 + Math.random() * 9000),
      restaurantId: this.reservation.restaurantId,
      customerId: customerId,
      reservationId: this.reservation.id,
      rating: this.selectedRating,
      comment: trimmed,
      createdAt: new Date().toISOString().split('T')[0],
      customerName: customerName,
      customerDisplayName: customerName,
    };

    try {
      this.reviewService.createReview(newReviewData, this.reservation).subscribe({
        next: (created) => {
          this.isSubmitting = false;
          this.isSubmitted = true;
          this.submittedReview = created;
          this.cdr?.markForCheck();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.validationError = err.message || 'Failed to submit review. Please try again.';
          this.cdr?.markForCheck();
        },
      });
    } catch (err: any) {
      this.isSubmitting = false;
      this.validationError = err.message || 'Failed to submit review. Please try again.';
      this.cdr?.markForCheck();
    }
  }

  goToRestaurant(): void {
    if (this.reservation) {
      this.router.navigate(['/customer/restaurants', this.reservation.restaurantId]);
    } else {
      this.router.navigate(['/customer/restaurants']);
    }
  }

  goToReservations(): void {
    this.router.navigate(['/customer/reservations']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        return dateObj.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  private setErrorState(state: ReviewErrorState, message: string): void {
    this.errorState = state;
    this.errorMessage = message;
  }
}

export default RestaurantReview;
