import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { MyReservations, EnrichedReservation } from './my-reservations';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { AuthService } from '../../core/services/auth.service';

describe('MyReservations', () => {
  let component: MyReservations;
  let fixture: ComponentFixture<MyReservations>;
  let reservationService: ReservationService;
  let reviewService: ReviewService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyReservations],
      providers: [
        provideRouter([]),
        ReservationService,
        RestaurantService,
        ReviewService,
        AuthService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyReservations);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    reviewService = TestBed.inject(ReviewService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load reservations for the customer', () => {
    expect(component.reservations.length).toBeGreaterThan(0);
    expect(component.filteredReservations.length).toBeGreaterThan(0);
  });

  it('should filter reservations by status', () => {
    component.setFilter('CONFIRMED');
    expect(component.activeFilter).toBe('CONFIRMED');
    const allConfirmed = component.filteredReservations.every(
      (r) => r.status === 'CONFIRMED'
    );
    expect(allConfirmed).toBe(true);
  });

  it('should cancel a reservation and update status', () => {
    const reservationToCancel: EnrichedReservation = {
      id: 1001,
      customerId: 1,
      restaurantId: 1,
      tableId: 102,
      date: '2026-09-30',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED',
      restaurantName: 'Spice Symphony Bistro',
    };

    // Mock confirm dialog
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.cancelBooking(reservationToCancel);

    expect(reservationToCancel.status).toBe('CANCELLED');
    expect(component.notificationMessage).toContain('successfully cancelled');
  });

  it('should navigate to reschedule page for a confirmed reservation', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.rescheduleBooking(1001);

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/reservations', 1001, 'reschedule']);
  });

  it('should navigate to review page when rateExperience is called', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.rateExperience(1003);

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/reservations', 1003, 'review']);
  });

  it('should correctly report whether a completed reservation is reviewed', () => {
    component.reviewedReservationIds.add(1004);

    expect(component.isReservationReviewed(1004)).toBe(true);
    expect(component.isReservationReviewed(1003)).toBe(false);
  });
});
