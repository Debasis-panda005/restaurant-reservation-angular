import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import {
  AuthResponse,
  AuthUser,
  normalizeRole,
  extractUserRole,
} from '../models/auth.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockAuthResponse: AuthResponse = {
    accessToken: 'mock-jwt-token-xyz',
    tokenType: 'Bearer',
    id: 10,
    name: 'Staff Manager',
    email: 'manager@restaurant.com',
    role: 'STAFF',
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  describe('normalizeRole and extractUserRole', () => {
    it('should normalize standard role strings', () => {
      expect(normalizeRole('STAFF')).toBe('STAFF');
      expect(normalizeRole('ADMIN')).toBe('ADMIN');
      expect(normalizeRole('CUSTOMER')).toBe('CUSTOMER');
    });

    it('should normalize Spring Security authority format with ROLE_ prefix', () => {
      expect(normalizeRole('ROLE_STAFF')).toBe('STAFF');
      expect(normalizeRole('ROLE_ADMIN')).toBe('ADMIN');
      expect(normalizeRole('ROLE_CUSTOMER')).toBe('CUSTOMER');
    });

    it('should handle whitespace and case-insensitivity', () => {
      expect(normalizeRole('  role_staff  ')).toBe('STAFF');
      expect(normalizeRole('admin')).toBe('ADMIN');
      expect(normalizeRole('customer ')).toBe('CUSTOMER');
    });

    it('should return null for invalid or null roles', () => {
      expect(normalizeRole(null)).toBeNull();
      expect(normalizeRole(undefined)).toBeNull();
      expect(normalizeRole('')).toBeNull();
      expect(normalizeRole('UNKNOWN_ROLE')).toBeNull();
    });

    it('should extract role from AuthUser object with authority or role', () => {
      expect(extractUserRole({ id: 1, name: 'A', email: 'a', role: 'ROLE_ADMIN' })).toBe('ADMIN');
      expect(extractUserRole({ id: 1, name: 'A', email: 'a', role: '', authority: 'ROLE_STAFF' })).toBe('STAFF');
      expect(
        extractUserRole({
          id: 1,
          name: 'A',
          email: 'a',
          role: '',
          authorities: [{ authority: 'ROLE_CUSTOMER' }],
        })
      ).toBe('CUSTOMER');
    });
  });

  it('should authenticate user and store token in sessionStorage', () => {
    let resultResponse: AuthResponse | undefined;

    service.login('manager@restaurant.com', 'Secret123!').subscribe((res) => {
      resultResponse = res;
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'manager@restaurant.com',
      password: 'Secret123!',
    });
    req.flush(mockAuthResponse);

    expect(resultResponse).toEqual(mockAuthResponse);
    expect(service.getAccessToken()).toBe('mock-jwt-token-xyz');
    expect(service.isAuthenticated()).toBe(true);
    expect(service.currentUser()?.email).toBe('manager@restaurant.com');
    expect(service.getUserRole()).toBe('STAFF');
    expect(service.isStaffOrAdmin()).toBe(true);
    expect(service.isCustomer()).toBe(false);
  });

  it('should not store token when login fails', () => {
    let errorOccurred = false;

    service.login('manager@restaurant.com', 'WrongPass').subscribe({
      next: () => {
        throw new Error('Login should have failed');
      },
      error: () => {
        errorOccurred = true;
      },
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(errorOccurred).toBe(true);
    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should validate current user session via GET /api/auth/me', () => {
    // Seed session
    sessionStorage.setItem('staff_auth_token', 'valid-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    let fetchedUser: AuthUser | null = null;
    service.getCurrentUser().subscribe((user) => {
      fetchedUser = user;
    });

    const req = httpMock.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');

    const meUser: AuthUser = {
      id: 10,
      name: 'Staff Manager',
      email: 'manager@restaurant.com',
      role: 'ROLE_STAFF',
    };
    req.flush(meUser);

    expect((fetchedUser as AuthUser | null)?.role).toBe('STAFF');
    expect(service.currentUser()?.role).toBe('STAFF');
    expect(service.isStaffOrAdmin()).toBe(true);
  });

  it('should clear session if /api/auth/me fails', () => {
    sessionStorage.setItem('staff_auth_token', 'invalid-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    let fetchedUser: AuthUser | null = undefined as any;
    service.getCurrentUser().subscribe((user) => {
      fetchedUser = user;
    });

    const req = httpMock.expectOne('/api/auth/me');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(fetchedUser).toBeNull();
    expect(service.getAccessToken()).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('should treat token as expired after 1 hour (3600000ms)', () => {
    const expiredTimestamp = Date.now() - 3600001;
    sessionStorage.setItem('staff_auth_token', 'old-token');
    sessionStorage.setItem(
      'staff_auth_timestamp',
      expiredTimestamp.toString()
    );

    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should identify customer role correctly and evaluate hasRole', () => {
    const customerResponse: AuthResponse = {
      accessToken: 'customer-token',
      tokenType: 'Bearer',
      id: 5,
      name: 'Customer Dave',
      email: 'dave@example.com',
      role: 'ROLE_CUSTOMER',
    };

    service.login('dave@example.com', 'Pass123!').subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    req.flush(customerResponse);

    expect(service.isCustomer()).toBe(true);
    expect(service.isStaffOrAdmin()).toBe(false);
    expect(service.hasRole(['CUSTOMER'])).toBe(true);
    expect(service.hasRole(['STAFF', 'ADMIN'])).toBe(false);
  });

  it('should clear session upon client-side logout', () => {
    sessionStorage.setItem('staff_auth_token', 'active-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    service.logout();

    expect(service.getAccessToken()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.currentUser()).toBeNull();
  });
});
