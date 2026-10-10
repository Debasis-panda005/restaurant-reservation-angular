import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
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
    vi.spyOn(reservationService, 'getReservationsByCustomerId').mockImplementation((id: number) => {
      return of(reservationService['reservations'].filter((r: any) => r.customerId === id));
    });
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
    vi.spyOn(reservationService, 'cancelReservation').mockReturnValue(of(true));

    component.cancelBooking(reservationToCancel);

    expect(reservationToCancel.status).toBe('CANCELLED');
    expect(component.notificationMessage).toContain('successfully cancelled');
  });

  it('should retain server-side status and display error when cancellation fails', () => {
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

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(reservationService, 'cancelReservation').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Server error' }))
    );

    component.cancelBooking(reservationToCancel);

    expect(reservationToCancel.status).toBe('CONFIRMED');
    expect(component.errorMessage).toContain('Unable to cancel reservation');
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

  it('REGRESSION: should maintain consistent table ID, table number, and seating type between creation and My Reservations', () => {
    // 1. Customer reserves live backend table ID 3 (Table T-01, WINDOW)
    const newBookingData = {
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      tableNumber: 'T-01',
      seatingType: 'WINDOW',
      restaurantName: 'Spice Symphony Bistro',
      date: '2026-10-10',
      time: '06:30 PM',
      guests: 2,
      status: 'CONFIRMED' as const
    };

    const mockCreated = {
      id: 9991,
      ...newBookingData,
    };
    vi.spyOn(reservationService, 'createReservation').mockImplementation(() => {
      reservationService['reservations'].unshift(mockCreated);
      return of(mockCreated);
    });

    let createdId = 0;
    reservationService.createReservation(newBookingData).subscribe((created) => {
      createdId = created.id;
      // Confirmation page contract check:
      expect(created.tableId).toBe(3);
      expect(created.tableNumber).toBe('T-01');
      expect(created.seatingType).toBe('WINDOW');
    });

    // 2. Reload My Reservations data
    component.loadData();

    // 3. Find the newly created reservation in My Reservations
    const myBooking = component.reservations.find((r) => r.id === createdId);
    expect(myBooking).toBeDefined();
    expect(myBooking?.tableId).toBe(3);
    // Verified: It must display 'Table T-01' and 'WINDOW', NEVER 'Table #3' or 'STANDARD'
    expect(myBooking?.tableNumber).toBe('Table T-01');
    expect(myBooking?.seatingType).toBe('WINDOW');
    expect(myBooking?.restaurantName).toBe('Spice Symphony Bistro');
  });

  it('should preserve saved reservation table metadata even when live tables API returns empty or fails', () => {
    const resWithMetadata = {
      customerId: 1,
      restaurantId: 99, // Unknown restaurant ID
      tableId: 777,
      tableNumber: 'T-77',
      seatingType: 'ROOFTOP',
      restaurantName: 'Skyline Terrace',
      date: '2026-10-12',
      time: '08:00 PM',
      guests: 4,
      status: 'CONFIRMED' as const,
    };

    const mockCreated2 = {
      id: 9992,
      ...resWithMetadata,
    };
    vi.spyOn(reservationService, 'createReservation').mockImplementation(() => {
      reservationService['reservations'].unshift(mockCreated2);
      return of(mockCreated2);
    });

    let createdId = 0;
    reservationService.createReservation(resWithMetadata).subscribe((res) => {
      createdId = res.id;
    });

    component.loadCustomerReservations();

    const booking = component.reservations.find((r) => r.id === createdId);
    expect(booking).toBeDefined();
    expect(booking?.tableNumber).toBe('Table T-77');
    expect(booking?.seatingType).toBe('ROOFTOP');
    expect(booking?.restaurantName).toBe('Skyline Terrace');
  });
});
