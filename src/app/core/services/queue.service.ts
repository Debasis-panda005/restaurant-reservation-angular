import { Injectable, Optional } from '@angular/core';
import { Observable, of } from 'rxjs';
import { QueueTicket } from '../models/queue-ticket.model';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class QueueService {
  constructor(@Optional() private notificationService?: NotificationService) {}
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

          if (this.notificationService) {
            this.notificationService.addNotification({
              id: 0,
              customerId: ticket.customerId,
              type: 'QUEUE_UPDATE',
              title: 'Queue Status Updated',
              message: `You are now #${ticket.peopleAhead + 1} in the queue at the restaurant.`,
              restaurantId: ticket.restaurantId,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              read: false
            }).subscribe();
          }
        } else if (ticket.peopleAhead === 1) {
          ticket.peopleAhead = 0;
          ticket.estimatedWaitMinutes = 2;

          if (this.notificationService) {
            this.notificationService.addNotification({
              id: 0,
              customerId: ticket.customerId,
              type: 'QUEUE_UPDATE',
              title: 'Queue Status Updated',
              message: 'You are next in line! Please stay near the entrance.',
              restaurantId: ticket.restaurantId,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              read: false
            }).subscribe();
          }
        } else if (ticket.peopleAhead === 0) {
          ticket.status = 'SERVING';
          ticket.estimatedWaitMinutes = 0;

          if (this.notificationService) {
            this.notificationService.addNotification({
              id: 0,
              customerId: ticket.customerId,
              type: 'TABLE_READY',
              title: 'Your Table Is Ready',
              message: 'Your table is ready. Please proceed to the restaurant concierge.',
              restaurantId: ticket.restaurantId,
              createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
              read: false
            }).subscribe();
          }
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

    if (this.notificationService) {
      this.notificationService.addNotification({
        id: 0,
        customerId: newTicket.customerId,
        type: 'QUEUE_UPDATE',
        title: 'Queue Status Updated',
        message: `You have joined the queue. Your priority pass token is #${newTicket.ticketNumber}.`,
        restaurantId: newTicket.restaurantId,
        createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        read: false
      }).subscribe();
    }

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
