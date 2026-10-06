import { Component, OnInit, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RestaurantService } from '../../core/services/restaurant.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';

@Component({
  selector: 'app-restaurant-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-list.html',
  styleUrl: './restaurant-list.css',
})
export class RestaurantList implements OnInit {
  restaurants: Restaurant[] = [];
  filteredRestaurants: Restaurant[] = [];
  searchQuery: string = '';
  selectedCuisine: string = 'ALL';
  cuisines: string[] = ['ALL'];
  tableAvailability: { [restaurantId: number]: { total: number; available: number } } = {};
  isMobileMenuOpen: boolean = false;
  favoriteRestaurantIds = new Set<number>();
  unreadNotificationsCount: number = 0;

  constructor(
    private restaurantService: RestaurantService,
    private favoriteService: FavoriteService,
    private authService: AuthService,
    private router: Router,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadFavorites();
    this.loadUnreadCount();
  }

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
      },
    });
  }

  loadFavorites(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.favoriteService.getFavoritesByCustomerId(customerId).subscribe({
      next: (favorites) => {
        this.favoriteRestaurantIds = new Set(favorites.map((f) => f.restaurantId));
      },
    });
  }

  isFavorite(restaurantId: number): boolean {
    return this.favoriteRestaurantIds.has(restaurantId);
  }

  toggleFavorite(restaurantId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    // Optimistic toggle
    if (this.favoriteRestaurantIds.has(restaurantId)) {
      this.favoriteRestaurantIds.delete(restaurantId);
    } else {
      this.favoriteRestaurantIds.add(restaurantId);
    }

    this.favoriteService.toggleFavorite(customerId, restaurantId).subscribe({
      next: (isNowFav) => {
        if (isNowFav) {
          this.favoriteRestaurantIds.add(restaurantId);
        } else {
          this.favoriteRestaurantIds.delete(restaurantId);
        }
      },
      error: () => {
        // Rollback
        if (this.favoriteRestaurantIds.has(restaurantId)) {
          this.favoriteRestaurantIds.delete(restaurantId);
        } else {
          this.favoriteRestaurantIds.add(restaurantId);
        }
      },
    });
  }

  loadRestaurants(): void {
    this.restaurantService.getRestaurants().subscribe({
      next: (data) => {
        this.restaurants = data;
        this.filteredRestaurants = data;

        const cuisineSet = new Set<string>();
        data.forEach((r) => {
          if (r.cuisine) {
            cuisineSet.add(r.cuisine);
          }
        });
        this.cuisines = ['ALL', ...Array.from(cuisineSet)];

        data.forEach((r) => {
          this.restaurantService.getTablesByRestaurantId(r.id).subscribe((tables) => {
            const availableCount = tables.filter((t) => t.available).length;
            this.tableAvailability[r.id] = {
              total: tables.length,
              available: availableCount,
            };
          });
        });
      },
    });
  }

  filterRestaurants(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.filteredRestaurants = this.restaurants.filter((restaurant) => {
      const matchesSearch =
        query === '' ||
        restaurant.name.toLowerCase().includes(query) ||
        restaurant.location.toLowerCase().includes(query) ||
        restaurant.cuisine.toLowerCase().includes(query);

      const matchesCuisine =
        this.selectedCuisine === 'ALL' || restaurant.cuisine === this.selectedCuisine;

      return matchesSearch && matchesCuisine;
    });
  }

  onSearchChange(): void {
    this.filterRestaurants();
  }

  onCuisineChange(cuisine: string): void {
    this.selectedCuisine = cuisine;
    this.filterRestaurants();
  }

  viewDetails(restaurantId: number): void {
    this.router.navigate(['/customer/restaurants', restaurantId]);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
