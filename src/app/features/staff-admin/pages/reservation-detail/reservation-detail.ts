import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  SHARED_MOCK_RESERVATIONS,
  ReservationItem,
  ReservationStatus,
} from '../reservation-list/reservation-list';

export type { ReservationStatus, ReservationItem as ReservationDetailData };

@Component({
  selector: 'app-reservation-detail',
  imports: [RouterLink],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail {
  private readonly route = inject(ActivatedRoute);

  reservation: ReservationItem | null = null;

  constructor() {
    const routeId = this.route.snapshot.paramMap.get('id');
    const matched = SHARED_MOCK_RESERVATIONS.find((res) => res.id === routeId);
    this.reservation = matched ? { ...matched } : null;
  }

  confirmReservation(): void {
    this.updateStatus('Confirmed');
  }

  rejectReservation(): void {
    this.updateStatus('Rejected');
  }

  completeReservation(): void {
    this.updateStatus('Completed');
  }

  private updateStatus(newStatus: ReservationStatus): void {
    if (!this.reservation) {
      return;
    }
    const target = SHARED_MOCK_RESERVATIONS.find(
      (res) => res.id === this.reservation?.id
    );
    if (target) {
      target.status = newStatus;
    }
    this.reservation = {
      ...this.reservation,
      status: newStatus,
    };
  }
}
