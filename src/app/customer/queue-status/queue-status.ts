import { Component, OnInit, OnDestroy, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
export class QueueStatus implements OnInit, OnDestroy {
  currentTicket: QueueTicket | null = null;
  restaurant: Restaurant | null = null;
  restaurants: Restaurant[] = [];
  unreadNotificationsCount: number = 0;

  // State management
  isLoading: boolean = true;
  isRefreshing: boolean = false;
  isJoining: boolean = false;
  isLeaving: boolean = false;
  isPollingPaused: boolean = false;
  lastRefreshedAt: string = '';
  notificationMessage: string = '';
  errorMessage: string = '';
  isMobileMenuOpen: boolean = false;

  // Quick Join Form
  selectedRestaurantId: number = 1;
  joinGuestsCount: number = 2;

  private destroy$ = new Subject<void>();

  constructor(
    private queueService: QueueService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['restaurantId']) {
        this.selectedRestaurantId = Number(params['restaurantId']);
      }
    });

    this.loadRestaurants();
    this.loadQueueStatus();
    this.loadUnreadCount();
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  startPolling(): void {
    // Poll queue status every 12 seconds to ensure real-time accuracy without overwhelming the server
    interval(12000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (!this.isRefreshing && !this.isJoining && !this.isLeaving && !this.isLoading && !this.isPollingPaused) {
          this.refreshStatus(true);
        }
      });
  }

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
      },
      error: () => {
        this.unreadNotificationsCount = 0;
      }
    });
  }

  loadRestaurants(): void {
    this.restaurantService.getRestaurants().subscribe({
      next: (data) => {
        this.restaurants = data;
        if (data.length > 0 && (!this.selectedRestaurantId || !data.some(r => r.id === this.selectedRestaurantId))) {
          this.selectedRestaurantId = data[0].id;
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.restaurants = [];
        this.cdr.markForCheck();
      }
    });
  }

  loadQueueStatus(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.isPollingPaused = false;
    this.cdr.markForCheck();

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.queueService.getQueueStatus(customerId).subscribe({
      next: (ticket) => {
        this.isLoading = false;
        this.isPollingPaused = false;
        const now = new Date();
        this.lastRefreshedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.currentTicket = ticket || null;
        if (this.currentTicket) {
          this.fetchRestaurant(this.currentTicket.restaurantId);
        } else {
          this.restaurant = null;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.handleQueueError(err, false);
      }
    });
  }

  fetchRestaurant(restaurantId: number): void {
    this.restaurantService.getRestaurantById(restaurantId).subscribe({
      next: (res) => {
        this.restaurant = res || null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.restaurant = null;
        this.cdr.markForCheck();
      }
    });
  }

  refreshStatus(silent: boolean = false): void {
    if (this.isRefreshing || this.isJoining || this.isLeaving || this.isLoading || (silent && this.isPollingPaused)) return;
    this.isRefreshing = true;
    if (!silent) {
      this.errorMessage = '';
      this.isPollingPaused = false;
    }
    this.cdr.markForCheck();

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.queueService.advanceQueue(customerId).subscribe({
      next: (ticket) => {
        this.isRefreshing = false;
        this.isLoading = false;
        this.isPollingPaused = false;
        const now = new Date();
        this.lastRefreshedAt = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.currentTicket = ticket || null;
        if (this.currentTicket) {
          this.fetchRestaurant(this.currentTicket.restaurantId);
          if (this.currentTicket.status === 'NOTIFIED' || this.currentTicket.status === 'SERVING') {
            this.notificationMessage = '🎉 Great news! Your table is ready. Please proceed to the maître d\' desk!';
          } else if (!silent) {
            this.notificationMessage = `Queue status refreshed: #${this.queuePosition} in line (${this.currentTicket.peopleAhead} parties ahead, ~${this.currentTicket.estimatedWaitMinutes}m wait).`;
            setTimeout(() => {
              this.notificationMessage = '';
              this.cdr.markForCheck();
            }, 3500);
          }
        } else {
          this.restaurant = null;
          if (!silent) {
            this.notificationMessage = 'No active waitlist ticket found.';
            setTimeout(() => {
              this.notificationMessage = '';
              this.cdr.markForCheck();
            }, 3500);
          }
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.handleQueueError(err, silent);
      }
    });
  }

  private handleQueueError(err: any, isSilent: boolean): void {
    this.isLoading = false;
    this.isRefreshing = false;

    if (err?.status === 401) {
      this.isPollingPaused = true;
      if (!isSilent || !this.errorMessage) {
        this.errorMessage = 'Your session has expired or authentication is required. Please sign in to view your live queue status.';
      }
    } else if (err?.status === 403) {
      this.isPollingPaused = true;
      if (!isSilent || !this.errorMessage) {
        this.errorMessage = 'Access denied. You do not have permission to view this waitlist ticket.';
      }
    } else if (err?.status === 0 || (err?.message && err.message.toLowerCase().includes('failed to fetch'))) {
      if (!isSilent || !this.errorMessage) {
        this.errorMessage = 'Unable to connect to the live queue service. Please check your network connection.';
      }
    } else if (err?.status >= 500) {
      if (!isSilent || !this.errorMessage) {
        this.errorMessage = err?.error?.message || 'The queue service is currently experiencing technical difficulties. Please try again shortly.';
      }
    } else if (err?.status !== 404) {
      if (!isSilent || !this.errorMessage) {
        this.errorMessage = err?.error?.message || err?.message || 'Unable to retrieve live queue status.';
      }
    }
    this.cdr.markForCheck();
  }

  leaveQueue(): void {
    if (!this.currentTicket || this.isLeaving) return;

    const ticketNumber = this.currentTicket.ticketNumber || this.currentTicket.queueNumber;
    if (confirm(`Are you sure you want to cancel your waitlist ticket #${ticketNumber}?`)) {
      this.isLeaving = true;
      this.errorMessage = '';
      this.cdr.markForCheck();

      this.queueService.leaveQueue(this.currentTicket.id).subscribe({
        next: (success) => {
          this.isLeaving = false;
          if (success) {
            this.notificationMessage = `You have left the queue. Ticket #${ticketNumber} has been cancelled.`;
            this.currentTicket = null;
            this.restaurant = null;
            setTimeout(() => {
              this.notificationMessage = '';
              this.cdr.markForCheck();
            }, 5000);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isLeaving = false;
          this.errorMessage = err.error?.message || 'Unable to leave queue at this moment. Please try again.';
          this.cdr.markForCheck();
        }
      });
    }
  }

  joinNewQueue(): void {
    if (this.isJoining) return;
    this.isJoining = true;
    this.isPollingPaused = false;
    this.errorMessage = '';
    this.notificationMessage = '';
    this.cdr.markForCheck();

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.queueService
      .joinQueue({
        customerId: customerId,
        restaurantId: Number(this.selectedRestaurantId),
        partySize: Number(this.joinGuestsCount),
        guests: Number(this.joinGuestsCount)
      })
      .subscribe({
        next: (ticket) => {
          this.isJoining = false;
          this.currentTicket = ticket;
          this.fetchRestaurant(ticket.restaurantId);
          this.notificationMessage = `Joined waitlist successfully! Your priority pass token is #${ticket.ticketNumber || ticket.queueNumber}.`;
          setTimeout(() => {
            this.notificationMessage = '';
            this.cdr.markForCheck();
          }, 5000);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isJoining = false;
          if (err.status === 409) {
            this.errorMessage = err.error?.message || 'You already have an active waitlist ticket at this restaurant.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to join waitlist. Please check details and try again.';
          }
          this.cdr.markForCheck();
        }
      });
  }

  get queuePosition(): number {
    if (!this.currentTicket) return 0;
    if (['CANCELLED', 'SEATED', 'LEFT', 'COMPLETED'].includes(this.currentTicket.status)) return 0;
    if (this.currentTicket.position !== undefined && this.currentTicket.position !== null && this.currentTicket.position > 0) {
      return this.currentTicket.position;
    }
    if (this.currentTicket.status === 'NOTIFIED' || this.currentTicket.status === 'SERVING') return 1;
    return (this.currentTicket.peopleAhead ?? 0) + 1;
  }

  get progressPercentage(): number {
    if (!this.currentTicket) return 0;
    if (this.currentTicket.status === 'CANCELLED' || this.currentTicket.status === 'LEFT') return 0;
    if (this.currentTicket.status === 'COMPLETED' || this.currentTicket.status === 'SEATED') return 100;
    if (this.currentTicket.status === 'NOTIFIED' || this.currentTicket.status === 'SERVING') return 85;
    if (this.currentTicket.peopleAhead === 0) return 70;
    if (this.currentTicket.peopleAhead === 1) return 50;
    if (this.currentTicket.peopleAhead === 2) return 35;
    return 20;
  }

  formatJoinedTime(dateString?: string): string {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
