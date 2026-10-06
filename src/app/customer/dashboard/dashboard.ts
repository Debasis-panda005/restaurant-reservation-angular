import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { QueueService } from '../../core/services/queue.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { NotificationService } from '../../core/services/notification.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';
import { Reservation } from '../../core/models/reservation.model';
import { QueueTicket } from '../../core/models/queue-ticket.model';
import { Notification } from '../../core/models/notification.model';
import { User } from '../../core/models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  // Current logged in user profile
  currentUser: User | null = null;
  customerDisplayName: string = 'Customer';

  // Restaurant data and search/filter states
  restaurants: Restaurant[] = [];
  filteredRestaurants: Restaurant[] = [];
  searchQuery: string = '';
  selectedCuisine: string = 'ALL';
  cuisines: string[] = ['ALL'];

  // Table availability per restaurant { [restaurantId]: { total, available } }
  tableAvailability: { [restaurantId: number]: { total: number; available: number } } = {};

  // Summary counts
  upcomingReservationsCount: number = 0;
  upcomingReservations: Reservation[] = [];
  currentQueueTicket: QueueTicket | null = null;
  favoritesCount: number = 0;
  favoriteRestaurants: Restaurant[] = [];
  unreadNotificationsCount: number = 0;
  latestNotifications: Notification[] = [];

  // View Tables Modal
  selectedRestaurantForTables: Restaurant | null = null;
  selectedRestaurantTables: Table[] = [];
  showTablesModal: boolean = false;

  // Feedback banner
  feedbackMessage: string = '';

  // Mobile navigation toggle
  isMobileMenuOpen: boolean = false;

  constructor(
    private restaurantService: RestaurantService,
    private reservationService: ReservationService,
    private queueService: QueueService,
    private favoriteService: FavoriteService,
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadRestaurants();
    this.loadSummaryData();
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser && this.currentUser.name) {
      this.customerDisplayName = this.currentUser.name;
    }
  }

  loadRestaurants(): void {
    this.restaurantService.getRestaurants().subscribe({
      next: (data) => {
        this.restaurants = data;
        this.filteredRestaurants = data;

        // Build unique cuisine list for filter
        const cuisineSet = new Set<string>();
        data.forEach((r) => {
          if (r.cuisine) {
            cuisineSet.add(r.cuisine);
          }
        });
        this.cuisines = ['ALL', ...Array.from(cuisineSet)];

        // Load table count for each restaurant
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

  loadSummaryData(): void {
    const customerId = this.currentUser ? this.currentUser.id : 1;

    // Upcoming reservations
    this.reservationService.getReservationsByCustomerId(customerId).subscribe({
      next: (reservations) => {
        this.upcomingReservations = reservations;
        this.upcomingReservationsCount = reservations.filter(
          (r) => r.status === 'CONFIRMED' || r.status === 'PENDING'
        ).length;
      },
    });

    // Queue status
    this.queueService.getQueueStatus(customerId).subscribe({
      next: (ticket) => {
        this.currentQueueTicket = ticket || null;
      },
    });

    // Favorites count and list
    this.favoriteService.getFavoriteCount(customerId).subscribe({
      next: (count) => {
        this.favoritesCount = count;
      },
    });

    this.favoriteService.getFavoritesByCustomerId(customerId).subscribe({
      next: (favorites) => {
        const topFavs = favorites.slice(0, 3);
        if (topFavs.length === 0) {
          this.favoriteRestaurants = [];
          return;
        }

        const loaded: Restaurant[] = [];
        let count = 0;
        topFavs.forEach((fav) => {
          this.restaurantService.getRestaurantById(fav.restaurantId).subscribe({
            next: (rest) => {
              count++;
              if (rest) {
                loaded.push(rest);
              }
              if (count === topFavs.length) {
                this.favoriteRestaurants = loaded;
              }
            },
            error: () => {
              count++;
              if (count === topFavs.length) {
                this.favoriteRestaurants = loaded;
              }
            },
          });
        });
      },
    });

    // Unread notifications count and latest updates
    this.notificationService.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
      },
    });

    this.notificationService.getNotificationsByCustomerId(customerId).subscribe({
      next: (notifs) => {
        this.latestNotifications = notifs.slice(0, 3);
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

  openTablesModal(restaurant: Restaurant): void {
    this.selectedRestaurantForTables = restaurant;
    this.restaurantService.getTablesByRestaurantId(restaurant.id).subscribe({
      next: (tables) => {
        this.selectedRestaurantTables = tables;
        this.showTablesModal = true;
      },
    });
  }

  closeTablesModal(): void {
    this.showTablesModal = false;
    this.selectedRestaurantForTables = null;
    this.selectedRestaurantTables = [];
  }

  onReserveClick(restaurant: Restaurant): void {
    this.router.navigate(['/customer/restaurants', restaurant.id]);
  }

  goToRestaurants(): void {
    this.router.navigate(['/customer/restaurants']);
  }

  goToMyReservations(): void {
    this.router.navigate(['/customer/reservations']);
  }

  goToFavorites(): void {
    this.router.navigate(['/customer/favorites']);
  }

  goToNotifications(): void {
    this.router.navigate(['/customer/notifications']);
  }

  goToQueue(): void {
    this.router.navigate(['/customer/queue']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  scrollToSection(sectionId: string): void {
    this.closeMobileMenu();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
