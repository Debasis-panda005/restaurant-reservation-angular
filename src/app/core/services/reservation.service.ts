import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Reservation } from '../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private reservations: Reservation[] = [
    {
      id: 1001,
      customerId: 1,
      restaurantId: 1,
      tableId: 102,
      date: '2026-09-30',
      time: '19:30',
      guests: 4,
      status: 'CONFIRMED'
    },
    {
      id: 1002,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-10-02',
      time: '20:00',
      guests: 2,
      status: 'PENDING'
    }
  ];

  /**
   * Get all reservations.
   */
  getReservations(): Observable<Reservation[]> {
    return of(this.reservations);
  }

  /**
   * Get reservations for a specific customer.
   */
  getReservationsByCustomerId(customerId: number): Observable<Reservation[]> {
    const customerReservations = this.reservations.filter(r => r.customerId === customerId);
    return of(customerReservations);
  }

  /**
   * Create and store a new reservation.
   */
  createReservation(reservationData: Omit<Reservation, 'id'>): Observable<Reservation> {
    const newReservation: Reservation = {
      ...reservationData,
      id: Math.floor(1000 + Math.random() * 9000)
    };

    this.reservations.push(newReservation);
    return of(newReservation);
  }

  /**
   * Cancel an existing reservation by ID.
   */
  cancelReservation(id: number): Observable<boolean> {
    const reservation = this.reservations.find(r => r.id === id);
    if (reservation) {
      reservation.status = 'CANCELLED';
      return of(true);
    }
    return of(false);
  }
}
