import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReservationService } from './reservation.service';
import { NotificationService } from './notification.service';
import { Reservation, ReservationResponseDto } from '../models/reservation.model';

describe('ReservationService', () => {
  let service: ReservationService;
  let httpTesting: HttpTestingController;
  let notificationService: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ReservationService,
        NotificationService
      ]
    });

    service = TestBed.inject(ReservationService);
    httpTesting = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should correctly format 12-hour and 24-hour time strings to Spring Boot LocalTime format', () => {
    expect(service.formatTimeTo24h('06:30 PM')).toBe('18:30:00');
    expect(service.formatTimeTo24h('12:00 PM')).toBe('12:00:00');
    expect(service.formatTimeTo24h('12:30 AM')).toBe('00:30:00');
    expect(service.formatTimeTo24h('19:30')).toBe('19:30:00');
    expect(service.formatTimeTo24h('19:30:00')).toBe('19:30:00');
  });

  it('should send HTTP POST to /api/reservations with backend DTO and map response on success', () => {
    const bookingInput: Omit<Reservation, 'id'> = {
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      tableNumber: 'T-01',
      seatingType: 'WINDOW',
      restaurantName: 'Spice Symphony Bistro',
      date: '2026-10-10',
      time: '06:30 PM',
      guests: 2,
      status: 'CONFIRMED'
    };

    const mockBackendResponse: ReservationResponseDto = {
      id: 501,
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      reservationDate: '2026-10-10',
      reservationTime: '18:30:00',
      guests: 2,
      status: 'CONFIRMED',
      qrToken: 'QR-RES-501-ABC'
    };

    let resultReservation: Reservation | undefined;
    service.createReservation(bookingInput).subscribe((res) => {
      resultReservation = res;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      reservationDate: '2026-10-10',
      reservationTime: '18:30:00',
      guests: 2,
      status: 'CONFIRMED'
    });

    req.flush(mockBackendResponse);

    expect(resultReservation).toBeDefined();
    expect(resultReservation?.id).toBe(501);
    expect(resultReservation?.tableNumber).toBe('T-01');
    expect(resultReservation?.seatingType).toBe('WINDOW');
    expect(resultReservation?.qrToken).toBe('QR-RES-501-ABC');
  });

  it('should propagate error and NOT create fake reservation when API returns 401 or 500', () => {
    const bookingInput: Omit<Reservation, 'id'> = {
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      tableNumber: 'T-01',
      seatingType: 'WINDOW',
      restaurantName: 'Spice Symphony Bistro',
      date: '2026-10-10',
      time: '06:30 PM',
      guests: 2,
      status: 'CONFIRMED'
    };

    let errorReceived: any;
    service.createReservation(bookingInput).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorReceived = err;
      }
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeDefined();
    expect(errorReceived.status).toBe(401);
  });

  it('should send HTTP PUT to /api/reservations/{id}/cancel and return true on success', () => {
    let resultSuccess: boolean | undefined;
    service.cancelReservation(5).subscribe((success) => {
      resultSuccess = success;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/5/cancel');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});

    req.flush({
      id: 5,
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      status: 'CANCELLED',
    });

    expect(resultSuccess).toBe(true);
  });

  it('should propagate error and NOT return true when cancel API returns 404 or 500', () => {
    let errorReceived: any;
    service.cancelReservation(999).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorReceived = err;
      },
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/999/cancel');
    req.flush('Reservation not found', { status: 404, statusText: 'Not Found' });

    expect(errorReceived).toBeDefined();
    expect(errorReceived.status).toBe(404);
  });

  it('should send HTTP PUT to /api/reservations/{id} with updated details and map response on success', () => {
    let resultReservation: Reservation | undefined;
    service.updateReservation(6, {
      date: '2026-10-31',
      time: '07:30 PM',
      tableId: 3,
      tableNumber: 'T-01',
      seatingType: 'WINDOW'
    }).subscribe((res) => {
      resultReservation = res;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/6');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      reservationDate: '2026-10-31',
      reservationTime: '19:30:00',
      guests: 2,
      status: 'CONFIRMED'
    });

    req.flush({
      id: 6,
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      tableNumber: 'T-01',
      restaurantName: 'Spice Symphony Bistro',
      reservationDate: '2026-10-31',
      reservationTime: '19:30:00',
      guests: 2,
      status: 'CONFIRMED',
      qrToken: 'eacae73a-646a-4694-aba9-34f6cc2d0d4e'
    });

    expect(resultReservation).toBeDefined();
    expect(resultReservation?.id).toBe(6);
    expect(resultReservation?.date).toBe('2026-10-31');
    expect(resultReservation?.time).toBe('19:30:00');
    expect(resultReservation?.tableNumber).toBe('T-01');
    expect(resultReservation?.qrToken).toBe('eacae73a-646a-4694-aba9-34f6cc2d0d4e');
  });

  it('should propagate error when update API returns 400, 404, or 500', () => {
    let errorReceived: any;
    service.updateReservation(999, {
      date: '2026-10-31',
      time: '07:30 PM'
    }).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorReceived = err;
      }
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/999');
    req.flush('Reservation not found', { status: 404, statusText: 'Not Found' });

    expect(errorReceived).toBeDefined();
    expect(errorReceived.status).toBe(404);
  });

  it('should fetch reservations by restaurantId from API', () => {
    let result: Reservation[] = [];
    service.getReservationsByRestaurantId(1).subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/restaurant/1');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 7,
        customerId: 1,
        restaurantId: 1,
        tableId: 3,
        reservationDate: '2026-11-05',
        reservationTime: '13:30:00',
        guests: 2,
        status: 'CANCELLED'
      }
    ]);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(7);
    expect(result[0].status).toBe('CANCELLED');
    expect(result[0].time).toBe('13:30:00');
  });

  it('should fetch reservations by restaurantId and date from API', () => {
    let result: Reservation[] = [];
    service.getReservationsByRestaurantId(1, '2026-11-05').subscribe((res) => {
      result = res;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/restaurant/1?date=2026-11-05');
    expect(req.request.method).toBe('GET');
    req.flush([
      {
        id: 7,
        customerId: 1,
        restaurantId: 1,
        tableId: 3,
        reservationDate: '2026-11-05',
        reservationTime: '13:30:00',
        guests: 2,
        status: 'CANCELLED'
      }
    ]);

    expect(result.length).toBe(1);
    expect(result[0].id).toBe(7);
    expect(result[0].status).toBe('CANCELLED');
  });

  it('should send HTTP DELETE to /api/reservations/{id} and update local status to CANCELLED on success', () => {
    let successResult: boolean | undefined;
    service.deleteReservation(501).subscribe((res) => {
      successResult = res;
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/501');
    expect(req.request.method).toBe('DELETE');
    req.flush({
      id: 501,
      customerId: 1,
      restaurantId: 1,
      tableId: 3,
      reservationDate: '2026-10-10',
      reservationTime: '18:30:00',
      guests: 2,
      status: 'CANCELLED'
    });

    expect(successResult).toBe(true);
  });

  it('should propagate error when DELETE /api/reservations/{id} fails', () => {
    let errorCaught: any;
    service.deleteReservation(999).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        errorCaught = err;
      }
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/reservations/999');
    req.flush('Reservation not found', { status: 404, statusText: 'Not Found' });

    expect(errorCaught).toBeDefined();
    expect(errorCaught.status).toBe(404);
  });
});
