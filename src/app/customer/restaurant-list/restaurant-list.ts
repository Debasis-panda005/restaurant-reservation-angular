import { Component, OnInit, OnDestroy, Optional, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
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
export class RestaurantList implements OnInit, OnDestroy {
  restaurants: Restaurant[] = [];
  filteredRestaurants: Restaurant[] = [];
  searchQuery: string = '';
  selectedCuisine: string = 'ALL';
  cuisines: string[] = ['ALL'];
  tableAvailability: { [restaurantId: number]: { total: number; available: number } } = {};
  isMobileMenuOpen: boolean = false;
  favoriteRestaurantIds = new Set<number>();
  togglingFavoriteIds = new Set<number>();
  unreadNotificationsCount: number = 0;
  isLoading: boolean = false;
  errorMessage: string = '';
  favoriteFeedbackMessage: string = '';

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private restaurantService: RestaurantService,
    private favoriteService: FavoriteService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadRestaurants();
    this.loadFavorites();
    this.loadUnreadCount();
  }

  ngOnDestroy(): void {
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
  }

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
        this.cdr.markForCheck();
      },
    });
  }

  loadFavorites(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    this.favoriteService.getFavoritesByCustomerId(customerId).subscribe({
      next: (favorites) => {
        this.favoriteRestaurantIds = new Set(favorites.map((f) => f.restaurantId));
        this.cdr.markForCheck();
      },
    });
  }

  isFavorite(restaurantId: number): boolean {
    return this.favoriteRestaurantIds.has(restaurantId);
  }

  toggleFavorite(restaurantId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.togglingFavoriteIds.has(restaurantId)) {
      return;
    }
    this.togglingFavoriteIds.add(restaurantId);

    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;

    // Optimistic toggle
    const wasFavorite = this.favoriteRestaurantIds.has(restaurantId);
    if (wasFavorite) {
      this.favoriteRestaurantIds.delete(restaurantId);
    } else {
      this.favoriteRestaurantIds.add(restaurantId);
    }
    this.cdr.markForCheck();

    this.favoriteService
      .toggleFavorite(customerId, restaurantId)
      .pipe(
        finalize(() => {
          this.togglingFavoriteIds.delete(restaurantId);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (isNowFav) => {
          if (isNowFav) {
            this.favoriteRestaurantIds.add(restaurantId);
            this.showFavoriteFeedback('Restaurant added to favorites.');
          } else {
            this.favoriteRestaurantIds.delete(restaurantId);
            this.showFavoriteFeedback('Restaurant removed from favorites.');
          }
          if (this.notificationService) {
            this.notificationService.refreshNotifications().subscribe({ error: () => {} });
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          // Rollback
          if (wasFavorite) {
            this.favoriteRestaurantIds.add(restaurantId);
          } else {
            this.favoriteRestaurantIds.delete(restaurantId);
          }
          if (err?.status === 401) {
            this.showFavoriteFeedback('Please sign in to save favorite restaurants.');
          } else {
            this.showFavoriteFeedback('Unable to update favorites. Please try again.');
          }
          this.cdr.markForCheck();
        },
      });
  }

  showFavoriteFeedback(message: string): void {
    this.favoriteFeedbackMessage = message;
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.favoriteFeedbackMessage = '';
      this.cdr.markForCheck();
    }, 3500);
  }

  loadRestaurants(forceRefresh: boolean = false): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.restaurantService
      .getRestaurants(forceRefresh)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (data) => {
          this.restaurants = data || [];
          this.filteredRestaurants = data || [];

          const cuisineSet = new Set<string>();
          (data || []).forEach((r) => {
            if (r.cuisine) {
              cuisineSet.add(r.cuisine);
            }
          });
          this.cuisines = ['ALL', ...Array.from(cuisineSet)];

          (data || []).forEach((r) => {
            this.restaurantService.getTablesByRestaurantId(r.id).subscribe((tables) => {
              const availableCount = tables.filter((t) => t.available).length;
              this.tableAvailability[r.id] = {
                total: tables.length,
                available: availableCount,
              };
              this.cdr.markForCheck();
            });
          });

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage =
            'Unable to connect to the restaurant concierge. Please ensure the backend is running at http://localhost:8080 and try again.';
          console.error('[RestaurantList] Error loading restaurants from backend API:', err);
          this.cdr.markForCheck();
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
    this.cdr.markForCheck();
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
