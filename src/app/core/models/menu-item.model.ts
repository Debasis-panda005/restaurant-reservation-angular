export type MenuCategory =
  | 'STARTERS'
  | 'SOUPS'
  | 'MAIN_COURSE'
  | 'BREADS'
  | 'RICE'
  | 'DESSERTS'
  | 'BEVERAGES';

export interface MenuItem {
  id: number;
  restaurantId: number;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageUrl: string;
  vegetarian: boolean;
  spicy?: boolean;
  available: boolean;
}
