export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  authority?: string;
  authorities?: Array<string | { authority: string }>;
}

/**
 * Normalizes role string or Spring authority to canonical UserRole ('CUSTOMER' | 'STAFF' | 'ADMIN').
 * Handles raw role enum values (CUSTOMER, STAFF, ADMIN) as well as Spring Security authorities
 * with 'ROLE_' prefix (e.g. ROLE_CUSTOMER, ROLE_STAFF, ROLE_ADMIN).
 */
export function normalizeRole(roleOrAuthority?: string | null): UserRole | null {
  if (!roleOrAuthority || typeof roleOrAuthority !== 'string') {
    return null;
  }
  const clean = roleOrAuthority.trim().toUpperCase();
  const stripped = clean.startsWith('ROLE_') ? clean.substring(5) : clean;

  if (stripped === 'CUSTOMER' || stripped === 'STAFF' || stripped === 'ADMIN') {
    return stripped as UserRole;
  }

  return null;
}

/**
 * Resolves the canonical UserRole from an AuthUser object or a raw role/authority string.
 */
export function extractUserRole(userOrRole?: AuthUser | string | null): UserRole | null {
  if (!userOrRole) {
    return null;
  }
  if (typeof userOrRole === 'string') {
    return normalizeRole(userOrRole);
  }
  if (userOrRole.role) {
    const role = normalizeRole(userOrRole.role);
    if (role) return role;
  }
  if (userOrRole.authority) {
    const role = normalizeRole(userOrRole.authority);
    if (role) return role;
  }
  if (Array.isArray(userOrRole.authorities) && userOrRole.authorities.length > 0) {
    for (const item of userOrRole.authorities) {
      const val = typeof item === 'string' ? item : item?.authority;
      const role = normalizeRole(val);
      if (role) return role;
    }
  }
  return null;
}
