export interface QueueTicket {
  id: number;
  customerId: number;
  restaurantId: number;
  ticketNumber: string;
  guests: number;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  status: 'WAITING' | 'SERVING' | 'COMPLETED' | 'CALLED' | 'SEATED' | 'CANCELLED';
}
