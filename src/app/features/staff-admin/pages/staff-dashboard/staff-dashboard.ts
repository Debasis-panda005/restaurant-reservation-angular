
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, finalize } from 'rxjs';

export interface DashboardStats {
  totalReservations: number;
  pendingReservations: number;
  availableTables: number;
  currentQueueCount: number;
}

export interface BackendReservation {
  id?: number | string;
  status?: string;
  [key: string]: any;
}

export interface BackendTable {
  id?: number;
  status?: string;
  active?: boolean;
  available?: boolean;
  [key: string]: any;
}

export interface BackendQueueItem {
  id?: number | string;
  status?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-staff-dashboard',
  imports: [RouterLink],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.css',
})
export class StaffDashboard implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  isLoading = true;
  errorMessage = '';

  totalReservations = 0;
  pendingReservations = 0;
  currentQueue = 0;
  availableTables = 0;

  ngOnInit(): void {
    this.fetchDashboardStats();
  }

  fetchDashboardStats(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const restaurantId = this.route?.snapshot?.queryParamMap?.get('restaurantId');
    const reservationsUrl = restaurantId
      ? `/api/staff/reservations/restaurant/${restaurantId}`
      : '/api/staff/reservations';
    const tablesUrl = restaurantId
      ? `/api/staff/tables/restaurant/${restaurantId}`
      : '/api/staff/tables';
    const queueUrl = restaurantId
      ? `/api/staff/queue/restaurant/${restaurantId}`
      : '/api/staff/queue';

    forkJoin({
      reservations: this.http.get<BackendReservation[]>(reservationsUrl),
      tables: this.http.get<BackendTable[]>(tablesUrl),
      queue: this.http.get<BackendQueueItem[]>(queueUrl),
    })
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: ({ reservations, tables, queue }) => {
          const resList = Array.isArray(reservations) ? reservations : [];
          const tableList = Array.isArray(tables) ? tables : [];
          const queueList = Array.isArray(queue) ? queue : [];

          this.totalReservations = resList.length;
          this.pendingReservations = resList.filter(
            (r) => (r?.status || '').toUpperCase() === 'PENDING'
          ).length;

          this.availableTables = tableList.filter((table) => {
            if (!table) return false;
            if (table.status) {
              return table.status.toUpperCase() === 'AVAILABLE';
            }
            return table.active === true || table.available === true;
          }).length;

          this.currentQueue = queueList.filter((item) => {
            if (!item) return false;
            const status = (item.status || 'WAITING').toUpperCase();
            return status === 'WAITING' || status === 'CALLED';
          }).length;

          this.errorMessage = '';
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to load dashboard statistics:', error);
          this.totalReservations = 0;
          this.pendingReservations = 0;
          this.availableTables = 0;
          this.currentQueue = 0;

          if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 404) {
            this.errorMessage = 'Requested restaurant data not found.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage =
              'Unable to load dashboard data. Check that the backend is running.';
          }

          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }
}
