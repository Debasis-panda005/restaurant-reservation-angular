import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ReservationDetail } from './reservation-detail';
import { BackendReservation } from '../reservation-list/reservation-list';

describe('ReservationDetail', () => {
  let component: ReservationDetail;
  let fixture: ComponentFixture<ReservationDetail>;
  let httpMock: HttpTestingController;

  const mockPendingReservation: BackendReservation = {
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
    reservationDateTime: '2026-10-01T18:30:00',
    status: 'PENDING',
    specialRequests: 'Booth seating requested.',
  };

  const mockConfirmedReservation: BackendReservation = {
    ...mockPendingReservation,
    status: 'CONFIRMED',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservationDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '1001' }),
            },
          },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReservationDetail);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load reservation details from API on initialization via GET /api/staff/reservations/:id', () => {
    expect(component.isLoading).toBe(true);

    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations/1001');
    expect(req.request.method).toBe('GET');
    req.flush(mockPendingReservation);

    expect(component.isLoading).toBe(false);
    expect(component.reservation).toBeTruthy();
    expect(component.reservation?.customerName).toBe('Sarah Jenkins');
    expect(component.reservation?.status).toBe('Pending');
    expect(component.errorMessage).toBe('');
  });

  it('should set reservation to null when API returns 404 Not Found', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations/1001');
    req.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isLoading).toBe(false);
    expect(component.reservation).toBeNull();
  });

  it('should handle non-404 API error gracefully when loading reservation', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/reservations/1001');
    req.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isLoading).toBe(false);
    expect(component.reservation).toBeNull();
    expect(component.errorMessage).toContain('Unable to load reservation details');
  });

  it('should confirm reservation via PUT /api/staff/reservations/:id', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('/api/staff/reservations/1001');
    loadReq.flush(mockPendingReservation);

    component.confirmReservation();
    expect(component.isUpdating).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30:00',
      status: 'CONFIRMED',
    });
    putReq.flush({
      ...mockPendingReservation,
      status: 'CONFIRMED',
    });

    expect(component.isUpdating).toBe(false);
    expect(component.reservation?.status).toBe('Confirmed');
    expect(component.errorMessage).toBe('');
  });

  it('should reject reservation via PUT /api/staff/reservations/:id', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('/api/staff/reservations/1001');
    loadReq.flush(mockPendingReservation);

    component.rejectReservation();
    expect(component.isUpdating).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30:00',
      status: 'REJECTED',
    });
    putReq.flush({
      ...mockPendingReservation,
      status: 'REJECTED',
    });

    expect(component.isUpdating).toBe(false);
    expect(component.reservation?.status).toBe('Rejected');
  });

  it('should complete reservation via PUT /api/staff/reservations/:id', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('/api/staff/reservations/1001');
    loadReq.flush(mockConfirmedReservation);

    component.completeReservation();
    expect(component.isUpdating).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30:00',
      status: 'COMPLETED',
    });
    putReq.flush({
      ...mockConfirmedReservation,
      status: 'COMPLETED',
    });

    expect(component.isUpdating).toBe(false);
    expect(component.reservation?.status).toBe('Completed');
  });

  it('should cancel reservation via PUT /api/staff/reservations/:id', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('/api/staff/reservations/1001');
    loadReq.flush(mockConfirmedReservation);

    component.cancelReservation();
    expect(component.isUpdating).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30:00',
      status: 'CANCELLED',
    });
    putReq.flush({
      ...mockConfirmedReservation,
      status: 'CANCELLED',
    });

    expect(component.isUpdating).toBe(false);
    expect(component.reservation?.status).toBe('Cancelled');
  });

  it('should handle status update error and preserve previous status', () => {
    fixture.detectChanges();
    const loadReq = httpMock.expectOne('/api/staff/reservations/1001');
    loadReq.flush(mockPendingReservation);

    component.confirmReservation();

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    putReq.error(new ProgressEvent('Network Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isUpdating).toBe(false);
    expect(component.reservation?.status).toBe('Pending');
    expect(component.errorMessage).toContain('Failed to update status to Confirmed');
  });

  it('should render reservation details in DOM when loaded successfully', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/staff/reservations/1001');
    req.flush(mockPendingReservation);
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('.detail-loading');
    expect(loadingEl).toBeNull();

    const titleEl = fixture.nativeElement.querySelector('.page-title');
    expect(titleEl?.textContent).toContain('Reservation Details');

    const badgeEl = fixture.nativeElement.querySelector('.status-badge');
    expect(badgeEl?.textContent?.trim()).toBe('Pending');

    const cardEl = fixture.nativeElement.querySelector('.detail-card');
    expect(cardEl).toBeTruthy();
    expect(cardEl.textContent).toContain('Sarah Jenkins');
  });

  it('should render not found state in DOM when API returns 404', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/staff/reservations/1001');
    req.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });
    fixture.detectChanges();

    const loadingEl = fixture.nativeElement.querySelector('.detail-loading');
    expect(loadingEl).toBeNull();

    const notFoundEl = fixture.nativeElement.querySelector('.section-title');
    expect(notFoundEl?.textContent).toContain('Reservation Not Found');
  });

  it('should open edit form pre-populated with reservation details on startEdit()', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    expect(component.isEditing).toBe(false);

    component.startEdit();

    expect(component.isEditing).toBe(true);
    expect(component.editReservationForm.value).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30',
    });
  });

  it('should cancel edit mode when cancelEdit() is called', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.startEdit();
    expect(component.isEditing).toBe(true);

    component.cancelEdit();
    expect(component.isEditing).toBe(false);
  });

  it('should submit PUT /api/staff/reservations/:id with updated details and preserve current status', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.startEdit();
    component.editReservationForm.setValue({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 6,
      reservationDateTime: '2026-10-01T20:00',
    });

    component.onEditReservationSubmit();
    expect(component.isEditSubmitting).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 6,
      reservationDateTime: '2026-10-01T20:00:00',
      status: 'PENDING',
    });

    const updatedResponse: BackendReservation = {
      ...mockPendingReservation,
      numberOfGuests: 6,
      reservationDateTime: '2026-10-01T20:00:00',
    };
    putReq.flush(updatedResponse);

    expect(component.isEditSubmitting).toBe(false);
    expect(component.isEditing).toBe(false);
    expect(component.reservation?.guests).toBe(6);
    expect(component.reservation?.time).toBe('20:00');
  });

  it('should preserve CONFIRMED status when editing confirmed reservation', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockConfirmedReservation);

    component.startEdit();
    component.editReservationForm.patchValue({
      numberOfGuests: 5,
    });

    component.onEditReservationSubmit();

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.body.status).toBe('CONFIRMED');
    putReq.flush({
      ...mockConfirmedReservation,
      numberOfGuests: 5,
    });

    expect(component.reservation?.status).toBe('Confirmed');
  });

  it('should handle error on reservation update and preserve form input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.startEdit();
    component.editReservationForm.setValue({
      restaurantId: 999,
      customerId: 101,
      numberOfGuests: 8,
      reservationDateTime: '2026-10-01T20:00',
    });

    component.onEditReservationSubmit();

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    putReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isEditSubmitting).toBe(false);
    expect(component.isEditing).toBe(true);
    expect(component.editFormErrorMessage).toContain(
      'Restaurant or reservation not found'
    );
    expect(component.editReservationForm.value.restaurantId).toBe(999);
    expect(component.editReservationForm.value.numberOfGuests).toBe(8);
  });

  it('should show delete confirmation prompt on promptDelete() and cancel on cancelDelete()', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    expect(component.isDeletePromptVisible).toBe(false);

    component.promptDelete();
    expect(component.isDeletePromptVisible).toBe(true);

    component.cancelDelete();
    expect(component.isDeletePromptVisible).toBe(false);
  });

  it('should call DELETE /api/staff/reservations/:id on confirmDelete() and navigate to list on success', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.promptDelete();
    component.confirmDelete();
    expect(component.isDeleting).toBe(true);

    const deleteReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    expect(component.isDeleting).toBe(false);
    expect(component.isDeletePromptVisible).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/staff/reservations']);
  });

  it('should handle DELETE error gracefully without hiding reservation or navigating', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.confirmDelete();

    const deleteReq = httpMock.expectOne('/api/staff/reservations/1001');
    deleteReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isDeleting).toBe(false);
    expect(component.isDeletePromptVisible).toBe(false);
    expect(component.reservation).toBeTruthy();
    expect(component.errorMessage).toContain('Failed to delete reservation #1001');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should query /api/staff/reservations/available-tables on fetchAvailableTables() with excludeReservationId', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.startEdit();
    component.fetchAvailableTables();
    expect(component.isLoadingAvailableTables).toBe(true);

    const tablesReq = httpMock.expectOne(
      '/api/staff/reservations/available-tables?restaurantId=1&guests=4&reservationDateTime=2026-10-01T18:30:00&excludeReservationId=1001'
    );
    expect(tablesReq.request.method).toBe('GET');
    tablesReq.flush([
      { id: 4, tableNumber: 'T-04', capacity: 4, status: 'Available' },
    ]);

    expect(component.isLoadingAvailableTables).toBe(false);
    expect(component.availableTables.length).toBe(1);
    expect(component.availableTables[0].tableNumber).toBe('T-04');
  });

  it('should include selected tableId in PUT /api/staff/reservations/:id when table is changed during edit', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/reservations/1001').flush(mockPendingReservation);

    component.startEdit();
    component.editReservationForm.setValue({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30',
    });
    component.editTableControl.setValue(4);

    component.onEditReservationSubmit();
    expect(component.isEditSubmitting).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/reservations/1001');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 101,
      numberOfGuests: 4,
      reservationDateTime: '2026-10-01T18:30:00',
      status: 'PENDING',
      tableId: 4,
    });
    putReq.flush({
      ...mockPendingReservation,
      tableId: 4,
      tableNumber: 'T-04',
    });

    expect(component.isEditSubmitting).toBe(false);
    expect(component.isEditing).toBe(false);
    expect(component.reservation?.tableNumber).toBe('T-04');
  });
});
