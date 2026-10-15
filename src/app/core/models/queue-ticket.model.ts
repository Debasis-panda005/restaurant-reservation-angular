export type QueueStatusType =
  | 'TICKET_ISSUED'
  | 'WAITING'
  | 'NOTIFIED'
  | 'TABLE_READY'
  | 'SERVING'
  | 'SEATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CALLED'
  | 'LEFT';

export interface QueueTicket {
  id: number;
  customerId: number;
  customerName?: string;
  restaurantId: number;
  restaurantName?: string;
  reservationId?: number;
  queueNumber?: string;
  ticketNumber: string;
  partySize?: number;
  guests: number;
  peopleAhead: number;
  position?: number;
  estimatedWaitMinutes: number;
  status: QueueStatusType;
  joinedAt?: string;
  updatedAt?: string;
}

export interface QueueJoinRequest {
  restaurantId: number;
  partySize: number;
  reservationId?: number;
}

export interface QueueStatusResponse {
  id: number;
  queueNumber: string;
  ticketNumber?: string;
  customerId: number;
  customerName?: string;
  restaurantId: number;
  restaurantName?: string;
  reservationId?: number;
  partySize: number;
  guests?: number;
  status: QueueStatusType;
  position: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  joinedAt?: string;
  updatedAt?: string;
}
