import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';
import { Reservation } from '../../core/models/reservation.model';
import { Review } from '../../core/models/review.model';

@Component({
  selector: 'app-restaurant-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-details.html',
  styleUrl: './restaurant-details.css',
})
export class RestaurantDetails implements OnInit {
  restaurant: Restaurant | null = null;
  tables: Table[] = [];
  selectedTable: Table | null = null;

  // Favorites State
  isFavoriteRestaurant: boolean = false;

  // Reviews & Rating State
  reviews: Review[] = [];
  averageRating: number = 0;
  reviewCount: number = 0;
  ratingDistribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  readonly stars: number[] = [1, 2, 3, 4, 5];

  // Reservation Form State
  bookingDate: string = '';
  minDate: string = '';
  bookingTime: string = '19:30';
  guestsCount: number = 2;
  specialRequests: string = '';
  timeSlots: string[] = [
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '06:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
    '08:30 PM',
    '09:00 PM',
  ];

  // Feedback & Modal state
  bookingSuccess: boolean = false;
  createdReservation: Reservation | null = null;
  errorMessage: string = '';
  isMobileMenuOpen: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private reservationService: ReservationService,
    private reviewService: ReviewService,
    private favoriteService: FavoriteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Default reservation date to today in YYYY-MM-DD format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.bookingDate = `${yyyy}-${mm}-${dd}`;
    this.minDate = this.bookingDate;

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const restaurantId = idParam ? Number(idParam) : 1;
      this.loadRestaurantDetails(restaurantId);
    });
  }

  loadRestaurantDetails(restaurantId: number): void {
    this.restaurantService.getRestaurantById(restaurantId).subscribe({
      next: (res) => {
        this.restaurant = res || null;
      },
    });

    this.restaurantService.getTablesByRestaurantId(restaurantId).subscribe({
      next: (tables) => {
        this.tables = tables;
      },
    });

    this.loadReviewsAndRatings(restaurantId);
    this.checkFavoriteStatus(restaurantId);
  }

  checkFavoriteStatus(restaurantId: number): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.favoriteService.isFavorite(customerId, restaurantId).subscribe({
      next: (isFav) => {
        this.isFavoriteRestaurant = isFav;
      },
    });
  }

  toggleFavorite(): void {
    if (!this.restaurant) return;

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    const restaurantId = this.restaurant.id;

    // Optimistic toggle
    this.isFavoriteRestaurant = !this.isFavoriteRestaurant;

    this.favoriteService.toggleFavorite(customerId, restaurantId).subscribe({
      next: (isNowFav) => {
        this.isFavoriteRestaurant = isNowFav;
      },
      error: () => {
        // Rollback on error
        this.isFavoriteRestaurant = !this.isFavoriteRestaurant;
      },
    });
  }

  loadReviewsAndRatings(restaurantId: number): void {
    this.reviewService.getReviewsByRestaurantId(restaurantId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
      },
    });

    this.reviewService.getRestaurantRating(restaurantId).subscribe({
      next: (rating) => {
        this.averageRating = rating;
      },
    });

    this.reviewService.getReviewCount(restaurantId).subscribe({
      next: (count) => {
        this.reviewCount = count;
      },
    });

    this.reviewService.getRatingDistribution(restaurantId).subscribe({
      next: (distribution) => {
        this.ratingDistribution = distribution;
      },
    });
  }

  getRatingPercentage(ratingValue: number): number {
    if (!this.reviewCount || this.reviewCount === 0) return 0;
    const count = this.ratingDistribution[ratingValue] || 0;
    return Math.round((count / this.reviewCount) * 100);
  }

  isStarFilled(star: number): boolean {
    const val = this.averageRating > 0 ? this.averageRating : (this.restaurant?.rating || 0);
    return star <= Math.round(val);
  }

  formatReviewDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, month, day).toLocaleDateString('en-US', {
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

  /**
   * Only allowed to select available tables.
   */
  selectTable(table: Table): void {
    if (!table.available) {
      this.errorMessage = `Table ${table.tableNumber} is currently occupied and cannot be selected.`;
      setTimeout(() => (this.errorMessage = ''), 4000);
      return;
    }

    this.errorMessage = '';
    this.selectedTable = table;

    // Adjust guests if current exceeds table capacity
    if (this.guestsCount > table.capacity) {
      this.guestsCount = table.capacity;
    }
  }

  submitReservation(): void {
    this.errorMessage = '';

    if (!this.restaurant) {
      this.errorMessage = 'Restaurant not found.';
      return;
    }

    if (!this.selectedTable) {
      this.errorMessage = 'Please click on an available table from the layout above to select it.';
      return;
    }

    if (!this.bookingDate) {
      this.errorMessage = 'Please choose a reservation date.';
      return;
    }

    if (this.bookingDate < this.minDate) {
      this.errorMessage = 'Reservation date cannot be in the past.';
      return;
    }

    if (!this.bookingTime) {
      this.errorMessage = 'Please choose a dining time slot.';
      return;
    }

    if (this.guestsCount < 1) {
      this.errorMessage = 'Guests count must be at least 1.';
      return;
    }

    if (this.guestsCount > this.selectedTable.capacity) {
      this.errorMessage = `Table ${this.selectedTable.tableNumber} holds a maximum of ${this.selectedTable.capacity} guests.`;
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    this.reservationService
      .createReservation({
        customerId: customerId,
        restaurantId: this.restaurant.id,
        tableId: this.selectedTable.id,
        date: this.bookingDate,
        time: this.bookingTime,
        guests: this.guestsCount,
        status: 'CONFIRMED',
      })
      .subscribe({
        next: (reservation) => {
          this.createdReservation = reservation;
          this.bookingSuccess = true;

          // Update table in-memory availability
          if (this.selectedTable) {
            this.selectedTable.available = false;
          }
        },
      });
  }

  goToMyReservations(): void {
    this.router.navigate(['/customer/reservations']);
  }

  viewMenu(): void {
    if (this.restaurant) {
      this.router.navigate(['/customer/restaurants', this.restaurant.id, 'menu']);
    }
  }

  viewQrPass(reservationId: number): void {
    this.router.navigate(['/customer/reservation-pass', reservationId]);
  }

  bookAnother(): void {
    this.bookingSuccess = false;
    this.createdReservation = null;
    this.selectedTable = null;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
