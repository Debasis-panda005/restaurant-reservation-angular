import { Component } from '@angular/core';

@Component({
  selector: 'app-staff-dashboard',
  imports: [],
  templateUrl: './staff-dashboard.html',
  styleUrl: './staff-dashboard.css',
})
export class StaffDashboard {
  readonly totalReservations: number = 24;
  readonly pendingReservations: number = 5;
  readonly currentQueue: number = 8;
  readonly availableTables: number = 12;
}
