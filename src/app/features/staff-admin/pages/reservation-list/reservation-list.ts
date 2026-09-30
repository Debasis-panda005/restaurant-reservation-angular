import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Rejected'
  | 'Completed';

export interface ReservationItem {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  tableNumber: string;
  date: string;
  time: string;
  guests: number;
  status: ReservationStatus;
  specialRequests?: string;
}

export const SHARED_MOCK_RESERVATIONS: ReservationItem[] = [
  {
    id: 'RES-1001',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.jenkins@example.com',
    customerPhone: '+1 (555) 123-4567',
    tableNumber: 'T-04',
    date: '2026-10-01',
    time: '18:30',
    guests: 4,
    status: 'Confirmed',
    specialRequests: 'Booth seating requested.',
  },
  {
    id: 'RES-1002',
    customerName: 'Michael Chang',
    customerEmail: 'michael.chang@example.com',
    customerPhone: '+1 (555) 234-5678',
    tableNumber: 'T-01',
    date: '2026-10-01',
    time: '19:00',
    guests: 2,
    status: 'Pending',
    specialRequests: 'Window seat preferred, celebrating anniversary.',
  },
  {
    id: 'RES-1003',
    customerName: 'Emma Watson',
    customerEmail: 'emma.watson@example.com',
    customerPhone: '+1 (555) 345-6789',
    tableNumber: 'T-07',
    date: '2026-10-01',
    time: '19:30',
    guests: 6,
    status: 'Confirmed',
    specialRequests: 'Birthday celebration; bringing own cake.',
  },
  {
    id: 'RES-1004',
    customerName: 'David Miller',
    customerEmail: 'david.miller@example.com',
    customerPhone: '+1 (555) 456-7890',
    tableNumber: 'T-02',
    date: '2026-10-01',
    time: '20:00',
    guests: 2,
    status: 'Rejected',
    specialRequests: 'Quiet corner preferred.',
  },
  {
    id: 'RES-1005',
    customerName: 'Olivia Taylor',
    customerEmail: 'olivia.taylor@example.com',
    customerPhone: '+1 (555) 567-8901',
    tableNumber: 'T-05',
    date: '2026-10-01',
    time: '17:30',
    guests: 5,
    status: 'Completed',
    specialRequests: 'High chair needed for child.',
  },
];

@Component({
  selector: 'app-reservation-list',
  imports: [RouterLink],
  templateUrl: './reservation-list.html',
  styleUrl: './reservation-list.css',
})
export class ReservationList {
  readonly reservations: ReservationItem[] = SHARED_MOCK_RESERVATIONS;
}
