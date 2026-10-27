export interface Table {
  id: number;
  restaurantId: number;
  tableNumber: string;
  capacity: number;
  seatingType: 'INDOOR' | 'OUTDOOR' | 'ROOFTOP' | 'WINDOW' | 'AC';
  available: boolean;
}

export type RestaurantTable = Table;
