import { Component, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';

export interface EnrichedReservation extends Reservation {
  restaurantName?: string;
  restaurantLocation?: string;
  restaurantImage?: string;
  tableNumber?: string;
  seatingType?: string;
}

@Component({
  selector: 'app-my-reservations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './my-reservations.html',
  styleUrl: './my-reservations.css',
})
export class MyReservations implements OnInit {
  reservations: EnrichedReservation[] = [];
  filteredReservations: EnrichedReservation[] = [];
  activeFilter: string = 'ALL';
  notificationMessage: string = '';
  errorMessage: string = '';
  isMobileMenuOpen: boolean = false;
  reviewedReservationIds = new Set<number>();
  unreadNotificationsCount: number = 0;

  private restaurantsMap = new Map<number, Restaurant>();
  private tablesMap = new Map<number, Table>();
  private rawReservations: Reservation[] = [];

  constructor(
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router,
    @Optional() private cdr?: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadUnreadCount();
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

  loadData(): void {
    // 1. Seed fallback tables from mock table catalog to enrich legacy mock reservations instantly
    if (typeof this.restaurantService.getMockTables === 'function') {
      const mockTables = this.restaurantService.getMockTables();
      mockTables.forEach((t) => this.tablesMap.set(t.id, t));
    }

    // 2. Immediately load reservations so bookings display without waiting for network calls
    this.loadCustomerReservations();

    // 3. Coordinate fetching restaurants and their live tables via forkJoin
    this.restaurantService.getRestaurants().pipe(
      switchMap((restaurants) => {
        restaurants.forEach((r) => this.restaurantsMap.set(r.id, r));
        if (restaurants.length === 0) {
          return of([] as Table[][]);
        }
        const tableObservables = restaurants.map((r) =>
          this.restaurantService.getTablesByRestaurantId(r.id).pipe(
            catchError((err) => {
              console.error(`[MyReservations] Failed to load tables for restaurant ${r.id}:`, err);
              return of([] as Table[]);
            })
          )
        );
        return forkJoin(tableObservables);
      }),
      catchError((err) => {
        console.error('[MyReservations] Failed to load restaurants:', err);
        return of([] as Table[][]);
      })
    ).subscribe({
      next: (allTablesNested) => {
        allTablesNested.forEach((tables) => {
          tables.forEach((t) => this.tablesMap.set(t.id, t));
        });
        // Tables are now loaded: re-enrich reservations to upgrade any unresolved tables!
        this.enrichReservations();
      },
    });
  }

  loadCustomerReservations(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.reservationService.getReservationsByCustomerId(customerId).subscribe({
      next: (data) => {
        this.rawReservations = data || [];
        this.enrichReservations();

        // Check review submission status for completed reservations
        this.rawReservations.forEach((res) => {
          this.reviewService.hasReviewedReservation(res.id).subscribe({
            next: (reviewed) => {
              if (reviewed) {
                this.reviewedReservationIds.add(res.id);
                this.cdr?.markForCheck();
              }
            },
          });
        });
      },
    });
  }

  enrichReservations(): void {
    this.reservations = this.rawReservations.map((res) => {
      const restaurant = this.restaurantsMap.get(res.restaurantId);
      const table = this.tablesMap.get(res.tableId);

      const restaurantName = restaurant?.name || res.restaurantName || `Restaurant #${res.restaurantId}`;
      const restaurantLocation = restaurant?.location || '';
      const restaurantImage = restaurant?.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';

      // Determine table number:
      // 1. Live table from tablesMap (e.g. table.tableNumber = 'T-01')
      // 2. Saved tableNumber on reservation (e.g. res.tableNumber = 'T-01')
      // 3. Fallback table identifier (e.g. '#3')
      let rawNumber = '';
      if (table && table.tableNumber) {
        rawNumber = table.tableNumber;
      } else if (res.tableNumber) {
        rawNumber = res.tableNumber;
      } else {
        rawNumber = `#${res.tableId}`;
      }

      const formattedTableNumber = rawNumber.toLowerCase().startsWith('table')
        ? rawNumber
        : `Table ${rawNumber}`;

      // Determine seating type:
      // 1. Live table seating type (e.g. table.seatingType = 'WINDOW')
      // 2. Saved seatingType on reservation (e.g. res.seatingType = 'WINDOW')
      // 3. Fallback 'STANDARD'
      const seatingType = table?.seatingType || res.seatingType || 'STANDARD';

      return {
        ...res,
        restaurantName,
        restaurantLocation,
        restaurantImage,
        tableNumber: formattedTableNumber,
        seatingType,
      };
    });

    this.applyFilter();
    this.cdr?.markForCheck();
  }

  applyFilter(): void {
    if (this.activeFilter === 'ALL') {
      this.filteredReservations = [...this.reservations];
    } else {
      this.filteredReservations = this.reservations.filter(
        (r) => r.status === this.activeFilter
      );
    }
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
    this.applyFilter();
  }

  isReservationReviewed(reservationId: number): boolean {
    return this.reviewedReservationIds.has(reservationId);
  }

  rateExperience(reservationId: number): void {
    this.router.navigate(['/customer/reservations', reservationId, 'review']);
  }

  cancelBooking(reservation: EnrichedReservation): void {
    if (confirm(`Are you sure you want to cancel reservation #RES-${reservation.id} at ${reservation.restaurantName}?`)) {
      this.errorMessage = '';
      this.reservationService.cancelReservation(reservation.id).subscribe({
        next: (success) => {
          if (success) {
            reservation.status = 'CANCELLED';
            const raw = this.rawReservations.find((r) => r.id === reservation.id);
            if (raw) {
              raw.status = 'CANCELLED';
            }
            this.notificationMessage = `Reservation #RES-${reservation.id} was successfully cancelled.`;
            this.applyFilter();
            // Refresh reservations from backend to synchronize server-side database state
            this.loadCustomerReservations();
            this.cdr?.markForCheck();
            setTimeout(() => {
              this.notificationMessage = '';
              this.cdr?.markForCheck();
            }, 5000);
          }
        },
        error: (err) => {
          console.error(`[MyReservations] Failed to cancel reservation #${reservation.id}:`, err);
          const statusText = err?.status ? ` (HTTP ${err.status})` : '';
          this.errorMessage = `Unable to cancel reservation #RES-${reservation.id}${statusText}. Please verify backend service or try again.`;
          // Retain actual server-side status - do NOT mark as CANCELLED!
          this.cdr?.markForCheck();
          setTimeout(() => {
            this.errorMessage = '';
            this.cdr?.markForCheck();
          }, 5000);
        },
      });
    }
  }

  viewQrPass(reservationId: number): void {
    this.router.navigate(['/customer/reservation-pass', reservationId]);
  }

  rescheduleBooking(reservationId: number): void {
    this.router.navigate(['/customer/reservations', reservationId, 'reschedule']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
