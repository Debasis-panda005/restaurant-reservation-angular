import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Login } from './login';
import { AuthService } from '../../core/services/auth.service';

describe('Login Component (Unified Portal)', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let router: Router;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockCustomerResponse = {
    accessToken: 'mock-customer-token',
    tokenType: 'Bearer',
    id: 101,
    name: 'Customer Alice',
    email: 'alice@example.com',
    role: 'CUSTOMER',
  };

  const mockStaffResponse = {
    accessToken: 'mock-staff-token',
    tokenType: 'Bearer',
    id: 201,
    name: 'Staff Bob',
    email: 'bob@restaurant.com',
    role: 'STAFF',
  };

  const mockAdminResponse = {
    accessToken: 'mock-admin-token',
    tokenType: 'Bearer',
    id: 301,
    name: 'Admin Boss',
    email: 'boss@restaurant.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should create component with empty invalid form initially', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.controls.email.value).toBe('');
    expect(component.loginForm.controls.password.value).toBe('');
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBeNull();
  });

  it('should validate email format and required password', () => {
    const emailCtrl = component.emailControl;
    const passCtrl = component.passwordControl;

    emailCtrl.setValue('invalid-email-address');
    passCtrl.setValue('');
    expect(emailCtrl.hasError('email')).toBe(true);
    expect(passCtrl.hasError('required')).toBe(true);
    expect(component.loginForm.valid).toBe(false);

    emailCtrl.setValue('valid@example.com');
    passCtrl.setValue('ValidPassword123');
    expect(emailCtrl.valid).toBe(true);
    expect(passCtrl.valid).toBe(true);
    expect(component.loginForm.valid).toBe(true);
  });

  it('should not call login API if form is submitted while invalid', () => {
    component.onSubmit();
    httpMock.expectNone('/api/auth/login');
  });

  it('should authenticate CUSTOMER and navigate to customer dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'alice@example.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'alice@example.com',
      password: 'Password123!',
    });
    req.flush(mockCustomerResponse);

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/dashboard']);
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBeNull();
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isCustomer()).toBe(true);
  });

  it('should redirect CUSTOMER to returnUrl when returnUrl starts with /customer', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key) => {
      if (key === 'returnUrl') return '/customer/reservations';
      return null;
    });

    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.setValue({
      email: 'alice@example.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockCustomerResponse);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/customer/reservations');
  });

  it('should authenticate STAFF and navigate to staff dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'bob@restaurant.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockStaffResponse);

    expect(navigateSpy).toHaveBeenCalledWith(['/staff/dashboard']);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isStaffOrAdmin()).toBe(true);
  });

  it('should authenticate ADMIN and navigate to staff dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'boss@restaurant.com',
      password: 'AdminPassword123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockAdminResponse);

    expect(navigateSpy).toHaveBeenCalledWith(['/staff/dashboard']);
    expect(authService.isAuthenticated()).toBe(true);
    expect(authService.isStaffOrAdmin()).toBe(true);
  });

  it('should redirect STAFF to returnUrl when returnUrl starts with /staff', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key) => {
      if (key === 'returnUrl') return '/staff/queue';
      return null;
    });

    const navigateByUrlSpy = vi.spyOn(router, 'navigateByUrl');

    component.loginForm.setValue({
      email: 'bob@restaurant.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockStaffResponse);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/staff/queue');
  });

  it('should fail safely and log out if backend returns unrecognized role', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    const logoutSpy = vi.spyOn(authService, 'logout');

    component.loginForm.setValue({
      email: 'weird@example.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush({
      ...mockCustomerResponse,
      role: 'SUPER_GUEST_UNSUPPORTED',
    });

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('Unrecognized or unsupported account role');
  });

  it('should display error on 401 Unauthorized', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'alice@example.com',
      password: 'WrongPassword!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Invalid email or password. Please try again.');
  });

  it('should display connection error when backend is unreachable (status 0)', () => {
    component.loginForm.setValue({
      email: 'alice@example.com',
      password: 'Password123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.error(new ProgressEvent('NetworkError'), {
      status: 0,
      statusText: 'Unknown Error',
    });

    expect(component.errorMessage).toContain('Unable to connect to the authentication server');
  });

  it('should display message for access_denied query parameter', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key) => {
      if (key === 'reason') return 'access_denied';
      return null;
    });

    component.ngOnInit();

    expect(component.errorMessage).toContain('Access denied');
  });

  it('should display message for customer-denied query parameter', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key) => {
      if (key === 'reason') return 'customer-denied';
      return null;
    });

    component.ngOnInit();

    expect(component.errorMessage).toContain('Customer accounts cannot access the Staff/Admin portal');
  });

  it('should redirect already authenticated customer to customer dashboard on init', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('CUSTOMER');

    component.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith(['/customer/dashboard']);
  });

  it('should redirect already authenticated staff to staff dashboard on init', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    component.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith(['/staff/dashboard']);
  });
});
