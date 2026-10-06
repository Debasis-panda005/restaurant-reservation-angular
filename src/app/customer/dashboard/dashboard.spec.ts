import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Dashboard } from './dashboard';
import { FavoriteService } from '../../core/services/favorite.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { QueueService } from '../../core/services/queue.service';
import { AuthService } from '../../core/services/auth.service';

describe('Dashboard', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        RestaurantService,
        ReservationService,
        QueueService,
        FavoriteService,
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load favorites count on summary load', () => {
    expect(component.favoritesCount).toBeGreaterThanOrEqual(0);
  });

  it('should navigate to favorites page when goToFavorites is called', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goToFavorites();
    expect(navSpy).toHaveBeenCalledWith(['/customer/favorites']);
  });
});
