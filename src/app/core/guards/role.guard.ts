import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/auth.model';

/**
 * Functional guard that enforces role-based access control.
 *
 * Rules:
 * - Unauthenticated users are redirected to /staff/login.
 * - Allowed roles default to ['STAFF', 'ADMIN'] unless overridden via `route.data['roles']`.
 * - CUSTOMER accounts are strictly barred and redirected to /staff/login with `reason=customer-denied`.
 * - Other unauthorized roles are blocked similarly.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    const queryParams =
      state.url && state.url !== '/staff/login' ? { returnUrl: state.url } : undefined;
    return router.createUrlTree(['/staff/login'], { queryParams });
  }

  const allowedRoles = (route.data?.['roles'] as UserRole[]) || ['STAFF', 'ADMIN'];
  const userRole = authService.getUserRole();

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Deny access for customer accounts or unauthorized roles
  return router.createUrlTree(['/staff/login'], {
    queryParams: { reason: 'customer-denied' },
  });
};

/**
 * Convenience alias specifically restricting access to STAFF or ADMIN roles.
 */
export const staffRoleGuard: CanActivateFn = roleGuard;
