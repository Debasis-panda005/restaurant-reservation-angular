import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { Notification } from '../models/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve notifications for customer 1 sorted newest first', async () => {
    const notifications = await firstValueFrom(service.getNotificationsByCustomerId(1));
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.every((n) => n.customerId === 1)).toBe(true);

    // Verify sorted descending by createdAt
    for (let i = 0; i < notifications.length - 1; i++) {
      expect(notifications[i].createdAt >= notifications[i + 1].createdAt).toBe(true);
    }
  });

  it('should guarantee customer privacy and isolation', async () => {
    const c1Notifs = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const c2Notifs = await firstValueFrom(service.getNotificationsByCustomerId(2));

    expect(c1Notifs.length).toBeGreaterThan(0);
    expect(c2Notifs.length).toBeGreaterThan(0);

    expect(c1Notifs.every((n) => n.customerId === 1)).toBe(true);
    expect(c2Notifs.every((n) => n.customerId === 2)).toBe(true);

    const overlap = c1Notifs.some((n1) => c2Notifs.some((n2) => n1.id === n2.id));
    expect(overlap).toBe(false);
  });

  it('should retrieve only unread notifications for a customer', async () => {
    const unread = await firstValueFrom(service.getUnreadNotifications(1));
    expect(unread.length).toBeGreaterThan(0);
    expect(unread.every((n) => n.customerId === 1 && !n.read)).toBe(true);
  });

  it('should calculate accurate unread count', async () => {
    const unreadCount = await firstValueFrom(service.getUnreadCount(1));
    const unreadList = await firstValueFrom(service.getUnreadNotifications(1));
    expect(unreadCount).toBe(unreadList.length);
  });

  it('should mark a single notification as read', async () => {
    const initialUnread = await firstValueFrom(service.getUnreadNotifications(1));
    const target = initialUnread[0];
    expect(target.read).toBe(false);

    await firstValueFrom(service.markAsRead(target.id));

    const updated = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const updatedTarget = updated.find((n) => n.id === target.id);
    expect(updatedTarget?.read).toBe(true);
  });

  it('should mark all notifications as read for a customer', async () => {
    const initialCount = await firstValueFrom(service.getUnreadCount(1));
    expect(initialCount).toBeGreaterThan(0);

    await firstValueFrom(service.markAllAsRead(1));

    const remainingCount = await firstValueFrom(service.getUnreadCount(1));
    expect(remainingCount).toBe(0);

    const allNotifs = await firstValueFrom(service.getNotificationsByCustomerId(1));
    expect(allNotifs.every((n) => n.read)).toBe(true);
  });

  it('should delete a notification by id', async () => {
    const beforeList = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const targetId = beforeList[0].id;

    await firstValueFrom(service.deleteNotification(targetId));

    const afterList = await firstValueFrom(service.getNotificationsByCustomerId(1));
    expect(afterList.some((n) => n.id === targetId)).toBe(false);
    expect(afterList.length).toBe(beforeList.length - 1);
  });

  it('should add a new notification', async () => {
    const newNotice: Notification = {
      id: 9901,
      customerId: 1,
      type: 'RESERVATION_CONFIRMED',
      title: 'VIP Reservation Created',
      message: 'Exclusive table booked.',
      reservationId: 999,
      restaurantId: 2,
      createdAt: '2026-10-06 12:00',
      read: false
    };

    const added = await firstValueFrom(service.addNotification(newNotice));
    expect(added.id).toBe(9901);

    const list = await firstValueFrom(service.getNotificationsByCustomerId(1));
    expect(list.some((n) => n.id === 9901)).toBe(true);
  });

  it('should deduplicate identical notifications', async () => {
    const notice = {
      customerId: 1,
      type: 'TABLE_READY' as const,
      title: 'Table Ready VIP',
      message: 'Your table is ready.',
      reservationId: 888,
      restaurantId: 2
    };

    const first = await firstValueFrom(service.addNotification(notice));
    const beforeList = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const countBefore = beforeList.filter((n) => n.title === 'Table Ready VIP').length;
    expect(countBefore).toBe(1);

    // Attempt to add duplicate
    const second = await firstValueFrom(service.addNotification(notice));
    expect(second.id).toBe(first.id);

    const afterList = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const countAfter = afterList.filter((n) => n.title === 'Table Ready VIP').length;
    expect(countAfter).toBe(1);
  });
});
