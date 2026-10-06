import { Component, OnInit, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-reschedule-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reschedule-reservation.html',
  styleUrl: './reschedule-reservation.css'
})
export class RescheduleReservation implements OnInit {
  reservation: Reservation | null = null;
  restaurant: Restaurant | null = null;
  currentTable: Table | null = null;
  tables: Table[] = [];
  existingReservations: Reservation[] = [];
  unreadNotificationsCount: number = 0;

  // Available Time Slots
  readonly timeSlots: string[] = [
    '12:00 PM',
    '12:30 PM',
    '01:00 PM',
    '01:30 PM',
    '07:00 PM',
    '07:30 PM',
    '08:00 PM',
    '08:30 PM',
    '09:00 PM'
  ];

  // Reschedule Form State
  minDate: string = '';
  newDate: string = '';
  newTime: string = '07:30 PM';
  selectedTable: Table | null = null;

  // View / Lifecycle States
  isLoading: boolean = true;
  notFound: boolean = false;
  cannotReschedule: boolean = false;
  cannotRescheduleReason: string = '';
  isReviewStep: boolean = false;
  rescheduleSuccess: boolean = false;
  updatedReservation: Reservation | null = null;

  // Feedback Messages
  errorMessage: string = '';
  isMobileMenuOpen: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    // Setup today as minimum date (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    this.loadUnreadCount();

