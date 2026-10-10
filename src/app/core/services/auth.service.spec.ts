import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthResponse, CustomerProfileDto } from '../models/user.model';

describe('AuthService', () => {
  let service: AuthService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
    try { sessionStorage.clear(); } catch {}
    try { localStorage.clear(); } catch {}
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should register a new customer and store token and profile', async () => {
    const mockAuthResponse: AuthResponse = {
      token: 'jwt-register-token-xyz',
      type: 'Bearer',
      customer: {
        id: 10,
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '9876543210',
        role: 'CUSTOMER'
      }
    };

    const registerPromise = firstValueFrom(service.register({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password@123',
      phone: '9876543210'
    }));

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/register');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Password@123',
      phone: '9876543210'
    });

    req.flush(mockAuthResponse);

    const result = await registerPromise;
    expect(result.token).toBe('jwt-register-token-xyz');
    expect(service.getToken()).toBe('jwt-register-token-xyz');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.getCurrentUser()?.email).toBe('jane@example.com');
  });

  it('should login customer and store token and profile', async () => {
    const mockAuthResponse: AuthResponse = {
      token: 'jwt-login-token-123',
      type: 'Bearer',
      customer: {
        id: 1,
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        phone: '9876543210',
        role: 'CUSTOMER'
      }
    };

    const loginPromise = firstValueFrom(service.login({
      email: 'john.doe@example.com',
      password: 'Password@123'
    }));

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockAuthResponse);

    const result = await loginPromise;
    expect(result.token).toBe('jwt-login-token-123');
    expect(service.getToken()).toBe('jwt-login-token-123');
    expect(service.isLoggedIn()).toBe(true);
    expect(service.getCurrentUser()?.name).toBe('John Doe');
  });

  it('should propagate error on failed login', async () => {
    let errorReceived: any;
    service.login({
      email: 'wrong@example.com',
      password: 'WrongPassword'
    }).subscribe({
      next: () => expect(true).toBe(false),
      error: (err: any) => {
        errorReceived = err;
      }
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/auth/login');
    req.flush({ message: 'Invalid email or password' }, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeDefined();
    expect(errorReceived.status).toBe(401);
  });

  it('should fetch user profile from GET /api/users/me', async () => {
    const mockProfile: CustomerProfileDto = {
      id: 1,
      fullName: 'John Doe',
      email: 'john.doe@example.com',
      phone: '9876543210',
      role: 'CUSTOMER'
    };

    const profilePromise = firstValueFrom(service.getProfile());
    const req = httpTesting.expectOne('http://localhost:8080/api/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);

    const profile = await profilePromise;
    expect(profile.id).toBe(1);
    expect(profile.name).toBe('John Doe');
  });

  it('should update user profile via PUT /api/users/me', async () => {
    const mockUpdated: CustomerProfileDto = {
      id: 1,
      fullName: 'Johnathan Doe',
      email: 'john.doe@example.com',
      phone: '9998887776',
      role: 'CUSTOMER'
    };

    const updatePromise = firstValueFrom(service.updateProfile({
      fullName: 'Johnathan Doe',
      phone: '9998887776'
    }));

    const req = httpTesting.expectOne('http://localhost:8080/api/users/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      fullName: 'Johnathan Doe',
      phone: '9998887776'
    });
    req.flush(mockUpdated);

    const result = await updatePromise;
    expect(result.name).toBe('Johnathan Doe');
    expect(result.phone).toBe('9998887776');
  });

  it('should clear token and user on logout', () => {
    sessionStorage.setItem('authToken', 'token-to-clear');
    sessionStorage.setItem('currentUser', JSON.stringify({ id: 1, name: 'Test' }));

    expect(service.isLoggedIn()).toBe(true);
    service.logout();
    expect(service.isLoggedIn()).toBe(false);
    expect(service.getToken()).toBeNull();
    expect(service.getCurrentUser()).toBeNull();
  });
});
