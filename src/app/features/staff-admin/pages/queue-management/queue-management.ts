import { Component } from '@angular/core';

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
    item.status = 'Called';
  }

  assignTable(item: QueueItem): void {
    item.status = 'Seated';
    item.assignedTable = 'T-01';
  }

  completeQueue(item: QueueItem): void {
    item.status = 'Completed';
  }

  cancelQueue(item: QueueItem): void {
    item.status = 'Cancelled';
  }
}
