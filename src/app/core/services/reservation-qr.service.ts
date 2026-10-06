import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';
import { Reservation } from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationQrService {

  /**
   * Generates a compact, non-sensitive verification payload for a reservation.
   * Excludes any passwords, tokens, or private credentials.
   */
  generateVerificationPayload(reservation: Reservation): string {
    if (!reservation) {
      return '';
    }

    return [
      `RESERVATION_ID=RES-${reservation.id}`,
      `CUSTOMER_ID=CUST-${reservation.customerId}`,
      `RESTAURANT_ID=${reservation.restaurantId}`,
      `TABLE_ID=${reservation.tableId}`,
      `DATE=${reservation.date}`,
      `TIME=${reservation.time}`,
      `GUESTS=${reservation.guests}`,
      `STATUS=${reservation.status}`
    ].join('\n');
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
}
