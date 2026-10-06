import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RestaurantService } from '../../core/services/restaurant.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { MenuItem } from '../../core/models/menu-item.model';

export interface CategoryOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-restaurant-menu',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './restaurant-menu.html',
  styleUrl: './restaurant-menu.css'
})
export class RestaurantMenu implements OnInit, OnDestroy {
  restaurant: Restaurant | null = null;
  restaurantId: number = 0;
  menuItems: MenuItem[] = [];
  filteredMenuItems: MenuItem[] = [];

  isLoading: boolean = true;
  notFound: boolean = false;
  isMobileMenuOpen: boolean = false;

  selectedCategory: string = 'ALL';
  searchQuery: string = '';

  readonly categories: CategoryOption[] = [
    { key: 'ALL', label: 'All Offerings' },
    { key: 'STARTERS', label: 'Starters' },
    { key: 'SOUPS', label: 'Soups' },
    { key: 'MAIN_COURSE', label: 'Main Course' },
    { key: 'BREADS', label: 'Breads' },
    { key: 'RICE', label: 'Rice' },
    { key: 'DESSERTS', label: 'Desserts' },
    { key: 'BEVERAGES', label: 'Beverages' }
  ];

  fallbackFoodImage: string = 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=80';

  private routeSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restaurantService: RestaurantService,
    private menuService: MenuService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.route.paramMap) {
      this.routeSub = this.route.paramMap.subscribe((params) => {
        const idParam = params.get('id');
        this.handleParamId(idParam);
      });
    } else {
      const idParam = this.route.snapshot?.paramMap?.get('id');
      this.handleParamId(idParam);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  private handleParamId(idParam: string | null | undefined): void {
    if (!idParam || isNaN(Number(idParam))) {
      this.notFound = true;
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }

    this.restaurantId = Number(idParam);
    this.loadRestaurantAndMenu(this.restaurantId);
  }

  loadRestaurantAndMenu(id: number): void {
    this.isLoading = true;
    this.notFound = false;
    this.cdr.markForCheck();

    this.restaurantService.getRestaurantById(id).subscribe({
      next: (rest) => {
        if (!rest) {
          this.notFound = true;
          this.isLoading = false;
          this.cdr.markForCheck();
          return;
        }

        this.restaurant = rest;
        this.menuService.getMenuByRestaurantId(id).subscribe({
          next: (items) => {
            this.menuItems = items || [];
            this.applyFilters();
            this.isLoading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.menuItems = [];
            this.applyFilters();
            this.isLoading = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: () => {
        this.notFound = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  selectCategory(categoryKey: string): void {
    this.selectedCategory = categoryKey;
    this.applyFilters();
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.menuItems];

    if (this.selectedCategory !== 'ALL') {
      result = result.filter((item) => item.category === this.selectedCategory);
    }

    if (this.searchQuery && this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
      );
    }

    this.filteredMenuItems = result;
    this.cdr.markForCheck();
  }

  backToRestaurant(): void {
    if (this.restaurantId) {
      this.router.navigate(['/customer/restaurants', this.restaurantId]);
    } else {
      this.router.navigate(['/customer/restaurants']);
    }
  }

  backToDirectory(): void {
    this.router.navigate(['/customer/restaurants']);
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target && target.src !== this.fallbackFoodImage) {
      target.src = this.fallbackFoodImage;
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
