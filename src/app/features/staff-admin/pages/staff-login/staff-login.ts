import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-staff-login',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-login.html',
  styleUrl: './staff-login.css',
})
export class StaffLogin {
  private readonly router = inject(Router, { optional: true });

  loginForm = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  statusMessage: string | null = null;

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.router?.navigate(['/staff/dashboard']);
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
