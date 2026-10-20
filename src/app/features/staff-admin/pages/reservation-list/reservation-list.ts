import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';

export type ReservationStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Rejected'
  | 'Completed'
  | 'Cancelled'
  | 'Checked-In'
  | 'No-Show';

export interface BackendReservation {
  id: number | string;
  customerId?: number | string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  restaurantId?: number;
  tableId?: number | string;
  tableNumber?: string;
  date?: string;
  time?: string;
  guests?: number;
  numberOfGuests?: number;
  reservationDateTime?: string;
  status?: string;
  specialRequests?: string;
}

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

@Component({
  selector: 'app-reservation-list',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './reservation-list.html',
  styleUrl: './reservation-list.css',
})
export class ReservationList implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly authService = inject(AuthService, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  reservations: ReservationItem[] = [];
  isLoading = true;
  errorMessage = '';

  isCreateFormVisible = false;
  isSubmitting = false;
  createFormErrorMessage = '';

  createReservationForm = new FormGroup({
    restaurantId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    customerId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    numberOfGuests: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    reservationDateTime: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  getActiveRestaurantId(): number | null {
    const fromQuery = this.route?.snapshot?.queryParamMap?.get('restaurantId');
    if (fromQuery && !isNaN(Number(fromQuery)) && Number(fromQuery) > 0) {
      return Number(fromQuery);
    }
    const fromUser = this.authService?.currentUser()?.restaurantId;
    if (fromUser && !isNaN(Number(fromUser)) && Number(fromUser) > 0) {
      return Number(fromUser);
    }
    return null;
  }

  ngOnInit(): void {
    const activeRestId = this.getActiveRestaurantId();
    if (activeRestId) {
      this.createReservationForm.patchValue({ restaurantId: activeRestId });
    }
    this.fetchReservations();
  }

  toggleCreateForm(): void {
    this.isCreateFormVisible = !this.isCreateFormVisible;
    this.createFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  cancelCreateForm(): void {
    this.isCreateFormVisible = false;
    this.createFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  onCreateReservationSubmit(): void {
    if (this.createReservationForm.invalid || this.isSubmitting) {
      this.createReservationForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.createFormErrorMessage = '';
    this.cdr.markForCheck();

    const raw = this.createReservationForm.getRawValue();
    let dt = raw.reservationDateTime?.trim() || '';
    if (dt.length === 16) {
      dt = `${dt}:00`;
    }

    const payload = {
      restaurantId: Number(raw.restaurantId),
      customerId: Number(raw.customerId),
      numberOfGuests: Number(raw.numberOfGuests),
      reservationDateTime: dt,
    };

    this.http
      .post<BackendReservation>('/api/staff/reservations', payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          const currentRestaurantId =
            this.createReservationForm.value.restaurantId ??
            this.getActiveRestaurantId();
          this.createReservationForm.reset({
            restaurantId: currentRestaurantId ?? null,
            customerId: null,
            numberOfGuests: null,
            reservationDateTime: '',
          });
          this.isCreateFormVisible = false;
          this.createFormErrorMessage = '';
          this.cdr.markForCheck();
          this.fetchReservations();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to create reservation:', error);
          if (error?.status === 404) {
            this.createFormErrorMessage =
              'Restaurant not found. Please verify the Restaurant ID.';
          } else if (error?.status === 401) {
            this.createFormErrorMessage =
              'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.createFormErrorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.createFormErrorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else if (typeof error?.error?.message === 'string') {
            this.createFormErrorMessage = error.error.message;
          } else {
            this.createFormErrorMessage =
              'Failed to create reservation. Please verify the entered details.';
          }
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  fetchReservations(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const restaurantId = this.getActiveRestaurantId();
    const url = restaurantId
      ? `/api/staff/reservations/restaurant/${restaurantId}`
      : '/api/staff/reservations';

    this.http
      .get<BackendReservation[]>(url)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? data : [];
          this.reservations = list.map((res) =>
            this.mapBackendReservation(res)
          );
          this.isLoading = false;
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to load reservations:', error);
          if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 404) {
            this.errorMessage = 'Reservations not found.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage =
              'Unable to load reservations. Check that the backend is running.';
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  private mapBackendReservation(data: BackendReservation): ReservationItem {
    let date = '';
    let time = '';

    if (data.reservationDateTime) {
      const parts = data.reservationDateTime.split('T');
      if (parts[0]) {
        date = parts[0];
      }
      if (parts[1]) {
        time = parts[1].substring(0, 5);
      }
    }

    if (!date && data.date) {
      date = data.date;
    }
    if (!time && data.time) {
      time = data.time;
    }

    return {
      id: String(data.id),
      customerName:
        data.customerName ||
        (data.customerId ? `Customer #${data.customerId}` : 'Unknown Customer'),
      customerEmail: data.customerEmail || '—',
      customerPhone: data.customerPhone || '—',
      tableNumber:
        data.tableNumber ||
        (data.tableId ? `T-${data.tableId}` : '—'),
      date,
      time,
      guests: data.numberOfGuests ?? data.guests ?? 1,
      status: this.normalizeStatus(data.status),
      specialRequests: data.specialRequests || '',
    };
  }

  private normalizeStatus(status?: string): ReservationStatus {
    if (!status) return 'Pending';
    const s = status.toUpperCase();
    switch (s) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'REJECTED':
        return 'Rejected';
      case 'COMPLETED':
        return 'Completed';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      case 'CHECKED_IN':
      case 'CHECKED-IN':
        return 'Checked-In';
      case 'NO_SHOW':
      case 'NO-SHOW':
        return 'No-Show';
      case 'PENDING':
      default:
        return 'Pending';
    }
  }
}
