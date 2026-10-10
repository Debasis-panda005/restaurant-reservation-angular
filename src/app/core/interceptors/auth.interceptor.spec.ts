import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpTesting: HttpTestingController;
  let authServiceMock: {
    getToken: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      getToken: vi.fn(),
      logout: vi.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting()
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should attach Authorization Bearer header when token exists on protected requests', () => {
    authServiceMock.getToken.mockReturnValue('sample-test-jwt-token');

    httpClient.get('/api/queue/my/active').subscribe();

    const req = httpTesting.expectOne('/api/queue/my/active');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer sample-test-jwt-token');
    req.flush([]);
  });

  it('should NOT attach Authorization header for /api/auth/login', () => {
    authServiceMock.getToken.mockReturnValue('sample-test-jwt-token');

    httpClient.post('/api/auth/login', { email: 'test@example.com' }).subscribe();

    const req = httpTesting.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should NOT attach Authorization header for /api/auth/register', () => {
    authServiceMock.getToken.mockReturnValue('sample-test-jwt-token');

    httpClient.post('/api/auth/register', { email: 'test@example.com' }).subscribe();

    const req = httpTesting.expectOne('/api/auth/register');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not attach Authorization header when token is null', () => {
    authServiceMock.getToken.mockReturnValue(null);

    httpClient.get('/api/queue/my/active').subscribe();

    const req = httpTesting.expectOne('/api/queue/my/active');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should call authService.logout() when a protected endpoint returns 401 Unauthorized', () => {
    authServiceMock.getToken.mockReturnValue('expired-jwt-token');

    httpClient.get('/api/queue/my/active').subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpTesting.expectOne('/api/queue/my/active');
    req.flush({ message: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.logout).toHaveBeenCalled();
  });

  it('should NOT call authService.logout() when /api/auth/login returns 401 Unauthorized', () => {
    authServiceMock.getToken.mockReturnValue(null);

    httpClient.post('/api/auth/login', {}).subscribe({
      next: () => expect(true).toBe(false),
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceMock.logout).not.toHaveBeenCalled();
  });
});
