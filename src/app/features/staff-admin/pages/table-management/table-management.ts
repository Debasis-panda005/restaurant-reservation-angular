import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';

export type TableStatus = 'Available' | 'Occupied' | 'Reserved';

export interface BackendTable {
  id: number;
  tableNumber?: string;
  capacity?: number;
  restaurantId?: number;
  seatingType?: string;
  status?: string;
  active?: boolean;
  available?: boolean;
}

export interface RestaurantTable {
  id: number;
  restaurantId?: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  active?: boolean;
}

export const SHARED_TABLES: RestaurantTable[] = [
  { id: 1, restaurantId: 1, tableNumber: 'T-01', capacity: 2, status: 'Available' },
  { id: 2, restaurantId: 1, tableNumber: 'T-02', capacity: 2, status: 'Occupied' },
  { id: 3, restaurantId: 1, tableNumber: 'T-03', capacity: 4, status: 'Available' },
  { id: 4, restaurantId: 1, tableNumber: 'T-04', capacity: 4, status: 'Reserved' },
  { id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 6, status: 'Occupied' },
  { id: 6, restaurantId: 1, tableNumber: 'T-06', capacity: 6, status: 'Available' },
  { id: 7, restaurantId: 1, tableNumber: 'T-07', capacity: 8, status: 'Reserved' },
  { id: 8, restaurantId: 1, tableNumber: 'T-08', capacity: 4, status: 'Available' },
];

