import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { QrReservationPass } from './qr-reservation-pass';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { ReservationQrService } from '../../core/services/reservation-qr.service';
import { Reservation } from '../../core/models/reservation.model';

describe('QrReservationPass', () => {
  let component: QrReservationPass;
  let fixture: ComponentFixture<QrReservationPass>;
  let reservationService: ReservationService;
  let reservationQrService: ReservationQrService;
  let router: Router;

  const mockConfirmedReservation: Reservation = {
    id: 1001,
    customerId: 1,
    restaurantId: 1,
    tableId: 102,
    date: '2026-10-15',
    time: '19:30',
    guests: 4,
    status: 'CONFIRMED'
  };

  const mockCancelledReservation: Reservation = {
    id: 1003,
    customerId: 1,
    restaurantId: 1,
    tableId: 102,
    date: '2026-10-15',
    time: '19:30',
    guests: 2,
    status: 'CANCELLED'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrReservationPass],
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

    fixture = TestBed.createComponent(QrReservationPass);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    reservationQrService = TestBed.inject(ReservationQrService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load confirmed reservation and generate scannable QR code', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockConfirmedReservation));
    vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqrdata');

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.isQrLoading).toBe(false);
    expect(component.qrFailed).toBe(false);
    expect(component.notFound).toBe(false);
    expect(component.isCancelled).toBe(false);
    expect(component.reservation).toEqual(mockConfirmedReservation);
    expect(component.qrCodeUrl).toBe('data:image/png;base64,mockqrdata');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Spice Symphony Bistro');
    expect(compiled.textContent).toContain('#RES-1001');
    expect(compiled.textContent).toContain('RESERVATION CONFIRMED');
    expect(compiled.querySelector('.pass-qr-image')).toBeTruthy();
  });

  it('should display "Reservation Not Found" when invalid ID is provided', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(undefined));

    await component.loadReservationPass(9999);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(true);
    expect(component.reservation).toBeNull();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Reservation Not Found');
    expect(compiled.querySelector('.pass-qr-image')).toBeFalsy();
  });

  it('should display "QR Pass Unavailable" for cancelled reservation and not generate QR', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockCancelledReservation));
    const qrSpy = vi.spyOn(reservationQrService, 'generateQrData');

    await component.loadReservationPass(1003);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(false);
    expect(component.isCancelled).toBe(true);
    expect(qrSpy).not.toHaveBeenCalled();
    expect(component.qrCodeUrl).toBe('');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('QR Pass Unavailable');
    expect(compiled.textContent).toContain('Cancelled reservations cannot be used for restaurant check-in');
    expect(compiled.querySelector('.pass-qr-image')).toBeFalsy();
  });

  it('should handle QR generation failure gracefully and display retry option', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockConfirmedReservation));
    vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('');

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.isQrLoading).toBe(false);
    expect(component.qrFailed).toBe(true);
    expect(component.qrCodeUrl).toBe('');
    // Reservation details MUST still be present
    expect(component.reservation).toEqual(mockConfirmedReservation);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Spice Symphony Bistro');
    expect(compiled.textContent).toContain('#RES-1001');
    expect(compiled.textContent).toContain('QR Code Unavailable');
    expect(compiled.textContent).toContain('Retry QR Generation');
  });

  it('should allow retrying QR generation after failure', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockConfirmedReservation));
    const qrSpy = vi.spyOn(reservationQrService, 'generateQrData')
      .mockResolvedValueOnce('') // first fail
      .mockResolvedValueOnce('data:image/png;base64,retriedqrdata'); // second succeed

    await component.loadReservationPass(1001);
    expect(component.qrFailed).toBe(true);

    await component.retryQrGeneration();
    fixture.detectChanges();

    expect(qrSpy).toHaveBeenCalledTimes(2);
    expect(component.qrFailed).toBe(false);
    expect(component.qrCodeUrl).toBe('data:image/png;base64,retriedqrdata');
  });

  it('should trigger image download when downloadPass is called', () => {
    component.reservation = mockConfirmedReservation;
    component.qrCodeUrl = 'data:image/png;base64,mockqrdata';

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    component.downloadPass();
    expect(clickSpy).toHaveBeenCalled();
    expect(component.downloadSuccess).toBe(true);
  });

  it('should navigate to reservations list on backToReservations', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.backToReservations();
    expect(navSpy).toHaveBeenCalledWith(['/customer/reservations']);
  });

  it('should navigate to restaurants list on goToRestaurants', () => {
    const navSpy = vi.spyOn(router, 'navigate');
    component.goToRestaurants();
    expect(navSpy).toHaveBeenCalledWith(['/customer/restaurants']);
  });
});
