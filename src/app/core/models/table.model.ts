/**
 * Table DTO representing the response from the Spring Boot REST API
 * GET /api/restaurants/{id}/tables
 */
export interface TableDto {
  id: number;
  tableNumber: string;
  capacity: number;
  active: boolean;
}

export interface Table {
  id: number;
  restaurantId: number;
  tableNumber: string;
  capacity: number;
  seatingType: 'INDOOR' | 'OUTDOOR' | 'ROOFTOP' | 'WINDOW' | 'AC' | string;
  available: boolean;
}

export type RestaurantTable = Table;

