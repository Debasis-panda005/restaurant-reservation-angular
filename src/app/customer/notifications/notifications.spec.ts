import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
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
    fixture.detectChanges();
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
    const markAllSpy = vi.spyOn(notificationService, 'markAllAsRead').mockReturnValue(of(void 0));

    component.markAllAsRead();

    expect(markAllSpy).toHaveBeenCalled();
    expect(component.feedbackMessage).toContain('marked as read');
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
});
