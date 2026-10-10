import { Component, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
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
  isMobileMenuOpen: boolean = false;
  reviewedReservationIds = new Set<number>();
  unreadNotificationsCount: number = 0;

  private restaurantsMap = new Map<number, Restaurant>();
  private tablesMap = new Map<number, Table>();

  constructor(
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router,
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
      },
    });
  }

  loadData(): void {
    // Immediately load reservations
    this.loadCustomerReservations();

    // Cache restaurants and tables
    this.restaurantService.getRestaurants().subscribe({
      next: (restaurants) => {
        restaurants.forEach((r) => this.restaurantsMap.set(r.id, r));

        // Load tables for each restaurant
        restaurants.forEach((r) => {
          this.restaurantService.getTablesByRestaurantId(r.id).subscribe((tables) => {
            tables.forEach((t) => this.tablesMap.set(t.id, t));
          });
        });

        // Re-enrich with restaurant details
        this.loadCustomerReservations();
      },
    });
  }

  loadCustomerReservations(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.reservationService.getReservationsByCustomerId(customerId).subscribe({
      next: (data) => {
        this.reservations = data.map((res) => {
          const restaurant = this.restaurantsMap.get(res.restaurantId);
          const table = this.tablesMap.get(res.tableId);
          return {
            ...res,
            restaurantName: restaurant ? restaurant.name : `Restaurant #${res.restaurantId}`,
            restaurantLocation: restaurant ? restaurant.location : '',
            restaurantImage: restaurant?.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
            tableNumber: table ? table.tableNumber : `Table #${res.tableId}`,
            seatingType: table ? table.seatingType : 'STANDARD',
          };
        });

        this.applyFilter();

        // Check review submission status for completed reservations
        this.reservations.forEach((res) => {
          this.reviewService.hasReviewedReservation(res.id).subscribe({
            next: (reviewed) => {
              if (reviewed) {
                this.reviewedReservationIds.add(res.id);
              }
            }
          });
        });
      },
    });
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
      this.reservationService.cancelReservation(reservation.id).subscribe({
        next: (success) => {
          if (success) {
            reservation.status = 'CANCELLED';
            this.notificationMessage = `Reservation #RES-${reservation.id} was successfully cancelled.`;
            this.applyFilter();
            setTimeout(() => (this.notificationMessage = ''), 5000);
          }
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
