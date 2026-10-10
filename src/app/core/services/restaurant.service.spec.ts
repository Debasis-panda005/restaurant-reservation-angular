import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { RestaurantService } from './restaurant.service';
import { RestaurantDto } from '../models/restaurant.model';

describe('RestaurantService', () => {
  let service: RestaurantService;
  let httpMock: HttpTestingController;

  const mockApiRestaurants: RestaurantDto[] = [
    {
      id: 1,
      name: 'Spice Symphony Bistro',
      address: 'Bhubaneswar, Odisha',
      phone: '9876543210',
      description: 'An elegant dining destination serving Indian cuisine and signature dishes in a premium atmosphere.',
      openingTime: '11:00:00',
      closingTime: '22:30:00'
    },
    {
      id: 5,
      name: 'Coastal Breeze Seafood & Grill',
      address: 'Puri, Odisha',
      phone: '9876543211',
      description: 'A coastal restaurant specializing in seafood, grilled dishes, and regional flavors.',
      openingTime: '11:30:00',
      closingTime: '22:00:00'
    },
    {
      id: 6,
      name: 'Urban Hearth Fine Dine',
      address: 'Cuttack, Odisha',
      phone: '9876543212',
      description: 'A contemporary fine-dining restaurant offering a comfortable atmosphere and a diverse menu.',
      openingTime: '12:00:00',
      closingTime: '23:00:00'
    }
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RestaurantService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(RestaurantService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch restaurants from API and map backend fields correctly', async () => {
    const fetchPromise = firstValueFrom(service.getRestaurants());

    const req = httpMock.expectOne('http://localhost:8080/api/restaurants');
    expect(req.request.method).toBe('GET');
    req.flush(mockApiRestaurants);

    const restaurants = await fetchPromise;

    expect(restaurants.length).toBe(3);

    // Verify Restaurant 1 (Spice Symphony Bistro)
    const r1 = restaurants.find((r) => r.id === 1);
    expect(r1).toBeDefined();
    expect(r1?.name).toBe('Spice Symphony Bistro');
    expect(r1?.address).toBe('Bhubaneswar, Odisha');
    expect(r1?.location).toBe('Bhubaneswar, Odisha');
    expect(r1?.phone).toBe('9876543210');
    expect(r1?.openingTime).toBe('11:00:00');
    expect(r1?.closingTime).toBe('22:30:00');
    expect(r1?.cuisine).toBe('North Indian & Mughlai');
    expect(r1?.rating).toBe(4.8);
    expect(r1?.imageUrl).toContain('photo-1517248135467-4c7edcad34c4');

    // Verify Restaurant 5 (Coastal Breeze Seafood & Grill)
    const r5 = restaurants.find((r) => r.id === 5);
    expect(r5).toBeDefined();
    expect(r5?.name).toBe('Coastal Breeze Seafood & Grill');
    expect(r5?.address).toBe('Puri, Odisha');
    expect(r5?.location).toBe('Puri, Odisha');
    expect(r5?.cuisine).toBe('Seafood & Coastal Odia');
    expect(r5?.rating).toBe(4.6);

    // Verify Restaurant 6 (Urban Hearth Fine Dine)
    const r6 = restaurants.find((r) => r.id === 6);
    expect(r6).toBeDefined();
    expect(r6?.name).toBe('Urban Hearth Fine Dine');
    expect(r6?.address).toBe('Cuttack, Odisha');
    expect(r6?.location).toBe('Cuttack, Odisha');
    expect(r6?.cuisine).toBe('Multi-Cuisine & Italian');
    expect(r6?.rating).toBe(4.7);
  });

  it('should prevent redundant HTTP requests via shareReplay caching', async () => {
    const call1Promise = firstValueFrom(service.getRestaurants());
    const req = httpMock.expectOne('http://localhost:8080/api/restaurants');
    req.flush(mockApiRestaurants);
    await call1Promise;

    // Second call should return cached observable without firing another HTTP request
    const call2Promise = firstValueFrom(service.getRestaurants());
    httpMock.expectNone('http://localhost:8080/api/restaurants');
    const cachedData = await call2Promise;
    expect(cachedData.length).toBe(3);
  });

  it('should invalidate cache and propagate error when API call fails', async () => {
    let errorCaught: any = null;
    service.getRestaurants().subscribe({
      next: () => {},
      error: (err) => {
        errorCaught = err;
      }
    });

    const req = httpMock.expectOne('http://localhost:8080/api/restaurants');
    req.flush('Internal Server Error', { status: 500, statusText: 'Server Error' });

    expect(errorCaught).toBeTruthy();
    expect(errorCaught.status).toBe(500);

    // After failure, next call should attempt fresh request
    service.getRestaurants().subscribe();
    const retryReq = httpMock.expectOne('http://localhost:8080/api/restaurants');
    expect(retryReq).toBeTruthy();
    retryReq.flush(mockApiRestaurants);
  });

  it('should retrieve restaurant by id from cached list', async () => {
    // Populate the cache first
    const listPromise = firstValueFrom(service.getRestaurants());
    const req = httpMock.expectOne('http://localhost:8080/api/restaurants');
    req.flush(mockApiRestaurants);
    await listPromise;

    // Retrieve from cache
    const r5 = await firstValueFrom(service.getRestaurantById(5));
    expect(r5).toBeDefined();
    expect(r5?.id).toBe(5);
    expect(r5?.name).toBe('Coastal Breeze Seafood & Grill');
  });

  it('should return undefined for non-existent restaurant id', async () => {
    const rMissing = await firstValueFrom(service.getRestaurantById(9999));
    expect(rMissing).toBeUndefined();
  });

  it('should return tables for restaurant matching DB IDs (1, 5, 6) and legacy IDs (2, 3)', async () => {
    const t1 = await firstValueFrom(service.getTablesByRestaurantId(1));
    expect(t1.length).toBe(5);

    const t5 = await firstValueFrom(service.getTablesByRestaurantId(5));
    expect(t5.length).toBe(3);

    const t6 = await firstValueFrom(service.getTablesByRestaurantId(6));
    expect(t6.length).toBe(2);

    // Legacy IDs 2 and 3 should also resolve
    const t2 = await firstValueFrom(service.getTablesByRestaurantId(2));
    expect(t2.length).toBe(3);

    const t3 = await firstValueFrom(service.getTablesByRestaurantId(3));
    expect(t3.length).toBe(2);
  });
});
