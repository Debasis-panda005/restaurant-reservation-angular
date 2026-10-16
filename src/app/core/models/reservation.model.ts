export interface Reservation {
  id: number;
  customerId: number;
  restaurantId: number;
  tableId: number;
  date: string;
  time: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'CHECKED_IN' | string;
  tableNumber?: string;
  seatingType?: string;
  restaurantName?: string;
  customerName?: string;
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
  customerName?: string;
  restaurantId?: number;
  restaurant?: { id: number; name?: string };
  restaurantName?: string;
  tableId?: number;
  table?: { id: number; tableNumber?: string; capacity?: number; seatingType?: string };
  tableNumber?: string;
  seatingType?: string;
  reservationDate?: string;
  date?: string;
  reservationTime?: string;
  time?: string;
  guests: number;
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'CHECKED_IN' | string;
  qrToken?: string;
  createdAt?: string;
}

export interface QrVerificationRequestDto {
  reservationId?: number | null;
  token: string;
}

export interface QrVerificationResponseDto {
  valid: boolean;
  reservationId?: number;
  customerName?: string;
  restaurantName?: string;
  tableNumber?: string;
  reservationDate?: string;
  reservationTime?: string;
  guests?: number;
  status?: 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'CHECKED_IN' | string;
  message?: string;
}

