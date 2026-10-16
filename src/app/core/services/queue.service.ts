import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { QueueTicket, QueueStatusResponse } from '../models/queue-ticket.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private readonly apiUrl = 'http://localhost:8080/api/queue';

  constructor(
    @Optional() private http?: HttpClient,
    @Optional() private notificationService?: NotificationService
  ) {}

  private mockTickets: QueueTicket[] = [
    {
      id: 501,
      customerId: 1,
      restaurantId: 1,
      restaurantName: 'Spice Symphony Bistro',
      ticketNumber: 'Q-104',
      queueNumber: 'Q-104',
      guests: 3,
      partySize: 3,
      peopleAhead: 2,
      position: 3,
      estimatedWaitMinutes: 15,
      status: 'WAITING',
      joinedAt: new Date().toISOString()
    }
  ];

  /**
   * Join the live queue / waitlist.
   */
  joinQueue(ticketData: {
    restaurantId: number;
    guests?: number;
    partySize?: number;
    customerId?: number;
    reservationId?: number;
  }): Observable<QueueTicket> {
    const guests = Number(ticketData.partySize || ticketData.guests || 2);
    const payload: any = {
      restaurantId: Number(ticketData.restaurantId),
      partySize: guests
    };
    if (ticketData.reservationId) {
      payload.reservationId = Number(ticketData.reservationId);
    }

    if (this.http) {
      return this.http.post<QueueStatusResponse>(`${this.apiUrl}/join`, payload).pipe(
        map(dto => this.mapDtoToTicket(dto)),
        catchError(err => throwError(() => err))
      );
    }

    // Mock fallback when HttpClient is not provided (e.g. isolated unit tests)
    const waitingParties = this.mockTickets.filter(
      q => q.restaurantId === ticketData.restaurantId && (q.status === 'WAITING' || q.status === 'NOTIFIED')
    ).length;

    const nextNumber = waitingParties + 101;
    const newTicket: QueueTicket = {
      id: Math.floor(500 + Math.random() * 500),
      customerId: ticketData.customerId || 1,
      restaurantId: ticketData.restaurantId,
      restaurantName: 'Spice Symphony Bistro',
      ticketNumber: `Q-${nextNumber}`,
      queueNumber: `Q-${nextNumber}`,
      guests: guests,
      partySize: guests,
      peopleAhead: waitingParties,
      position: waitingParties + 1,
      estimatedWaitMinutes: waitingParties * 8 + 5,
      status: 'WAITING',
      joinedAt: new Date().toISOString()
    };

    this.mockTickets.push(newTicket);
    return of(newTicket);
  }

  /**
   * Get active queue status for a customer.
   */
  getQueueStatus(customerId?: number): Observable<QueueTicket | undefined> {
    if (this.http) {
      const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
      return this.http.get<QueueStatusResponse[] | QueueStatusResponse | null>(
        `${this.apiUrl}/my/active`,
        { headers }
      ).pipe(
        map(dto => {
          if (Array.isArray(dto)) {
            return dto.length > 0 ? this.mapDtoToTicket(dto[0]) : undefined;
          }
          return dto ? this.mapDtoToTicket(dto) : undefined;
        }),
        catchError(err => {
          // If 404, or HTTP 200 with empty body (SyntaxError), customer has no active ticket
          if (err.status === 404 || (err.status === 200 && err.name === 'HttpErrorResponse')) {
            return of(undefined);
          }
          return throwError(() => err);
        })
      );
    }

    const active = this.mockTickets.find(
      q => (!customerId || q.customerId === customerId) &&
           (q.status === 'WAITING' || q.status === 'NOTIFIED' || q.status === 'SERVING')
    );
    return of(active);
  }

  /**
   * Get all tickets for current customer history.
   */
  getMyQueue(): Observable<QueueTicket[]> {
    if (this.http) {
      return this.http.get<QueueStatusResponse[]>(`${this.apiUrl}/my`).pipe(
        map(dtos => (dtos || []).map(d => this.mapDtoToTicket(d))),
        catchError(err => throwError(() => err))
      );
    }
    return of(this.mockTickets);
  }

  /**
   * Leave / cancel waiting in queue.
   */
  leaveQueue(ticketId: number): Observable<boolean> {
    if (this.http) {
      return this.http.delete<QueueStatusResponse>(`${this.apiUrl}/${ticketId}/leave`).pipe(
        map(() => true),
        catchError(err => throwError(() => err))
      );
    }

    const ticket = this.mockTickets.find(q => q.id === ticketId);
    if (ticket) {
      ticket.status = 'CANCELLED';
      return of(true);
    }
    return of(false);
  }

  /**
   * Simulate or refresh queue advancement.
   */
  advanceQueue(customerId: number): Observable<QueueTicket | undefined> {
    if (this.http) {
      // In live environment, fetch the actual up-to-date queue status from the database
      return this.getQueueStatus(customerId);
    }

    // In unit test environment without HttpClient, simulate mock progression
    const ticket = this.mockTickets.find(
      q => q.customerId === customerId && (q.status === 'WAITING' || q.status === 'SERVING')
    );

    if (ticket) {
      if (ticket.status === 'WAITING') {
        if (ticket.peopleAhead > 1) {
          ticket.peopleAhead -= 1;
          ticket.position = ticket.peopleAhead + 1;
          ticket.estimatedWaitMinutes = Math.max(3, ticket.peopleAhead * 5 + 3);
        } else if (ticket.peopleAhead === 1) {
          ticket.peopleAhead = 0;
          ticket.position = 1;
          ticket.estimatedWaitMinutes = 2;
        } else if (ticket.peopleAhead === 0) {
          ticket.status = 'SERVING';
          ticket.position = 1;
          ticket.estimatedWaitMinutes = 0;
        }
      } else if (ticket.status === 'SERVING') {
        ticket.status = 'COMPLETED';
        ticket.position = 0;
      }
    }
    return of(ticket);
  }

  /**
   * Get queue ticket by ticket ID.
   */
  getTicketById(ticketId: number): Observable<QueueTicket | undefined> {
    if (this.http) {
      const headers = { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' };
      return this.http.get<QueueStatusResponse>(`${this.apiUrl}/${ticketId}/status`, { headers }).pipe(
        map(dto => this.mapDtoToTicket(dto)),
        catchError(err => throwError(() => err))
      );
    }
    const ticket = this.mockTickets.find(q => q.id === ticketId);
    return of(ticket);
  }

  /**
   * Refresh active queue status from backend.
   */
  refreshQueueStatus(customerId?: number): Observable<QueueTicket | undefined> {
    return this.getQueueStatus(customerId);
  }

  getAllTickets(): Observable<QueueTicket[]> {
    return this.getMyQueue();
  }

  private mapDtoToTicket(dto: QueueStatusResponse): QueueTicket {
    const guests = dto.guests !== undefined && dto.guests !== null
      ? Number(dto.guests)
      : (dto.partySize !== undefined && dto.partySize !== null ? Number(dto.partySize) : 1);

    const ticketNum = dto.ticketNumber || dto.queueNumber || `Q-${dto.id}`;

    const peopleAhead = dto.peopleAhead !== undefined && dto.peopleAhead !== null
      ? Number(dto.peopleAhead)
      : Math.max(0, (dto.position !== undefined && dto.position !== null ? Number(dto.position) : 1) - 1);

    const position = dto.position !== undefined && dto.position !== null
      ? Number(dto.position)
      : (peopleAhead > 0 ? peopleAhead + 1 : 1);

    const estimatedWaitMinutes = dto.estimatedWaitMinutes !== undefined && dto.estimatedWaitMinutes !== null
      ? Number(dto.estimatedWaitMinutes)
      : (dto.status === 'NOTIFIED' ? 2 : (peopleAhead * 8 + 5));

    return {
      id: dto.id,
      customerId: dto.customerId,
      customerName: dto.customerName,
      restaurantId: dto.restaurantId,
      restaurantName: dto.restaurantName,
      reservationId: dto.reservationId,
      queueNumber: dto.queueNumber || ticketNum,
      ticketNumber: ticketNum,
      partySize: dto.partySize !== undefined && dto.partySize !== null ? Number(dto.partySize) : guests,
      guests: guests,
      peopleAhead: peopleAhead,
      position: position,
      estimatedWaitMinutes: estimatedWaitMinutes,
      status: dto.status,
      joinedAt: dto.joinedAt,
      updatedAt: dto.updatedAt
    };
  }
}
