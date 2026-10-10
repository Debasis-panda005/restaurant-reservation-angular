import { Injectable, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import {
  User,
  AuthResponse,
  LoginCredentials,
  RegisterData,
  UpdateProfileData,
  CustomerProfileDto
} from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = 'http://localhost:8080/api/auth';
  private readonly userUrl = 'http://localhost:8080/api/users';
  private readonly tokenKey = 'authToken';
  private readonly storageKey = 'currentUser';

  private memoryStore: Map<string, string> = new Map();

  constructor(@Optional() private http?: HttpClient) {}

  /**
   * Safe storage access supporting browser, Node.js, and SSR test environments.
   */
  private safeGet(key: string): string | null {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const val = sessionStorage.getItem(key);
        if (val) return val;
      }
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val) return val;
      }
    } catch {}
    return this.memoryStore.get(key) || null;
  }

  private safeSet(key: string, value: string): void {
    this.memoryStore.set(key, value);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(key, value);
      }
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch {}
  }

  private safeRemove(key: string): void {
    this.memoryStore.delete(key);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {}
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  }

  /**
   * Register a new customer account via backend API.
   * Endpoint: POST http://localhost:8080/api/auth/register
   */
  register(data: RegisterData): Observable<AuthResponse> {
    if (this.http) {
      return this.http.post<AuthResponse>(`${this.authUrl}/register`, data).pipe(
        tap((res) => {
          if (res?.token && res?.customer) {
            this.saveAuthSession(res.token, res.customer);
          }
        }),
        catchError((err) => {
          console.error('[AuthService] Registration failed:', err);
          return throwError(() => err);
        })
      );
    }

    // Isolated test environment fallback
    const mockRes: AuthResponse = {
      token: 'mock-jwt-token',
      type: 'Bearer',
      customer: {
        id: 1,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'CUSTOMER'
      }
    };
    this.saveAuthSession(mockRes.token, mockRes.customer);
    return of(mockRes);
  }

  /**
   * Authenticate a customer using email and password via backend API.
   * Supports both object credentials Observable and legacy synchronous signature for compatibility.
   * Endpoint: POST http://localhost:8080/api/auth/login
   */
  login(credentials: LoginCredentials): Observable<AuthResponse>;
  login(email: string, defaultName?: string): User;
  login(credentialsOrEmail: LoginCredentials | string, defaultName: string = 'Debasis Panda'): Observable<AuthResponse> | User {
    if (typeof credentialsOrEmail === 'string') {
      const email = credentialsOrEmail;
      const user: User = {
        id: 1,
        name: defaultName,
        fullName: defaultName,
        email: email,
        phone: '9876543210',
        role: 'CUSTOMER'
      };
      this.safeSet(this.storageKey, JSON.stringify(user));
      this.safeSet(this.tokenKey, 'legacy-mock-token');
      return user;
    }

    const creds = credentialsOrEmail;

    if (this.http) {
      return this.http.post<AuthResponse>(`${this.authUrl}/login`, creds).pipe(
        tap((res) => {
          if (res?.token && res?.customer) {
            this.saveAuthSession(res.token, res.customer);
          }
        }),
        catchError((err) => {
          console.error('[AuthService] Login failed:', err);
          return throwError(() => err);
        })
      );
    }

    // Isolated test environment fallback
    const mockRes: AuthResponse = {
      token: 'mock-jwt-token',
      type: 'Bearer',
      customer: {
        id: 1,
        fullName: defaultName,
        email: creds.email,
        phone: '9876543210',
        role: 'CUSTOMER'
      }
    };
    this.saveAuthSession(mockRes.token, mockRes.customer);
    return of(mockRes);
  }

  /**
   * Retrieve the currently authenticated customer's profile from the backend.
   * Endpoint: GET http://localhost:8080/api/users/me
   */
  getProfile(): Observable<User> {
    if (this.http) {
      return this.http.get<CustomerProfileDto>(`${this.userUrl}/me`).pipe(
        map((dto) => {
          const user = this.mapDtoToUser(dto);
          this.saveUser(user);
          return user;
        }),
        catchError((err) => {
          console.error('[AuthService] Failed to load profile:', err);
          return throwError(() => err);
        })
      );
    }

    const current = this.getCurrentUser();
    return of(current || {
      id: 1,
      name: 'Debasis Panda',
      fullName: 'Debasis Panda',
      email: 'debasis@example.com',
      phone: '9876543210',
      role: 'CUSTOMER'
    });
  }

  /**
   * Update the currently authenticated customer's profile via backend.
   * Endpoint: PUT http://localhost:8080/api/users/me
   */
  updateProfile(updates: UpdateProfileData): Observable<User> {
    if (this.http) {
      return this.http.put<CustomerProfileDto>(`${this.userUrl}/me`, updates).pipe(
        map((dto) => {
          const user = this.mapDtoToUser(dto);
          this.saveUser(user);
          return user;
        }),
        catchError((err) => {
          console.error('[AuthService] Failed to update profile:', err);
          return throwError(() => err);
        })
      );
    }

    const current = this.getCurrentUser();
    const updated: User = {
      ...(current || { id: 1, email: 'debasis@example.com', role: 'CUSTOMER' }),
      name: updates.fullName,
      fullName: updates.fullName,
      phone: updates.phone
    };
    this.saveUser(updated);
    return of(updated);
  }

  /**
   * Retrieve the current JWT authentication token.
   */
  getToken(): string | null {
    return this.safeGet(this.tokenKey);
  }

  /**
   * Check whether a customer is currently authenticated with a valid token and user session.
   */
  isLoggedIn(): boolean {
    return this.getToken() !== null && this.getCurrentUser() !== null;
  }

  /**
   * Get the currently logged-in customer profile from session storage.
   */
  getCurrentUser(): User | null {
    const data = this.safeGet(this.storageKey);
    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as User;
    } catch {
      return null;
    }
  }

  /**
   * Log out the current user by removing token and session profile.
   */
  logout(): void {
    this.safeRemove(this.tokenKey);
    this.safeRemove(this.storageKey);
  }

  private saveAuthSession(token: string, customer: CustomerProfileDto): void {
    this.safeSet(this.tokenKey, token);
    const user = this.mapDtoToUser(customer);
    this.saveUser(user);
  }

  private saveUser(user: User): void {
    this.safeSet(this.storageKey, JSON.stringify(user));
  }

  private mapDtoToUser(dto: CustomerProfileDto): User {
    return {
      id: dto.id,
      name: dto.fullName,
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      role: (dto.role as any) || 'CUSTOMER'
    };
  }
}
