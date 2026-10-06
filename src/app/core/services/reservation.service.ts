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
    },
    {
      id: 1003,
      customerId: 1,
      restaurantId: 1,
      tableId: 101,
      date: '2026-09-20',
      time: '19:00',
      guests: 2,
      status: 'COMPLETED'
    },
    {
      id: 1004,
      customerId: 1,
      restaurantId: 2,
      tableId: 202,
      date: '2026-09-12',
      time: '20:30',
      guests: 2,
      status: 'COMPLETED'
    },
    {
      id: 1005,
      customerId: 1,
      restaurantId: 3,
      tableId: 301,
      date: '2026-09-15',
      time: '18:30',
      guests: 2,
      status: 'CANCELLED'
    },
    {
      id: 1006,
      customerId: 1,
      restaurantId: 3,
      tableId: 302,
      date: '2026-09-10',
      time: '20:00',
      guests: 2,
      status: 'COMPLETED'
    },
    {
      id: 1007,
      customerId: 1,
      restaurantId: 3,
      tableId: 301,
      date: '2026-09-02',
      time: '19:30',
      guests: 2,
      status: 'COMPLETED'
    },
    {
      id: 1008,
      customerId: 1,
      restaurantId: 2,
      tableId: 201,
      date: '2026-09-25',
      time: '19:00',
      guests: 4,
      status: 'COMPLETED'
    },
    {
      id: 1009,
      customerId: 1,
      restaurantId: 1,
      tableId: 104,
      date: '2026-09-18',
      time: '20:00',
      guests: 6,
      status: 'COMPLETED'
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
   * Get a reservation by its ID.
   */
  getReservationById(id: number): Observable<Reservation | undefined> {
    const reservation = this.reservations.find(r => r.id === id);
    return of(reservation);
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

  /**
   * Update an existing reservation without altering its identity.
   * Modifies date, time, tableId (and optionally guests/status).
   */
  updateReservation(id: number, updates: Partial<Reservation>): Observable<Reservation> {
    const index = this.reservations.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error(`Reservation #${id} not found.`);
    }

    const current = this.reservations[index];
    const updated: Reservation = {
      ...current,
      ...updates,
      id: current.id,                 // Preserve reservation ID
      customerId: current.customerId, // Preserve customer ID
      restaurantId: current.restaurantId // Preserve restaurant ID
    };

    this.reservations[index] = updated;
    return of(updated);
  }
}

