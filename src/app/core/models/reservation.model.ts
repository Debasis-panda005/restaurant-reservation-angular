export interface Reservation {
  id: number;
  customerId: number;
  restaurantId: number;
  tableId: number;
  date: string;
  time: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
}
