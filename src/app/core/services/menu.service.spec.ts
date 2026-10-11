import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { MenuService } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MenuService]
    });
    service = TestBed.inject(MenuService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return menu items for a specific restaurant', async () => {
    const items = await firstValueFrom(service.getMenuByRestaurantId(1));
    expect(items.length).toBeGreaterThanOrEqual(8);
    expect(items.every(i => i.restaurantId === 1)).toBe(true);
    expect(items.some(i => i.name === 'Dahi Ke Kebab')).toBe(true);
  });

  it('should return distinct menus for different restaurants', async () => {
    const menu1 = await firstValueFrom(service.getMenuByRestaurantId(1));
    const menu2 = await firstValueFrom(service.getMenuByRestaurantId(2));
    const menu3 = await firstValueFrom(service.getMenuByRestaurantId(3));

    expect(menu1.length).toBeGreaterThanOrEqual(8);
    expect(menu2.length).toBeGreaterThanOrEqual(8);
    expect(menu3.length).toBeGreaterThanOrEqual(8);

    const menu1Names = menu1.map(m => m.name);
    const menu2Names = menu2.map(m => m.name);
    const menu3Names = menu3.map(m => m.name);

    expect(menu1Names).not.toEqual(menu2Names);
    expect(menu2Names).not.toEqual(menu3Names);
    expect(menu1Names).not.toEqual(menu3Names);

    expect(menu2Names).toContain('Prawn Koliwada Crisp');
    expect(menu3Names).toContain('Truffle Mushroom Crostini');
  });

  it('should get a single menu item by ID', async () => {
    const item = await firstValueFrom(service.getMenuItemById(101));
    expect(item).toBeTruthy();
    expect(item?.name).toBe('Dahi Ke Kebab');
    expect(item?.category).toBe('STARTERS');
  });

  it('should return undefined for a non-existent menu item ID', async () => {
    const item = await firstValueFrom(service.getMenuItemById(99999));
    expect(item).toBeUndefined();
  });

  it('should return an empty list for a restaurant without a menu', async () => {
    const items = await firstValueFrom(service.getMenuByRestaurantId(9999));
    expect(items).toEqual([]);
  });

  it('should return the standard menu categories list', () => {
    const categories = service.getCategories();
    expect(categories).toContain('STARTERS');
    expect(categories).toContain('SOUPS');
    expect(categories).toContain('MAIN_COURSE');
    expect(categories).toContain('BREADS');
    expect(categories).toContain('RICE');
    expect(categories).toContain('DESSERTS');
    expect(categories).toContain('BEVERAGES');
  });

  describe('with HttpClient provided', () => {
    let httpService: MenuService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MenuService,
          provideHttpClient(),
          provideHttpClientTesting()
        ]
      });
      httpService = TestBed.inject(MenuService);
      httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
      httpMock.verify();
    });

    it('should fetch menu items from backend API', async () => {
      const mockBackendItems = [
        {
          id: 501,
          restaurantId: 1,
          name: 'Paneer Tikka',
          description: 'Spiced cottage cheese',
          price: 350.0,
          category: 'STARTERS',
          imageUrl: '/images/501.jpg',
          vegetarian: true,
          spicy: true,
          available: true
        }
      ];

      const fetchPromise = firstValueFrom(httpService.getMenuByRestaurantId(1));

      const req = httpMock.expectOne('http://localhost:8080/api/restaurants/1/menu');
      expect(req.request.method).toBe('GET');
      req.flush(mockBackendItems);

      const items = await fetchPromise;
      expect(items.length).toBe(1);
      expect(items[0].name).toBe('Paneer Tikka');
      expect(items[0].price).toBe(350);
      expect(items[0].category).toBe('STARTERS');
    });

    it('should reuse cached menu observable on subsequent calls', () => {
      let callCount = 0;
      httpService.getMenuByRestaurantId(1).subscribe(() => callCount++);
      httpService.getMenuByRestaurantId(1).subscribe(() => callCount++);

      const reqs = httpMock.match('http://localhost:8080/api/restaurants/1/menu');
      expect(reqs.length).toBe(1);
      reqs[0].flush([]);
      expect(callCount).toBe(2);
    });

    it('should handle 404 response by returning an empty list', async () => {
      const fetchPromise = firstValueFrom(httpService.getMenuByRestaurantId(999));

      const req = httpMock.expectOne('http://localhost:8080/api/restaurants/999/menu');
      req.flush({ message: 'Restaurant not found' }, { status: 404, statusText: 'Not Found' });

      const items = await fetchPromise;
      expect(items).toEqual([]);
    });

    it('should fetch single menu item by ID from backend', async () => {
      const mockDto = {
        id: 101,
        restaurantId: 1,
        name: 'Dahi Ke Kebab',
        description: 'Hung curd patties',
        price: 320,
        category: 'STARTERS',
        imageUrl: '/images/101.jpg',
        vegetarian: true,
        spicy: false,
        available: true
      };

      const fetchPromise = firstValueFrom(httpService.getMenuItemById(101));

      const req = httpMock.expectOne('http://localhost:8080/api/menu/101');
      expect(req.request.method).toBe('GET');
      req.flush(mockDto);

      const item = await fetchPromise;
      expect(item).toBeTruthy();
      expect(item?.name).toBe('Dahi Ke Kebab');
    });
  });
});
