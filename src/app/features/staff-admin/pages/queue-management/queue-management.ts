import { Component } from '@angular/core';
import { SHARED_TABLES } from '../table-management/table-management';

export type QueueStatus =
  | 'Waiting'
  | 'Called'
  | 'Seated'
  | 'Completed'
  | 'Cancelled';

export interface QueueItem {
  queueNo: string;
  customerName: string;
  guests: number;
  joinedTime: string;
  position: number;
  status: QueueStatus;
  assignedTable?: string;
}

@Component({
  selector: 'app-queue-management',
  imports: [],
  templateUrl: './queue-management.html',
  styleUrl: './queue-management.css',
})
export class QueueManagement {
  alertMessage: string | null = null;

  constructor() {
    this.recalculatePositions();
  }

  queueList: QueueItem[] = [
    {
      queueNo: 'Q-001',
      customerName: 'Rahul Sharma',
      guests: 3,
      joinedTime: '18:20',
      position: 1,
      status: 'Waiting',
      assignedTable: '—',
    },
    {
      queueNo: 'Q-002',
      customerName: 'Priya Das',
      guests: 2,
      joinedTime: '18:25',
      position: 2,
      status: 'Called',
      assignedTable: '—',
    },
    {
      queueNo: 'Q-003',
      customerName: 'Arjun Patel',
      guests: 4,
      joinedTime: '18:32',
      position: 3,
      status: 'Waiting',
      assignedTable: '—',
    },
    {
      queueNo: 'Q-004',
      customerName: 'Sneha Rao',
      guests: 2,
      joinedTime: '18:40',
      position: 4,
      status: 'Seated',
      assignedTable: 'T-03',
    },
    {
      queueNo: 'Q-005',
      customerName: 'Amit Kumar',
      guests: 5,
      joinedTime: '18:45',
      position: 5,
      status: 'Waiting',
      assignedTable: '—',
    },
  ];

  callCustomer(item: QueueItem): void {
    this.alertMessage = null;
    item.status = 'Called';
  }

  assignTable(item: QueueItem): void {
    this.alertMessage = null;

    // Find a suitable table that is currently Available and has enough capacity
    const suitableTable = SHARED_TABLES
      .filter((t) => t.status === 'Available' && t.capacity >= item.guests)
      .sort((a, b) => a.capacity - b.capacity)[0];

    if (!suitableTable) {
      this.alertMessage = `No available table found with capacity for ${item.guests} guests (${item.customerName} remains in Called status).`;
      return;
    }

    item.status = 'Seated';
    item.assignedTable = suitableTable.tableNumber;
    suitableTable.status = 'Occupied';
    this.recalculatePositions();
  }

  completeQueue(item: QueueItem): void {
    this.alertMessage = null;
    item.status = 'Completed';
    if (item.assignedTable && item.assignedTable !== '—') {
      const table = SHARED_TABLES.find((t) => t.tableNumber === item.assignedTable);
      if (table && table.status === 'Occupied') {
        table.status = 'Available';
      }
    }
  }

  cancelQueue(item: QueueItem): void {
    this.alertMessage = null;
    if (item.status === 'Seated' && item.assignedTable && item.assignedTable !== '—') {
      const table = SHARED_TABLES.find((t) => t.tableNumber === item.assignedTable);
      if (table && table.status === 'Occupied') {
        table.status = 'Available';
      }
    }
    item.status = 'Cancelled';
    this.recalculatePositions();
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
}
