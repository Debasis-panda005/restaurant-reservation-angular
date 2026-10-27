import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { roleGuard, staffRoleGuard, customerRoleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';

describe('roleGuard', () => {
  let authService: AuthService;
  let router: Router;

  const createRouteSnapshot = (data: any = {}): ActivatedRouteSnapshot => {
    return { data } as unknown as ActivatedRouteSnapshot;
  };

  const createStateSnapshot = (url = '/staff/dashboard'): RouterStateSnapshot => {
    return { url } as RouterStateSnapshot;
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    authService = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should redirect unauthenticated users to /login', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'login',
    ]);
  });

  it('should allow access for STAFF role on default staff routes', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should allow access for ADMIN role on default staff routes', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('ADMIN');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should strictly bar CUSTOMER role from staff routes and redirect to /login?reason=customer-denied', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('CUSTOMER');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'login',
    ]);
    expect(tree.queryParams['reason']).toBe('customer-denied');
  });

  it('should allow access for CUSTOMER role on routes with data roles CUSTOMER', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('CUSTOMER');

    const customerRouteSnapshot = createRouteSnapshot({ roles: ['CUSTOMER'] });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(customerRouteSnapshot, createStateSnapshot('/customer/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should safely redirect STAFF to staff dashboard when accessing customer-only routes', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const customerRouteSnapshot = createRouteSnapshot({ roles: ['CUSTOMER'] });

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(customerRouteSnapshot, createStateSnapshot('/customer/dashboard'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'staff',
      'dashboard',
    ]);
  });

  it('should support custom role requirements from route.data (e.g. ADMIN only)', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const adminOnlySnapshot = createRouteSnapshot({ roles: ['ADMIN'] });

    const staffResult = TestBed.runInInjectionContext(() =>
      roleGuard(adminOnlySnapshot, createStateSnapshot('/staff/admin-settings'))
    );
    expect(staffResult instanceof UrlTree).toBe(true);
    expect((staffResult as UrlTree).root.children['primary'].segments.map((s) => s.path)).toEqual([
      'staff',
      'dashboard',
    ]);

    vi.spyOn(authService, 'getUserRole').mockReturnValue('ADMIN');
    const adminResult = TestBed.runInInjectionContext(() =>
      roleGuard(adminOnlySnapshot, createStateSnapshot('/staff/admin-settings'))
    );
    expect(adminResult).toBe(true);
  });

  it('staffRoleGuard and customerRoleGuard aliases should function properly', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const staffResult = TestBed.runInInjectionContext(() =>
      staffRoleGuard(createRouteSnapshot(), createStateSnapshot('/staff/tables'))
    );
    expect(staffResult).toBe(true);

    vi.spyOn(authService, 'getUserRole').mockReturnValue('CUSTOMER');
    const customerResult = TestBed.runInInjectionContext(() =>
      customerRoleGuard(createRouteSnapshot({ roles: ['CUSTOMER'] }), createStateSnapshot('/customer/dashboard'))
    );
    expect(customerResult).toBe(true);
  });
});