    const idParam = this.route.snapshot.paramMap.get('id');
    this.handleRouteId(idParam);
  }

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
      },
    });
  }

  handleRouteId(idParam: string | null | undefined): void {
    if (!idParam || isNaN(Number(idParam))) {
      this.notFound = true;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    const reservationId = Number(idParam);
    this.loadReservationData(reservationId);
  }

  loadReservationData(reservationId: number): void {
    this.isLoading = true;
    this.notFound = false;
    this.cannotReschedule = false;
    this.errorMessage = '';

    // Load reservation
    this.reservationService.getReservationById(reservationId).subscribe({
      next: (res) => {
        if (!res) {
          this.notFound = true;
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        // Verify customer authorization
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && res.customerId !== currentUser.id) {
          this.notFound = true;
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        // Verify reservation status: only CONFIRMED may be rescheduled
        if (res.status === 'CANCELLED') {
          this.cannotReschedule = true;
          this.cannotRescheduleReason = 'Cancelled reservations cannot be rescheduled.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        if (res.status === 'COMPLETED') {
          this.cannotReschedule = true;
          this.cannotRescheduleReason = 'Completed reservations cannot be rescheduled.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        if (res.status !== 'CONFIRMED') {
          this.cannotReschedule = true;
          this.cannotRescheduleReason = 'Only confirmed reservations can be rescheduled.';
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        this.reservation = res;

        // Initialize form values
        this.newDate = res.date >= this.minDate ? res.date : this.minDate;
        this.newTime = this.formatTo12h(res.time);

        // Load all existing reservations for conflict checking
        this.reservationService.getReservations().subscribe({
          next: (allRes) => {
            this.existingReservations = allRes || [];
          }
        });

        // Load restaurant details
        this.restaurantService.getRestaurantById(res.restaurantId).subscribe({
          next: (restaurant) => {
            this.restaurant = restaurant || null;
          }
        });

        // Load restaurant tables
        this.restaurantService.getTablesByRestaurantId(res.restaurantId).subscribe({
          next: (tables) => {
            this.tables = tables || [];
            this.currentTable = this.tables.find(t => t.id === res.tableId) || null;
            // Set initial selected table to current table if compatible
            this.selectedTable = this.currentTable;
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================================================
  // DATE & TIME SELECTION
  // =========================================================================

  onDateChange(): void {
    this.errorMessage = '';
    if (!this.newDate) {
      this.newDate = this.minDate;
    }
    if (this.newDate < this.minDate) {
      this.errorMessage = 'Past dates cannot be selected for reservation.';
      this.newDate = this.minDate;
    }

    // If current selected table is now occupied or invalid on this new date/time, reset selection
    if (this.selectedTable && this.isTableOccupied(this.selectedTable.id, this.newDate, this.newTime)) {
      this.selectedTable = null;
    }
  }

  selectTimeSlot(slot: string): void {
    if (!this.isTimeSlotAvailable(slot)) {
      this.errorMessage = `The ${slot} time slot has no available tables for your party size.`;
      return;
    }

    this.errorMessage = '';
    this.newTime = slot;

    // Check if currently selected table is occupied at the new time
    if (this.selectedTable && this.isTableOccupied(this.selectedTable.id, this.newDate, this.newTime)) {
      this.selectedTable = null;
    }
  }

  isTimeSlotAvailable(slot: string): boolean {
    if (!this.reservation) return false;
    const requiredGuests = this.reservation.guests;
    const eligibleTables = this.tables.filter(t => t.available !== false && t.capacity >= requiredGuests);
    if (eligibleTables.length === 0) return false;

    // Is there at least one table not occupied?
    return eligibleTables.some(t => !this.isTableOccupied(t.id, this.newDate, slot));
  }

  // =========================================================================
  // TABLE AVAILABILITY & CAPACITY
  // =========================================================================

  isTableOccupied(tableId: number, date: string, timeStr: string): boolean {
    if (!this.reservation) return false;
    const targetTime24 = this.formatTo24h(timeStr);

    return this.existingReservations.some(r => {
      // Exclude the current reservation being rescheduled
      if (r.id === this.reservation!.id) return false;
      if (r.status !== 'CONFIRMED') return false;
      if (r.restaurantId !== this.reservation!.restaurantId) return false;
      if (r.tableId !== tableId) return false;
      if (r.date !== date) return false;
      return this.formatTo24h(r.time) === targetTime24;
    });
  }

  isTableSelectable(table: Table): boolean {
    if (!this.reservation) return false;
    if (table.capacity < this.reservation.guests) return false;
    if (table.available === false) return false;
    if (this.isTableOccupied(table.id, this.newDate, this.newTime)) return false;
    return true;
  }

  selectTable(table: Table): void {
    if (!this.reservation) return;

    if (table.capacity < this.reservation.guests) {
      this.errorMessage = 'Table capacity is insufficient for your party.';
      return;
    }

    if (table.available === false) {
      this.errorMessage = 'This table is currently unavailable.';
      return;
    }

    if (this.isTableOccupied(table.id, this.newDate, this.newTime)) {
      this.errorMessage = 'Table unavailable for the selected time.';
      return;
    }

    this.errorMessage = '';
    this.selectedTable = table;
  }

  // =========================================================================
  // REVIEW & VALIDATION
  // =========================================================================

  hasChanges(): boolean {
    if (!this.reservation || !this.selectedTable) return false;
    const isSameDate = this.newDate === this.reservation.date;
    const isSameTime = this.formatTo24h(this.newTime) === this.formatTo24h(this.reservation.time);
    const isSameTable = this.selectedTable.id === this.reservation.tableId;
    return !(isSameDate && isSameTime && isSameTable);
  }

  proceedToReview(): void {
    this.errorMessage = '';

    if (!this.newDate) {
      this.errorMessage = 'Please select a reservation date.';
      return;
    }

    if (!this.newTime) {
      this.errorMessage = 'Please select a dining time slot.';
      return;
    }

    if (!this.selectedTable) {
      this.errorMessage = 'Please select a dining table for your party.';
      return;
    }

    if (!this.hasChanges()) {
      this.errorMessage = 'No changes detected.';
      return;
    }

    this.isReviewStep = true;
    this.cdr.markForCheck();
  }

  backToEditing(): void {
    this.isReviewStep = false;
    this.errorMessage = '';
    this.cdr.markForCheck();
  }

  // =========================================================================
  // CONFIRM RESCHEDULE
  // =========================================================================

  confirmReschedule(): void {
    this.errorMessage = '';

    if (!this.reservation || !this.selectedTable) {
      this.errorMessage = 'Missing reservation or table selection.';
      return;
    }

    if (!this.hasChanges()) {
      this.errorMessage = 'No changes detected.';
      return;
    }

    this.reservationService.updateReservation(this.reservation.id, {
      date: this.newDate,
      time: this.newTime,
      tableId: this.selectedTable.id
    }).subscribe({
      next: (updated) => {
        this.updatedReservation = updated;
        this.rescheduleSuccess = true;
        this.isReviewStep = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Failed to update reservation. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  // =========================================================================
  // NAVIGATION & HELPERS
  // =========================================================================

  goToMyReservations(): void {
    this.router.navigate(['/customer/reservations']);
  }

  goToQrPass(): void {
    const id = this.updatedReservation?.id || this.reservation?.id;
    if (id) {
      this.router.navigate(['/customer/reservation-pass', id]);
    } else {
      this.router.navigate(['/customer/reservations']);
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  formatTo12h(timeStr: string): string {
    if (!timeStr) return '07:30 PM';
    const trimmed = timeStr.trim().toUpperCase();
    if (trimmed.includes('AM') || trimmed.includes('PM')) {
      const parts = trimmed.split(' ');
      const [h, m] = parts[0].split(':');
      return `${h.padStart(2, '0')}:${m || '00'} ${parts[1]}`;
    }
    const [hStr, mStr] = trimmed.split(':');
    let hour = parseInt(hStr, 10);
    const minute = mStr || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${String(hour).padStart(2, '0')}:${minute} ${ampm}`;
  }

  formatTo24h(timeStr: string): string {
    if (!timeStr) return '19:30';
    const trimmed = timeStr.trim().toUpperCase();
    if (!trimmed.includes('AM') && !trimmed.includes('PM')) {
      const [h, m] = trimmed.split(':');
      return `${h.padStart(2, '0')}:${(m || '00').padStart(2, '0')}`;
    }
    const parts = trimmed.split(' ');
    const [hStr, mStr] = parts[0].split(':');
    let hour = parseInt(hStr, 10);
    const minute = mStr || '00';
    const ampm = parts[1];
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  formatDisplayDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  }
}

export default RescheduleReservation;

