import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { RescheduleReservation } from './reschedule-reservation';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { ReservationQrService } from '../../core/services/reservation-qr.service';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';

describe('RescheduleReservation', () => {
  let component: RescheduleReservation;
  let fixture: ComponentFixture<RescheduleReservation>;
  let reservationService: ReservationService;
  let restaurantService: RestaurantService;
  let authService: AuthService;
  let router: Router;

  const mockRestaurant: Restaurant = {
    id: 1,
    name: 'Spice Symphony Bistro',
    location: 'Bhubaneswar, Odisha',
    cuisine: 'North Indian & Mughlai',
    description: 'Authentic royal curries and tandoor specials.',
    rating: 4.8,
    tagline: 'Imperial Flavors & Royal Dining',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'
  };

  const mockTables: Table[] = [
    { id: 101, restaurantId: 1, tableNumber: 'T-01', capacity: 2, seatingType: 'WINDOW', available: true },
    { id: 102, restaurantId: 1, tableNumber: 'T-02', capacity: 4, seatingType: 'AC', available: true },
    { id: 103, restaurantId: 1, tableNumber: 'T-03', capacity: 4, seatingType: 'INDOOR', available: false },
    { id: 104, restaurantId: 1, tableNumber: 'T-04', capacity: 6, seatingType: 'OUTDOOR', available: true }
  ];

  const mockConfirmedReservation: Reservation = {
    id: 1001,
    customerId: 1,
    restaurantId: 1,
    tableId: 102,
    date: '2026-10-10',
    time: '19:30',
    guests: 4,
    status: 'CONFIRMED'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RescheduleReservation],
      providers: [
        provideRouter([]),
        ReservationService,
        RestaurantService,
        AuthService,
        ReservationQrService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1001'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RescheduleReservation);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    restaurantService = TestBed.inject(RestaurantService);
    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('2. should load confirmed reservation, restaurant and tables on initialization', () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockConfirmedReservation));
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));
    vi.spyOn(restaurantService, 'getTablesByRestaurantId').mockReturnValue(of(mockTables));
    vi.spyOn(reservationService, 'getReservations').mockReturnValue(of([mockConfirmedReservation]));

    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(false);
    expect(component.cannotReschedule).toBe(false);
    expect(component.reservation).toEqual(mockConfirmedReservation);
    expect(component.restaurant).toEqual(mockRestaurant);
    expect(component.tables.length).toBe(4);
    expect(component.selectedTable?.id).toBe(102);
  });

  it('3. should handle invalid or non-existent reservation ID by displaying notFound state', () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(undefined));

    component.handleRouteId('99999');
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(component.isLoading).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reservation Not Found');
  });

  it('4. should reject rescheduling for CANCELLED reservations', () => {
    const cancelledRes: Reservation = {
      ...mockConfirmedReservation,
      status: 'CANCELLED'
    };
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(cancelledRes));

    component.loadReservationData(1001);
    fixture.detectChanges();

    expect(component.cannotReschedule).toBe(true);
    expect(component.cannotRescheduleReason).toContain('Cancelled reservations cannot be rescheduled');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reservation Cannot Be Rescheduled');
  });

  it('5. should reject rescheduling for COMPLETED reservations', () => {
    const completedRes: Reservation = {
      ...mockConfirmedReservation,
      status: 'COMPLETED'
    };
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(completedRes));

    component.loadReservationData(1001);
    fixture.detectChanges();

    expect(component.cannotReschedule).toBe(true);
    expect(component.cannotRescheduleReason).toContain('Completed reservations cannot be rescheduled');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reservation Cannot Be Rescheduled');
  });

  it('6. should validate date and prevent past dates', () => {
    component.reservation = mockConfirmedReservation;
    component.minDate = '2026-10-06';
    component.newDate = '2026-10-01'; // past date

    component.onDateChange();

    expect(component.newDate).toBe('2026-10-06');
    expect(component.errorMessage).toContain('Past dates cannot be selected');
  });

  it('7. should allow time slot selection when available', () => {
    component.reservation = mockConfirmedReservation;
    component.tables = mockTables;
    component.existingReservations = [mockConfirmedReservation];
    component.newDate = '2026-10-15';

    component.selectTimeSlot('08:00 PM');

    expect(component.newTime).toBe('08:00 PM');
    expect(component.errorMessage).toBe('');
  });

  it('8. should select an eligible table', () => {
    component.reservation = mockConfirmedReservation; // 4 guests
    component.tables = mockTables;
    component.newDate = '2026-10-15';
    component.newTime = '08:00 PM';

    const table104 = mockTables.find(t => t.id === 104)!; // capacity 6
    component.selectTable(table104);

    expect(component.selectedTable).toEqual(table104);
    expect(component.errorMessage).toBe('');
  });

  it('9. should validate and reject table with insufficient capacity', () => {
    component.reservation = mockConfirmedReservation; // 4 guests
    component.tables = mockTables;

    const table101 = mockTables.find(t => t.id === 101)!; // capacity 2
    component.selectTable(table101);

    expect(component.selectedTable?.id).not.toBe(101);
    expect(component.errorMessage).toContain('Table capacity is insufficient');
  });

  it('10. should validate and reject occupied/conflicting tables', () => {
    component.reservation = mockConfirmedReservation; // id 1001, table 102
    component.tables = mockTables;
    component.newDate = '2026-10-12';
    component.newTime = '08:00 PM';

    // Existing reservation on Table 104 at the same date and time
    const conflictingRes: Reservation = {
      id: 2002,
      customerId: 2,
      restaurantId: 1,
      tableId: 104,
      date: '2026-10-12',
      time: '08:00 PM',
      guests: 4,
      status: 'CONFIRMED'
    };
    component.existingReservations = [mockConfirmedReservation, conflictingRes];

    const table104 = mockTables.find(t => t.id === 104)!;
    expect(component.isTableOccupied(104, '2026-10-12', '08:00 PM')).toBe(true);

    component.selectTable(table104);
    expect(component.selectedTable?.id).not.toBe(104);
    expect(component.errorMessage).toContain('Table unavailable for the selected time');
  });

  it('11. should detect when no changes are made and reject proceeding to review', () => {
    component.reservation = mockConfirmedReservation;
    component.selectedTable = mockTables.find(t => t.id === 102)!;
    component.newDate = mockConfirmedReservation.date; // 2026-10-10
    component.newTime = '07:30 PM'; // 19:30 normalized

    component.proceedToReview();

    expect(component.isReviewStep).toBe(false);
    expect(component.errorMessage).toContain('No changes detected');
  });

  it('12. should successfully update the reservation and preserve the reservation ID', () => {
    component.reservation = mockConfirmedReservation;
    component.restaurant = mockRestaurant;
    component.tables = mockTables;
    component.newDate = '2026-10-15';
    component.newTime = '08:30 PM';
    component.selectedTable = mockTables.find(t => t.id === 104)!;

    const updateSpy = vi.spyOn(reservationService, 'updateReservation').mockReturnValue(of({
      ...mockConfirmedReservation,
      date: '2026-10-15',
      time: '08:30 PM',
      tableId: 104
    }));

    component.confirmReschedule();

    expect(updateSpy).toHaveBeenCalledWith(1001, {
      date: '2026-10-15',
      time: '08:30 PM',
      tableId: 104
    });

    expect(component.rescheduleSuccess).toBe(true);
    expect(component.updatedReservation?.id).toBe(1001); // ID strictly preserved!
    expect(component.updatedReservation?.date).toBe('2026-10-15');
    expect(component.updatedReservation?.time).toBe('08:30 PM');
    expect(component.updatedReservation?.tableId).toBe(104);
  });

  it('13. should verify QR reservation payload receives updated reservation details', () => {
    const qrService = TestBed.inject(ReservationQrService);
    const updatedRes: Reservation = {
      ...mockConfirmedReservation,
      date: '2026-10-15',
      time: '08:30 PM',
      tableId: 104
    };

    const payload = qrService.generateVerificationPayload(updatedRes);

    expect(payload).toContain('RESERVATION_ID=RES-1001');
    expect(payload).toContain('DATE=2026-10-15');
    expect(payload).toContain('TIME=08:30 PM');
    expect(payload).toContain('TABLE_ID=104');
    expect(payload).toContain('STATUS=CONFIRMED');
  });

  it('14. should navigate to QR reservation pass and My Reservations correctly', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.updatedReservation = {
      ...mockConfirmedReservation,
      id: 1001
    };

    component.goToQrPass();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/reservation-pass', 1001]);

    component.goToMyReservations();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/reservations']);
  });
});
