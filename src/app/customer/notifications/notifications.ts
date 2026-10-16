import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NotificationService } from '../../core/services/notification.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { Notification } from '../../core/models/notification.model';
import { Restaurant } from '../../core/models/restaurant.model';

export type NotificationFilter = 'ALL' | 'UNREAD' | 'RESERVATIONS' | 'QUEUE';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class Notifications implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  activeFilter: NotificationFilter = 'ALL';
  unreadCount: number = 0;
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  feedbackMessage: string = '';
  isMobileMenuOpen: boolean = false;
  restaurantNames: { [restaurantId: number]: string } = {};

  // Duplicate click tracking
  markingIds: Set<number> = new Set<number>();
  isMarkingAll: boolean = false;

  private subscriptions: Subscription = new Subscription();
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private notificationService: NotificationService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRestaurantNames();
    this.loadNotifications();
    this.subscribeToRealtimeUpdates();
  }

  private subscribeToRealtimeUpdates(): void {
    const unreadSub = this.notificationService.unreadCount$.subscribe((count) => {
      this.unreadCount = count;
      this.cdr.markForCheck();
    });
    this.subscriptions.add(unreadSub);

    const notifsSub = this.notificationService.notifications$.subscribe((items) => {
      if (!this.isLoading && items) {
        this.notifications = items;
        this.applyFilter();
        this.cdr.markForCheck();
      }
    });
    this.subscriptions.add(notifsSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
  }

  loadRestaurantNames(): void {
    const sub = this.restaurantService.getRestaurants().subscribe({
      next: (restaurants: Restaurant[]) => {
        restaurants.forEach((r) => {
          this.restaurantNames[r.id] = r.name;
        });
        this.cdr.markForCheck();
      },
      error: () => {}
    });
    this.subscriptions.add(sub);
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    const notifSub = this.notificationService
      .getNotificationsByCustomerId(customerId)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (items) => {
          this.notifications = items || [];
          this.applyFilter();
          this.hasError = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.hasError = true;
          if (err?.status === 401) {
            this.errorMessage = 'Your session has expired or full authentication is required. Please sign in to view notifications.';
          } else if (err?.status === 403) {
            this.errorMessage = 'You are not authorized to view these notifications.';
          } else if (err?.status === 0) {
            this.errorMessage = 'Unable to connect to the concierge service. Please check your internet connection and backend status.';
          } else {
            this.errorMessage = 'Unable to retrieve notifications at this time. Please try again.';
          }
          this.cdr.markForCheck();
        }
      });
    this.subscriptions.add(notifSub);

    const unreadSub = this.notificationService
      .getUnreadCount(customerId)
      .subscribe({
        next: (count) => {
          this.unreadCount = count;
          this.cdr.markForCheck();
        },
        error: () => {}
      });
    this.subscriptions.add(unreadSub);
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
    this.cdr.markForCheck();
  }

  applyFilter(): void {
    switch (this.activeFilter) {
      case 'UNREAD':
        this.filteredNotifications = this.notifications.filter((n) => !n.read);
        break;
      case 'RESERVATIONS':
        this.filteredNotifications = this.notifications.filter(
          (n) =>
            n.type === 'RESERVATION_CONFIRMED' ||
            n.type === 'RESERVATION_RESCHEDULED' ||
            n.type === 'RESERVATION_CANCELLED'
        );
        break;
      case 'QUEUE':
        this.filteredNotifications = this.notifications.filter(
          (n) => n.type === 'QUEUE_UPDATE' || n.type === 'TABLE_READY'
        );
        break;
      case 'ALL':
      default:
        this.filteredNotifications = [...this.notifications];
        break;
    }
  }

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification.id).subscribe({
        next: () => {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          this.applyFilter();
          this.cdr.markForCheck();
        }
      });
    }

    // Context-sensitive navigation
    if (notification.reservationId) {
      this.router.navigate(['/customer/reservations']);
    } else if (
      notification.type === 'QUEUE_UPDATE' ||
      notification.type === 'TABLE_READY'
    ) {
      this.router.navigate(['/customer/queue']);
    } else if (notification.restaurantId) {
      this.router.navigate(['/customer/restaurants', notification.restaurantId]);
    }
  }

  markAsRead(notification: Notification, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (notification.read || this.markingIds.has(notification.id)) {
      return;
    }

    this.markingIds.add(notification.id);
    this.cdr.markForCheck();

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
        notification.read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.applyFilter();
        this.markingIds.delete(notification.id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.markingIds.delete(notification.id);
        if (err?.status === 401) {
          this.showFeedback('Session expired. Please sign in again.');
        } else if (err?.status === 403) {
          this.showFeedback('You are not authorized to modify this notification.');
        } else {
          this.showFeedback('Unable to mark notification as read.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  markAllAsRead(): void {
    if (this.isMarkingAll || this.unreadCount === 0) {
      return;
    }

    this.isMarkingAll = true;
    this.cdr.markForCheck();

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.read = true));
        this.unreadCount = 0;
        this.applyFilter();
        this.isMarkingAll = false;
        this.showFeedback('All notifications marked as read.');
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.isMarkingAll = false;
        if (err?.status === 401) {
          this.showFeedback('Session expired. Please sign in again.');
        } else {
          this.showFeedback('Unable to mark all notifications as read.');
        }
        this.cdr.markForCheck();
      }
    });
  }

  deleteNotification(notificationId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.notifications = this.notifications.filter((n) => n.id !== notificationId);
        this.applyFilter();
        this.showFeedback('Notification removed.');
        this.cdr.markForCheck();
      }
    });
  }

  showFeedback(message: string): void {
    this.feedbackMessage = message;
    this.cdr.markForCheck();
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
      this.cdr.markForCheck();
    }, 3500);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
