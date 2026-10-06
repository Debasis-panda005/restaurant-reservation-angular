import { Component, OnInit, Optional } from '@angular/core';
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
  feedbackMessage: string = '';
  isMobileMenuOpen: boolean = false;

  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private favoriteService: FavoriteService,
    private restaurantService: RestaurantService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private router: Router,
    @Optional() private notificationService?: NotificationService
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
      },
    });
  }

  loadFavorites(): void {
    this.isLoading = true;
    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    this.favoriteService.getFavoritesByCustomerId(customerId).subscribe({
      next: (favorites) => {
        if (favorites.length === 0) {
          this.favoriteRestaurants = [];
          this.isLoading = false;
          return;
        }

        const restaurantList: Restaurant[] = [];
        let loadedCount = 0;

        favorites.forEach((fav) => {
          this.restaurantService.getRestaurantById(fav.restaurantId).subscribe({
            next: (rest) => {
              loadedCount++;
              if (rest) {
                restaurantList.push(rest);

                // Load tables availability
                this.restaurantService.getTablesByRestaurantId(rest.id).subscribe({
                  next: (tables) => {
                    const freeCount = tables.filter((t) => t.available).length;
                    this.tableAvailability[rest.id] = {
                      total: tables.length,
                      available: freeCount,
                    };
                  },
                });

                // Load review rating & count
                this.reviewService.getRestaurantRating(rest.id).subscribe({
                  next: (rating) => {
                    this.reviewService.getReviewCount(rest.id).subscribe({
                      next: (count) => {
                        this.ratings[rest.id] = {
                          rating: rating > 0 ? rating : rest.rating,
                          count: count,
                        };
                      },
                    });
                  },
                });
              }

              if (loadedCount === favorites.length) {
                this.favoriteRestaurants = restaurantList;
                this.isLoading = false;
              }
            },
            error: () => {
              loadedCount++;
              if (loadedCount === favorites.length) {
                this.favoriteRestaurants = restaurantList;
                this.isLoading = false;
              }
            },
          });
        });
      },
      error: () => {
        this.isLoading = false;
        this.favoriteRestaurants = [];
      },
    });
  }

  removeFavorite(restaurantId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }

    const currentUser = this.authService.getCurrentUser();
    const customerId = currentUser ? currentUser.id : 1;

    // Optimistically update the UI list
    const removedRest = this.favoriteRestaurants.find((r) => r.id === restaurantId);
    this.favoriteRestaurants = this.favoriteRestaurants.filter((r) => r.id !== restaurantId);

    this.favoriteService.removeFavorite(customerId, restaurantId).subscribe({
      next: () => {
        this.showFeedback(
          removedRest
            ? `${removedRest.name} removed from favorites.`
            : 'Removed from favorites'
        );
      },
      error: () => {
        // Rollback on failure
        if (removedRest) {
          this.favoriteRestaurants.push(removedRest);
        }
        this.showFeedback('Unable to remove favorite. Please try again.');
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
    }, 3500);
  }
}

export default Favorites;
