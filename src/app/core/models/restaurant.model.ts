/**
 * Restaurant DTO representing the response from the Spring Boot REST API
 * GET /api/restaurants
 */
export interface RestaurantDto {
  id: number;
  name: string;
  address: string;
  phone: string;
  description: string;
  openingTime: string;
  closingTime: string;
}

/**
 * Domain model used throughout the Angular Customer Module.
 * Preserves all UI and presentation fields while mapping backend attributes.
 */
export interface Restaurant {
  id: number;
  name: string;
  address?: string;
  location: string;
  phone?: string;
  cuisine: string;
  description: string;
  rating: number;
  openingTime?: string;
  closingTime?: string;
  imageUrl?: string;
  tagline?: string;
}
