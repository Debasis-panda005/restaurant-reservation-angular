import { Component } from '@angular/core';

export type TableStatus = 'Available' | 'Occupied' | 'Reserved';

export interface RestaurantTable {
  id: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
}

export const SHARED_TABLES: RestaurantTable[] = [
  { id: 1, tableNumber: 'T-01', capacity: 2, status: 'Available' },
  { id: 2, tableNumber: 'T-02', capacity: 2, status: 'Occupied' },
  { id: 3, tableNumber: 'T-03', capacity: 4, status: 'Available' },
  { id: 4, tableNumber: 'T-04', capacity: 4, status: 'Reserved' },
  { id: 5, tableNumber: 'T-05', capacity: 6, status: 'Occupied' },
  { id: 6, tableNumber: 'T-06', capacity: 6, status: 'Available' },
  { id: 7, tableNumber: 'T-07', capacity: 8, status: 'Reserved' },
  { id: 8, tableNumber: 'T-08', capacity: 4, status: 'Available' },
];

@Component({
  selector: 'app-table-management',
  imports: [],
  templateUrl: './table-management.html',
  styleUrl: './table-management.css',
})
export class TableManagement {
  tables: RestaurantTable[] = SHARED_TABLES;

  toggleStatus(table: RestaurantTable): void {
    if (table.status === 'Reserved') {
      return;
    }
    table.status = table.status === 'Available' ? 'Occupied' : 'Available';
  }
}
