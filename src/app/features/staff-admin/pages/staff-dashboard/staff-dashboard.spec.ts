import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { StaffDashboard } from './staff-dashboard';

describe('StaffDashboard', () => {
  let component: StaffDashboard;
  let fixture: ComponentFixture<StaffDashboard>;
  let httpMock: HttpTestingController;

  const mockReservations = [
    { id: 1, status: 'PENDING' },
    { id: 2, status: 'CONFIRMED' },
    { id: 3, status: 'Pending' },
    { id: 4, status: 'CANCELLED' },
  ];

  const mockTables = [
    { id: 1, tableNumber: 'T-01', status: 'AVAILABLE' },
    { id: 2, tableNumber: 'T-02', status: 'OCCUPIED' },
    { id: 3, tableNumber: 'T-03', status: 'Available' },
    { id: 4, tableNumber: 'T-04', status: 'RESERVED' },
    { id: 5, tableNumber: 'T-05', active: true },
  ];

  const mockQueue = [
    { id: 1, status: 'WAITING' },
    { id: 2, status: 'Called' },
    { id: 3, status: 'SEATED' },
    { id: 4, status: 'CANCELLED' },
    { id: 5, status: 'WAITING' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StaffDashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StaffDashboard);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify({ ignoreCancelled: true });
  });

  it('should create and load dashboard statistics from confirmed API endpoints via forkJoin', () => {
    expect(component.isLoading).toBe(true);

    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    const queueReq = httpMock.expectOne('/api/staff/queue');

    expect(resReq.request.method).toBe('GET');
    expect(tablesReq.request.method).toBe('GET');
    expect(queueReq.request.method).toBe('GET');

    resReq.flush(mockReservations);
    tablesReq.flush(mockTables);
    queueReq.flush(mockQueue);

    expect(component.isLoading).toBe(false);
    expect(component.totalReservations).toBe(4);
    expect(component.pendingReservations).toBe(2);
    expect(component.availableTables).toBe(3);
    expect(component.currentQueue).toBe(3);
    expect(component.errorMessage).toBe('');
  });

  it('should handle empty datasets without error', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    const queueReq = httpMock.expectOne('/api/staff/queue');

    resReq.flush([]);
    tablesReq.flush([]);
    queueReq.flush([]);

    expect(component.isLoading).toBe(false);
    expect(component.totalReservations).toBe(0);
    expect(component.pendingReservations).toBe(0);
    expect(component.availableTables).toBe(0);
    expect(component.currentQueue).toBe(0);
    expect(component.errorMessage).toBe('');
  });

  it('should handle API error gracefully and display error message', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    const queueReq = httpMock.expectOne('/api/staff/queue');

    resReq.error(new ProgressEvent('Network error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Unable to load dashboard data. Check that the backend is running.'
    );
    expect(component.totalReservations).toBe(0);
    expect(component.pendingReservations).toBe(0);
    expect(component.availableTables).toBe(0);
    expect(component.currentQueue).toBe(0);
  });

  it('should request restaurant-specific endpoints when restaurantId query param is present', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (param: string) => (param === 'restaurantId' ? '2' : null)
    );

    component.fetchDashboardStats();

    const resReq = httpMock.expectOne(
      '/api/staff/reservations/restaurant/2'
    );
    const tablesReq = httpMock.expectOne(
      '/api/staff/tables/restaurant/2'
    );
    const queueReq = httpMock.expectOne(
      '/api/staff/queue/restaurant/2'
    );

    resReq.flush(mockReservations);
    tablesReq.flush(mockTables);
    queueReq.flush(mockQueue);

    expect(component.totalReservations).toBe(4);
    expect(component.pendingReservations).toBe(2);
    expect(component.availableTables).toBe(3);
    expect(component.currentQueue).toBe(3);
  });

  it('should handle 401 Unauthorized error and display authentication required message', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    httpMock.expectOne('/api/staff/tables');
    httpMock.expectOne('/api/staff/queue');

    resReq.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Authentication required. Please log in again.'
    );
    expect(component.totalReservations).toBe(0);
    expect(component.pendingReservations).toBe(0);
    expect(component.availableTables).toBe(0);
    expect(component.currentQueue).toBe(0);
  });

  it('should handle 403 Forbidden error and display access denied message', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    httpMock.expectOne('/api/staff/tables');
    httpMock.expectOne('/api/staff/queue');

    resReq.error(new ProgressEvent('Forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Access denied. Staff or Admin privileges are required.'
    );
    expect(component.totalReservations).toBe(0);
    expect(component.pendingReservations).toBe(0);
    expect(component.availableTables).toBe(0);
    expect(component.currentQueue).toBe(0);
  });

  it('should handle 404 Not Found error and display not found message', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    httpMock.expectOne('/api/staff/tables');
    httpMock.expectOne('/api/staff/queue');

    resReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Requested restaurant data not found.'
    );
    expect(component.totalReservations).toBe(0);
  });

  it('should safely handle non-array or null responses without throwing errors', () => {
    fixture.detectChanges();

    const resReq = httpMock.expectOne('/api/staff/reservations');
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    const queueReq = httpMock.expectOne('/api/staff/queue');

    resReq.flush(null);
    tablesReq.flush(null);
    queueReq.flush(null);

    expect(component.isLoading).toBe(false);
    expect(component.totalReservations).toBe(0);
    expect(component.pendingReservations).toBe(0);
    expect(component.availableTables).toBe(0);
    expect(component.currentQueue).toBe(0);
    expect(component.errorMessage).toBe('');
  });

  it('should refresh dashboard stats when fetchDashboardStats is called', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush(mockReservations);
    httpMock.expectOne('/api/staff/tables').flush(mockTables);
    httpMock.expectOne('/api/staff/queue').flush(mockQueue);

    expect(component.totalReservations).toBe(4);

    component.fetchDashboardStats();
    expect(component.isLoading).toBe(true);

    httpMock.expectOne('/api/staff/reservations').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);
    httpMock.expectOne('/api/staff/queue').flush([]);

    expect(component.isLoading).toBe(false);
    expect(component.totalReservations).toBe(0);
  });
});
