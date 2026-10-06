import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
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
  feedbackMessage: string = '';
  isMobileMenuOpen: boolean = false;
  restaurantNames: { [restaurantId: number]: string } = {};

  private subscriptions: Subscription = new Subscription();
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private notificationService: NotificationService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRestaurantNames();
    this.loadNotifications();
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
      }
    });
    this.subscriptions.add(sub);
  }

  loadNotifications(): void {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    // Subscribe to customer notifications stream
    const notifSub = this.notificationService
      .getNotificationsByCustomerId(customerId)
      .subscribe({
        next: (items) => {
          this.notifications = items;
          this.applyFilter();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        }
      });
    this.subscriptions.add(notifSub);

    // Subscribe to unread count stream
    const unreadSub = this.notificationService
      .getUnreadCount(customerId)
      .subscribe({
        next: (count) => {
          this.unreadCount = count;
        }
      });
    this.subscriptions.add(unreadSub);
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter = filter;
    this.applyFilter();
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
      this.notificationService.markAsRead(notification.id).subscribe();
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
    this.notificationService.markAsRead(notification.id).subscribe();
  }

  markAllAsRead(): void {
    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;
    this.notificationService.markAllAsRead(customerId).subscribe({
      next: () => {
        this.showFeedback('All notifications marked as read.');
      }
    });
  }

  deleteNotification(notificationId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        this.showFeedback('Notification removed.');
      }
    });
  }

  showFeedback(message: string): void {
    this.feedbackMessage = message;
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
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
