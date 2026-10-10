import { Component, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { ReviewService } from '../../core/services/review.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { NotificationService } from '../../core/services/notification.service';
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
  rawTables: Table[] = [];
  tables: Table[] = [];
  selectedTable: Table | null = null;
  isTablesLoading: boolean = false;
  tablesErrorMessage: string = '';
  existingReservations: Reservation[] = [];

  // Favorites State
  isFavoriteRestaurant: boolean = false;
  unreadNotificationsCount: number = 0;

  // Reviews & Rating State
  reviews: Review[] = [];
  averageRating: number = 0;
  reviewCount: number = 0;
  ratingDistribution: { [key: number]: number } = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  readonly stars: number[] = [1, 2, 3, 4, 5];

  // Reservation Form State
  bookingDate: string = '';
  minDate: string = '';
  bookingTime: string = '07:30 PM';
  guestsCount: number = 2;
  specialRequests: string = '';
  timeSlots: string[] = [
    '11:00 AM',
    '11:30 AM',
    '12:00 PM',
    '12:30 PM',
    '01:00 PM',
    '01:30 PM',
    '02:00 PM',
    '02:30 PM',
    '03:00 PM',
    '03:30 PM',
    '04:00 PM',
    '04:30 PM',
    '05:00 PM',
    '05:30 PM',
    '06:00 PM',
    '06:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
    '08:30 PM',
    '09:00 PM',
    '09:30 PM',
    '10:00 PM',
  ];

  // Feedback & Modal state
  bookingSuccess: boolean = false;
  createdReservation: Reservation | null = null;
  errorMessage: string = '';
  isMobileMenuOpen: boolean = false;
  isSubmittingReservation: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private reservationService: ReservationService,
    private reviewService: ReviewService,
    private favoriteService: FavoriteService,
    private authService: AuthService,
    @Optional() private cdr?: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    // Default reservation date to today in YYYY-MM-DD format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.bookingDate = `${yyyy}-${mm}-${dd}`;
    this.minDate = this.bookingDate;

    this.generateTimeSlots(null);
    this.loadUnreadCount();

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      const restaurantId = idParam ? Number(idParam) : 1;
      this.loadRestaurantDetails(restaurantId);
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

  loadTables(restaurantId: number): void {
    this.isTablesLoading = true;
    this.tablesErrorMessage = '';
    this.selectedTable = null;
    this.cdr?.markForCheck();

    this.restaurantService
      .getTablesByRestaurantId(restaurantId)
      .pipe(
        finalize(() => {
          this.isTablesLoading = false;
          this.cdr?.markForCheck();
        })
      )
      .subscribe({
        next: (tables) => {
          this.rawTables = (tables || []).map((t) => ({ ...t }));
          this.tables = (tables || []).map((t) => ({ ...t }));
          this.updateTableAvailability();
          this.cdr?.markForCheck();
        },
        error: (err) => {
          console.error(`[RestaurantDetails] Error loading tables for restaurant #${restaurantId}:`, err);
          this.rawTables = [];
          this.tables = [];
          this.tablesErrorMessage = 'Unable to load seating configuration from concierge. Please verify your connection or try again.';
          this.cdr?.markForCheck();
        },
      });
  }

  loadRestaurantDetails(restaurantId: number): void {
    this.restaurantService.getRestaurantById(restaurantId).subscribe({
      next: (res) => {
        this.restaurant = res || null;
        if (this.restaurant) {
          this.generateTimeSlots(this.restaurant);
        }
        this.cdr?.markForCheck();
      },
    });

    this.loadTables(restaurantId);
    this.loadRestaurantReservations(restaurantId, this.bookingDate);
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
   * Load reservations for this restaurant to calculate table and time-slot availability.
   */
  loadRestaurantReservations(restaurantId: number, date?: string): void {
    this.reservationService.getReservationsByRestaurantId(restaurantId, date).subscribe({
      next: (res) => {
        this.existingReservations = res || [];
        this.updateTableAvailability();
        this.cdr?.markForCheck();
      },
      error: (err) => {
        console.warn(`[RestaurantDetails] Could not fetch reservations for restaurant #${restaurantId}:`, err);
        this.existingReservations = [];
        this.updateTableAvailability();
        this.cdr?.markForCheck();
      }
    });
  }

  /**
   * Generate 30-minute time slots dynamically based on restaurant opening and closing hours.
   */
  generateTimeSlots(restaurant?: Restaurant | null): void {
    const slots: string[] = [];

    let startHour = 11;
    let startMin = 0;
    let endHour = 22;
    let endMin = 0;

    if (restaurant?.openingTime) {
      const parts = restaurant.openingTime.split(':');
      if (parts.length >= 1) {
        startHour = parseInt(parts[0], 10);
        startMin = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      }
    }

    if (restaurant?.closingTime) {
      const parts = restaurant.closingTime.split(':');
      if (parts.length >= 1) {
        endHour = parseInt(parts[0], 10);
        endMin = parts.length > 1 ? parseInt(parts[1], 10) : 0;
        // Last seating is typically at least 30 minutes before closing
        if (endMin >= 30) {
          endMin -= 30;
        } else {
          endHour -= 1;
          endMin += 30;
        }
      }
    }

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes <= endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const ampm = h >= 12 ? 'PM' : 'AM';
      let displayH = h % 12;
      displayH = displayH === 0 ? 12 : displayH;
      const formattedSlot = `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
      slots.push(formattedSlot);
      currentMinutes += 30;
    }

    if (slots.length === 0) {
      slots.push(
        '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
        '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
        '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
        '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
        '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
        '09:00 PM', '09:30 PM', '10:00 PM'
      );
    }

    this.timeSlots = slots;

    // Ensure bookingTime matches a valid slot in timeSlots
    if (!this.bookingTime || !this.timeSlots.includes(this.bookingTime)) {
      const matched = this.timeSlots.find(
        (s) => this.formatTo24h(s).substring(0, 5) === this.formatTo24h(this.bookingTime).substring(0, 5)
      );
      this.bookingTime = matched || this.timeSlots[0];
    }
  }

  /**
   * Helper to normalize 12h or 24h time strings to 'HH:mm:ss'.
   */
  formatTo24h(timeStr: string): string {
    if (!timeStr) return '19:30:00';
    const trimmed = timeStr.trim().toUpperCase();
    if (trimmed.includes('AM') || trimmed.includes('PM')) {
      const isPm = trimmed.includes('PM');
      const clean = trimmed.replace('AM', '').replace('PM', '').trim();
      const parts = clean.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    if (trimmed.length === 5) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }

  /**
   * Checks whether a table is occupied at a given date and time.
   * Only CONFIRMED or PENDING reservations block the table.
   * CANCELLED and COMPLETED reservations do NOT block the table.
   */
  isTableOccupied(tableId: number, date: string, timeStr: string): boolean {
    if (!this.existingReservations || this.existingReservations.length === 0) {
      return false;
    }
    const targetTime24 = this.formatTo24h(timeStr);

    return this.existingReservations.some((r) => {
      // CANCELLED or COMPLETED reservations do NOT block
      if (r.status !== 'CONFIRMED' && r.status !== 'PENDING') {
        return false;
      }
      if (this.restaurant && Number(r.restaurantId) !== Number(this.restaurant.id)) {
        return false;
      }
      if (Number(r.tableId) !== Number(tableId)) {
        return false;
      }
      if (r.date !== date) {
        return false;
      }
      return this.formatTo24h(r.time) === targetTime24;
    });
  }

  /**
   * Recalculates the available flag for all tables based on current bookingDate and bookingTime.
   */
  updateTableAvailability(): void {
    if (!this.tables || this.tables.length === 0) return;

    this.tables.forEach((table) => {
      const raw = this.rawTables.find((t) => t.id === table.id);
      const isBaseActive = raw ? raw.available !== false : true;
      const isOccupied = this.isTableOccupied(table.id, this.bookingDate, this.bookingTime);
      table.available = isBaseActive && !isOccupied;
    });

    if (this.selectedTable && !this.selectedTable.available) {
      this.selectedTable = null;
    }
    this.cdr?.markForCheck();
  }

  /**
   * Checks if all tables are booked out for a given time slot.
   */
  isSlotFullyBooked(slot: string): boolean {
    if (!this.tables || this.tables.length === 0) return false;
    return this.tables.every((t) => this.isTableOccupied(t.id, this.bookingDate, slot));
  }

  onDateChange(newDate: string): void {
    this.bookingDate = newDate;
    if (this.restaurant) {
      this.loadRestaurantReservations(this.restaurant.id, this.bookingDate);
    } else {
      this.updateTableAvailability();
    }
  }

  onTimeChange(newTime: string): void {
    this.bookingTime = newTime;
    this.updateTableAvailability();
  }

  /**
   * Only allowed to select available tables.
   */
  selectTable(table: Table): void {
    if (!table.available || this.isTableOccupied(table.id, this.bookingDate, this.bookingTime)) {
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

    if (this.isSubmittingReservation) {
      return;
    }

    if (!this.restaurant) {
      this.errorMessage = 'Restaurant not found.';
      return;
    }

    if (!this.selectedTable) {
      this.errorMessage = 'Please click on an available table from the layout above to select it.';
      return;
    }

    if (this.isTableOccupied(this.selectedTable.id, this.bookingDate, this.bookingTime)) {
      this.errorMessage = `Table ${this.selectedTable.tableNumber} is already reserved for this date and time. Please select another table or time.`;
      this.updateTableAvailability();
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

    this.isSubmittingReservation = true;
    this.cdr?.markForCheck();

    this.reservationService
      .createReservation({
        customerId: customerId,
        restaurantId: this.restaurant.id,
        tableId: this.selectedTable.id,
        tableNumber: this.selectedTable.tableNumber,
        seatingType: this.selectedTable.seatingType,
        restaurantName: this.restaurant.name,
        date: this.bookingDate,
        time: this.bookingTime,
        guests: this.guestsCount,
        status: 'CONFIRMED',
      })
      .subscribe({
        next: (reservation) => {
          this.isSubmittingReservation = false;
          this.createdReservation = reservation;
          this.bookingSuccess = true;

          // Update table in-memory availability
          if (this.selectedTable) {
            this.selectedTable.available = false;
          }
          this.existingReservations.push(reservation);
          this.updateTableAvailability();
          this.cdr?.markForCheck();
        },
        error: (err) => {
          this.isSubmittingReservation = false;
          const statusText = err?.status ? ` (HTTP ${err.status})` : '';
          this.errorMessage = `Unable to confirm reservation with the server${statusText}. The Spring Boot reservation API endpoint (POST /api/reservations) is currently not available or unauthorized. Please verify the backend service or try again.`;
          this.cdr?.markForCheck();
        }
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
