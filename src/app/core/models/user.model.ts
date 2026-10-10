export interface User {
  id: number;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  role?: 'CUSTOMER' | 'STAFF' | 'ADMIN' | string;
}

export interface CustomerProfileDto {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  customer: CustomerProfileDto;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

export interface UpdateProfileData {
  fullName: string;
  phone: string;
}
