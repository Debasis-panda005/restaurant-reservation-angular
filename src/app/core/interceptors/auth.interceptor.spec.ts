import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should attach Authorization Bearer header to backend API requests when token exists', () => {
    sessionStorage.setItem('staff_auth_token', 'valid-staff-jwt-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    http.get('http://localhost:8080/api/tables?restaurantId=1').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/tables?restaurantId=1');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer valid-staff-jwt-token'
    );
    req.flush([]);
  });

  it('should attach Authorization Bearer header to relative /api/ requests when token exists', () => {
    sessionStorage.setItem('staff_auth_token', 'valid-staff-jwt-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    http.get('/api/dashboard/stats').subscribe();

    const req = httpMock.expectOne('/api/dashboard/stats');
    expect(req.request.headers.get('Authorization')).toBe(
      'Bearer valid-staff-jwt-token'
    );
    req.flush({});
  });

  it('should NOT attach Authorization header when token does not exist', () => {
    http.get('http://localhost:8080/api/tables?restaurantId=1').subscribe();

    const req = httpMock.expectOne('http://localhost:8080/api/tables?restaurantId=1');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('should NOT attach Authorization header to external third-party origins', () => {
    sessionStorage.setItem('staff_auth_token', 'valid-staff-jwt-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    http.get('https://maps.googleapis.com/maps/api/geocode/json').subscribe();

    const req = httpMock.expectOne('https://maps.googleapis.com/maps/api/geocode/json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should NOT attach Authorization header to login endpoint', () => {
    sessionStorage.setItem('staff_auth_token', 'valid-staff-jwt-token');
    sessionStorage.setItem('staff_auth_timestamp', Date.now().toString());

    http.post('/api/auth/login', { email: 'a', password: 'b' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
