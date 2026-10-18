import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { StaffLogin } from './staff-login';
import { AuthService } from '../../../../core/services/auth.service';

describe('StaffLogin', () => {
  let component: StaffLogin;
  let fixture: ComponentFixture<StaffLogin>;
  let router: Router;
  let httpMock: HttpTestingController;
  let authService: AuthService;

  const mockStaffResponse = {
    accessToken: 'valid-staff-token',
    tokenType: 'Bearer',
    id: 1,
    name: 'Admin Staff',
    email: 'staff@restaurant.com',
    role: 'STAFF',
  };

  const mockCustomerResponse = {
    accessToken: 'customer-token',
    tokenType: 'Bearer',
    id: 2,
    name: 'Customer John',
    email: 'customer@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    sessionStorage.clear();

    await TestBed.configureTestingModule({
      imports: [StaffLogin],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    fixture = TestBed.createComponent(StaffLogin);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
    sessionStorage.clear();
  });

  it('should create component with invalid form initially', () => {
    expect(component).toBeTruthy();
    expect(component.loginForm.valid).toBe(false);
    expect(component.loginForm.controls.email.value).toBe('');
    expect(component.loginForm.controls.password.value).toBe('');
  });

  it('should validate email format and required password', () => {
    const emailCtrl = component.loginForm.controls.email;
    const passCtrl = component.loginForm.controls.password;

    emailCtrl.setValue('not-an-email');
    passCtrl.setValue('');
    expect(emailCtrl.hasError('email')).toBe(true);
    expect(passCtrl.hasError('required')).toBe(true);
    expect(component.loginForm.valid).toBe(false);

    emailCtrl.setValue('staff@restaurant.com');
    passCtrl.setValue('SecurePass123!');
    expect(emailCtrl.valid).toBe(true);
    expect(passCtrl.valid).toBe(true);
    expect(component.loginForm.valid).toBe(true);
  });

  it('should not call login API if form is submitted while invalid', () => {
    component.onSubmit();
    httpMock.expectNone('/api/auth/login');
  });

  it('should successfully login and navigate to dashboard for staff user', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'staff@restaurant.com',
      password: 'SecurePass123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      email: 'staff@restaurant.com',
      password: 'SecurePass123!',
    });
    req.flush(mockStaffResponse);

    expect(navigateSpy).toHaveBeenCalledWith(['/staff/dashboard']);
    expect(component.isLoading).toBe(false);
    expect(component.statusMessage).toBeNull();
  });

  it('should reject customer role and not navigate to dashboard', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'customer@example.com',
      password: 'SecurePass123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockCustomerResponse);

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.statusMessage).toContain(
      'Access denied: Customer accounts cannot access the Staff/Admin portal.'
    );
  });

  it('should reject customer authority format (ROLE_CUSTOMER) on login', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'customer@example.com',
      password: 'SecurePass123!',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush({
      ...mockCustomerResponse,
      role: 'ROLE_CUSTOMER',
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.statusMessage).toContain(
      'Access denied: Customer accounts cannot access the Staff/Admin portal.'
    );
  });

  it('should handle login error gracefully without navigating', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');

    component.loginForm.setValue({
      email: 'staff@restaurant.com',
      password: 'WrongPassword',
    });

    component.onSubmit();

    const req = httpMock.expectOne('/api/auth/login');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(navigateSpy).not.toHaveBeenCalled();
    expect(component.isLoading).toBe(false);
    expect(component.statusMessage).toBe(
      'Invalid email or password. Please try again.'
    );
  });

  it('should render error alert in DOM when 401 Unauthorized response is received', () => {
    component.loginForm.setValue({
      email: 'staff@restaurant.com',
      password: 'WrongPassword123',
    });

    component.onSubmit();
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/auth/login');
    req.flush(
      { timestamp: '2026-10-17T15:41:00Z', status: 401, error: 'Unauthorized', path: '/api/auth/login' },
      { status: 401, statusText: 'Unauthorized' }
    );
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.statusMessage).toBe('Invalid email or password. Please try again.');

    const alertEl = fixture.nativeElement.querySelector('.status-alert');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('Invalid email or password. Please try again.');

    const submitBtn = fixture.nativeElement.querySelector('.btn-submit');
    expect(submitBtn.textContent.trim()).toBe('Login');
    expect(submitBtn.disabled).toBe(false);
  });

  it('should display access denied message when queryParam reason is customer-denied', async () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation((key: string) => {
      if (key === 'reason') return 'customer-denied';
      return null;
    });

    const logoutSpy = vi.spyOn(authService, 'logout');
    vi.spyOn(authService, 'isCustomer').mockReturnValue(true);

    component.ngOnInit();

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.statusMessage).toBe(
      'Access denied: Customer accounts cannot access the Staff/Admin portal.'
    );
  });

  it('should redirect already authenticated staff member to dashboard upon visiting login page', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'isStaffOrAdmin').mockReturnValue(true);

    component.ngOnInit();

    expect(navigateSpy).toHaveBeenCalledWith(['/staff/dashboard']);
  });
});
