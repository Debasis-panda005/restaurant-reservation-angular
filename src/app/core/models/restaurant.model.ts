export interface Restaurant {
  id: number;
  name: string;
  location: string;
  cuisine: string;
  description: string;
  rating: number;
  imageUrl?: string;
  tagline?: string;
}
