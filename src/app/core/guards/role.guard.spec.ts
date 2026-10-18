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
import { roleGuard, staffRoleGuard } from './role.guard';
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

  it('should redirect unauthenticated users to /staff/login', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'staff',
      'login',
    ]);
  });

  it('should allow access for STAFF role', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should allow access for ADMIN role', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('ADMIN');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should strictly bar CUSTOMER role and redirect to /staff/login?reason=customer-denied', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('CUSTOMER');

    const result = TestBed.runInInjectionContext(() =>
      roleGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'staff',
      'login',
    ]);
    expect(tree.queryParams['reason']).toBe('customer-denied');
  });

  it('should support custom role requirements from route.data', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    // Route requiring ADMIN only
    const adminOnlySnapshot = createRouteSnapshot({ roles: ['ADMIN'] });

    const staffResult = TestBed.runInInjectionContext(() =>
      roleGuard(adminOnlySnapshot, createStateSnapshot('/staff/admin-settings'))
    );
    expect(staffResult instanceof UrlTree).toBe(true);
    expect((staffResult as UrlTree).queryParams['reason']).toBe('customer-denied');

    // With ADMIN role
    vi.spyOn(authService, 'getUserRole').mockReturnValue('ADMIN');
    const adminResult = TestBed.runInInjectionContext(() =>
      roleGuard(adminOnlySnapshot, createStateSnapshot('/staff/admin-settings'))
    );
    expect(adminResult).toBe(true);
  });

  it('staffRoleGuard alias should function identically to roleGuard', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);
    vi.spyOn(authService, 'getUserRole').mockReturnValue('STAFF');

    const result = TestBed.runInInjectionContext(() =>
      staffRoleGuard(createRouteSnapshot(), createStateSnapshot('/staff/tables'))
    );

    expect(result).toBe(true);
  });
});
