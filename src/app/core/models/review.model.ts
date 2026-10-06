export interface Review {
  id: number;
  restaurantId: number;
  customerId: number;
  reservationId: number;
  rating: number; // 1 | 2 | 3 | 4 | 5
  comment: string;
  createdAt: string;
  customerName?: string;
}
