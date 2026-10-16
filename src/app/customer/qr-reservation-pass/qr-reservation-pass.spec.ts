import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { QrReservationPass } from './qr-reservation-pass';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { ReservationQrService } from '../../core/services/reservation-qr.service';
import { Reservation, QrVerificationResponseDto } from '../../core/models/reservation.model';

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

  it('should render real customer name, restaurant name, table and seating details from API response', async () => {
    const mockRichReservation: Reservation = {
      id: 1005,
      customerId: 1,
      customerName: 'Victoria Sterling',
      restaurantId: 999,
      restaurantName: 'The Grand Heritage',
      tableId: 105,
      tableNumber: 'T-12',
      seatingType: 'Window View Booth',
      date: '2026-10-25',
      time: '20:00',
      guests: 2,
      status: 'CONFIRMED',
      qrToken: 'HERITAGE_TOKEN_1005'
    };

    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockRichReservation));
    vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockrichqr');

    await component.loadReservationPass(1005);
    fixture.detectChanges();

    expect(component.customerName).toBe('Victoria Sterling');
    expect(component.formatTableDisplay()).toBe('Table T-12');
    expect(component.statusDisplayLabel).toBe('RESERVATION CONFIRMED');
    expect(component.statusBadgeClass).toBe('badge-confirmed');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Victoria Sterling');
    expect(compiled.textContent).toContain('The Grand Heritage');
    expect(compiled.textContent).toContain('Table T-12');
    expect(compiled.textContent).toContain('Window View Booth');
  });

  it('should display "Access Denied" when 403 Forbidden is returned from API', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(
      throwError(() => ({ status: 403, message: 'Forbidden' }))
    );

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(true);
    expect(component.errorTitle).toBe('Access Denied');
    expect(component.errorMessage).toContain('not authorized');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Access Denied');
  });

  it('should display "Unable to Load Pass" when server error occurs', async () => {
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Internal Server Error' }))
    );

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(true);
    expect(component.errorTitle).toBe('Unable to Load Pass');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Unable to Load Pass');
  });

  it('should display correct status label and badge class for CHECKED_IN reservation', async () => {
    const checkedInRes: Reservation = {
      ...mockConfirmedReservation,
      status: 'CHECKED_IN'
    };
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(checkedInRes));
    vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,checkedinqr');

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.statusDisplayLabel).toBe('CHECKED IN');
    expect(component.statusBadgeClass).toBe('badge-confirmed');
  });

  it('should display correct status label and badge class for PENDING reservation', async () => {
    const pendingRes: Reservation = {
      ...mockConfirmedReservation,
      status: 'PENDING'
    };
    vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(pendingRes));
    vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,pendingqr');

    await component.loadReservationPass(1001);
    fixture.detectChanges();

    expect(component.statusDisplayLabel).toBe('RESERVATION PENDING');
    expect(component.statusBadgeClass).toBe('badge-pending');
  });

  describe('QR verification workflow', () => {
    const mockReservationWithToken: Reservation = {
      ...mockConfirmedReservation,
      qrToken: 'SERVER_TOKEN_1001',
      restaurantName: 'Spice Symphony Bistro',
      tableNumber: '102'
    };

    const mockVerificationSuccess: QrVerificationResponseDto = {
      valid: true,
      reservationId: 1001,
      customerName: 'Valued Patron',
      restaurantName: 'Spice Symphony Bistro',
      tableNumber: '102',
      guests: 4,
      status: 'CONFIRMED',
      message: 'Reservation is valid and confirmed'
    };

    it('should display "DIGITAL RESERVATION PASS" tag and not claim server verification on load', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verification-tag')?.textContent).toContain('DIGITAL RESERVATION PASS');
      expect(compiled.querySelector('.pass-verified-result')).toBeFalsy();
      expect(component.verificationSuccess).toBe(false);
    });

    it('should verify reservation pass successfully via ReservationQrService', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      const verifySpy = vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(of(mockVerificationSuccess));

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(verifySpy).toHaveBeenCalledWith({
        reservationId: 1001,
        token: 'SERVER_TOKEN_1001'
      });
      expect(component.isVerifying).toBe(false);
      expect(component.verificationSuccess).toBe(true);
      expect(component.verificationResult).toEqual(mockVerificationSuccess);
      expect(component.verificationError).toBeNull();

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verified-result')).toBeTruthy();
      expect(compiled.textContent).toContain('QR PASS VERIFIED BY SERVER');
      expect(compiled.textContent).toContain('Reservation is valid and confirmed');
    });

    it('should prevent concurrent duplicate verification calls while isVerifying is active', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      const verifySpy = vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(of(mockVerificationSuccess));

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.isVerifying = true;
      component.verifyPass();

      expect(verifySpy).not.toHaveBeenCalled();
    });

    it('should display error when reservation has no verification token', async () => {
      const resWithoutToken: Reservation = { ...mockConfirmedReservation, qrToken: undefined };
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(resWithoutToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      const verifySpy = vi.spyOn(reservationQrService, 'verifyReservation');

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(verifySpy).not.toHaveBeenCalled();
      expect(component.verificationSuccess).toBe(false);
      expect(component.verificationError).toContain('No server verification token assigned');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verify-error-box')).toBeTruthy();
    });

    it('should reject verification attempt if reservation is cancelled', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of({
        ...mockCancelledReservation,
        qrToken: 'CANCELLED_TOKEN'
      }));
      const verifySpy = vi.spyOn(reservationQrService, 'verifyReservation');

      await component.loadReservationPass(1003);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(verifySpy).not.toHaveBeenCalled();
      expect(component.verificationSuccess).toBe(false);
      expect(component.verificationError).toContain('Cannot verify a cancelled reservation');
    });

    it('should handle invalid token error (400 Bad Request) from backend API', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(
        throwError(() => ({
          status: 400,
          error: { message: 'Invalid verification token' }
        }))
      );

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(component.isVerifying).toBe(false);
      expect(component.verificationSuccess).toBe(false);
      expect(component.verificationResult).toBeNull();
      expect(component.verificationError).toBe('Invalid verification token');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verify-error-box')).toBeTruthy();
      expect(compiled.textContent).toContain('Invalid verification token');
    });

    it('should handle authorization failure (403 Forbidden) when user does not own reservation', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(
        throwError(() => ({
          status: 403,
          error: { message: 'You are not authorized to verify this reservation.' }
        }))
      );

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(component.isVerifying).toBe(false);
      expect(component.verificationSuccess).toBe(false);
      expect(component.verificationError).toBe('You are not authorized to verify this reservation.');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verify-error-box')).toBeTruthy();
      expect(compiled.textContent).toContain('You are not authorized to verify this reservation.');
    });

    it('should handle unauthenticated error (401 Unauthorized)', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(
        throwError(() => ({ status: 401, error: { message: 'Unauthorized' } }))
      );

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(component.verificationError).toContain('Authentication required');
    });

    it('should handle server or network error (500) during verification', async () => {
      vi.spyOn(reservationService, 'getReservationById').mockReturnValue(of(mockReservationWithToken));
      vi.spyOn(reservationQrService, 'generateQrData').mockResolvedValue('data:image/png;base64,mockqr');
      vi.spyOn(reservationQrService, 'verifyReservation').mockReturnValue(
        throwError(() => ({ status: 500, error: 'Internal Server Error' }))
      );

      await component.loadReservationPass(1001);
      fixture.detectChanges();

      component.verifyPass();
      fixture.detectChanges();

      expect(component.isVerifying).toBe(false);
      expect(component.verificationSuccess).toBe(false);
      expect(component.verificationError).toContain('Verification service is currently unavailable');

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.pass-verify-error-box')).toBeTruthy();
    });
  });
});

