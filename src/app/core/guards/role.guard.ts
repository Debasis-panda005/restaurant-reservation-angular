import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

/**
 * Functional guard that enforces role-based access control.
 *
 * Rules:
 * - Unauthenticated users are redirected to /login with returnUrl.
 * - Allowed roles default to ['STAFF', 'ADMIN'] unless overridden via `route.data['roles']`.
 * - CUSTOMER accounts accessing staff/admin routes are blocked and redirected to /login?reason=customer-denied.
 * - STAFF/ADMIN accounts accessing customer routes are safely redirected to /staff/dashboard.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    const queryParams =
      state.url && state.url !== '/login' ? { returnUrl: state.url } : undefined;
    return router.createUrlTree(['/login'], { queryParams });
  }

  const allowedRoles = (route.data?.['roles'] as UserRole[]) || ['STAFF', 'ADMIN'];
  const userRole = authService.getUserRole();

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // If user is a customer attempting to access staff/admin portal
  if (userRole === 'CUSTOMER') {
    return router.createUrlTree(['/login'], {
      queryParams: { reason: 'customer-denied' },
    });
  }

  // If user is staff/admin attempting to access customer portal
  if (userRole === 'STAFF' || userRole === 'ADMIN') {
    return router.createUrlTree(['/staff/dashboard']);
  }

  // Fallback for unknown or unsupported roles
  return router.createUrlTree(['/login'], {
    queryParams: { reason: 'access_denied' },
  });
};

/**
 * Convenience alias specifically restricting access to STAFF or ADMIN roles.
 */
export const staffRoleGuard: CanActivateFn = roleGuard;

/**
 * Convenience alias specifically restricting access to CUSTOMER role.
 */
export const customerRoleGuard: CanActivateFn = roleGuard;
