import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email: string = '';
  password: string = '';

  login() {
    if (this.email === '' || this.password === '') {
      alert('Please enter email and password');
      return;
    }

    alert('Login button clicked');
  }
}