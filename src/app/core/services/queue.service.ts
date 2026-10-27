import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QueueTicket } from '../models/queue-ticket.model';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  private queueTickets: QueueTicket[] = [
    {
      id: 501,
      customerId: 1,
      restaurantId: 1,
      ticketNumber: 'Q-104',
      guests: 3,
      peopleAhead: 2,
      estimatedWaitMinutes: 15,
      status: 'WAITING'
    }
  ];

  /**
   * Get active queue status for a specific customer.
   */
  getQueueStatus(customerId: number): Observable<QueueTicket | undefined> {
    const activeTicket = this.queueTickets.find(
      q => q.customerId === customerId && (q.status === 'WAITING' || q.status === 'SERVING')
    );
    return of(activeTicket);
  }

  /**
   * Simulate queue progression on refresh.
   */
  advanceQueue(customerId: number): Observable<QueueTicket | undefined> {
    const ticket = this.queueTickets.find(
      q => q.customerId === customerId && (q.status === 'WAITING' || q.status === 'SERVING')
    );
    if (ticket) {
      if (ticket.status === 'WAITING') {
        if (ticket.peopleAhead > 1) {
          ticket.peopleAhead -= 1;
          ticket.estimatedWaitMinutes = Math.max(3, ticket.peopleAhead * 5 + 3);
        } else if (ticket.peopleAhead === 1) {
          ticket.peopleAhead = 0;
          ticket.estimatedWaitMinutes = 2;
        } else if (ticket.peopleAhead === 0) {
          ticket.status = 'SERVING';
          ticket.estimatedWaitMinutes = 0;
        }
      } else if (ticket.status === 'SERVING') {
        ticket.status = 'COMPLETED';
      }
    }
    return of(ticket);
  }

  /**
   * Get all tickets in the system.
   */
  getAllTickets(): Observable<QueueTicket[]> {
    return of(this.queueTickets);
  }

  /**
   * Join the live queue / waitlist.
   */
  joinQueue(ticketData: { customerId: number; restaurantId: number; guests: number }): Observable<QueueTicket> {
    const waitingParties = this.queueTickets.filter(
      q => q.restaurantId === ticketData.restaurantId && q.status === 'WAITING'
    ).length;

    const nextNumber = waitingParties + 101;
    const newTicket: QueueTicket = {
      id: Math.floor(500 + Math.random() * 500),
      customerId: ticketData.customerId,
      restaurantId: ticketData.restaurantId,
      ticketNumber: `Q-${nextNumber}`,
      guests: ticketData.guests,
      peopleAhead: waitingParties,
      estimatedWaitMinutes: waitingParties * 8 + 5,
      status: 'WAITING'
    };

    this.queueTickets.push(newTicket);
    return of(newTicket);
  }

  /**
   * Leave/cancel waiting in queue.
   */
  leaveQueue(ticketId: number): Observable<boolean> {
    const ticket = this.queueTickets.find(q => q.id === ticketId);
    if (ticket) {
      ticket.status = 'CANCELLED';
      return of(true);
    }
    return of(false);
  }
}
