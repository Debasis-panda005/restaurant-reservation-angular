import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-staff-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.css',
})
export class StaffLayout {}
