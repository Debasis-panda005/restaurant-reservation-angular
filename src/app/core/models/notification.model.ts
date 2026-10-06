export interface Notification {
  id: number;
  customerId: number;
  type:
    | 'RESERVATION_CONFIRMED'
    | 'RESERVATION_RESCHEDULED'
    | 'RESERVATION_CANCELLED'
    | 'QUEUE_UPDATE'
    | 'TABLE_READY'
    | 'REVIEW_SUBMITTED'
    | 'SYSTEM';

  title: string;
  message: string;
  reservationId?: number;
  restaurantId?: number;
  createdAt: string;
  read: boolean;
}
