import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional guard that ensures the user is authenticated with an active session.
 * If unauthenticated or token is expired, redirects to the common login page (/login).
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  const queryParams =
    state.url && state.url !== '/login' && state.url !== '/staff/login'
      ? { returnUrl: state.url }
      : undefined;

  return router.createUrlTree(['/login'], { queryParams });
};
