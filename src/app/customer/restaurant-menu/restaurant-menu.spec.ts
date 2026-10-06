import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { RestaurantMenu } from './restaurant-menu';
import { RestaurantService } from '../../core/services/restaurant.service';
import { MenuService } from '../../core/services/menu.service';
import { AuthService } from '../../core/services/auth.service';
import { Restaurant } from '../../core/models/restaurant.model';
import { MenuItem } from '../../core/models/menu-item.model';

describe('RestaurantMenu', () => {
  let component: RestaurantMenu;
  let fixture: ComponentFixture<RestaurantMenu>;
  let restaurantService: RestaurantService;
  let menuService: MenuService;
  let router: Router;

  const mockRestaurant: Restaurant = {
    id: 1,
    name: 'Spice Symphony Bistro',
    location: 'Bhubaneswar, Odisha',
    cuisine: 'North Indian & Mughlai',
    description: 'Authentic royal curries and tandoor delicacies.',
    rating: 4.8,
    tagline: 'Imperial Flavors & Royal Dining',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
  };

  const mockMenuItems: MenuItem[] = [
    {
      id: 101,
      restaurantId: 1,
      name: 'Dahi Ke Kebab',
      description: 'Hung curd patties infused with green cardamom and coriander.',
      price: 320,
      category: 'STARTERS',
      imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 102,
      restaurantId: 1,
      name: 'Murgh Malai Tikka',
      description: 'Char-grilled chicken tenders marinated in clotted cream and crushed white pepper.',
      price: 480,
      category: 'STARTERS',
      imageUrl: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=600&q=80',
      vegetarian: false,
      spicy: false,
      available: true
    },
    {
      id: 106,
      restaurantId: 1,
      name: 'Paneer Lababdar',
      description: 'Soft cottage cheese cubes in rich onion tomato cashew gravy.',
      price: 440,
      category: 'MAIN_COURSE',
      imageUrl: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=80',
      vegetarian: true,
      spicy: false,
      available: true
    },
    {
      id: 112,
      restaurantId: 1,
      name: 'Kesariya Thandai',
      description: 'Chilled milk infused with hand-ground almonds and Kashmiri saffron.',
      price: 220,
      category: 'BEVERAGES',
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      vegetarian: true,
      available: false
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantMenu],
      providers: [
        provideRouter([]),
        RestaurantService,
        MenuService,
        AuthService,
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => '1'
              }
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantMenu);
    component = fixture.componentInstance;
    restaurantService = TestBed.inject(RestaurantService);
    menuService = TestBed.inject(MenuService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should create the menu component', () => {
    expect(component).toBeTruthy();
  });

  it('2. should load restaurant from route ID', () => {
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));
    vi.spyOn(menuService, 'getMenuByRestaurantId').mockReturnValue(of(mockMenuItems));

    component.loadRestaurantAndMenu(1);
    fixture.detectChanges();

    expect(component.restaurant).toEqual(mockRestaurant);
    expect(component.isLoading).toBe(false);
    expect(component.notFound).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Spice Symphony Bistro');
    expect(compiled.textContent).toContain('North Indian & Mughlai');
    expect(compiled.textContent).toContain('Bhubaneswar, Odisha');
  });

  it('3. should load the correct restaurant menu items', () => {
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));
    vi.spyOn(menuService, 'getMenuByRestaurantId').mockReturnValue(of(mockMenuItems));

    component.loadRestaurantAndMenu(1);
    fixture.detectChanges();

    expect(component.menuItems.length).toBe(4);
    expect(component.filteredMenuItems.length).toBe(4);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dahi Ke Kebab');
    expect(compiled.textContent).toContain('Murgh Malai Tikka');
    expect(compiled.textContent).toContain('Paneer Lababdar');
    expect(compiled.textContent).toContain('Kesariya Thandai');
  });

  it('4. should verify different restaurants load different menus', () => {
    const restaurant2Items: MenuItem[] = [
      {
        id: 201,
        restaurantId: 2,
        name: 'Prawn Koliwada Crisp',
        description: 'Fresh Bay of Bengal tiger prawns in coastal spices.',
        price: 520,
        category: 'STARTERS',
        imageUrl: '',
        vegetarian: false,
        spicy: true,
        available: true
      }
    ];

    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of({ ...mockRestaurant, id: 2, name: 'Coastal Breeze Seafood & Grill' }));
    vi.spyOn(menuService, 'getMenuByRestaurantId').mockReturnValue(of(restaurant2Items));

    component.loadRestaurantAndMenu(2);
    fixture.detectChanges();

    expect(component.menuItems.length).toBe(1);
    expect(component.menuItems[0].name).toBe('Prawn Koliwada Crisp');
    expect(component.menuItems[0].name).not.toBe('Dahi Ke Kebab');
  });

  it('5. should filter menu items by category', () => {
    component.restaurant = mockRestaurant;
    component.menuItems = mockMenuItems;
    component.applyFilters();

    expect(component.filteredMenuItems.length).toBe(4);

    // Filter by STARTERS
    component.selectCategory('STARTERS');
    expect(component.selectedCategory).toBe('STARTERS');
    expect(component.filteredMenuItems.length).toBe(2);
    expect(component.filteredMenuItems.every(i => i.category === 'STARTERS')).toBe(true);

    // Filter by MAIN_COURSE
    component.selectCategory('MAIN_COURSE');
    expect(component.filteredMenuItems.length).toBe(1);
    expect(component.filteredMenuItems[0].name).toBe('Paneer Lababdar');

    // Filter back to ALL
    component.selectCategory('ALL');
    expect(component.filteredMenuItems.length).toBe(4);
  });

  it('6. should filter menu items by food search matching name or description', () => {
    component.restaurant = mockRestaurant;
    component.menuItems = mockMenuItems;

    // Search by name
    component.searchQuery = 'Malai';
    component.onSearchChange();
    expect(component.filteredMenuItems.length).toBe(1);
    expect(component.filteredMenuItems[0].name).toBe('Murgh Malai Tikka');

    // Search by description
    component.searchQuery = 'cardamom';
    component.onSearchChange();
    expect(component.filteredMenuItems.length).toBe(1);
    expect(component.filteredMenuItems[0].name).toBe('Dahi Ke Kebab');
  });

  it('7. should perform case-insensitive search', () => {
    component.restaurant = mockRestaurant;
    component.menuItems = mockMenuItems;

    component.searchQuery = 'mURgH';
    component.onSearchChange();
    expect(component.filteredMenuItems.length).toBe(1);
    expect(component.filteredMenuItems[0].name).toBe('Murgh Malai Tikka');

    component.searchQuery = 'PANEER';
    component.onSearchChange();
    expect(component.filteredMenuItems.length).toBe(1);
    expect(component.filteredMenuItems[0].name).toBe('Paneer Lababdar');
  });

  it('8. should display unavailable items with muted styling and "Currently Unavailable" tag', () => {
    component.restaurant = mockRestaurant;
    component.menuItems = mockMenuItems;
    component.applyFilters();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Currently Unavailable');

    const unavailableCard = compiled.querySelector('.menu-item-card.is-unavailable');
    expect(unavailableCard).toBeTruthy();
    expect(unavailableCard?.textContent).toContain('Kesariya Thandai');
  });

  it('9. should display empty search state with clear search button when no dishes match', () => {
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));
    vi.spyOn(menuService, 'getMenuByRestaurantId').mockReturnValue(of(mockMenuItems));

    component.loadRestaurantAndMenu(1);
    fixture.detectChanges();

    component.searchQuery = 'NonExistentDishXYZ';
    component.onSearchChange();
    fixture.detectChanges();

    expect(component.filteredMenuItems.length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No dishes found');
    expect(compiled.textContent).toContain('Clear Search');

    // Clicking Clear Search should reset results
    component.clearSearch();
    expect(component.searchQuery).toBe('');
    expect(component.filteredMenuItems.length).toBe(mockMenuItems.length);
  });

  it('10. should display "Menu Coming Soon" when restaurant has no menu items', () => {
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(mockRestaurant));
    vi.spyOn(menuService, 'getMenuByRestaurantId').mockReturnValue(of([]));

    component.loadRestaurantAndMenu(1);
    fixture.detectChanges();

    expect(component.menuItems.length).toBe(0);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Menu Coming Soon');
    expect(compiled.textContent).toContain("Please check back later for today's dining selection.");
  });

  it('11. should navigate back to restaurant details on backToRestaurant', () => {
    component.restaurantId = 1;
    const navSpy = vi.spyOn(router, 'navigate');

    component.backToRestaurant();
    expect(navSpy).toHaveBeenCalledWith(['/customer/restaurants', 1]);
  });

  it('12. should handle image fallback gracefully on image error', () => {
    const mockImgElement = document.createElement('img');
    mockImgElement.src = 'https://broken-url.com/food.jpg';

    const mockEvent = {
      target: mockImgElement
    } as unknown as Event;

    component.onImageError(mockEvent);
    expect(mockImgElement.src).toBe(component.fallbackFoodImage);
  });

  it('13. should handle not found restaurant ID', () => {
    vi.spyOn(restaurantService, 'getRestaurantById').mockReturnValue(of(undefined));

    component.loadRestaurantAndMenu(9999);
    fixture.detectChanges();

    expect(component.notFound).toBe(true);
    expect(component.isLoading).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Restaurant Not Found');
  });
});
