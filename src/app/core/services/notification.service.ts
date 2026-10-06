import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private initialNotifications: Notification[] = [
    {
      id: 1,
      customerId: 1,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Confirmed',
      message: 'Your table at Spice Symphony Bistro is confirmed for October 15 at 7:30 PM.',
      reservationId: 1001,
      restaurantId: 1,
      createdAt: '2026-10-06 11:30',
      read: false
    },
    {
      id: 2,
      customerId: 1,
      type: 'QUEUE_UPDATE',
      title: 'Queue Status Updated',
      message: 'You are now #2 in the queue at Spice Symphony Bistro.',
      restaurantId: 1,
      createdAt: '2026-10-06 10:15',
      read: false
    },
    {
      id: 3,
      customerId: 1,
      type: 'REVIEW_SUBMITTED',
      title: 'Review Submitted',
      message: 'Thank you for sharing your dining experience at Spice Symphony Bistro.',
      reservationId: 1003,
      restaurantId: 1,
      createdAt: '2026-10-05 14:20',
      read: true
    },
    {
      id: 4,
      customerId: 1,
      type: 'SYSTEM',
      title: 'Restaurant Reservation',
      message: 'Welcome to the Restaurant Reservation concierge. Explore curated fine dining tables.',
      createdAt: '2026-10-01 09:00',
      read: true
    },
    {
      id: 5,
      customerId: 2,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Confirmed',
      message: 'Your table at Urban Hearth Fine Dine is confirmed for October 18 at 8:00 PM.',
      reservationId: 2001,
      restaurantId: 3,
      createdAt: '2026-10-06 09:00',
      read: false
    }
  ];

  private notificationsSubject = new BehaviorSubject<Notification[]>(this.initialNotifications);
  public notifications$ = this.notificationsSubject.asObservable();

  /**
   * Get all notifications for a specific customer, sorted newest first.
   */
  getNotificationsByCustomerId(customerId: number): Observable<Notification[]> {
    return this.notifications$.pipe(
      map((list) =>
        list
          .filter((n) => n.customerId === customerId)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      )
    );
  }

  /**
   * Get only unread notifications for a specific customer.
   */
  getUnreadNotifications(customerId: number): Observable<Notification[]> {
    return this.notifications$.pipe(
      map((list) =>
        list
          .filter((n) => n.customerId === customerId && !n.read)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      )
    );
  }

  /**
   * Get total unread count for a customer.
   */
  getUnreadCount(customerId: number): Observable<number> {
    return this.notifications$.pipe(
      map((list) => list.filter((n) => n.customerId === customerId && !n.read).length)
    );
  }

  /**
   * Mark a specific notification as read.
   */
  markAsRead(notificationId: number): Observable<void> {
    const list = this.notificationsSubject.getValue();
    const item = list.find((n) => n.id === notificationId);
    if (item && !item.read) {
      item.read = true;
      this.notificationsSubject.next([...list]);
    }
    return of(void 0);
  }

  /**
   * Mark all notifications for a customer as read.
   */
  markAllAsRead(customerId: number): Observable<void> {
    const list = this.notificationsSubject.getValue();
    let hasChanges = false;
    list.forEach((n) => {
      if (n.customerId === customerId && !n.read) {
        n.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.notificationsSubject.next([...list]);
    }
    return of(void 0);
  }

  /**
   * Delete a notification by ID.
   */
  deleteNotification(notificationId: number): Observable<void> {
    const list = this.notificationsSubject.getValue();
    const updated = list.filter((n) => n.id !== notificationId);
    this.notificationsSubject.next(updated);
    return of(void 0);
  }

  /**
   * Add a new notification with deduplication.
   */
  addNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'read'> &
      Partial<Pick<Notification, 'id' | 'createdAt' | 'read'>>
  ): Observable<Notification> {
    const list = this.notificationsSubject.getValue();

    // Deduplication check: prevent identical action notification from being added multiple times
    const existing = list.find(
      (n) =>
        n.customerId === notification.customerId &&
        n.type === notification.type &&
        n.reservationId === notification.reservationId &&
        n.restaurantId === notification.restaurantId &&
        n.title === notification.title
    );

    if (existing) {
      return of(existing);
    }

    const todayStr =
      notification.createdAt ||
      new Date().toISOString().replace('T', ' ').substring(0, 16);

    const newNotification: Notification = {
      ...notification,
      id: notification.id || Math.floor(1000 + Math.random() * 9000),
      createdAt: todayStr,
      read: notification.read !== undefined ? notification.read : false
    };

    this.notificationsSubject.next([newNotification, ...list]);
    return of(newNotification);
  }
}
