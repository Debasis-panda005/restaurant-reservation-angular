import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ReservationList, BackendReservation } from './reservation-list';

describe('ReservationList', () => {
  let component: ReservationList;
  let fixture: ComponentFixture<ReservationList>;
  let httpMock: HttpTestingController;

  const mockBackendReservations: BackendReservation[] = [
    {
      id: 1001,
      restaurantId: 1,
      customerId: 101,
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah.jenkins@example.com',
      customerPhone: '+1 (555) 123-4567',
      tableNumber: 'T-04',
      date: '2026-10-01',
      time: '18:30',
      numberOfGuests: 4,
      status: 'CONFIRMED',
    },
    {
      id: 1002,
      restaurantId: 1,
      customerId: 5,
      tableId: 2,
      reservationDateTime: '2026-10-02T19:00:00',
      numberOfGuests: 2,
      status: 'PENDING',
    },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReservationList);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load reservations from API on initialization via GET /api/staff/reservations', () => {
    expect(component.isLoading).toBe(true);

    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    expect(req.request.method).toBe('GET');
    req.flush(mockBackendReservations);

    expect(component.isLoading).toBe(false);
    expect(component.reservations.length).toBe(2);
    expect(component.reservations[0].customerName).toBe('Sarah Jenkins');
    expect(component.reservations[0].status).toBe('Confirmed');
    expect(component.reservations[1].customerName).toBe('Customer #5');
    expect(component.reservations[1].tableNumber).toBe('T-2');
    expect(component.reservations[1].date).toBe('2026-10-02');
    expect(component.reservations[1].time).toBe('19:00');
    expect(component.reservations[1].status).toBe('Pending');
    expect(component.errorMessage).toBe('');
  });

  it('should handle API error gracefully when loading reservations', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    req.error(new ProgressEvent('Network error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Unable to load reservations. Check that the backend is running.'
    );
    expect(component.reservations.length).toBe(0);
  });

  it('should handle 401 Unauthorized error and display authentication message', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Authentication required. Please log in again.'
    );
    expect(component.reservations.length).toBe(0);
  });

  it('should handle 403 Forbidden error and display access denied message', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    req.error(new ProgressEvent('Forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Access denied. Staff or Admin privileges are required.'
    );
    expect(component.reservations.length).toBe(0);
  });

  it('should handle null or non-array backend response safely', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    req.flush(null);

    expect(component.isLoading).toBe(false);
    expect(component.reservations.length).toBe(0);
    expect(component.errorMessage).toBe('');
  });

  it('should render empty state message when reservations list is empty', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations');
    req.flush([]);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-message')?.textContent).toContain(
      'No reservations found.'
    );
  });

  it('should request restaurant-specific reservations endpoint when restaurantId query param is present', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (param: string) => (param === 'restaurantId' ? '2' : null)
    );

    component.fetchReservations();

    const req = httpMock.expectOne('/api/staff/reservations/restaurant/2');
    req.flush(mockBackendReservations);

    expect(component.reservations.length).toBe(2);
  });

  it('should toggle Create Reservation form visibility', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush(mockBackendReservations);

    expect(component.isCreateFormVisible).toBe(false);

    component.toggleCreateForm();
    expect(component.isCreateFormVisible).toBe(true);

    component.cancelCreateForm();
    expect(component.isCreateFormVisible).toBe(false);
  });

  it('should validate required fields and minimum values in createReservationForm', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush([]);

    component.toggleCreateForm();
    expect(component.createReservationForm.valid).toBe(false);

    component.createReservationForm.patchValue({
      restaurantId: 0,
      customerId: 0,
      numberOfGuests: 0,
      reservationDateTime: '',
    });
    expect(component.createReservationForm.controls.restaurantId.hasError('min')).toBe(true);
    expect(component.createReservationForm.controls.customerId.hasError('min')).toBe(true);
    expect(component.createReservationForm.controls.numberOfGuests.hasError('min')).toBe(true);
    expect(component.createReservationForm.controls.reservationDateTime.hasError('required')).toBe(true);

    component.createReservationForm.patchValue({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-25T19:30',
    });
    expect(component.createReservationForm.valid).toBe(true);
  });

  it('should submit POST /api/staff/reservations with correct payload and refresh list on success', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush(mockBackendReservations);

    component.toggleCreateForm();
    component.createReservationForm.setValue({
      restaurantId: 1,
      customerId: 202,
      numberOfGuests: 3,
      reservationDateTime: '2026-10-28T19:00',
    });

    component.onCreateReservationSubmit();
    expect(component.isSubmitting).toBe(true);

    const postReq = httpMock.expectOne('/api/staff/reservations');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 202,
      numberOfGuests: 3,
      reservationDateTime: '2026-10-28T19:00:00',
    });

    const newReservation: BackendReservation = {
      id: 1003,
      restaurantId: 1,
      customerId: 202,
      numberOfGuests: 3,
      reservationDateTime: '2026-10-28T19:00:00',
      status: 'PENDING',
    };
    postReq.flush(newReservation);

    expect(component.isSubmitting).toBe(false);
    expect(component.isCreateFormVisible).toBe(false);

    // Verifies list refresh
    const refreshReq = httpMock.expectOne('/api/staff/reservations');
    expect(refreshReq.request.method).toBe('GET');
    refreshReq.flush([...mockBackendReservations, newReservation]);

    expect(component.reservations.length).toBe(3);
    expect(component.reservations[2].customerName).toBe('Customer #202');
  });

  it('should handle 404 Restaurant Not Found on reservation creation and preserve form input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush([]);

    component.toggleCreateForm();
    component.createReservationForm.setValue({
      restaurantId: 999,
      customerId: 101,
      numberOfGuests: 2,
      reservationDateTime: '2026-10-28T19:00',
    });

    component.onCreateReservationSubmit();

    const postReq = httpMock.expectOne('/api/staff/reservations');
    postReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isCreateFormVisible).toBe(true);
    expect(component.createFormErrorMessage).toContain(
      'Restaurant not found. Please verify the Restaurant ID.'
    );
    expect(component.createReservationForm.value.restaurantId).toBe(999);
    expect(component.createReservationForm.value.customerId).toBe(101);
  });

  it('should handle server error on reservation creation and preserve form input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush([]);

    component.toggleCreateForm();
    component.createReservationForm.setValue({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-28T19:00',
    });

    component.onCreateReservationSubmit();

    const postReq = httpMock.expectOne('/api/staff/reservations');
    postReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isCreateFormVisible).toBe(true);
    expect(component.createFormErrorMessage).toContain(
      'Failed to create reservation. Please verify the entered details.'
    );
    expect(component.createReservationForm.value.restaurantId).toBe(1);
    expect(component.createReservationForm.value.numberOfGuests).toBe(4);
  });

  it('should query /api/staff/reservations/available-tables on fetchAvailableTables() when form fields are set', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush([]);

    component.createReservationForm.patchValue({
      restaurantId: 2,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-30T19:00',
    });

    component.fetchAvailableTables();
    expect(component.isLoadingAvailableTables).toBe(true);

    const tablesReq = httpMock.expectOne(
      '/api/staff/reservations/available-tables?restaurantId=2&guests=4&reservationDateTime=2026-10-30T19:00:00'
    );
    expect(tablesReq.request.method).toBe('GET');
    tablesReq.flush([
      { id: 9, tableNumber: 'T-09', capacity: 4, status: 'Available' },
    ]);

    expect(component.isLoadingAvailableTables).toBe(false);
    expect(component.availableTables.length).toBe(1);
    expect(component.availableTables[0].tableNumber).toBe('T-09');
  });

  it('should include selected tableId in POST /api/staff/reservations when table is chosen', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations').flush([]);

    component.toggleCreateForm();
    component.createReservationForm.patchValue({
      restaurantId: 2,
      customerId: 303,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-30T19:00',
    });
    component.tableControl.setValue(9);

    component.onCreateReservationSubmit();
    expect(component.isSubmitting).toBe(true);

    const postReq = httpMock.expectOne('/api/staff/reservations');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      restaurantId: 2,
      customerId: 303,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-30T19:00:00',
      tableId: 9,
    });
    postReq.flush({
      id: 2001,
      restaurantId: 2,
      customerId: 303,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-30T19:00:00',
      tableId: 9,
      tableNumber: 'T-09',
      status: 'PENDING',
    });

    httpMock.expectOne('/api/staff/reservations').flush([]);
    expect(component.isSubmitting).toBe(false);
    expect(component.tableControl.value).toBeNull();
  });
});
