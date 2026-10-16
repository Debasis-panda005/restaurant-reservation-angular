import { Component, OnInit, Optional, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FavoriteService } from '../../core/services/favorite.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReviewService } from '../../core/services/review.service';
import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites implements OnInit {
  favoriteRestaurants: Restaurant[] = [];
  tableAvailability: { [restaurantId: number]: { total: number; available: number } } = {};
  ratings: { [restaurantId: number]: { rating: number; count: number } } = {};
  unreadNotificationsCount: number = 0;

  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  feedbackMessage: string = '';
  isMobileMenuOpen: boolean = false;

  // Active in-flight remove request tracking to prevent rapid duplicate clicks
  removingIds: Set<number> = new Set<number>();

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private favoriteService: FavoriteService,
    private restaurantService: RestaurantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router,
    @Optional() private notificationService?: NotificationService,
    @Optional() private cdr?: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
    this.loadUnreadCount();
  }

  loadUnreadCount(): void {
    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
        this.cdr?.markForCheck();
      },
    });
  }

  /**
   * Loads the authenticated customer's favorite restaurants via the backend API.
   * Endpoints: GET /api/favorites/my
   */
  loadFavorites(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';
    this.cdr?.markForCheck();

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    this.favoriteService.getFavoritesByCustomerId(customerId).subscribe({
      next: (favorites) => {
        if (!favorites || favorites.length === 0) {
          this.favoriteRestaurants = [];
          this.isLoading = false;
          this.hasError = false;
          this.cdr?.markForCheck();
          return;
        }

        const restaurantList: Restaurant[] = [];
        let loadedCount = 0;

        favorites.forEach((fav) => {
          if (fav.restaurant) {
            restaurantList.push(fav.restaurant);
            this.loadRestaurantMetadata(fav.restaurant.id);
            loadedCount++;
            if (loadedCount === favorites.length) {
              this.favoriteRestaurants = restaurantList;
              this.isLoading = false;
              this.hasError = false;
              this.cdr?.markForCheck();
            }
          } else {
            this.restaurantService.getRestaurantById(fav.restaurantId).subscribe({
              next: (rest) => {
                loadedCount++;
                if (rest) {
                  restaurantList.push(rest);
                  this.loadRestaurantMetadata(rest.id);
                }

                if (loadedCount === favorites.length) {
                  this.favoriteRestaurants = restaurantList;
                  this.isLoading = false;
                  this.hasError = false;
                  this.cdr?.markForCheck();
                }
              },
              error: () => {
                loadedCount++;
                if (loadedCount === favorites.length) {
                  this.favoriteRestaurants = restaurantList;
                  this.isLoading = false;
                  this.hasError = false;
                  this.cdr?.markForCheck();
                }
              },
            });
          }
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.hasError = true;
        this.favoriteRestaurants = [];

        if (err?.status === 401) {
          this.errorMessage = 'Your session has expired. Please sign in to view your favorites.';
        } else if (err?.status === 403) {
          this.errorMessage = 'Access denied. You are not authorized to view favorites.';
        } else if (err?.status === 404) {
          this.errorMessage = 'The favorites service is currently unavailable.';
        } else if (err?.status === 500) {
          this.errorMessage = 'A server error occurred while retrieving your favorites. Please try again later.';
        } else {
          this.errorMessage = 'Unable to connect to the server. Please check your network connection.';
        }
        this.cdr?.markForCheck();
      },
    });
  }

  private loadRestaurantMetadata(restaurantId: number): void {
    // Load live table availability
    this.restaurantService.getTablesByRestaurantId(restaurantId).subscribe({
      next: (tables) => {
        const freeCount = tables.filter((t) => t.available).length;
        this.tableAvailability[restaurantId] = {
          total: tables.length,
          available: freeCount,
        };
        this.cdr?.markForCheck();
      },
    });

    // Load review ratings & review count
    this.reviewService.getRestaurantRating(restaurantId).subscribe({
      next: (rating) => {
        this.reviewService.getReviewCount(restaurantId).subscribe({
          next: (count) => {
            this.ratings[restaurantId] = {
              rating: rating > 0 ? rating : 0,
              count: count,
            };
            this.cdr?.markForCheck();
          },
        });
      },
    });
  }

  /**
   * Remove a restaurant from the authenticated customer's favorites.
   * Endpoint: DELETE /api/favorites/{restaurantId}
   * Implements optimistic removal with rollback upon server error and in-flight click deduplication.
   */
  removeFavorite(restaurantId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    // Prevent duplicate requests caused by rapid repeated clicks
    if (this.removingIds.has(restaurantId)) {
      return;
    }
    this.removingIds.add(restaurantId);

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    // Optimistically update the UI list
    const originalIndex = this.favoriteRestaurants.findIndex((r) => r.id === restaurantId);
    const removedRest = originalIndex !== -1 ? this.favoriteRestaurants[originalIndex] : undefined;
    this.favoriteRestaurants = this.favoriteRestaurants.filter((r) => r.id !== restaurantId);
    this.cdr?.markForCheck();

    this.favoriteService.removeFavorite(customerId, restaurantId).subscribe({
      next: () => {
        this.removingIds.delete(restaurantId);
        this.showFeedback(
          removedRest
            ? `${removedRest.name} removed from favorites.`
            : 'Removed from favorites'
        );
        if (this.notificationService) {
          this.notificationService.refreshNotifications().subscribe({ error: () => {} });
        }
        this.cdr?.markForCheck();
      },
      error: (err) => {
        this.removingIds.delete(restaurantId);

        // Rollback on failure: restore restaurant to its exact position
        if (removedRest && originalIndex !== -1) {
          this.favoriteRestaurants.splice(originalIndex, 0, removedRest);
        }

        if (err?.status === 401) {
          this.showFeedback('Session expired. Please sign in again.');
        } else if (err?.status === 403) {
          this.showFeedback('You are not authorized to modify favorites.');
        } else if (err?.status === 404) {
          this.showFeedback('Restaurant not found in your favorites.');
        } else if (err?.status === 500) {
          this.showFeedback('Server error occurred. Could not remove favorite.');
        } else {
          this.showFeedback('Unable to remove favorite. Please try again.');
        }
        this.cdr?.markForCheck();
      },
    });
  }

  viewRestaurant(restaurantId: number): void {
    this.router.navigate(['/customer/restaurants', restaurantId]);
  }

  reserveTable(restaurantId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/customer/restaurants', restaurantId]);
  }

  exploreRestaurants(): void {
    this.router.navigate(['/customer/restaurants']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private showFeedback(message: string): void {
    this.feedbackMessage = message;
    if (this.feedbackTimer) {
      clearTimeout(this.feedbackTimer);
    }
    this.feedbackTimer = setTimeout(() => {
      this.feedbackMessage = '';
      this.cdr?.markForCheck();
    }, 3500);
    this.cdr?.markForCheck();
  }
}

export default Favorites;
