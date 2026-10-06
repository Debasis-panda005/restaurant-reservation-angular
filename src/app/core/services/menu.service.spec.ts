import { TestBed } from '@angular/core/testing';
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
});
