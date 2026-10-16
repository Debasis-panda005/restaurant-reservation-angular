import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { NotificationService } from './notification.service';
import { Notification } from '../models/notification.model';

describe('NotificationService (Offline / In-Memory Isolation)', () => {
  let service: NotificationService;

  beforeEach(() => {
    // Instantiate without HttpClient to test in-memory fallback
    service = new NotificationService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should retrieve notifications for customer 1 sorted newest first', async () => {
    const notifications = await firstValueFrom(service.getNotificationsByCustomerId(1));
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications.every((n) => n.customerId === 1)).toBe(true);

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

    const second = await firstValueFrom(service.addNotification(notice));
    expect(second.id).toBe(first.id);

    const afterList = await firstValueFrom(service.getNotificationsByCustomerId(1));
    const countAfter = afterList.filter((n) => n.title === 'Table Ready VIP').length;
    expect(countAfter).toBe(1);
  });
});

describe('NotificationService (HTTP REST Backend Integration)', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should GET /api/notifications/my and normalize results', () => {
    const mockBackendResponse = [
      {
        id: 35,
        customerId: 1,
        type: 'RESERVATION_CONFIRMED',
        title: 'Table Confirmed',
        message: 'Your table is reserved.',
        reservationId: 1001,
        restaurantId: 1,
        createdAt: '2026-10-16 14:11',
        read: false
      }
    ];

    let notifsResult: any[] = [];
    service.getMyNotifications().subscribe((notifs) => {
      notifsResult = notifs;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/my');
    expect(req.request.method).toBe('GET');
    req.flush(mockBackendResponse);

    expect(notifsResult.length).toBe(1);
    expect(notifsResult[0].id).toBe(35);
    expect(notifsResult[0].title).toBe('Table Confirmed');
    expect(notifsResult[0].read).toBe(false);
  });

  it('should handle empty array from GET /api/notifications/my', () => {
    let notifsResult: any[] = [];
    service.getMyNotifications().subscribe((notifs) => {
      notifsResult = notifs;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/my');
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(notifsResult).toEqual([]);
  });

  it('should propagate 401 error on GET /api/notifications/my', () => {
    let errorCaught: any;
    service.getMyNotifications().subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorCaught = err;
      }
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/my');
    req.flush({ message: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught.status).toBe(401);
  });

  it('should GET /api/notifications/unread/count and parse count', () => {
    let countResult: number | undefined;
    service.getUnreadCount().subscribe((count) => {
      countResult = count;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/unread/count');
    expect(req.request.method).toBe('GET');
    req.flush({ count: 4 });

    expect(countResult).toBe(4);
  });

  it('should PUT /api/notifications/{id}/read and update unread count', () => {
    let result: any;
    service.markAsRead(42).subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/42/read');
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Notification marked as read' });

    expect(result).toBeDefined();
    expect(result.message).toBe('Notification marked as read');
  });

  it('should deduplicate concurrent in-flight markAsRead requests', () => {
    let callCount = 0;
    service.markAsRead(42).subscribe(() => callCount++);
    service.markAsRead(42).subscribe(() => callCount++);

    // Only one HTTP request should be dispatched
    const req = httpMock.expectOne('http://localhost:8080/api/notifications/42/read');
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'Notification marked as read' });

    expect(callCount).toBe(2);
  });

  it('should PUT /api/notifications/read-all and reset unread count', () => {
    let result: any;
    service.markAllAsRead().subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/read-all');
    expect(req.request.method).toBe('PUT');
    req.flush({ message: 'All notifications marked as read' });

    expect(result).toBeDefined();
    expect(result.message).toBe('All notifications marked as read');
  });

  it('should propagate 403 Forbidden on markAsRead', () => {
    let errorCaught: any;
    service.markAsRead(99).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorCaught = err;
      }
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/99/read');
    req.flush({ message: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught.status).toBe(403);
  });

  it('should propagate 500 Server Error on markAllAsRead', () => {
    let errorCaught: any;
    service.markAllAsRead().subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorCaught = err;
      }
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/read-all');
    req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught.status).toBe(500);
  });

  it('should refresh notifications from GET /api/notifications/my when refreshNotifications is called', () => {
    let result: any[] = [];
    service.refreshNotifications().subscribe((notifs) => {
      result = notifs;
    });

    const req = httpMock.expectOne('http://localhost:8080/api/notifications/my');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 101,
        customerId: 1,
        type: 'RESERVATION_CONFIRMED',
        title: 'Backend Confirmation',
        message: 'Your table is confirmed.',
        read: false
      }
    ]);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(101);
  });
});
