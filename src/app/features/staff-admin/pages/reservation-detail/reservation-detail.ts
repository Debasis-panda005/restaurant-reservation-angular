import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ReservationItem,
  ReservationStatus,
  BackendReservation,
} from '../reservation-list/reservation-list';

export type { ReservationStatus, ReservationItem as ReservationDetailData };

@Component({
  selector: 'app-reservation-detail',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './reservation-detail.html',
  styleUrl: './reservation-detail.css',
})
export class ReservationDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  reservation: ReservationItem | null = null;
  rawReservation: BackendReservation | null = null;
  isLoading = true;
  errorMessage = '';
  isUpdating = false;

  isEditing = false;
  isEditSubmitting = false;
  editFormErrorMessage = '';

  isDeletePromptVisible = false;
  isDeleting = false;

  editReservationForm = new FormGroup({
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
    const routeId = this.route.snapshot.paramMap.get('id');
    if (!routeId) {
      this.reservation = null;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.fetchReservation(routeId);
  }

  fetchReservation(id: string): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.http
      .get<BackendReservation>(
        `/api/staff/reservations/${id}`
      )
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          if (data) {
            this.rawReservation = data;
            this.reservation = this.mapBackendReservation(data);
          } else {
            this.rawReservation = null;
            this.reservation = null;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(`Failed to load reservation ${id}:`, error);
          if (error.status === 404) {
            this.rawReservation = null;
            this.reservation = null;
          } else if (error.status === 401) {
            this.errorMessage =
              'Authentication required. Please log in again.';
          } else if (error.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error.status === 0) {
            this.errorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage =
              'Unable to load reservation details. Check that the backend is running.';
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  startEdit(): void {
    if (!this.reservation) return;
    this.isEditing = true;
    this.isDeletePromptVisible = false;
    this.editFormErrorMessage = '';

    let dt = '';
    if (this.rawReservation?.reservationDateTime) {
      dt = this.rawReservation.reservationDateTime.substring(0, 16);
    } else if (this.reservation.date && this.reservation.time) {
      dt = `${this.reservation.date}T${this.reservation.time.substring(0, 5)}`;
    }

    this.editReservationForm.setValue({
      restaurantId:
        this.rawReservation?.restaurantId ??
        this.getActiveRestaurantId() ??
        null,
      customerId: this.rawReservation?.customerId
        ? Number(this.rawReservation.customerId)
        : null,
      numberOfGuests:
        this.rawReservation?.numberOfGuests ??
        this.rawReservation?.guests ??
        this.reservation.guests ??
        1,
      reservationDateTime: dt,
    });
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  onEditReservationSubmit(): void {
    if (!this.reservation) return;

    if (this.editReservationForm.invalid || this.isEditSubmitting) {
      this.editReservationForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isEditSubmitting = true;
    this.editFormErrorMessage = '';
    this.cdr.markForCheck();

    const raw = this.editReservationForm.getRawValue();
    let dt = raw.reservationDateTime?.trim() || '';
    if (dt.length === 16) {
      dt = `${dt}:00`;
    }

    const currentStatus =
      this.rawReservation?.status ||
      this.reservation.status.toUpperCase();

    const payload = {
      restaurantId: Number(raw.restaurantId),
      customerId: Number(raw.customerId),
      numberOfGuests: Number(raw.numberOfGuests),
      reservationDateTime: dt,
      status: currentStatus,
    };

    const id = this.reservation.id;

    this.http
      .put<BackendReservation>(`/api/staff/reservations/${id}`, payload)
      .pipe(
        finalize(() => {
          this.isEditSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (updated) => {
          if (updated) {
            this.rawReservation = updated;
            this.reservation = this.mapBackendReservation(updated);
          }
          this.isEditing = false;
          this.editFormErrorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to update reservation ${id}:`, error);
          if (error?.status === 404) {
            this.editFormErrorMessage =
              'Restaurant or reservation not found. Please verify the Restaurant ID.';
          } else if (error?.status === 401) {
            this.editFormErrorMessage =
              'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.editFormErrorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.editFormErrorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else if (typeof error?.error?.message === 'string') {
            this.editFormErrorMessage = error.error.message;
          } else {
            this.editFormErrorMessage =
              'Failed to update reservation. Please verify the entered details.';
          }
          this.isEditSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  promptDelete(): void {
    this.isDeletePromptVisible = true;
    this.isEditing = false;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.isDeletePromptVisible = false;
    this.cdr.markForCheck();
  }

  confirmDelete(): void {
    this.deleteReservation();
  }

  deleteReservation(): void {
    if (!this.reservation || this.isDeleting) {
      return;
    }

    this.isDeleting = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const id = this.reservation.id;

    this.http
      .delete<void>(`/api/staff/reservations/${id}`)
      .pipe(
        finalize(() => {
          this.isDeleting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.isDeletePromptVisible = false;
          this.cdr.markForCheck();
          this.router.navigate(['/staff/reservations']);
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to delete reservation ${id}:`, error);
          if (error?.status === 404) {
            this.errorMessage = `Reservation #${id} was not found on the server.`;
          } else if (error?.status === 401) {
            this.errorMessage =
              'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage = `Failed to delete reservation #${id}. Check backend connection.`;
          }
          this.isDeletePromptVisible = false;
          this.isDeleting = false;
          this.cdr.markForCheck();
        },
      });
  }

  confirmReservation(): void {
    this.updateStatus('CONFIRMED', 'Confirmed');
  }

  rejectReservation(): void {
    this.updateStatus('REJECTED', 'Rejected');
  }

  completeReservation(): void {
    this.updateStatus('COMPLETED', 'Completed');
  }

  cancelReservation(): void {
    this.updateStatus('CANCELLED', 'Cancelled');
  }

  private updateStatus(
    backendStatus: string,
    displayStatus: ReservationStatus
  ): void {
    if (!this.reservation || this.isUpdating) {
      return;
    }
    this.isUpdating = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const restaurantId =
      this.rawReservation?.restaurantId ??
      this.getActiveRestaurantId() ??
      1;
    const customerId = this.rawReservation?.customerId
      ? Number(this.rawReservation.customerId)
      : 1;
    const numberOfGuests =
      this.rawReservation?.numberOfGuests ??
      this.rawReservation?.guests ??
      this.reservation.guests ??
      1;

    let reservationDateTime = this.rawReservation?.reservationDateTime;
    if (!reservationDateTime) {
      const d = this.reservation.date || '2026-10-01';
      const t = this.reservation.time
        ? this.reservation.time.length === 5
          ? `${this.reservation.time}:00`
          : this.reservation.time
        : '18:00:00';
      reservationDateTime = `${d}T${t}`;
    }

    const payload = {
      restaurantId,
      customerId,
      numberOfGuests,
      reservationDateTime,
      status: backendStatus,
    };

    this.http
      .put<BackendReservation>(
        `/api/staff/reservations/${this.reservation.id}`,
        payload
      )
      .pipe(
        finalize(() => {
          this.isUpdating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (updated) => {
          if (this.reservation) {
            this.reservation.status = displayStatus;
          }
          if (updated) {
            this.rawReservation = updated;
          }
          this.isUpdating = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error(
            `Failed to update reservation status to ${backendStatus}:`,
            error
          );
          if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else {
            this.errorMessage = `Failed to update status to ${displayStatus}. Check backend connection.`;
          }
          this.isUpdating = false;
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
