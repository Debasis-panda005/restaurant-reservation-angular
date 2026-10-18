import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { normalizeRole } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-staff-login',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-login.html',
  styleUrl: './staff-login.css',
})
export class StaffLogin implements OnInit {
  private readonly router = inject(Router, { optional: true });
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  loginForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  statusMessage: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    const reason =
      this.route?.snapshot.queryParamMap.get('reason') ||
      this.route?.snapshot.queryParamMap.get('error');

    if (
      reason === 'customer-denied' ||
      reason === 'customer' ||
      reason === 'access_denied'
    ) {
      if (this.authService.isCustomer()) {
        this.authService.logout();
      }
      this.statusMessage =
        'Access denied: Customer accounts cannot access the Staff/Admin portal.';
      this.cdr.markForCheck();
      return;
    }

    // If user is already authenticated with staff/admin role, navigate to dashboard
    if (this.authService.isAuthenticated() && this.authService.isStaffOrAdmin()) {
      this.router?.navigate(['/staff/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.statusMessage = null;
    this.cdr.markForCheck();

    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email, password)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;

          // Customer role is strictly rejected from Staff/Admin portal
          const role = normalizeRole(response.role);
          if (role === 'CUSTOMER' || !this.authService.isStaffOrAdmin()) {
            this.authService.logout();
            this.statusMessage =
              'Access denied: Customer accounts cannot access the Staff/Admin portal.';
            this.cdr.markForCheck();
            return;
          }

          const returnUrl = this.route?.snapshot.queryParamMap.get('returnUrl');
          if (
            returnUrl &&
            returnUrl.startsWith('/staff') &&
            returnUrl !== '/staff/login'
          ) {
            this.router?.navigateByUrl(returnUrl);
          } else {
            this.router?.navigate(['/staff/dashboard']);
          }
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login failed:', error);

          // Handle error without assuming specific JSON shape
          let message = 'Invalid email or password. Please try again.';
          if (error?.status === 0) {
            message =
              'Unable to connect to the authentication server. Please check that backend is running.';
          } else if (error?.status === 401) {
            message = 'Invalid email or password. Please try again.';
          } else if (
            typeof error?.error === 'string' &&
            error.error.trim().length > 0 &&
            error.error.length < 150
          ) {
            message = error.error;
          } else if (
            error?.error?.message &&
            typeof error.error.message === 'string'
          ) {
            message = error.error.message;
          }

          this.statusMessage = message;
          this.cdr.markForCheck();
        },
      });
  }
}
