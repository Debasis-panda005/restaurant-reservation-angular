import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { normalizeRole } from '../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
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

  errorMessage: string | null = null;
  isLoading = false;

  ngOnInit(): void {
    const reason =
      this.route?.snapshot.queryParamMap.get('reason') ||
      this.route?.snapshot.queryParamMap.get('error');

    if (reason === 'customer-denied') {
      this.errorMessage =
        'Access denied: Customer accounts cannot access the Staff/Admin portal.';
    } else if (reason === 'access_denied' || reason === 'forbidden') {
      this.errorMessage =
        'Access denied: You do not have permission to access that area.';
    } else if (reason === 'unauthorized') {
      this.errorMessage = 'Please sign in to access that page.';
    }

    // Automatic redirect for already-authenticated users
    if (this.authService.isAuthenticated()) {
      const role = this.authService.getUserRole();
      if (role === 'CUSTOMER') {
        this.router?.navigate(['/customer/dashboard']);
      } else if (role === 'STAFF' || role === 'ADMIN') {
        this.router?.navigate(['/staff/dashboard']);
      }
    }
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
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

          const role =
            normalizeRole(response?.role) || this.authService.getUserRole();

          const returnUrl = this.route?.snapshot.queryParamMap.get('returnUrl');

          if (role === 'CUSTOMER') {
            if (returnUrl && returnUrl.startsWith('/customer')) {
              this.router?.navigateByUrl(returnUrl);
            } else {
              this.router?.navigate(['/customer/dashboard']);
            }
          } else if (role === 'STAFF' || role === 'ADMIN') {
            if (
              returnUrl &&
              returnUrl.startsWith('/staff') &&
              returnUrl !== '/staff/login'
            ) {
              this.router?.navigateByUrl(returnUrl);
            } else {
              this.router?.navigate(['/staff/dashboard']);
            }
          } else {
            // Unsupported or missing role: fail safely without navigating
            this.authService.logout();
            this.errorMessage =
              'Authentication failed: Unrecognized or unsupported account role.';
            this.cdr.markForCheck();
            return;
          }

          this.cdr.markForCheck();
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Login request failed:', error);

          let message = 'Invalid email or password. Please try again.';
          if (error?.status === 0) {
            message =
              'Unable to connect to the authentication server. Please check backend connection.';
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

          this.errorMessage = message;
          this.cdr.markForCheck();
        },
      });
  }

  // Helper getters for template validation display
  get emailControl(): FormControl<string> {
    return this.loginForm.controls.email;
  }

  get passwordControl(): FormControl<string> {
    return this.loginForm.controls.password;
  }
}
