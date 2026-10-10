import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Reservation, CreateReservationDto, UpdateReservationDto, ReservationResponseDto } from '../models/reservation.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private readonly apiUrl = 'http://localhost:8080/api/reservations';

  constructor(
    @Optional() private http?: HttpClient,
    @Optional() private notificationService?: NotificationService
  ) {}
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
   * Get reservations for a specific customer from backend API.
   */
  getReservationsByCustomerId(customerId: number): Observable<Reservation[]> {
    const numericCustomerId = Number(customerId);

    if (this.http) {
      return this.http.get<ReservationResponseDto[]>(`${this.apiUrl}/customer/${numericCustomerId}`).pipe(
        map((response: any) => {
          const dtos: ReservationResponseDto[] = Array.isArray(response)
            ? response
            : (response?.data || response?.content || []);
          const mapped = dtos.map((dto) => this.mapDtoToReservation(dto));

          // Sync into local array cache
          mapped.forEach((res) => {
            const idx = this.reservations.findIndex((r) => r.id === res.id);
            if (idx >= 0) {
              this.reservations[idx] = res;
            } else {
              this.reservations.unshift(res);
            }
          });
          return mapped;
        }),
        catchError((err) => {
          console.error(`[ReservationService] Failed to load reservations for customer #${numericCustomerId} from API:`, err);
          const local = this.reservations.filter((r) => r.customerId === numericCustomerId);
          return of(local);
        })
      );
    }

    const customerReservations = this.reservations.filter((r) => r.customerId === numericCustomerId);
    return of(customerReservations);
  }

  /**
   * Get reservations for a specific restaurant and optional date from backend API.
   */
  getReservationsByRestaurantId(restaurantId: number, date?: string): Observable<Reservation[]> {
    const numericRestaurantId = Number(restaurantId);

    if (this.http) {
      const url = date
        ? `${this.apiUrl}/restaurant/${numericRestaurantId}?date=${encodeURIComponent(date)}`
        : `${this.apiUrl}/restaurant/${numericRestaurantId}`;

      return this.http.get<ReservationResponseDto[]>(url).pipe(
        map((response: any) => {
          const dtos: ReservationResponseDto[] = Array.isArray(response)
            ? response
            : (response?.data || response?.content || []);
          const mapped = dtos.map((dto) => this.mapDtoToReservation(dto));

          // Sync into local array cache
          mapped.forEach((res) => {
            const idx = this.reservations.findIndex((r) => r.id === res.id);
            if (idx >= 0) {
              this.reservations[idx] = res;
            } else {
              this.reservations.unshift(res);
            }
          });

          return mapped;
        }),
        catchError((err) => {
          console.error(`[ReservationService] Failed to load reservations for restaurant #${numericRestaurantId} from API:`, err);
          const local = this.reservations.filter((r) => {
            const matchRestaurant = r.restaurantId === numericRestaurantId;
            const matchDate = date ? r.date === date : true;
            return matchRestaurant && matchDate;
          });
          return of(local);
        })
      );
    }

    const local = this.reservations.filter((r) => {
      const matchRestaurant = r.restaurantId === numericRestaurantId;
      const matchDate = date ? r.date === date : true;
      return matchRestaurant && matchDate;
    });
    return of(local);
  }

  /**
   * Get a reservation by its ID from backend API.
   */
  getReservationById(id: number): Observable<Reservation | undefined> {
    const numericId = Number(id);

    if (this.http) {
      return this.http.get<ReservationResponseDto>(`${this.apiUrl}/${numericId}`).pipe(
        map((dto) => {
          const mapped = this.mapDtoToReservation(dto);
          const idx = this.reservations.findIndex((r) => r.id === mapped.id);
          if (idx >= 0) {
            this.reservations[idx] = mapped;
          } else {
            this.reservations.unshift(mapped);
          }
          return mapped;
        }),
        catchError((err) => {
          console.error(`[ReservationService] Failed to load reservation #${numericId} from API:`, err);
          const local = this.reservations.find((r) => r.id === numericId);
          return of(local);
        })
      );
    }

    const reservation = this.reservations.find((r) => r.id === numericId);
    return of(reservation);
  }

  /**
   * Helper to format time strings (e.g. '06:30 PM' or '19:30') into Spring Boot LocalTime 'HH:mm:ss' format.
   */
  public formatTimeTo24h(timeStr: string): string {
    if (!timeStr) return '19:00:00';
    const trimmed = timeStr.trim().toUpperCase();
    if (trimmed.includes('AM') || trimmed.includes('PM')) {
      const isPm = trimmed.includes('PM');
      const clean = trimmed.replace('AM', '').replace('PM', '').trim();
      const parts = clean.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts.length > 1 ? parseInt(parts[1], 10) : 0;
      if (isPm && hours < 12) hours += 12;
      if (!isPm && hours === 12) hours = 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }
    if (trimmed.length === 5) {
      return `${trimmed}:00`;
    }
    return trimmed;
  }

  /**
   * Map backend reservation response to frontend Reservation model.
   */
  public mapDtoToReservation(dto: any, fallback: Partial<Reservation> = {}): Reservation {
    return {
      id: Number(dto.id),
      customerId: Number(dto.customerId || dto.customer?.id || fallback.customerId || 1),
      restaurantId: Number(dto.restaurantId || dto.restaurant?.id || fallback.restaurantId || 1),
      tableId: Number(dto.tableId || dto.table?.id || fallback.tableId || 0),
      date: dto.reservationDate || dto.date || fallback.date || '',
      time: dto.reservationTime || dto.time || fallback.time || '',
      guests: Number(dto.guests || fallback.guests || 2),
      status: dto.status || fallback.status || 'CONFIRMED',
      tableNumber: dto.table?.tableNumber || fallback.tableNumber,
      seatingType: dto.table?.seatingType || fallback.seatingType,
      restaurantName: dto.restaurant?.name || fallback.restaurantName,
      qrToken: dto.qrToken || fallback.qrToken
    };
  }

  private sendConfirmationNotification(res: Reservation): void {
    if (this.notificationService) {
      this.notificationService.addNotification({
        id: 0,
        customerId: res.customerId,
        type: 'RESERVATION_CONFIRMED',
        title: 'Reservation Confirmed',
        message: `Your reservation #${res.id} is confirmed for ${res.date} at ${res.time}.`,
        reservationId: res.id,
        restaurantId: res.restaurantId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false
      }).subscribe();
    }
  }

  /**
   * Create and store a new reservation.
   * If HttpClient is present, dispatches HTTP POST to the Spring Boot REST API.
   * On API failure, propagates error without falling back to fake confirmation data.
   */
  createReservation(reservationData: Omit<Reservation, 'id'>): Observable<Reservation> {
    if (this.http) {
      const backendPayload: CreateReservationDto = {
        customerId: reservationData.customerId,
        restaurantId: reservationData.restaurantId,
        tableId: reservationData.tableId,
        reservationDate: reservationData.date,
        reservationTime: this.formatTimeTo24h(reservationData.time),
        guests: reservationData.guests,
        status: reservationData.status || 'CONFIRMED'
      };

      return this.http.post<ReservationResponseDto>(this.apiUrl, backendPayload).pipe(
        map((response) => {
          const created = this.mapDtoToReservation(response, reservationData);
          this.reservations.unshift(created);
          this.sendConfirmationNotification(created);
          return created;
        }),
        catchError((err) => {
          console.error('[ReservationService] Failed to create reservation via backend API:', err);
          return throwError(() => err);
        })
      );
    }

    // Isolated test environment fallback when HttpClient is not provided in TestBed
    const newReservation: Reservation = {
      ...reservationData,
      id: Math.floor(1000 + Math.random() * 9000)
    };

    this.reservations.unshift(newReservation);
    this.sendConfirmationNotification(newReservation);
    return of(newReservation);
  }

  /**
   * Cancel an existing reservation by ID.
   * If HttpClient is present, sends HTTP PUT to Spring Boot /api/reservations/{id}/cancel.
   */
  cancelReservation(id: number): Observable<boolean> {
    const numericId = Number(id);

    if (this.http) {
      return this.http.put<ReservationResponseDto>(`${this.apiUrl}/${numericId}/cancel`, {}).pipe(
        map((response) => {
          const local = this.reservations.find((r) => r.id === numericId);
          if (local) {
            local.status = 'CANCELLED';
          }
          const customerId = response?.customerId || local?.customerId || 1;
          const restaurantId = response?.restaurantId || local?.restaurantId || 1;

          this.sendCancellationNotification({
            id: numericId,
            customerId,
            restaurantId,
          });

          return true;
        }),
        catchError((err) => {
          console.error(`[ReservationService] Failed to cancel reservation #${numericId} via API:`, err);
          return throwError(() => err);
        })
      );
    }

    const reservation = this.reservations.find((r) => r.id === numericId);
    if (reservation) {
      reservation.status = 'CANCELLED';

      this.sendCancellationNotification({
        id: reservation.id,
        customerId: reservation.customerId,
        restaurantId: reservation.restaurantId,
      });

      return of(true);
    }
    return of(false);
  }

  private sendCancellationNotification(res: { id: number; customerId: number; restaurantId: number }): void {
    if (this.notificationService) {
      this.notificationService.addNotification({
        id: 0,
        customerId: res.customerId,
        type: 'RESERVATION_CANCELLED',
        title: 'Reservation Cancelled',
        message: `Your reservation #${res.id} has been cancelled.`,
        reservationId: res.id,
        restaurantId: res.restaurantId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false,
      }).subscribe();
    }
  }

  /**
   * Update an existing reservation without altering its identity.
   * If HttpClient is present, dispatches HTTP PUT to Spring Boot REST API.
   * Modifies date, time, tableId (and optionally guests/status).
   */
  updateReservation(id: number, updates: Partial<Reservation>): Observable<Reservation> {
    const numericId = Number(id);
    const index = this.reservations.findIndex((r) => r.id === numericId);
    const current = index >= 0 ? this.reservations[index] : null;

    if (this.http) {
      const backendPayload: UpdateReservationDto = {
        customerId: updates.customerId || current?.customerId || 1,
        restaurantId: updates.restaurantId || current?.restaurantId || 1,
        tableId: updates.tableId || current?.tableId,
        reservationDate: updates.date || current?.date,
        reservationTime: updates.time
          ? this.formatTimeTo24h(updates.time)
          : (current?.time ? this.formatTimeTo24h(current.time) : undefined),
        guests: updates.guests || current?.guests || 2,
        status: updates.status || current?.status || 'CONFIRMED'
      };

      return this.http.put<ReservationResponseDto>(`${this.apiUrl}/${numericId}`, backendPayload).pipe(
        map((response) => {
          const updated = this.mapDtoToReservation(response, {
            ...current,
            ...updates,
            id: numericId
          });

          // Sync into local array cache
          if (index >= 0) {
            this.reservations[index] = updated;
          } else {
            this.reservations.unshift(updated);
          }

          if (this.notificationService) {
            this.notificationService.addNotification({
              id: 0,
              customerId: updated.customerId,
              type: 'RESERVATION_RESCHEDULED',
              title: 'Reservation Rescheduled',
              message: `Your reservation #${updated.id} has been successfully rescheduled to ${updated.date} at ${updated.time}.`,
              reservationId: updated.id,
              restaurantId: updated.restaurantId,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              read: false
            }).subscribe();
          }

          return updated;
        }),
        catchError((err) => {
          console.error(`[ReservationService] Failed to update reservation #${numericId} via backend API:`, err);
          return throwError(() => err);
        })
      );
    }

    if (index === -1) {
      throw new Error(`Reservation #${numericId} not found.`);
    }

    const updated: Reservation = {
      ...current!,
      ...updates,
      id: current!.id,                 // Preserve reservation ID
      customerId: current!.customerId, // Preserve customer ID
      restaurantId: current!.restaurantId // Preserve restaurant ID
    };

    this.reservations[index] = updated;

    if (this.notificationService) {
      this.notificationService.addNotification({
        id: 0,
        customerId: updated.customerId,
        type: 'RESERVATION_RESCHEDULED',
        title: 'Reservation Rescheduled',
        message: `Your reservation #${updated.id} has been successfully rescheduled to ${updated.date} at ${updated.time}.`,
        reservationId: updated.id,
        restaurantId: updated.restaurantId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false
      }).subscribe();
    }

    return of(updated);
  }
}

