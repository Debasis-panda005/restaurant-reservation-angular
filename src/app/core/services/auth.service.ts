import { Injectable } from '@angular/core';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly storageKey = 'currentUser';

  /**
   * Log in a mock customer and save the profile in sessionStorage.
   */
  login(email: string, name: string = 'Debasis Panda'): User {
    const user: User = {
      id: 1,
      name: name,
      email: email,
      phone: '9876543210',
      role: 'CUSTOMER'
    };

    if (this.isBrowser()) {
      sessionStorage.setItem(this.storageKey, JSON.stringify(user));
    }

    return user;
  }

  /**
   * Log out the current user by removing user data from sessionStorage.
   */
  logout(): void {
    if (this.isBrowser()) {
      sessionStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Check whether a customer is currently logged in.
   */
  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  /**
   * Get the currently logged-in customer profile from sessionStorage.
   */
  getCurrentUser(): User | null {
    if (!this.isBrowser()) {
      return null;
    }

    const data = sessionStorage.getItem(this.storageKey);
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
  }
}
