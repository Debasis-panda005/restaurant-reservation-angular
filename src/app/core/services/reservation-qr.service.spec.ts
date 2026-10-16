import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReservationQrService } from './reservation-qr.service';
import { Reservation, QrVerificationRequestDto, QrVerificationResponseDto } from '../models/reservation.model';

describe('ReservationQrService', () => {
  let service: ReservationQrService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReservationQrService
      ]
    });
    service = TestBed.inject(ReservationQrService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting?.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should generate a verification payload string', () => {
    const mockReservation: Reservation = {
      id: 6175,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-10-15',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED'
    };

    const payload = service.generateVerificationPayload(mockReservation);
    expect(payload).toContain('RESERVATION_ID=RES-6175');
    expect(payload).toContain('CUSTOMER_ID=CUST-1');
    expect(payload).toContain('STATUS=CONFIRMED');
    expect(payload).not.toContain('password');
    expect(payload).not.toContain('Bearer');
    expect(payload).not.toContain('token');
  });

  it('should include server verification token when qrToken is present', () => {
    const mockReservationWithToken: Reservation = {
      id: 6175,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-10-15',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED',
      qrToken: 'SECURE_TEST_TOKEN_XYZ123'
    };

    const payload = service.generateVerificationPayload(mockReservationWithToken);
    expect(payload).toContain('RESERVATION_ID=RES-6175');
    expect(payload).toContain('TOKEN=SECURE_TEST_TOKEN_XYZ123');
    expect(payload).toContain('STATUS=CONFIRMED');
  });

  it('should extract verification data correctly from payload string', () => {
    const payload = 'RESERVATION_ID=RES-6175\nCUSTOMER_ID=CUST-1\nRESTAURANT_ID=REST-2\nPARTY=4\nSTATUS=CONFIRMED\nTOKEN=VERIF_ABC987';
    const data = service.extractVerificationData(payload);

    expect(data.reservationId).toBe(6175);
    expect(data.token).toBe('VERIF_ABC987');
  });

  it('should generate a valid data URL image string for confirmed reservation', async () => {
    const mockReservation: Reservation = {
      id: 6175,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-10-15',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED'
    };

    const dataUrl = await service.generateQrData(mockReservation);
    expect(dataUrl).toBeTruthy();
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
  });

  describe('verifyReservation API integration', () => {
    it('should send POST request to /api/reservations/verify and return response on success', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'VALID_TOKEN_123'
      };

      const mockResponse: QrVerificationResponseDto = {
        valid: true,
        reservationId: 1001,
        customerName: 'Victoria Sterling',
        restaurantName: 'The Grand Heritage',
        tableNumber: 'T-12',
        status: 'CONFIRMED',
        message: 'Reservation is valid and confirmed'
      };

      let result: QrVerificationResponseDto | undefined;
      service.verifyReservation(request).subscribe((res) => {
        result = res;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        reservationId: 1001,
        token: 'VALID_TOKEN_123'
      });

      req.flush(mockResponse);

      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
      expect(result?.customerName).toBe('Victoria Sterling');
      expect(result?.status).toBe('CONFIRMED');
    });

    it('should reject verification when token is missing or blank without calling HTTP', () => {
      let errorCaught: any;
      service.verifyReservation({ reservationId: 1001, token: '' }).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(400);
      expect(errorCaught.message).toContain('token is required');
      httpTesting.expectNone('http://localhost:8080/api/reservations/verify');
    });

    it('should handle invalid token error (400 Bad Request) from backend', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'INVALID_TOKEN'
      };

      let errorCaught: any;
      service.verifyReservation(request).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      req.flush({ message: 'Invalid verification token' }, { status: 400, statusText: 'Bad Request' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(400);
      expect(errorCaught.error.message).toBe('Invalid verification token');
    });

    it('should handle cancelled reservation error (400 Bad Request) from backend', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'TOKEN_FOR_CANCELLED'
      };

      let errorCaught: any;
      service.verifyReservation(request).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      req.flush({ message: 'Cannot verify a cancelled reservation' }, { status: 400, statusText: 'Bad Request' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(400);
      expect(errorCaught.error.message).toBe('Cannot verify a cancelled reservation');
    });

    it('should handle authorization failure (403 Forbidden) when user does not own reservation', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 9999,
        token: 'SOME_TOKEN'
      };

      let errorCaught: any;
      service.verifyReservation(request).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      req.flush(
        { message: "You are not authorized to verify another customer's reservation" },
        { status: 403, statusText: 'Forbidden' }
      );

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(403);
      expect(errorCaught.error.message).toBe("You are not authorized to verify another customer's reservation");
    });

    it('should handle server or network errors gracefully', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'VALID_TOKEN'
      };

      let errorCaught: any;
      service.verifyReservation(request).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(500);
    });

    it('should verify raw scanned payload string correctly', () => {
      const scannedPayload = 'RESERVATION_ID=RES-1005\nSTATUS=CONFIRMED\nTOKEN=SCANNED_TOKEN_XYZ';

      let result: QrVerificationResponseDto | undefined;
      service.verifyScannedPayload(scannedPayload).subscribe((res) => {
        result = res;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/verify');
      expect(req.request.body).toEqual({
        reservationId: 1005,
        token: 'SCANNED_TOKEN_XYZ'
      });
      req.flush({ valid: true, reservationId: 1005, status: 'CONFIRMED' });

      expect(result).toBeDefined();
      expect(result?.valid).toBe(true);
    });

    it('should reject scanned payload string when token is missing', () => {
      const scannedPayload = 'RESERVATION_ID=RES-1005\nSTATUS=CONFIRMED';

      let errorCaught: any;
      service.verifyScannedPayload(scannedPayload).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(400);
      expect(errorCaught.message).toContain('No valid verification token found');
      httpTesting.expectNone('http://localhost:8080/api/reservations/verify');
    });

    it('should throw an error and never return mock success when HttpClient is unavailable', () => {
      const standaloneService = new ReservationQrService();
      let errorCaught: any;
      let successCaught: any;

      standaloneService.verifyReservation({ reservationId: 1001, token: 'SOME_TOKEN' }).subscribe({
        next: (res) => {
          successCaught = res;
        },
        error: (err) => {
          errorCaught = err;
        }
      });

      expect(successCaught).toBeUndefined();
      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(503);
      expect(errorCaught.message).toContain('unavailable');
    });
  });

  describe('checkInReservation API integration (Staff separation)', () => {
    it('should send POST request to /api/reservations/check-in', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'CHECKIN_TOKEN_123'
      };

      let result: any;
      service.checkInReservation(request).subscribe((res) => {
        result = res;
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/check-in');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        reservationId: 1001,
        token: 'CHECKIN_TOKEN_123'
      });
      req.flush({ id: 1001, status: 'CHECKED_IN' });

      expect(result).toBeDefined();
      expect(result.status).toBe('CHECKED_IN');
    });

    it('should propagate 403 Forbidden when non-staff customer attempts check-in', () => {
      const request: QrVerificationRequestDto = {
        reservationId: 1001,
        token: 'CHECKIN_TOKEN_123'
      };

      let errorCaught: any;
      service.checkInReservation(request).subscribe({
        next: () => expect(true).toBe(false),
        error: (err) => {
          errorCaught = err;
        }
      });

      const req = httpTesting.expectOne('http://localhost:8080/api/reservations/check-in');
      req.flush(
        { message: 'Only staff or admin can check in reservations' },
        { status: 403, statusText: 'Forbidden' }
      );

      expect(errorCaught).toBeDefined();
      expect(errorCaught.status).toBe(403);
    });
  });
});


