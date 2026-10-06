import { TestBed } from '@angular/core/testing';
import { ReservationQrService } from './reservation-qr.service';
import { Reservation } from '../models/reservation.model';

describe('ReservationQrService', () => {
  let service: ReservationQrService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReservationQrService]
    });
    service = TestBed.inject(ReservationQrService);
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
});
