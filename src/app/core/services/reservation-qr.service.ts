import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as QRCode from 'qrcode';
import {
  Reservation,
  QrVerificationRequestDto,
  QrVerificationResponseDto,
  ReservationResponseDto
} from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationQrService {
  private readonly apiUrl = 'http://localhost:8080/api/reservations';

  constructor(@Optional() private http?: HttpClient) {}

  /**
   * Generates a compact, non-sensitive verification payload for a reservation.
   * Excludes any passwords, tokens, or private credentials.
   */
  generateVerificationPayload(reservation: Reservation): string {
    if (!reservation) {
      return '';
    }

    const payloadLines = [
      `RESERVATION_ID=RES-${reservation.id}`,
      `CUSTOMER_ID=CUST-${reservation.customerId}`,
      `RESTAURANT_ID=${reservation.restaurantId}`,
      `TABLE_ID=${reservation.tableId}`,
      `DATE=${reservation.date}`,
      `TIME=${reservation.time}`,
      `GUESTS=${reservation.guests}`,
      `STATUS=${reservation.status}`
    ];

    if (reservation.qrToken) {
      payloadLines.push(`TOKEN=${reservation.qrToken}`);
    }

    return payloadLines.join('\n');
  }

  /**
   * Extracts verification token and reservation ID from scanned raw QR payload text.
   */
  extractVerificationData(payload: string): { reservationId: number | null; token: string | null } {
    if (!payload) {
      return { reservationId: null, token: null };
    }

    let reservationId: number | null = null;
    let token: string | null = null;

    const lines = payload.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('RESERVATION_ID=')) {
        const val = trimmed.replace('RESERVATION_ID=', '').replace('RES-', '').trim();
        reservationId = isNaN(Number(val)) ? null : Number(val);
      } else if (trimmed.startsWith('TOKEN=')) {
        token = trimmed.replace('TOKEN=', '').trim() || null;
      }
    }

    return { reservationId, token };
  }

  /**
   * Generates a scannable QR Code Data URL from the reservation verification payload.
   * Suitable directly as an <img [src]="qrCodeUrl"> source.
   */
  async generateQrData(reservation: Reservation): Promise<string> {
    if (!reservation) {
      return '';
    }

    const payload = this.generateVerificationPayload(reservation);

    const options: QRCode.QRCodeToDataURLOptions = {
      width: 260,
      margin: 2,
      color: {
        dark: '#0D0D0C',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    };

    try {
      const qrLib: any = QRCode;
      const fn = qrLib.toDataURL || qrLib.default?.toDataURL;

      const qrPromise: Promise<string> = (typeof fn === 'function')
        ? fn.call(qrLib, payload, options)
        : QRCode.toDataURL(payload, options);

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('QR generation timed out')), 5000)
      );

      return await Promise.race([qrPromise, timeoutPromise]);
    } catch (err) {
      console.error('Error generating QR code for reservation pass:', err);
      return '';
    }
  }

  /**
   * Verifies a reservation's authenticity and status with the Spring Boot backend.
   * Sends the user's JWT via the auth interceptor.
   * Endpoint: POST http://localhost:8080/api/reservations/verify
   */
  verifyReservation(request: QrVerificationRequestDto): Observable<QrVerificationResponseDto> {
    if (!request || !request.token || !request.token.trim()) {
      return throwError(() => ({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Verification token is required' },
        message: 'Verification token is required'
      }));
    }

    const payload: QrVerificationRequestDto = {
      reservationId: request.reservationId || null,
      token: request.token.trim()
    };

    if (this.http) {
      return this.http.post<QrVerificationResponseDto>(`${this.apiUrl}/verify`, payload).pipe(
        catchError((err) => {
          console.error('[ReservationQrService] Verification failed:', err);
          return throwError(() => err);
        })
      );
    }

    // Fail if HttpClient is not available - never return mock verification success
    return throwError(() => ({
      status: 503,
      statusText: 'Service Unavailable',
      error: { message: 'Verification service is unavailable' },
      message: 'Verification service is unavailable'
    }));
  }

  /**
   * Convenience helper to verify with reservation ID and token directly.
   */
  verifyReservationToken(reservationId: number | null, token: string): Observable<QrVerificationResponseDto> {
    return this.verifyReservation({ reservationId, token });
  }

  /**
   * Parses raw scanned QR string text and verifies it directly with the backend.
   */
  verifyScannedPayload(payload: string): Observable<QrVerificationResponseDto> {
    const { reservationId, token } = this.extractVerificationData(payload);
    if (!token) {
      return throwError(() => ({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'No valid verification token found in QR payload' },
        message: 'No valid verification token found in QR payload'
      }));
    }
    return this.verifyReservation({ reservationId, token });
  }

  /**
   * Checks in a confirmed reservation.
   * IMPORTANT: This operation is strictly restricted to ROLE_STAFF and ROLE_ADMIN on the backend.
   * Customer accounts are forbidden from checking in and will receive HTTP 403 Forbidden.
   * Endpoint: POST http://localhost:8080/api/reservations/check-in
   */
  checkInReservation(request: QrVerificationRequestDto): Observable<ReservationResponseDto> {
    if (!request || !request.token || !request.token.trim()) {
      return throwError(() => ({
        status: 400,
        statusText: 'Bad Request',
        error: { message: 'Verification token is required for check-in' },
        message: 'Verification token is required for check-in'
      }));
    }

    const payload: QrVerificationRequestDto = {
      reservationId: request.reservationId || null,
      token: request.token.trim()
    };

    if (this.http) {
      return this.http.post<ReservationResponseDto>(`${this.apiUrl}/check-in`, payload).pipe(
        catchError((err) => {
          console.error('[ReservationQrService] Check-in failed:', err);
          return throwError(() => err);
        })
      );
    }

    return throwError(() => ({
      status: 403,
      statusText: 'Forbidden',
      error: { message: 'Only staff or admin can check in reservations' },
      message: 'Only staff or admin can check in reservations'
    }));
  }
}

