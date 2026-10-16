import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError, finalize, shareReplay, tap } from 'rxjs/operators';
import { Notification } from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly apiUrl = 'http://localhost:8080/api/notifications';

  // In-flight mutation cache to prevent duplicate requests from rapid repeated clicks
  private inFlightMutations = new Map<string, Observable<any>>();

  // Fallback initial data for offline/mock testbed environments
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

  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(@Optional() private http?: HttpClient) {
    // Initialize unread count from fallback notifications
    this.unreadCountSubject.next(this.initialNotifications.filter((n) => n.customerId === 1 && !n.read).length);
  }

  /**
   * Normalize raw backend notification response into client Notification model.
   */
  private normalizeNotification(item: any): Notification {
    return {
      id: Number(item.id),
      customerId: Number(item.customerId || 1),
      type: item.type || 'SYSTEM',
      title: item.title || '',
      message: item.message || '',
      reservationId: item.reservationId ? Number(item.reservationId) : undefined,
      restaurantId: item.restaurantId ? Number(item.restaurantId) : undefined,
      createdAt: item.createdAt || '',
      read: item.read !== undefined ? Boolean(item.read) : (item.isRead !== undefined ? Boolean(item.isRead) : false)
    };
  }

  /**
   * Retrieve all notifications for the authenticated customer from the backend.
   * Endpoint: GET /api/notifications/my
   */
  getMyNotifications(): Observable<Notification[]> {
    if (this.http) {
      const mutationKey = 'GET_MY_NOTIFICATIONS';
      if (this.inFlightMutations.has(mutationKey)) {
        return this.inFlightMutations.get(mutationKey)!;
      }

      const request$ = this.http.get<any>(`${this.apiUrl}/my`).pipe(
        map((response) => {
          const rawList: any[] = Array.isArray(response)
            ? response
            : (response?.data || response?.content || []);
          const mapped = rawList.map((item) => this.normalizeNotification(item));
          this.notificationsSubject.next(mapped);
          this.unreadCountSubject.next(mapped.filter((n) => !n.read).length);
          return mapped;
        }),
        catchError((err) => {
          console.error('[NotificationService] Failed to load notifications from /api/notifications/my:', err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    return this.notifications$.pipe(
      map((list) =>
        list
          .filter((n) => n.customerId === 1)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      )
    );
  }

  /**
   * Explicitly triggers a reload of the authenticated customer's notifications
   * and unread count from the backend API.
   */
  refreshNotifications(): Observable<Notification[]> {
    if (this.http) {
      this.inFlightMutations.delete('GET_MY_NOTIFICATIONS');
      return this.getMyNotifications();
    }
    return this.getMyNotifications();
  }

  /**
   * Get all notifications for a specific customer, sorted newest first.
   * Supports backward compatibility with existing callers.
   */
  getNotificationsByCustomerId(customerId?: number): Observable<Notification[]> {
    if (this.http) {
      return this.getMyNotifications();
    }

    const targetId = customerId !== undefined ? customerId : 1;
    return this.notifications$.pipe(
      map((list) =>
        list
          .filter((n) => n.customerId === targetId)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      )
    );
  }

  /**
   * Get only unread notifications for a customer.
   */
  getUnreadNotifications(customerId?: number): Observable<Notification[]> {
    if (this.http) {
      return this.getMyNotifications().pipe(
        map((list) => list.filter((n) => !n.read))
      );
    }

    const targetId = customerId !== undefined ? customerId : 1;
    return this.notifications$.pipe(
      map((list) =>
        list
          .filter((n) => n.customerId === targetId && !n.read)
          .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      )
    );
  }

  /**
   * Get total unread count for the authenticated customer.
   * Endpoint: GET /api/notifications/unread/count
   */
  getUnreadCount(customerId?: number): Observable<number> {
    if (this.http) {
      const mutationKey = 'GET_UNREAD_COUNT';
      if (this.inFlightMutations.has(mutationKey)) {
        return this.inFlightMutations.get(mutationKey)!;
      }

      const request$ = this.http.get<any>(`${this.apiUrl}/unread/count`).pipe(
        map((response) => {
          const count = response && typeof response.count === 'number'
            ? response.count
            : (typeof response === 'number' ? response : 0);
          this.unreadCountSubject.next(count);
          return count;
        }),
        catchError((err) => {
          console.error('[NotificationService] Failed to load unread count from /api/notifications/unread/count:', err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    const targetId = customerId !== undefined ? customerId : 1;
    return this.notifications$.pipe(
      map((list) => list.filter((n) => n.customerId === targetId && !n.read).length)
    );
  }

  /**
   * Mark a specific notification as read.
   * Endpoint: PUT /api/notifications/{notificationId}/read
   */
  markAsRead(notificationId: number): Observable<any> {
    if (this.http) {
      const mutationKey = `read_${notificationId}`;
      if (this.inFlightMutations.has(mutationKey)) {
        return this.inFlightMutations.get(mutationKey)!;
      }

      const request$ = this.http.put<any>(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
        tap(() => {
          const list = this.notificationsSubject.getValue();
          const item = list.find((n) => n.id === Number(notificationId));
          if (item && !item.read) {
            item.read = true;
            this.notificationsSubject.next([...list]);
            const current = this.unreadCountSubject.getValue();
            this.unreadCountSubject.next(Math.max(0, current - 1));
          }
          this.inFlightMutations.delete('GET_UNREAD_COUNT');
        }),
        catchError((err) => {
          console.error(`[NotificationService] Failed to mark notification ${notificationId} as read:`, err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    const list = this.notificationsSubject.getValue();
    const item = list.find((n) => n.id === Number(notificationId));
    if (item && !item.read) {
      item.read = true;
      this.notificationsSubject.next([...list]);
      const current = this.unreadCountSubject.getValue();
      this.unreadCountSubject.next(Math.max(0, current - 1));
    }
    return of(void 0);
  }

  /**
   * Mark all notifications for the authenticated customer as read.
   * Endpoint: PUT /api/notifications/read-all
   */
  markAllAsRead(customerId?: number): Observable<any> {
    if (this.http) {
      const mutationKey = 'read_all';
      if (this.inFlightMutations.has(mutationKey)) {
        return this.inFlightMutations.get(mutationKey)!;
      }

      const request$ = this.http.put<any>(`${this.apiUrl}/read-all`, {}).pipe(
        tap(() => {
          const list = this.notificationsSubject.getValue();
          list.forEach((n) => (n.read = true));
          this.notificationsSubject.next([...list]);
          this.unreadCountSubject.next(0);
          this.inFlightMutations.delete('GET_UNREAD_COUNT');
        }),
        catchError((err) => {
          console.error('[NotificationService] Failed to mark all notifications as read:', err);
          return throwError(() => err);
        }),
        finalize(() => {
          this.inFlightMutations.delete(mutationKey);
        }),
        shareReplay(1)
      );

      this.inFlightMutations.set(mutationKey, request$);
      return request$;
    }

    const targetId = customerId !== undefined ? customerId : 1;
    const list = this.notificationsSubject.getValue();
    let hasChanges = false;
    list.forEach((n) => {
      if (n.customerId === targetId && !n.read) {
        n.read = true;
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.notificationsSubject.next([...list]);
      this.unreadCountSubject.next(0);
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
    this.unreadCountSubject.next(updated.filter((n) => !n.read).length);
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
    this.unreadCountSubject.next([newNotification, ...list].filter((n) => !n.read).length);
    return of(newNotification);
  }
}
