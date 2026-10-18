import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Functional HTTP interceptor that attaches the Bearer token to backend API calls.
 *
 * Scoping rules:
 * - Only attaches `Authorization: Bearer <token>` to requests targeted to the backend API origin
 *   (`http://localhost:8080/api/` or relative `/api/`).
 * - Never leaks the access token to unrelated third-party or external origins.
 * - Does not attach token to the initial login or registration endpoints.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getAccessToken();

  const isBackendApi =
    req.url.startsWith('http://localhost:8080/api/') ||
    req.url.startsWith('/api/');

  const isLoginOrRegister =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/register');

  if (token && isBackendApi && !isLoginOrRegister) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    return next(authReq);
  }

  return next(req);
};
