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
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('authGuard', () => {
  let authService: AuthService;
  let router: Router;

  const createRouteSnapshot = (data = {}): ActivatedRouteSnapshot => {
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

  it('should allow access when user is authenticated', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createStateSnapshot('/staff/dashboard'))
    );

    expect(result).toBe(true);
  });

  it('should redirect unauthenticated users to /login with returnUrl query parameter', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createStateSnapshot('/staff/tables'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.root.children['primary'].segments.map((s) => s.path)).toEqual([
      'login',
    ]);
    expect(tree.queryParams['returnUrl']).toBe('/staff/tables');
  });

  it('should redirect without returnUrl if already targeting /login', () => {
    vi.spyOn(authService, 'isAuthenticated').mockReturnValue(false);

    const result = TestBed.runInInjectionContext(() =>
      authGuard(createRouteSnapshot(), createStateSnapshot('/login'))
    );

    expect(result instanceof UrlTree).toBe(true);
    const tree = result as UrlTree;
    expect(tree.queryParams['returnUrl']).toBeUndefined();
  });
});
