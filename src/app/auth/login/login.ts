import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email: string = '';
  password: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  login(): void {

    if (this.email === '' || this.password === '') {
      alert('Please enter email and password');
      return;
    }

    // Save session and redirect to Customer Dashboard
    this.authService.login(this.email, 'Debasis Panda');
    this.router.navigate(['/customer/dashboard']);

  }
}