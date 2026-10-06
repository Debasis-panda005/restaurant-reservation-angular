import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
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
  | 'ALREADY_REVIEWED';

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
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const id = idParam ? Number(idParam) : NaN;

      if (!idParam || isNaN(id)) {
        this.setErrorState('NOT_FOUND', 'Reservation Not Found');
        this.isLoading = false;
        return;
      }

      this.reservationId = id;
      this.loadReservationAndCheckEligibility(id);
    });
  }

  loadReservationAndCheckEligibility(resId: number): void {
    this.isLoading = true;
    this.errorState = 'NONE';
    this.errorMessage = '';

    const currentUser = this.authService.getCurrentUser();
    const currentCustomerId = currentUser ? currentUser.id : 1;

    this.reservationService.getReservationById(resId).subscribe({
      next: (res) => {
        if (!res) {
          this.setErrorState('NOT_FOUND', 'Reservation Not Found');
          this.isLoading = false;
          return;
        }

        // Ownership verification
        if (res.customerId !== currentCustomerId) {
          this.setErrorState('UNAUTHORIZED', 'Reservation Not Found');
          this.isLoading = false;
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
          return;
        }

        if (res.status === 'CONFIRMED' || res.status === 'PENDING') {
          this.setErrorState(
            'NOT_COMPLETED',
            'Please complete your dining experience before leaving a review.'
          );
          this.isLoading = false;
          return;
        }

        if (res.status !== 'COMPLETED') {
          this.setErrorState(
            'NOT_COMPLETED',
            'Reviews are available only after completed dining experiences.'
          );
          this.isLoading = false;
          return;
        }

        // Check if already reviewed
        this.reviewService.hasReviewedReservation(resId).subscribe({
          next: (alreadyReviewed) => {
            if (alreadyReviewed) {
              this.setErrorState(
                'ALREADY_REVIEWED',
                'You have already shared your experience for this reservation.'
              );
              this.isLoading = false;
              return;
            }

            // Load Restaurant Details
            this.restaurantService.getRestaurantById(res.restaurantId).subscribe({
              next: (rest) => {
                this.restaurant = rest || null;
                this.isLoading = false;
              },
              error: () => {
                this.isLoading = false;
              },
            });
          },
          error: () => {
            this.isLoading = false;
          },
        });
      },
      error: () => {
        this.setErrorState('NOT_FOUND', 'Reservation Not Found');
        this.isLoading = false;
      },
    });
  }

  setRating(star: number): void {
    if (star >= 1 && star <= 5) {
      this.selectedRating = star;
      this.validationError = '';
    }
  }

  setHoverRating(star: number): void {
    this.hoverRating = star;
  }

  clearHoverRating(): void {
    this.hoverRating = 0;
  }

  get currentRatingLabel(): string {
    const star = this.hoverRating || this.selectedRating;
    return this.ratingLabels[star] || '';
  }

  submitReview(): void {
    this.validationError = '';

    if (!this.selectedRating || this.selectedRating < 1 || this.selectedRating > 5) {
      this.validationError = 'Please select a star rating between 1 and 5.';
      return;
    }

    const trimmed = (this.comment || '').trim();
    if (trimmed.length < 10) {
      this.validationError = 'Please write at least 10 characters.';
      return;
    }

    if (trimmed.length > 500) {
      this.validationError = 'Review comment cannot exceed 500 characters.';
      return;
    }

    if (!this.reservation || this.reservation.status !== 'COMPLETED') {
      this.validationError = 'Only completed dining reservations can be reviewed.';
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : this.reservation.customerId;
    const customerName = currentUser ? currentUser.name : 'Debasis Panda';

    this.isSubmitting = true;

    const newReviewData: Review = {
      id: Math.floor(1000 + Math.random() * 9000),
      restaurantId: this.reservation.restaurantId,
      customerId: customerId,
      reservationId: this.reservation.id,
      rating: this.selectedRating,
      comment: trimmed,
      createdAt: new Date().toISOString().split('T')[0],
      customerName: customerName,
    };

    this.reviewService.createReview(newReviewData).subscribe({
      next: (created) => {
        this.isSubmitting = false;
        this.isSubmitted = true;
        this.submittedReview = created;
      },
      error: (err) => {
        this.isSubmitting = false;
        this.validationError = err.message || 'Failed to submit review. Please try again.';
      },
    });
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
