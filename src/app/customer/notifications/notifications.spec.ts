import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { vi } from 'vitest';
import { Notifications } from './notifications';
import { NotificationService } from '../../core/services/notification.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { Notification } from '../../core/models/notification.model';

describe('Notifications Component', () => {
  let component: Notifications;
  let fixture: ComponentFixture<Notifications>;
  let notificationService: NotificationService;
  let restaurantService: RestaurantService;
  let authService: AuthService;
  let router: Router;

  const mockNotifications: Notification[] = [
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
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifications],
      providers: [
        provideRouter([]),
        NotificationService,
        RestaurantService,
        AuthService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Notifications);
    component = fixture.componentInstance;
    notificationService = TestBed.inject(NotificationService);
    restaurantService = TestBed.inject(RestaurantService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);

    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(of(mockNotifications));
    vi.spyOn(notificationService, 'getUnreadCount').mockReturnValue(of(2));

    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the notifications component', () => {
    expect(component).toBeTruthy();
  });

  it('should load customer notifications on initialization', () => {
    expect(component.isLoading).toBe(false);
    expect(component.notifications.length).toBeGreaterThan(0);
    expect(component.unreadCount).toBeGreaterThanOrEqual(0);
  });

  it('should switch filters and filter notifications accurately', () => {
    component.setFilter('ALL');
    expect(component.filteredNotifications.length).toBe(component.notifications.length);

    component.setFilter('UNREAD');
    expect(component.filteredNotifications.every((n) => !n.read)).toBe(true);

    component.setFilter('RESERVATIONS');
    expect(
      component.filteredNotifications.every(
        (n) =>
          n.type === 'RESERVATION_CONFIRMED' ||
          n.type === 'RESERVATION_RESCHEDULED' ||
          n.type === 'RESERVATION_CANCELLED'
      )
    ).toBe(true);

    component.setFilter('QUEUE');
    expect(
      component.filteredNotifications.every(
        (n) => n.type === 'QUEUE_UPDATE' || n.type === 'TABLE_READY'
      )
    ).toBe(true);
  });

  it('should mark unread notification as read on click and navigate', () => {
    const markSpy = vi.spyOn(notificationService, 'markAsRead').mockReturnValue(of(void 0));
    const navSpy = vi.spyOn(router, 'navigate');

    const testNotice: Notification = {
      id: 991,
      customerId: 1,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Confirmed',
      message: 'Test message',
      reservationId: 1001,
      restaurantId: 1,
      createdAt: '2026-10-06 12:00',
      read: false
    };

    component.onNotificationClick(testNotice);

    expect(markSpy).toHaveBeenCalledWith(991);
    expect(navSpy).toHaveBeenCalledWith(['/customer/reservations']);
  });

  it('should navigate to queue page on queue notification click', () => {
    const navSpy = vi.spyOn(router, 'navigate');

    const queueNotice: Notification = {
      id: 992,
      customerId: 1,
      type: 'QUEUE_UPDATE',
      title: 'Queue Position',
      message: 'You are #1',
      restaurantId: 1,
      createdAt: '2026-10-06 12:00',
      read: true
    };

    component.onNotificationClick(queueNotice);
    expect(navSpy).toHaveBeenCalledWith(['/customer/queue']);
  });

  it('should navigate to restaurant details if only restaurantId is present', () => {
    const navSpy = vi.spyOn(router, 'navigate');

    const systemNotice: Notification = {
      id: 993,
      customerId: 1,
      type: 'SYSTEM',
      title: 'Special Event',
      message: 'Chef tasting tonight',
      restaurantId: 2,
      createdAt: '2026-10-06 12:00',
      read: true
    };

    component.onNotificationClick(systemNotice);
    expect(navSpy).toHaveBeenCalledWith(['/customer/restaurants', 2]);
  });

  it('should mark all notifications as read and show feedback', () => {
    component.unreadCount = 2;
    const markAllSpy = vi.spyOn(notificationService, 'markAllAsRead').mockReturnValue(of(void 0));

    component.markAllAsRead();

    expect(markAllSpy).toHaveBeenCalled();
    expect(component.feedbackMessage).toContain('marked as read');
  });

  it('should not call markAllAsRead if unreadCount is 0 or already marking all', () => {
    const markAllSpy = vi.spyOn(notificationService, 'markAllAsRead');
    component.unreadCount = 0;
    component.markAllAsRead();
    expect(markAllSpy).not.toHaveBeenCalled();

    component.unreadCount = 3;
    component.isMarkingAll = true;
    component.markAllAsRead();
    expect(markAllSpy).not.toHaveBeenCalled();
  });

  it('should handle markAllAsRead error gracefully', () => {
    component.unreadCount = 2;
    vi.spyOn(notificationService, 'markAllAsRead').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );

    component.markAllAsRead();
    expect(component.isMarkingAll).toBe(false);
    expect(component.feedbackMessage).toContain('Unable to mark all notifications');
  });

  it('should mark individual notification as read with button and prevent duplicate in-flight calls', () => {
    const markSpy = vi.spyOn(notificationService, 'markAsRead').mockReturnValue(of(void 0));
    const testNotice: Notification = {
      id: 995,
      customerId: 1,
      type: 'SYSTEM',
      title: 'Alert',
      message: 'Notice text',
      createdAt: '2026-10-06 12:00',
      read: false
    };
    component.notifications = [testNotice];
    component.unreadCount = 1;

    component.markAsRead(testNotice);
    expect(markSpy).toHaveBeenCalledWith(995);
    expect(testNotice.read).toBe(true);

    // Call again on already-read notification
    markSpy.mockClear();
    component.markAsRead(testNotice);
    expect(markSpy).not.toHaveBeenCalled();
  });

  it('should handle markAsRead error gracefully', () => {
    vi.spyOn(notificationService, 'markAsRead').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );
    const testNotice: Notification = {
      id: 996,
      customerId: 1,
      type: 'SYSTEM',
      title: 'Alert',
      message: 'Notice text',
      createdAt: '2026-10-06 12:00',
      read: false
    };

    component.markAsRead(testNotice);
    expect(component.markingIds.has(996)).toBe(false);
    expect(component.feedbackMessage).toContain('not authorized');
  });

  it('should delete a notification and show feedback', () => {
    const deleteSpy = vi.spyOn(notificationService, 'deleteNotification').mockReturnValue(of(void 0));
    const fakeEvent = new MouseEvent('click');
    const stopSpy = vi.spyOn(fakeEvent, 'stopPropagation');

    component.deleteNotification(1, fakeEvent);

    expect(stopSpy).toHaveBeenCalled();
    expect(deleteSpy).toHaveBeenCalledWith(1);
    expect(component.feedbackMessage).toContain('removed');
  });

  it('should toggle mobile menu', () => {
    expect(component.isMobileMenuOpen).toBe(false);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(true);
    component.toggleMobileMenu();
    expect(component.isMobileMenuOpen).toBe(false);
  });

  it('should handle empty state when customer has no notifications', () => {
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(of([]));
    component.loadNotifications();

    expect(component.isLoading).toBe(false);
    expect(component.notifications.length).toBe(0);
    expect(component.filteredNotifications.length).toBe(0);
  });

  it('should handle 401 error when loading notifications', () => {
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );

    component.loadNotifications();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toContain('session has expired');
  });

  it('should handle 403 error when loading notifications', () => {
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 403 }))
    );

    component.loadNotifications();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toContain('not authorized');
  });

  it('should handle network error (status 0) when loading notifications', () => {
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 0 }))
    );

    component.loadNotifications();

    expect(component.isLoading).toBe(false);
    expect(component.hasError).toBe(true);
    expect(component.errorMessage).toContain('Unable to connect to the concierge service');
  });

  it('should logout and navigate to login', () => {
    const logoutSpy = vi.spyOn(authService, 'logout');
    const navSpy = vi.spyOn(router, 'navigate');

    component.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navSpy).toHaveBeenCalledWith(['/login']);
  });

  it('should retry loading notifications and recover from error state', () => {
    // First simulate failure
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    component.loadNotifications();
    expect(component.hasError).toBe(true);

    // Now simulate successful retry
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(of(mockNotifications));
    component.loadNotifications();
    expect(component.hasError).toBe(false);
    expect(component.notifications.length).toBe(mockNotifications.length);
  });

  it('should update notifications and unread count reactively from service streams', () => {
    // Component should have loaded
    expect(component.isLoading).toBe(false);

    // Simulate backend data refresh arriving on service streams
    const newItems: Notification[] = [
      ...mockNotifications,
      {
        id: 99,
        customerId: 1,
        type: 'RESERVATION_RESCHEDULED',
        title: 'Table Rescheduled',
        message: 'Rescheduled successfully.',
        createdAt: '2026-10-16 16:30',
        read: false
      }
    ];

    (notificationService as any).notificationsSubject.next(newItems);
    expect(component.notifications.some((n) => n.id === 99)).toBe(true);

    (notificationService as any).unreadCountSubject.next(5);
    expect(component.unreadCount).toBe(5);
  });
});
