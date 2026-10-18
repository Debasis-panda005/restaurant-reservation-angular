import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { QueueManagement, BackendQueueItem } from './queue-management';
import { RestaurantTable } from '../table-management/table-management';

describe('QueueManagement', () => {
  let component: QueueManagement;
  let fixture: ComponentFixture<QueueManagement>;
  let httpMock: HttpTestingController;

  const mockQueueData: BackendQueueItem[] = [
    {
      id: 1,
      ticketNumber: 'Q-001',
      customerName: 'Rahul Sharma',
      numberOfPeople: 2,
      joinedTime: '18:20',
      position: 1,
      status: 'WAITING',
      assignedTable: '—',
    },
    {
      id: 2,
      ticketNumber: 'Q-002',
      customerName: 'Priya Das',
      numberOfPeople: 2,
      joinedTime: '18:25',
      position: 2,
      status: 'CALLED',
      assignedTable: '—',
    },
    {
      id: 3,
      ticketNumber: 'Q-003',
      customerName: 'Sneha Rao',
      numberOfPeople: 4,
      joinedTime: '18:30',
      position: 0,
      status: 'SEATED',
      assignedTable: 'T-03',
    },
  ];

  const mockTablesData: RestaurantTable[] = [
    { id: 1, tableNumber: 'T-01', capacity: 2, status: 'Available' },
    { id: 2, tableNumber: 'T-02', capacity: 4, status: 'Occupied' },
    { id: 3, tableNumber: 'T-03', capacity: 4, status: 'Occupied' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueManagement],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(QueueManagement);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load queue entries and tables on initialization via confirmed GET /api/staff/queue', () => {
    expect(component.isLoading).toBe(true);

    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    expect(queueReq.request.method).toBe('GET');
    queueReq.flush(mockQueueData);

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    expect(tablesReq.request.method).toBe('GET');
    tablesReq.flush(mockTablesData);

    expect(component.isLoading).toBe(false);
    expect(component.queueList.length).toBe(3);
    expect(component.queueList[0].status).toBe('Waiting');
    expect(component.queueList[1].status).toBe('Called');
    expect(component.queueList[2].status).toBe('Seated');
    expect(component.alertMessage).toBeNull();
  });

  it('should handle API load error gracefully', () => {
    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.error(new ProgressEvent('Network Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush([]);

    expect(component.isLoading).toBe(false);
    expect(component.queueList.length).toBe(0);
    expect(component.alertMessage).toContain('Unable to load customer queue');
  });

  it('should call customer via PUT status endpoint with status query parameter (WAITING -> CALLED)', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    expect(targetItem.status).toBe('Waiting');

    component.callCustomer(targetItem);
    expect(component.isUpdatingId).toBe(targetItem.id);

    const putReq = httpMock.expectOne(
      '/api/staff/queue/1/status?status=CALLED'
    );
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({});

    expect(targetItem.status).toBe('Called');
    expect(component.isUpdatingId).toBeNull();
    expect(component.alertMessage).toBeNull();
  });

  it('should enforce that only Waiting entries can transition to Called', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const alreadyCalledItem = component.queueList[1];
    expect(alreadyCalledItem.status).toBe('Called');

    component.callCustomer(alreadyCalledItem);

    httpMock.expectNone(
      '/api/staff/queue/2/status?status=CALLED'
    );
    expect(alreadyCalledItem.status).toBe('Called');
  });

  it('should assign a suitable table, persist table status via PUT /api/staff/tables/:id, and reload data on success', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const calledItem = component.queueList[1];
    expect(calledItem.status).toBe('Called');

    component.assignTable(calledItem);
    expect(component.isUpdatingId).toBe(calledItem.id);

    // 1. Queue status update to SEATED
    const queuePutReq = httpMock.expectOne(
      '/api/staff/queue/2/status?status=SEATED'
    );
    expect(queuePutReq.request.method).toBe('PUT');
    queuePutReq.flush({});

    // 2. Table status update to OCCUPIED
    const tablePutReq = httpMock.expectOne('/api/staff/tables/1');
    expect(tablePutReq.request.method).toBe('PUT');
    expect(tablePutReq.request.body).toEqual({
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 2,
      status: 'OCCUPIED',
    });
    tablePutReq.flush({
      id: 1,
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 2,
      status: 'OCCUPIED',
    });

    expect(calledItem.status).toBe('Seated');
    expect(calledItem.assignedTable).toBe('T-01');
    expect(component.isUpdatingId).toBeNull();

    // 3. Re-loads queue and tables
    const reloadQueueReq = httpMock.expectOne('/api/staff/queue');
    reloadQueueReq.flush(mockQueueData);
    const reloadTablesReq = httpMock.expectOne('/api/staff/tables');
    reloadTablesReq.flush([
      { id: 1, tableNumber: 'T-01', capacity: 2, status: 'Occupied' },
      mockTablesData[1],
      mockTablesData[2],
    ]);
  });

  it('should handle partial failure if table update fails after queue status is updated', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const calledItem = component.queueList[1];
    component.assignTable(calledItem);

    // Queue status update succeeds
    const queuePutReq = httpMock.expectOne(
      '/api/staff/queue/2/status?status=SEATED'
    );
    queuePutReq.flush({});

    // Table update fails
    const tablePutReq = httpMock.expectOne('/api/staff/tables/1');
    tablePutReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isUpdatingId).toBeNull();
    expect(component.alertMessage).toContain('Failed to seat customer Priya Das');

    // Reloads data to reconcile server state
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);
  });

  it('should enforce that only Called entries can be assigned a table (CALLED -> SEATED)', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const waitingItem = component.queueList[0];
    expect(waitingItem.status).toBe('Waiting');

    component.assignTable(waitingItem);

    httpMock.expectNone(
      '/api/staff/queue/1/status?status=SEATED'
    );
    expect(waitingItem.status).toBe('Waiting');
  });

  it('should show alert message and not attempt transition when no suitable table is available', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush([
      { id: 1, tableNumber: 'T-01', capacity: 2, status: 'Occupied' },
    ]);

    const calledItem = component.queueList[1];
    component.assignTable(calledItem);

    httpMock.expectNone(
      '/api/staff/queue/2/status?status=SEATED'
    );
    expect(calledItem.status).toBe('Called');
    expect(component.alertMessage).toContain(
      'No available table found with capacity for 2 guests'
    );
  });

  it('should cancel queue entry via PUT status endpoint with CANCELLED status and recalculate positions', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    component.cancelQueue(targetItem);

    const putReq = httpMock.expectOne(
      '/api/staff/queue/1/status?status=CANCELLED'
    );
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({});

    expect(targetItem.status).toBe('Cancelled');
    expect(targetItem.position).toBe(0);
    expect(component.queueList[1].position).toBe(1);
  });

  it('should enforce that Seated entries cannot be cancelled', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const seatedItem = component.queueList[2];
    expect(seatedItem.status).toBe('Seated');

    component.cancelQueue(seatedItem);

    httpMock.expectNone(
      '/api/staff/queue/3/status?status=CANCELLED'
    );
    expect(seatedItem.status).toBe('Seated');
  });

  it('should verify absence of any COMPLETED request when completeQueue is invoked', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const seatedItem = component.queueList[2];
    expect(seatedItem.status).toBe('Seated');

    component.completeQueue(seatedItem);

    httpMock.expectNone(
      '/api/staff/queue/3/status?status=COMPLETED'
    );
    expect(seatedItem.status).toBe('Seated');
  });

  it('should handle API failure without incorrectly changing local status', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    component.callCustomer(targetItem);

    const putReq = httpMock.expectOne(
      '/api/staff/queue/1/status?status=CALLED'
    );
    putReq.error(new ProgressEvent('Network Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(targetItem.status).toBe('Waiting');
    expect(component.isUpdatingId).toBeNull();
    expect(component.alertMessage).toContain(
      'Failed to call customer Rahul Sharma'
    );
  });

  it('should use restaurant-specific queue endpoint when restaurantId query param is present', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (key: string) => (key === 'restaurantId' ? '5' : null)
    );

    component.loadData();

    const queueReq = httpMock.expectOne(
      '/api/staff/queue/restaurant/5'
    );
    queueReq.flush(mockQueueData);

    const tablesReq = httpMock.expectOne(
      '/api/staff/tables/restaurant/5'
    );
    tablesReq.flush(mockTablesData);

    expect(component.queueList.length).toBe(3);
  });

  it('should handle 401 Unauthorized error and display authentication message', () => {
    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush([]);

    expect(component.isLoading).toBe(false);
    expect(component.alertMessage).toBe(
      'Authentication required. Please log in again.'
    );
    expect(component.queueList.length).toBe(0);
  });

  it('should handle 403 Forbidden error and display access denied message', () => {
    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.error(new ProgressEvent('Forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush([]);

    expect(component.isLoading).toBe(false);
    expect(component.alertMessage).toBe(
      'Access denied. Staff or Admin privileges are required.'
    );
    expect(component.queueList.length).toBe(0);
  });

  it('should handle null or non-array queue response safely', () => {
    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.flush(null);

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush(null);

    expect(component.isLoading).toBe(false);
    expect(component.queueList.length).toBe(0);
    expect(component.alertMessage).toBeNull();
  });

  it('should render empty state message when queue is empty', () => {
    fixture.detectChanges();

    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.flush([]);

    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush([]);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.empty-state h3')?.textContent).toContain(
      'No Customers in Queue'
    );
  });

  it('should toggle Add to Queue form visibility', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    expect(component.isAddFormVisible).toBe(false);

    component.toggleAddForm();
    expect(component.isAddFormVisible).toBe(true);

    component.cancelAddForm();
    expect(component.isAddFormVisible).toBe(false);
  });

  it('should validate required fields and minimum values in addQueueForm', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);

    component.toggleAddForm();
    expect(component.addQueueForm.valid).toBe(false);

    component.addQueueForm.patchValue({
      restaurantId: 0,
      customerId: 0,
      numberOfPeople: 0,
    });
    expect(component.addQueueForm.controls.restaurantId.hasError('min')).toBe(true);
    expect(component.addQueueForm.controls.customerId.hasError('min')).toBe(true);
    expect(component.addQueueForm.controls.numberOfPeople.hasError('min')).toBe(true);

    component.addQueueForm.patchValue({
      restaurantId: 1,
      customerId: 101,
      numberOfPeople: 2,
    });
    expect(component.addQueueForm.valid).toBe(true);
  });

  it('should submit POST /api/staff/queue with correct payload and reload queue on success', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    component.toggleAddForm();
    component.addQueueForm.setValue({
      restaurantId: 1,
      customerId: 105,
      numberOfPeople: 3,
    });

    component.onAddQueueSubmit();
    expect(component.isSubmitting).toBe(true);

    const postReq = httpMock.expectOne('/api/staff/queue');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      restaurantId: 1,
      customerId: 105,
      numberOfPeople: 3,
    });

    const newQueueEntry: BackendQueueItem = {
      id: 4,
      restaurantId: 1,
      customerId: 105,
      numberOfPeople: 3,
      status: 'WAITING',
    };
    postReq.flush(newQueueEntry);

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(false);

    // Verify reload
    httpMock.expectOne('/api/staff/queue').flush([...mockQueueData, newQueueEntry]);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    expect(component.queueList.length).toBe(4);
    expect(component.queueList[3].customerName).toBe('Customer #105');
  });

  it('should handle 404 Restaurant Not Found on queue creation and preserve form input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);

    component.toggleAddForm();
    component.addQueueForm.setValue({
      restaurantId: 999,
      customerId: 105,
      numberOfPeople: 2,
    });

    component.onAddQueueSubmit();

    const postReq = httpMock.expectOne('/api/staff/queue');
    postReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(true);
    expect(component.addFormErrorMessage).toContain('Restaurant not found');
    expect(component.addQueueForm.value.restaurantId).toBe(999);
    expect(component.addQueueForm.value.customerId).toBe(105);
  });

  it('should handle server error on queue creation and preserve form input', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);

    component.toggleAddForm();
    component.addQueueForm.setValue({
      restaurantId: 1,
      customerId: 105,
      numberOfPeople: 4,
    });

    component.onAddQueueSubmit();

    const postReq = httpMock.expectOne('/api/staff/queue');
    postReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(true);
    expect(component.addFormErrorMessage).toContain('Failed to add to queue');
    expect(component.addQueueForm.value.restaurantId).toBe(1);
    expect(component.addQueueForm.value.numberOfPeople).toBe(4);
  });

  it('should show inline delete confirmation prompt on promptDelete() and cancel on cancelDelete()', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    expect(component.itemPendingDelete).toBeNull();

    component.promptDelete(targetItem);
    expect(component.itemPendingDelete?.id).toBe(targetItem.id);

    component.cancelDelete();
    expect(component.itemPendingDelete).toBeNull();
  });

  it('should call DELETE /api/staff/queue/:id on confirmDelete() and reload queue on success', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    component.promptDelete(targetItem);
    component.confirmDelete(targetItem);
    expect(component.isDeletingId).toBe(targetItem.id);

    const deleteReq = httpMock.expectOne('/api/staff/queue/1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null);

    expect(component.isDeletingId).toBeNull();
    expect(component.itemPendingDelete).toBeNull();

    // Verify reload
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData.slice(1));
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    expect(component.queueList.length).toBe(2);
  });

  it('should handle DELETE error gracefully without removing entry from list', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const targetItem = component.queueList[0];
    component.deleteQueue(targetItem);

    const deleteReq = httpMock.expectOne('/api/staff/queue/1');
    deleteReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isDeletingId).toBeNull();
    expect(component.itemPendingDelete).toBeNull();
    expect(component.queueList.length).toBe(3);
    expect(component.alertMessage).toContain('Failed to delete queue entry Q-001');
  });
});
