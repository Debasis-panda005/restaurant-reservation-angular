import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Dashboard } from './dashboard';
import { FavoriteService } from '../../core/services/favorite.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { QueueService } from '../../core/services/queue.service';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let router: Router;
  let reservationService: ReservationService;
  let restaurantService: RestaurantService;
  let favoriteService: FavoriteService;
  let notificationService: NotificationService;
  let queueService: QueueService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        RestaurantService,
        ReservationService,
        QueueService,
        FavoriteService,
        NotificationService,
        AuthService,
      ],
    }).compileComponents();

    reservationService = TestBed.inject(ReservationService);
    restaurantService = TestBed.inject(RestaurantService);
    favoriteService = TestBed.inject(FavoriteService);
    notificationService = TestBed.inject(NotificationService);
    queueService = TestBed.inject(QueueService);

    vi.spyOn(reservationService, 'getReservationsByCustomerId').mockReturnValue(
      of([
        {
          id: 1001,
          customerId: 1,
          restaurantId: 1,
          tableId: 101,
          date: '2026-10-15',
          time: '19:30',
          guests: 2,
          status: 'CONFIRMED',
        },
      ])
    );
    vi.spyOn(restaurantService, 'getRestaurants').mockReturnValue(of([]));
    vi.spyOn(favoriteService, 'getFavoriteCount').mockReturnValue(of(2));
    vi.spyOn(favoriteService, 'getFavoritesByCustomerId').mockReturnValue(of([]));
    vi.spyOn(notificationService, 'getUnreadCount').mockReturnValue(of(3));
    vi.spyOn(notificationService, 'getNotificationsByCustomerId').mockReturnValue(of([]));
    vi.spyOn(queueService, 'getQueueStatus').mockReturnValue(of(undefined));

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load favorites count on summary load', () => {
    expect(component.favoritesCount).toBeGreaterThanOrEqual(0);
  });

  it('should load notifications on summary load', () => {
    expect(component.unreadNotificationsCount).toBeGreaterThanOrEqual(0);
    expect(component.latestNotifications).toBeDefined();
  });

  it('should navigate to favorites page when goToFavorites is called', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goToFavorites();
    expect(navSpy).toHaveBeenCalledWith(['/customer/favorites']);
  });

  it('should navigate to notifications page when goToNotifications is called', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goToNotifications();
    expect(navSpy).toHaveBeenCalledWith(['/customer/notifications']);
  });
});
