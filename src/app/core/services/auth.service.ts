import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import {
  AuthResponse,
  AuthUser,
  LoginRequest,
  UserRole,
  extractUserRole,
  normalizeRole,
} from '../models/auth.model';

/**
 * AuthService manages authentication state, login, session validation,
 * token persistence, and role resolution for the restaurant reservation application.
 *
 * TOKEN STORAGE DECISION & SECURITY TRADE-OFFS:
 * We store the access token in browser `sessionStorage` with an in-memory Signal cache.
 *
 * Security Trade-offs:
 * - Scoped strictly to the active browser tab/session; automatically cleared when the tab/window is closed.
 * - Does not leak across different tabs or windows (unlike localStorage).
 * - Mitigates CSRF vulnerabilities because tokens must be explicitly attached via the Authorization header
 *   rather than automatically sent by the browser.
 * - Unlike HttpOnly cookies, sessionStorage is accessible to client-side JavaScript and is therefore vulnerable
 *   if an XSS vulnerability exists. True HttpOnly cookie protection requires backend architecture support
 *   which is not present in the current Spring Boot token-based API contract.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly API_BASE = '/api/auth';
  private readonly TOKEN_STORAGE_KEY = 'staff_auth_token';
  private readonly USER_STORAGE_KEY = 'staff_auth_user';
  private readonly TIMESTAMP_STORAGE_KEY = 'staff_auth_timestamp';
  private readonly TOKEN_LIFETIME_MS = 3600000; // 1 hour (confirmed by backend team)

  readonly currentUser = signal<AuthUser | null>(this.getStoredUser());

  /**
   * Authenticate a user with email and password against POST /api/auth/login.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    const payload: LoginRequest = { email, password };

    return this.http.post<AuthResponse>(`${this.API_BASE}/login`, payload).pipe(
      tap((response) => {
        if (response?.accessToken) {
          this.saveSession(response);
        }
      })
    );
  }

  /**
   * Fetch current user profile from GET /api/auth/me to validate session.
   * Clears session gracefully if token is missing or rejected by the server.
   */
  getCurrentUser(): Observable<AuthUser | null> {
    const token = this.getAccessToken();
    if (!token) {
      this.clearSession();
      return of(null);
    }

    return this.http.get<any>(`${this.API_BASE}/me`).pipe(
      map((userData): AuthUser => {
        const resolvedRole = extractUserRole(userData) || userData?.role || '';
        const user: AuthUser = {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: resolvedRole,
          authority: userData.authority,
          authorities: userData.authorities,
        };
        this.currentUser.set(user);
        if (this.isBrowser()) {
          sessionStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
        }
        return user;
      }),
      catchError((error) => {
        console.warn('Session validation failed against /api/auth/me:', error);
        this.clearSession();
        return of(null);
      })
    );
  }

  /**
   * Check whether a valid, non-expired access token exists.
   */
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  /**
   * Retrieve the active access token if present and not expired.
   */
  getAccessToken(): string | null {
    if (!this.isBrowser()) {
      return null;
    }

    const token = sessionStorage.getItem(this.TOKEN_STORAGE_KEY);
    const timestampStr = sessionStorage.getItem(this.TIMESTAMP_STORAGE_KEY);

    if (!token || !timestampStr) {
      return null;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp) || Date.now() - timestamp >= this.TOKEN_LIFETIME_MS) {
      // Token expired based on confirmed 1-hour lifetime
      this.clearSession();
      return null;
    }

    return token;
  }

  /**
   * Resolves the canonical user role ('CUSTOMER', 'STAFF', or 'ADMIN') from the active user profile.
   * Handles raw enums and 'ROLE_' prefixed Spring authorities gracefully.
   */
  getUserRole(): UserRole | null {
    return extractUserRole(this.currentUser());
  }

  /**
   * Check if the authenticated user has STAFF or ADMIN privileges.
   */
  isStaffOrAdmin(): boolean {
    const role = this.getUserRole();
    return role === 'STAFF' || role === 'ADMIN';
  }

  /**
   * Check if the authenticated user has the CUSTOMER role.
   * Customer accounts must be strictly barred from Staff/Admin access.
   */
  isCustomer(): boolean {
    return this.getUserRole() === 'CUSTOMER';
  }

  /**
   * Check if current user possesses any of the specified roles.
   */
  hasRole(allowedRoles: UserRole[]): boolean {
    const role = this.getUserRole();
    return role !== null && allowedRoles.includes(role);
  }

  /**
   * Client-side session clearing.
   * NOTE: Server-side token invalidation / logout endpoint is not available in the backend contract.
   */
  logout(): void {
    this.clearSession();
  }

  private saveSession(response: AuthResponse): void {
    if (!this.isBrowser()) {
      return;
    }

    sessionStorage.setItem(this.TOKEN_STORAGE_KEY, response.accessToken);
    sessionStorage.setItem(
      this.TIMESTAMP_STORAGE_KEY,
      Date.now().toString()
    );

    const canonicalRole = extractUserRole(response.role) || response.role;

    const user: AuthUser = {
      id: response.id,
      name: response.name,
      email: response.email,
      role: canonicalRole,
    };

    sessionStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private clearSession(): void {
    if (this.isBrowser()) {
      sessionStorage.removeItem(this.TOKEN_STORAGE_KEY);
      sessionStorage.removeItem(this.USER_STORAGE_KEY);
      sessionStorage.removeItem(this.TIMESTAMP_STORAGE_KEY);
    }
    this.currentUser.set(null);
  }

  private getStoredUser(): AuthUser | null {
    if (!this.isBrowser()) {
      return null;
    }
    const raw = sessionStorage.getItem(this.USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  private isBrowser(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof sessionStorage !== 'undefined'
    );
  }
}
