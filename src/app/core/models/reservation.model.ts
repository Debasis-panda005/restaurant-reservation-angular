export interface Reservation {
  id: number;
  customerId: number;
  restaurantId: number;
  tableId: number;
  date: string;
  time: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  tableNumber?: string;
  seatingType?: string;
  restaurantName?: string;
  qrToken?: string;
}

export interface CreateReservationDto {
  customerId: number;
  restaurantId: number;
  tableId: number;
  reservationDate: string;
  reservationTime: string;
  guests: number;
  status?: string;
}

export interface UpdateReservationDto {
  customerId?: number;
  restaurantId?: number;
  tableId?: number;
  reservationDate?: string;
  reservationTime?: string;
  guests?: number;
  status?: string;
}

export interface ReservationResponseDto {
  id: number;
  customerId?: number;
  customer?: { id: number; fullName?: string; email?: string };
  restaurantId?: number;
  restaurant?: { id: number; name?: string };
  tableId?: number;
  table?: { id: number; tableNumber?: string; capacity?: number };
  reservationDate?: string;
  date?: string;
  reservationTime?: string;
  time?: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED';
  qrToken?: string;
  createdAt?: string;
}