@Component({
  selector: 'app-table-management',
  imports: [ReactiveFormsModule],
  templateUrl: './table-management.html',
  styleUrl: './table-management.css',
})
export class TableManagement implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly cdr = inject(ChangeDetectorRef);

  tables: RestaurantTable[] = [];
  isLoading = true;
  errorMessage = '';
  updatingTableId: number | null = null;

  isAddFormVisible = false;
  isSubmitting = false;
  formErrorMessage = '';

  editingTable: RestaurantTable | null = null;
  isEditSubmitting = false;
  editFormErrorMessage = '';

  tablePendingDelete: RestaurantTable | null = null;
  deletingTableId: number | null = null;

  addTableForm = new FormGroup({
    restaurantId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    tableNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    capacity: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  editTableForm = new FormGroup({
    restaurantId: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
    tableNumber: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    capacity: new FormControl<number | null>(null, {
      validators: [Validators.required, Validators.min(1)],
    }),
  });

  ngOnInit(): void {
    const queryRestaurantId = this.route?.snapshot?.queryParamMap?.get('restaurantId');
    if (queryRestaurantId && !isNaN(Number(queryRestaurantId))) {
      this.addTableForm.patchValue({ restaurantId: Number(queryRestaurantId) });
    }
    this.fetchTables();
  }

  toggleAddForm(): void {
    this.isAddFormVisible = !this.isAddFormVisible;
    this.formErrorMessage = '';
    if (this.isAddFormVisible) {
      this.editingTable = null;
    }
    this.cdr.markForCheck();
  }

  startEditTable(table: RestaurantTable): void {
    this.editingTable = table;
    this.editFormErrorMessage = '';
    this.isAddFormVisible = false;
    this.editTableForm.setValue({
      restaurantId: table.restaurantId ?? 1,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
    });
    this.cdr.markForCheck();
  }

  cancelEditTable(): void {
    this.editingTable = null;
    this.editFormErrorMessage = '';
    this.cdr.markForCheck();
  }

  onEditTableSubmit(): void {
    if (!this.editingTable) {
      return;
    }

    const raw = this.editTableForm.getRawValue();
    const tableNumber = raw.tableNumber?.trim() || '';
    if (!tableNumber) {
      this.editTableForm.controls.tableNumber.setErrors({ required: true });
    }

    if (this.editTableForm.invalid || this.isEditSubmitting) {
      this.editTableForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isEditSubmitting = true;
    this.editFormErrorMessage = '';
    this.cdr.markForCheck();

    let backendStatus = 'AVAILABLE';
    if (this.editingTable.status) {
      const upper = this.editingTable.status.toUpperCase();
      if (upper === 'OCCUPIED' || upper === 'RESERVED' || upper === 'AVAILABLE') {
        backendStatus = upper;
      }
    }

    const payload = {
      restaurantId: Number(raw.restaurantId),
      tableNumber,
      capacity: Number(raw.capacity),
      status: backendStatus,
    };

    const tableId = this.editingTable.id;

    this.http
      .put<BackendTable>(`/api/staff/tables/${tableId}`, payload)
      .pipe(
        finalize(() => {
          this.isEditSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.editingTable = null;
          this.editFormErrorMessage = '';
          this.cdr.markForCheck();
          this.fetchTables();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to update table ${tableId}:`, error);
          if (error?.status === 404) {
            this.editFormErrorMessage =
              'Restaurant or table not found. Please verify the Restaurant ID.';
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
              'Failed to update table. Please check input values.';
          }
          this.isEditSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  promptDeleteTable(table: RestaurantTable): void {
    this.tablePendingDelete = table;
    this.cdr.markForCheck();
  }

  cancelDeleteTable(): void {
    this.tablePendingDelete = null;
    this.cdr.markForCheck();
  }

  confirmDeleteTable(table: RestaurantTable): void {
    this.deleteTable(table);
  }

  deleteTable(table: RestaurantTable): void {
    if (this.deletingTableId === table.id) {
      return;
    }

    this.deletingTableId = table.id;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.http
      .delete<void>(`/api/staff/tables/${table.id}`)
      .pipe(
        finalize(() => {
          this.deletingTableId = null;
          this.tablePendingDelete = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.errorMessage = '';
          this.tablePendingDelete = null;
          this.cdr.markForCheck();
          this.fetchTables();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(`Failed to delete table ${table.tableNumber}:`, error);
          if (error?.status === 404) {
            this.errorMessage = `Table ${table.tableNumber} was not found on the server.`;
          } else if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage = 'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.errorMessage = 'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage = `Failed to delete table ${table.tableNumber}. Check backend connection.`;
          }
          this.tablePendingDelete = null;
          this.cdr.markForCheck();
        },
      });
  }

  onAddTableSubmit(): void {
    const raw = this.addTableForm.getRawValue();
    const tableNumber = raw.tableNumber?.trim() || '';
    if (!tableNumber) {
      this.addTableForm.controls.tableNumber.setErrors({ required: true });
    }

    if (this.addTableForm.invalid || this.isSubmitting) {
      this.addTableForm.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    this.isSubmitting = true;
    this.formErrorMessage = '';
    this.cdr.markForCheck();

    const payload = {
      restaurantId: Number(raw.restaurantId),
      tableNumber,
      capacity: Number(raw.capacity),
    };

    this.http
      .post<BackendTable>('/api/staff/tables', payload)
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.isAddFormVisible = false;
          this.addTableForm.reset();
          const queryRestaurantId = this.route?.snapshot?.queryParamMap?.get('restaurantId');
          if (queryRestaurantId && !isNaN(Number(queryRestaurantId))) {
            this.addTableForm.patchValue({ restaurantId: Number(queryRestaurantId) });
          }
          this.formErrorMessage = '';
          this.cdr.markForCheck();
          this.fetchTables();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to create table:', error);
          if (error?.status === 404) {
            this.formErrorMessage =
              'Restaurant not found. Please verify that the Restaurant ID exists.';
          } else if (error?.status === 401) {
            this.formErrorMessage =
              'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.formErrorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 0) {
            this.formErrorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else if (typeof error?.error?.message === 'string') {
            this.formErrorMessage = error.error.message;
          } else {
            this.formErrorMessage =
              'Failed to create table. Please check input values.';
          }
          this.isSubmitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  fetchTables(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const restaurantId = this.route?.snapshot?.queryParamMap?.get('restaurantId');
    const url = restaurantId
      ? `/api/staff/tables/restaurant/${restaurantId}`
      : '/api/staff/tables';

    this.http
      .get<BackendTable[]>(url)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          const list = Array.isArray(data) ? data : [];
          this.tables = list.map((t) => this.mapBackendTable(t));
          SHARED_TABLES.length = 0;
          SHARED_TABLES.push(...this.tables);
          this.isLoading = false;
          this.errorMessage = '';
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error('Failed to load tables:', error);
          if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else if (error?.status === 404) {
            this.errorMessage = 'Table data not found.';
          } else if (error?.status === 0) {
            this.errorMessage =
              'Unable to connect to the backend server. Check that the backend is running.';
          } else {
            this.errorMessage =
              'Unable to load table data. Check that the backend is running.';
          }
          this.isLoading = false;
          this.cdr.markForCheck();
        },
      });
  }

  toggleStatus(table: RestaurantTable): void {
    if (table.status === 'Reserved' || this.updatingTableId === table.id) {
      return;
    }

    const nextStatus: TableStatus =
      table.status === 'Available' ? 'Occupied' : 'Available';
    const nextBackendStatus =
      nextStatus === 'Available' ? 'AVAILABLE' : 'OCCUPIED';

    this.updatingTableId = table.id;
    this.errorMessage = '';
    this.cdr.markForCheck();

    const payload = {
      restaurantId: table.restaurantId ?? 1,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      status: nextBackendStatus,
    };

    this.http
      .put<BackendTable>(
        `/api/staff/tables/${table.id}`,
        payload
      )
      .pipe(
        finalize(() => {
          this.updatingTableId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (updated) => {
          table.status = nextStatus;
          table.active = nextStatus === 'Available';
          if (updated?.restaurantId) {
            table.restaurantId = updated.restaurantId;
          }
          this.updatingTableId = null;
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse | any) => {
          console.error(
            `Failed to update status for table ${table.tableNumber}:`,
            error
          );
          if (error?.status === 401) {
            this.errorMessage = 'Authentication required. Please log in again.';
          } else if (error?.status === 403) {
            this.errorMessage =
              'Access denied. Staff or Admin privileges are required.';
          } else {
            this.errorMessage = `Failed to update status for table ${table.tableNumber}. Check backend connection.`;
          }
          this.updatingTableId = null;
          this.cdr.markForCheck();
        },
      });
  }

  private mapBackendTable(t: BackendTable): RestaurantTable {
    let status: TableStatus = 'Available';

    if (t.status) {
      const upper = t.status.toUpperCase();
      if (upper === 'OCCUPIED') {
        status = 'Occupied';
      } else if (upper === 'RESERVED') {
        status = 'Reserved';
      } else {
        status = 'Available';
      }
    } else if (t.active !== undefined) {
      status = t.active ? 'Available' : 'Occupied';
    } else if (t.available !== undefined) {
      status = t.available ? 'Available' : 'Occupied';
    }

    return {
      id: t.id,
      restaurantId: t.restaurantId ?? 1,
      tableNumber: t.tableNumber || `T-${t.id}`,
      capacity: t.capacity || 2,
      status,
      active: t.active ?? (status === 'Available'),
    };
  }
}
