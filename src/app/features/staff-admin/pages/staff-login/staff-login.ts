import { Component } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

@Component({
  selector: 'app-staff-login',
  imports: [ReactiveFormsModule],
  templateUrl: './staff-login.html',
  styleUrl: './staff-login.css',
})
export class StaffLogin {
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
      this.statusMessage =
        'Login UI is ready. Authentication will be connected later.';
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
