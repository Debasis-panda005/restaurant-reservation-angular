import { Component, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { QueueService } from '../../core/services/queue.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { QueueTicket } from '../../core/models/queue-ticket.model';
import { Restaurant } from '../../core/models/restaurant.model';

@Component({
  selector: 'app-queue-status',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './queue-status.html',
  styleUrl: './queue-status.css',
})
export class QueueStatus implements OnInit {
  currentTicket: QueueTicket | null = null;
  restaurant: Restaurant | null = null;
  restaurants: Restaurant[] = [];
  unreadNotificationsCount: number = 0;

  // Feedback notifications
  notificationMessage: string = '';
  isRefreshing: boolean = false;
  isMobileMenuOpen: boolean = false;

  // Quick Join Form when not in queue
  selectedRestaurantId: number = 1;
  joinGuestsCount: number = 2;

  constructor(
    private queueService: QueueService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadQueueStatus();
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

  loadRestaurants(): void {
    this.restaurantService.getRestaurants().subscribe({
      next: (data) => {
        this.restaurants = data;
        if (data.length > 0) {
          this.selectedRestaurantId = data[0].id;
        }
      },
    });
  }

  loadQueueStatus(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.queueService.getQueueStatus(customerId).subscribe({
      next: (ticket) => {
        this.currentTicket = ticket || null;
        if (this.currentTicket) {
          this.fetchRestaurant(this.currentTicket.restaurantId);
        } else {
          this.restaurant = null;
        }
      },
    });
  }

  fetchRestaurant(restaurantId: number): void {
    this.restaurantService.getRestaurantById(restaurantId).subscribe({
      next: (res) => {
        this.restaurant = res || null;
      },
    });
  }

  refreshStatus(): void {
    this.isRefreshing = true;
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    // Simulate real-time queue advancement if active
    this.queueService.advanceQueue(customerId).subscribe({
      next: (ticket) => {
        setTimeout(() => {
          this.isRefreshing = false;
          this.currentTicket = ticket || null;
          if (this.currentTicket) {
            this.fetchRestaurant(this.currentTicket.restaurantId);
            if (this.currentTicket.status === 'SERVING') {
              this.notificationMessage = '🎉 Great news! Your table is ready. Please proceed to the host desk!';
            } else if (this.currentTicket.status === 'COMPLETED') {
              this.notificationMessage = 'Table seated! Queue session completed.';
            } else {
              this.notificationMessage = 'Queue status refreshed successfully.';
            }
          } else {
            this.notificationMessage = 'No active queue token found.';
          }
          setTimeout(() => (this.notificationMessage = ''), 4000);
        }, 400);
      },
    });
  }

  leaveQueue(): void {
    if (!this.currentTicket) return;

    if (confirm(`Are you sure you want to cancel your queue ticket ${this.currentTicket.ticketNumber}?`)) {
      this.queueService.leaveQueue(this.currentTicket.id).subscribe({
        next: (success) => {
          if (success) {
            this.notificationMessage = `You have successfully left the queue. Ticket ${this.currentTicket?.ticketNumber} cancelled.`;
            this.currentTicket = null;
            this.restaurant = null;
            setTimeout(() => (this.notificationMessage = ''), 5000);
          }
        },
      });
    }
  }

  joinNewQueue(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.queueService
      .joinQueue({
        customerId: customerId,
        restaurantId: Number(this.selectedRestaurantId),
        guests: Number(this.joinGuestsCount),
      })
      .subscribe({
        next: (ticket) => {
          this.currentTicket = ticket;
          this.fetchRestaurant(ticket.restaurantId);
          this.notificationMessage = `Joined waitlist successfully! Your token is ${ticket.ticketNumber}.`;
          setTimeout(() => (this.notificationMessage = ''), 5000);
        },
      });
  }

  get queuePosition(): number {
    if (!this.currentTicket) return 0;
    if (this.currentTicket.status === 'SERVING') return 1;
    return this.currentTicket.peopleAhead + 1;
  }

  get progressPercentage(): number {
    if (!this.currentTicket) return 0;
    if (this.currentTicket.status === 'COMPLETED') return 100;
    if (this.currentTicket.status === 'SERVING') return 85;
    if (this.currentTicket.peopleAhead === 0) return 70;
    if (this.currentTicket.peopleAhead === 1) return 50;
    if (this.currentTicket.peopleAhead === 2) return 30;
    return 15;
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
