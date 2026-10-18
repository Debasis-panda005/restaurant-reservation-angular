import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize, switchMap } from 'rxjs';
import {
  RestaurantTable,
  SHARED_TABLES,
} from '../table-management/table-management';

export type QueueStatus =
  | 'Waiting'
  | 'Called'
  | 'Seated'
  | 'Cancelled'
  | 'Completed';

export interface BackendQueueItem {
  id?: number | string;
  queueId?: number | string;
  restaurantId?: number | string;
  ticketNumber?: string;
  queueNo?: string;
  customerName?: string;
  customerId?: number | string;
  guests?: number;
  numberOfPeople?: number;
  joinedTime?: string;
  joinedAt?: string;
  createdAt?: string;
  position?: number;
  peopleAhead?: number;
  status?: string;
  assignedTable?: string;
  tableNumber?: string;
  tableId?: number;
}

export interface QueueItem {
  id: number | string;
  queueNo: string;
  customerName: string;
  guests: number;
  joinedTime: string;
  position: number;
  status: QueueStatus;
  assignedTable?: string;
  tableId?: number;
}

@Component({
  selector: 'app-queue-management',
  imports: [ReactiveFormsModule],
  templateUrl: './queue-management.html',
  styleUrl: './queue-management.css',
})
export class QueueManagement implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  queueList: QueueItem[] = [];
  tables: RestaurantTable[] = [];
  alertMessage: string | null = null;
  isLoading = true;
  isUpdatingId: number | string | null = null;

  isAddFormVisible = false;
  isSubmitting = false;
  addFormErrorMessage = '';

  itemPendingDelete: QueueItem | null = null;
  isDeletingId: number | string | null = null;

  addQueueForm = new FormGroup({
    restaurantId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    customerId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    numberOfPeople: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  ngOnInit(): void {
    const queryRestaurantId = this.route?.snapshot?.queryParamMap?.get('restaurantId');
    if (queryRestaurantId && !isNaN(Number(queryRestaurantId))) {
      this.addQueueForm.patchValue({ restaurantId: Number(queryRestaurantId) });
    }
    this.loadData();
  }

  loadData(preserveAlert = false): void {
    this.isLoading = true;
    if (!preserveAlert) {
      this.alertMessage = null;
    }
    this.cdr.markForCheck();

    const restaurantId = this.route?.snapshot.queryParamMap.get('restaurantId');
    const queueUrl = restaurantId
      ? `/api/staff/queue/restaurant/${restaurantId}`
      : '/api/staff/queue';

    const tablesUrl = restaurantId
      ? `/api/staff/tables/restaurant/${restaurantId}`
      : '/api/staff/tables';

    this.http
      .get<BackendQueueItem[]>(queueUrl)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (queueData) => {
          const list = Array.isArray(queueData) ? queueData : [];
          this.queueList = list.map((item, idx) =>
            this.mapBackendQueueItem(item, idx)
          );
          this.recalculatePositions();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to load queue:', error);
          if (error?.status === 401) {
            this.alertMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.alertMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 404) {
            this.alertMessage = 'Requested queue data not found.';
          } else if (error?.status === 0) {
            this.alertMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.alertMessage =
              'Unable to load customer queue. Check that the backend is running.';
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });

    this.http
      .get<RestaurantTable[]>(tablesUrl)
      .pipe(
        finalize(() => {
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (tablesData) => {
          const list = Array.isArray(tablesData) ? tablesData : [];
          if (list.length > 0) {
            this.tables = list.map((t) => ({
              id: t.id,
              restaurantId: t.restaurantId ?? (restaurantId ? Number(restaurantId) : 1),
              tableNumber: t.tableNumber || `T-${t.id}`,
              capacity: t.capacity || 2,
              status:
                t.status ||
                ((t as any).active === false ? 'Occupied' : 'Available'),
            }));
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.warn(
            'Failed to load tables for queue assignment from backend, using fallback tables:',
            error
          );
        },
      });
  }

  toggleAddForm(): void {
    this.isAddFormVisible = !this.isAddFormVisible;
    this.addFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  cancelAddForm(): void {
    this.isAddFormVisible = false;
    this.addFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  onAddQueueSubmit(): void {
    if (this.addQueueForm.invalid || this.isSubmitting) {
      this.addQueueForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.addFormErrorMessage = '';
    this.cdr.markForCheck();

    const raw = this.addQueueForm.getRawValue();
    const payload = {
      restaurantId: Number(raw.restaurantId),
      customerId: Number(raw.customerId),
      numberOfPeople: Number(raw.numberOfPeople),
    };

    this.http
      .post<BackendQueueItem>('/api/staff/queue', payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          const preservedRestaurantId = this.addQueueForm.value.restaurantId;
          this.addQueueForm.reset({
            restaurantId: preservedRestaurantId ?? null,
            customerId: null,
            numberOfPeople: null,
          });
          this.isAddFormVisible = false;
          this.addFormErrorMessage = '';
          this.cdr.markForCheck();
          this.loadData();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to add to queue:', error);
          if (error?.status === 404) {
            this.addFormErrorMessage =
              'Restaurant not found. Please verify the Restaurant ID.';
          } else if (error?.status === 401) {
            this.addFormErrorMessage =
              'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.addFormErrorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.addFormErrorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else if (typeof error?.error?.message === 'string') {
            this.addFormErrorMessage = error.error.message;
          } else {
            this.addFormErrorMessage =
              'Failed to add to queue. Please verify the entered details.';
          }
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  promptDelete(item: QueueItem): void {
    this.itemPendingDelete = item;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.itemPendingDelete = null;
    this.cdr.markForCheck();
  }

  confirmDelete(item: QueueItem): void {
    this.deleteQueue(item);
  }

  deleteQueue(item: QueueItem): void {
    if (this.isDeletingId === item.id) {
      return;
    }

    this.isDeletingId = item.id;
    this.alertMessage = null;
    this.cdr.markForCheck();

    this.http
      .delete<void>(`/api/staff/queue/${item.id}`)
      .pipe(
        finalize(() => {
          this.isDeletingId = null;
          this.itemPendingDelete = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.alertMessage = null;
          this.itemPendingDelete = null;
          this.isDeletingId = null;
          this.cdr.markForCheck();
          this.loadData();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to delete queue entry ${item.id}:`, error);
          if (error?.status === 404) {
            this.alertMessage = `Queue entry ${item.queueNo} was not found on the server.`;
          } else if (error?.status === 401) {
            this.alertMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.alertMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.alertMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.alertMessage = `Failed to delete queue entry ${item.queueNo}. Check backend connection.`;
          }
          this.itemPendingDelete = null;
          this.isDeletingId = null;
          this.cdr.markForCheck();
        },
      });
  }

  callCustomer(item: QueueItem): void {
    if (this.isUpdatingId === item.id) {
      return;
    }
    // Enforce valid transition: WAITING -> CALLED only
    if (item.status !== 'Waiting') {
      return;
    }

    this.alertMessage = null;
    this.isUpdatingId = item.id;
    this.cdr.markForCheck();

    this.http
      .put<BackendQueueItem>(
        `/api/staff/queue/${item.id}/status?status=CALLED`,
        {}
      )
      .pipe(
        finalize(() => {
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          item.status = 'Called';
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to call customer ${item.queueNo}:`, error);
          if (error?.status === 401) {
            this.alertMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.alertMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else {
            this.alertMessage = `Failed to call customer ${item.customerName}. Check backend connection.`;
          }
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        },
      });
  }

  assignTable(item: QueueItem): void {
    if (this.isUpdatingId === item.id) {
      return;
    }
    // Enforce valid transition: CALLED -> SEATED only
    if (item.status !== 'Called') {
      return;
    }

    this.alertMessage = null;

    const tablesSource =
      this.tables.length > 0 ? this.tables : SHARED_TABLES;

    const suitableTable = tablesSource
      .filter((t) => t.status === 'Available' && t.capacity >= item.guests)
      .sort((a, b) => a.capacity - b.capacity)[0];

    // Ensure a table is assigned before attempting transition
    if (!suitableTable || !suitableTable.id) {
      this.alertMessage = `No available table found with capacity for ${item.guests} guests (${item.customerName} remains in Called status).`;
      this.cdr.markForCheck();
      return;
    }

    this.isUpdatingId = item.id;
    this.cdr.markForCheck();

    const currentRestaurantId =
      suitableTable.restaurantId ??
      (this.route?.snapshot.queryParamMap.get('restaurantId')
        ? Number(this.route.snapshot.queryParamMap.get('restaurantId'))
        : 1);

    const tablePayload = {
      restaurantId: currentRestaurantId,
      tableNumber: suitableTable.tableNumber,
      capacity: suitableTable.capacity,
      status: 'OCCUPIED',
    };

    // Chain PUT queue status to SEATED and PUT table status to OCCUPIED
    this.http
      .put<BackendQueueItem>(
        `/api/staff/queue/${item.id}/status?status=SEATED`,
        {}
      )
      .pipe(
        switchMap(() =>
          this.http.put<RestaurantTable>(
            `/api/staff/tables/${suitableTable.id}`,
            tablePayload
          )
        ),
        finalize(() => {
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          item.status = 'Seated';
          item.assignedTable = suitableTable.tableNumber;
          suitableTable.status = 'Occupied';

          const sharedMatch = SHARED_TABLES.find(
            (t) =>
              t.id === suitableTable.id ||
              t.tableNumber === suitableTable.tableNumber
          );
          if (sharedMatch) {
            sharedMatch.status = 'Occupied';
          }

          this.recalculatePositions();
          this.isUpdatingId = null;
          this.cdr.markForCheck();
          this.loadData();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to seat queue entry ${item.id}:`, error);
          if (error?.status === 401) {
            this.alertMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.alertMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else {
            this.alertMessage = `Failed to seat customer ${item.customerName}. Check backend connection.`;
          }
          this.isUpdatingId = null;
          this.cdr.markForCheck();
          this.loadData(true);
        },
      });
  }

  cancelQueue(item: QueueItem): void {
    if (this.isUpdatingId === item.id) {
      return;
    }
    if (item.status === 'Seated') {
      return;
    }

    this.alertMessage = null;
    this.isUpdatingId = item.id;
    this.cdr.markForCheck();

    this.http
      .put<BackendQueueItem>(
        `/api/staff/queue/${item.id}/status?status=CANCELLED`,
        {}
      )
      .pipe(
        finalize(() => {
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          item.status = 'Cancelled';
          item.position = 0;
          this.recalculatePositions();
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to cancel queue entry ${item.id}:`, error);
          if (error?.status === 401) {
            this.alertMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.alertMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else {
            this.alertMessage = `Failed to cancel queue entry ${item.customerName}. Check backend connection.`;
          }
          this.isUpdatingId = null;
          this.cdr.markForCheck();
        },
      });
  }

  completeQueue(item: QueueItem): void {
    // Backend queue API does not support COMPLETED status; maintain Seated status without invalid mutations
    return;
  }

  seatCustomer(item: QueueItem): void {
    this.assignTable(item);
  }

  private recalculatePositions(): void {
    let pos = 1;
    for (const entry of this.queueList) {
      if (entry.status === 'Waiting' || entry.status === 'Called') {
        entry.position = pos++;
      } else {
        entry.position = 0;
      }
    }
  }

  private mapBackendQueueItem(raw: BackendQueueItem, idx: number): QueueItem {
    const rawId = raw.id ?? raw.queueId ?? idx + 1;
    const existing = this.queueList.find((q) => q.id === rawId || q.queueNo === raw.queueNo);

    let customerName = raw.customerName;
    if (!customerName) {
      if (raw.customerId) {
        customerName = `Customer #${raw.customerId}`;
      } else {
        customerName = `Guest #${idx + 1}`;
      }
    }

    let joinedTime = raw.joinedTime;
    if (!joinedTime) {
      const dt = raw.joinedAt || raw.createdAt;
      if (dt) {
        const parts = dt.split('T');
        joinedTime = parts[1] ? parts[1].substring(0, 5) : parts[0];
      } else {
        joinedTime = '12:00';
      }
    }

    return {
      id: rawId,
      queueNo: raw.queueNo || raw.ticketNumber || `Q-${String(idx + 1).padStart(3, '0')}`,
      customerName,
      guests: raw.numberOfPeople ?? raw.guests ?? 2,
      joinedTime,
      position: raw.position ?? (idx + 1),
      status: this.normalizeQueueStatus(raw.status),
      assignedTable: raw.assignedTable || raw.tableNumber || existing?.assignedTable,
      tableId: raw.tableId,
    };
  }

  private normalizeQueueStatus(status?: string): QueueStatus {
    if (!status) return 'Waiting';
    const s = status.toUpperCase();
    switch (s) {
      case 'CALLED':
        return 'Called';
      case 'SEATED':
        return 'Seated';
      case 'CANCELLED':
      case 'CANCELED':
        return 'Cancelled';
      case 'COMPLETED':
        return 'Completed';
      case 'WAITING':
      default:
        return 'Waiting';
    }
  }
}
