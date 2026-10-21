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

  it('should assign a suitable table via PUT /api/staff/queue/:id/assign-table/:tableId and update queue status to Table Ready', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const calledItem = component.queueList[1];
    expect(calledItem.status).toBe('Called');

    // 1. Open modal
    component.assignTable(calledItem);
    expect(component.assigningQueueItem).toBe(calledItem);
    expect(component.selectedTableId).toBe(1); // Table 1 is eligible (capacity 2, Available)

    // 2. Confirm assignment
    component.confirmTableAssignment();
    expect(component.isAssigningTable).toBe(true);

    const assignReq = httpMock.expectOne('/api/staff/queue/2/assign-table/1');
    expect(assignReq.request.method).toBe('PUT');
    assignReq.flush({
      id: 2,
      customerName: 'Priya Das',
      numberOfPeople: 2,
      status: 'TABLE_READY',
      assignedTableId: 1,
    });

    expect(calledItem.status).toBe('Table Ready');
    expect(calledItem.assignedTable).toBe('T-01');
    expect(component.assigningQueueItem).toBeNull();
    expect(component.isAssigningTable).toBe(false);

    // 3. Reloads data
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);
  });

  it('should handle partial failure if table update fails after queue status is updated during seatCustomer', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const readyItem = component.queueList[1];
    readyItem.status = 'Table Ready';
    readyItem.assignedTableId = 1;

    component.seatCustomer(readyItem);

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

  it('should call PUT /api/staff/queue/:id/status?status=COMPLETED when completeQueue is invoked on a Seated item', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const seatedItem = component.queueList[2];
    expect(seatedItem.status).toBe('Seated');

    component.completeQueue(seatedItem);

    const putReq = httpMock.expectOne(
      '/api/staff/queue/3/status?status=COMPLETED'
    );
    expect(putReq.request.method).toBe('PUT');
    putReq.flush({
      id: 3,
      status: 'COMPLETED',
    });

    expect(seatedItem.status).toBe('Completed');
    expect(seatedItem.assignedTable).toBeUndefined();

    // Reloads data
    httpMock.expectOne('/api/staff/queue').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);
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

  it('should render Seat and Cancel buttons for Table Ready status, and Complete button for Seated status', () => {
    const tableReadyQueueData: BackendQueueItem[] = [
      {
        id: 1,
        ticketNumber: 'Q-001',
        customerName: 'Seated Customer',
        numberOfPeople: 2,
        status: 'SEATED',
        assignedTableId: 1,
      },
      {
        id: 2,
        ticketNumber: 'Q-002',
        customerName: 'Ready Customer',
        numberOfPeople: 4,
        status: 'TABLE_READY',
        assignedTableId: 9,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(tableReadyQueueData);
    httpMock.expectOne('/api/staff/tables').flush([
      { id: 1, tableNumber: 'T-01', capacity: 2, status: 'Occupied' },
      { id: 9, tableNumber: 'T-09', capacity: 4, status: 'Available' },
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    // Verify Seated customer has Complete button
    const completeBtns = Array.from(compiled.querySelectorAll('.btn-assign')).filter(
      (b) => b.textContent?.trim() === 'Complete'
    );
    expect(completeBtns.length).toBe(1);

    // Verify Ready Customer has Seat Customer and Cancel buttons
    const seatBtn = Array.from(compiled.querySelectorAll('.btn-assign')).find(
      (b) => b.textContent?.trim() === 'Seat Customer' || b.textContent?.trim() === 'Seat'
    );
    expect(seatBtn).toBeDefined();

    const cancelBtns = Array.from(compiled.querySelectorAll('.btn-cancel'));
    expect(cancelBtns.length).toBeGreaterThan(0);
  });

  it('should allow seating a customer in Table Ready status using their assigned table', () => {
    const tableReadyQueueData: BackendQueueItem[] = [
      {
        id: 3,
        restaurantId: 2,
        ticketNumber: 'Q-003',
        customerName: 'Sneha Rao',
        numberOfPeople: 4,
        status: 'TABLE_READY',
        assignedTableId: 9,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(tableReadyQueueData);
    httpMock.expectOne('/api/staff/tables').flush([
      { id: 9, restaurantId: 2, tableNumber: 'T-09', capacity: 4, status: 'Available' },
    ]);

    const item = component.queueList[0];
    expect(item.status).toBe('Table Ready');
    expect(item.assignedTable).toBe('T-09');

    component.seatCustomer(item);

    // Queue status update to SEATED
    const queuePut = httpMock.expectOne('/api/staff/queue/3/status?status=SEATED');
    expect(queuePut.request.method).toBe('PUT');
    queuePut.flush({});

    // Table status update to OCCUPIED on T-09
    const tablePut = httpMock.expectOne('/api/staff/tables/9');
    expect(tablePut.request.method).toBe('PUT');
    expect(tablePut.request.body).toEqual({
      restaurantId: 2,
      tableNumber: 'T-09',
      capacity: 4,
      status: 'OCCUPIED',
    });
    tablePut.flush({
      id: 9,
      restaurantId: 2,
      tableNumber: 'T-09',
      capacity: 4,
      status: 'OCCUPIED',
    });

    expect(item.status).toBe('Seated');

    // Reloads data
    httpMock.expectOne('/api/staff/queue').flush([]);
    httpMock.expectOne('/api/staff/tables').flush([]);
  });

  it('should not fabricate table numbers when assignedTableId is null or missing', () => {
    const nullTableQueue: BackendQueueItem[] = [
      {
        id: 1,
        ticketNumber: 'Q-001',
        customerName: 'Aarav Patel',
        numberOfPeople: 2,
        status: 'WAITING',
        assignedTableId: null,
      },
      {
        id: 2,
        ticketNumber: 'Q-002',
        customerName: 'Diya Sen',
        numberOfPeople: 2,
        status: 'CALLED',
        assignedTableId: null,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(nullTableQueue);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    expect(component.queueList[0].assignedTable).toBeUndefined();
    expect(component.queueList[1].assignedTable).toBeUndefined();

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const tableBadges = compiled.querySelectorAll('.table-badge');
    expect(tableBadges[0].textContent?.trim()).toBe('—');
    expect(tableBadges[1].textContent?.trim()).toBe('—');
  });

  it('should correctly match 4-person queue item with T-09 capacity 4 in restaurant 2 (Issue 6)', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (key: string) => (key === 'restaurantId' ? '2' : null)
    );

    const queue4Guests: BackendQueueItem[] = [
      {
        id: 4,
        restaurantId: 2,
        ticketNumber: 'Q-004',
        customerName: 'Ananya Roy',
        numberOfPeople: 4,
        status: 'CALLED',
        assignedTableId: null,
      },
    ];

    const tablesWithT09: any[] = [
      { id: 1, restaurantId: 2, tableNumber: 'T-01', capacity: 2, status: 'AVAILABLE' },
      { id: 9, restaurantId: 2, tableNumber: 'T-09', capacity: 4, status: 'AVAILABLE' },
    ];

    component.loadData();
    httpMock.expectOne('/api/staff/queue/restaurant/2').flush(queue4Guests);
    httpMock.expectOne('/api/staff/tables/restaurant/2').flush(tablesWithT09);

    const item = component.queueList[0];
    expect(item.status).toBe('Called');
    expect(item.guests).toBe(4);

    // Call assignTable - opens modal and pre-selects T-09 because T-01 capacity (2) < guests (4)
    component.assignTable(item);
    expect(component.assigningQueueItem).toBe(item);
    expect(component.currentEligibleTables.length).toBe(1);
    expect(component.currentEligibleTables[0].tableNumber).toBe('T-09');
    expect(component.selectedTableId).toBe(9);

    component.confirmTableAssignment();

    const assignPut = httpMock.expectOne('/api/staff/queue/4/assign-table/9');
    expect(assignPut.request.method).toBe('PUT');
    assignPut.flush({
      id: 4,
      restaurantId: 2,
      ticketNumber: 'Q-004',
      customerName: 'Ananya Roy',
      numberOfPeople: 4,
      status: 'TABLE_READY',
      assignedTableId: 9,
    });

    expect(item.status).toBe('Table Ready');
    expect(item.assignedTable).toBe('T-09');

    // Reloads data
    httpMock.expectOne('/api/staff/queue/restaurant/2').flush([]);
    httpMock.expectOne('/api/staff/tables/restaurant/2').flush([]);
  });

  it('should open and close the assign table modal properly and update state', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const waitingItem = component.queueList[0];
    component.openAssignTableModal(waitingItem);
    expect(component.assigningQueueItem).toBe(waitingItem);
    expect(component.selectedTableId).toBe(1);

    component.closeAssignTableModal();
    expect(component.assigningQueueItem).toBeNull();
    expect(component.selectedTableId).toBeNull();
  });

  it('should handle 409 conflict error when assigning a table and show accurate message', () => {
    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(mockQueueData);
    httpMock.expectOne('/api/staff/tables').flush(mockTablesData);

    const calledItem = component.queueList[1];
    component.openAssignTableModal(calledItem);
    component.selectedTableId = 1;

    component.confirmTableAssignment();

    const putReq = httpMock.expectOne('/api/staff/queue/2/assign-table/1');
    putReq.flush(
      { message: 'Table is not available' },
      { status: 409, statusText: 'Conflict' }
    );

    expect(component.assignTableErrorMessage).toBe('Table is not available');
    expect(component.alertMessage).toBe('Table is not available');
    expect(component.isAssigningTable).toBe(false);
  });

  it('should display T-09 for queue entry ID 3 with assignedTableId: 3 and restaurant ID 2 when queue loads before tables (async)', () => {
    const queueEntry3: BackendQueueItem[] = [
      {
        id: 3,
        restaurantId: 2,
        ticketNumber: 'Q-003',
        customerName: 'Sneha Rao',
        numberOfPeople: 4,
        status: 'TABLE_READY',
        assignedTableId: 3,
      },
    ];

    const table3T09: any[] = [
      {
        id: 3,
        restaurantId: 2,
        tableNumber: 'T-09',
        capacity: 4,
        status: 'RESERVED',
      },
    ];

    fixture.detectChanges();
    // 1. Queue response arrives first
    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.flush(queueEntry3);

    // 2. Tables response arrives second
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush(table3T09);

    fixture.detectChanges();
    expect(component.queueList.length).toBe(1);
    expect(component.queueList[0].status).toBe('Table Ready');
    expect(component.queueList[0].assignedTableId).toBe(3);
    expect(component.queueList[0].assignedTable).toBe('T-09');

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.table-badge');
    expect(badge?.textContent?.trim()).toBe('T-09');
  });

  it('should display T-09 for queue entry ID 3 with assignedTableId: 3 and restaurant ID 2 when tables load before queue (async)', () => {
    const queueEntry3: BackendQueueItem[] = [
      {
        id: 3,
        restaurantId: 2,
        ticketNumber: 'Q-003',
        customerName: 'Sneha Rao',
        numberOfPeople: 4,
        status: 'TABLE_READY',
        assignedTableId: 3,
      },
    ];

    const table3T09: any[] = [
      {
        id: 3,
        restaurantId: 2,
        tableNumber: 'T-09',
        capacity: 4,
        status: 'RESERVED',
      },
    ];

    fixture.detectChanges();
    // 1. Tables response arrives first
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.flush(table3T09);

    // 2. Queue response arrives second
    const queueReq = httpMock.expectOne('/api/staff/queue');
    queueReq.flush(queueEntry3);

    fixture.detectChanges();
    expect(component.queueList.length).toBe(1);
    expect(component.queueList[0].status).toBe('Table Ready');
    expect(component.queueList[0].assignedTableId).toBe(3);
    expect(component.queueList[0].assignedTable).toBe('T-09');

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.table-badge');
    expect(badge?.textContent?.trim()).toBe('T-09');
  });

  it('should not display SHARED_TABLES fallback records when backend is reachable but returns empty tables array', () => {
    const queueEntry: BackendQueueItem[] = [
      {
        id: 3,
        restaurantId: 2,
        ticketNumber: 'Q-003',
        customerName: 'Sneha Rao',
        numberOfPeople: 4,
        status: 'TABLE_READY',
        assignedTableId: 3,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(queueEntry);
    httpMock.expectOne('/api/staff/tables').flush([]);

    fixture.detectChanges();
    expect(component.queueList.length).toBe(1);
    expect(component.queueList[0].assignedTable).toBeUndefined();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.table-badge');
    expect(badge?.textContent?.trim()).toBe('—');
  });

  it('should not use SHARED_TABLES fallback records for assignment when backend is reachable but has no tables', () => {
    const queueEntry: BackendQueueItem[] = [
      {
        id: 2,
        restaurantId: 2,
        ticketNumber: 'Q-002',
        customerName: 'Priya Das',
        numberOfPeople: 4,
        status: 'CALLED',
        assignedTableId: null,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(queueEntry);
    httpMock.expectOne('/api/staff/tables').flush([]);

    const item = component.queueList[0];
    component.assignTable(item);

    expect(component.alertMessage).toContain('No available table found with capacity for 4 guests');
    expect(item.status).toBe('Called');
    httpMock.expectNone('/api/staff/queue/2/status?status=SEATED');
  });

  it('should not display fallback records when active restaurant ID differs from fallback record restaurant ID', () => {
    const queueEntry: BackendQueueItem[] = [
      {
        id: 5,
        restaurantId: 2,
        ticketNumber: 'Q-005',
        customerName: 'Vikram Seth',
        numberOfPeople: 2,
        status: 'WAITING',
        assignedTableId: 1,
      },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(queueEntry);
    const tablesReq = httpMock.expectOne('/api/staff/tables');
    tablesReq.error(new ProgressEvent('Network Error'), { status: 500, statusText: 'Server Error' });

    fixture.detectChanges();
    expect(component.queueList[0].assignedTable).toBeUndefined();

    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.table-badge');
    expect(badge?.textContent?.trim()).toBe('—');
  });

  it('should not assign fallback records when active restaurant ID differs from fallback record restaurant ID', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (key: string) => (key === 'restaurantId' ? '3' : null)
    );

    const queueEntry: BackendQueueItem[] = [
      {
        id: 6,
        restaurantId: 3,
        ticketNumber: 'Q-006',
        customerName: 'Kavita Nair',
        numberOfPeople: 2,
        status: 'CALLED',
        assignedTableId: null,
      },
    ];

    component.loadData();
    httpMock.expectOne('/api/staff/queue/restaurant/3').flush(queueEntry);
    const tablesReq = httpMock.expectOne('/api/staff/tables/restaurant/3');
    tablesReq.error(new ProgressEvent('Network Error'), { status: 500, statusText: 'Server Error' });

    const item = component.queueList[0];
    component.assignTable(item);

    expect(component.alertMessage).toContain('No available table found with capacity for 2 guests');
    expect(item.status).toBe('Called');
    httpMock.expectNone('/api/staff/queue/6/status?status=SEATED');
  });

  it('should transition single action button through WAITING -> CALLED -> TABLE_READY -> SEATED -> COMPLETED', () => {
    const singleQueueEntry: BackendQueueItem[] = [
      {
        id: 10,
        restaurantId: 1,
        ticketNumber: 'Q-010',
        customerName: 'Aman Verma',
        numberOfPeople: 2,
        status: 'WAITING',
        assignedTableId: null,
      },
    ];

    const singleTable: RestaurantTable[] = [
      { id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 2, status: 'Available' },
    ];

    fixture.detectChanges();
    httpMock.expectOne('/api/staff/queue').flush(singleQueueEntry);
    httpMock.expectOne('/api/staff/tables').flush(singleTable);

    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    // 1. In WAITING: only Call button is visible as progression action (no Assign Table)
    const callBtn = Array.from(compiled.querySelectorAll('.btn-call')).find(
      (b) => b.textContent?.trim() === 'Call'
    );
    expect(callBtn).toBeDefined();
    const assignBtnWaiting = Array.from(compiled.querySelectorAll('.btn-assign')).find(
      (b) => b.textContent?.trim() === 'Assign Table'
    );
    expect(assignBtnWaiting).toBeUndefined();

    // Click Call
    const item = component.queueList[0];
    component.callCustomer(item);
    const callReq = httpMock.expectOne('/api/staff/queue/10/status?status=CALLED');
    callReq.flush({ ...singleQueueEntry[0], status: 'CALLED' });
    fixture.detectChanges();

    // 2. In CALLED: single action button changes to Assign Table
    expect(item.status).toBe('Called');
    const assignBtn = Array.from(compiled.querySelectorAll('.btn-assign')).find(
      (b) => b.textContent?.trim() === 'Assign Table'
    );
    expect(assignBtn).toBeDefined();

    // Click Assign Table and confirm assignment
    component.assignTable(item);
    component.selectedTableId = 5;
    component.confirmTableAssignment();
    const assignReq = httpMock.expectOne('/api/staff/queue/10/assign-table/5');
    assignReq.flush({ ...singleQueueEntry[0], status: 'TABLE_READY', assignedTableId: 5 });
    httpMock.expectOne('/api/staff/queue').flush([{ ...singleQueueEntry[0], status: 'TABLE_READY', assignedTableId: 5 }]);
    httpMock.expectOne('/api/staff/tables').flush([{ id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 2, status: 'Reserved' }]);
    fixture.detectChanges();

    // 3. In TABLE_READY: single action button changes to Seat Customer
    expect(component.queueList[0].status).toBe('Table Ready');
    const seatBtn = Array.from(compiled.querySelectorAll('.btn-assign')).find(
      (b) => b.textContent?.trim() === 'Seat Customer'
    );
    expect(seatBtn).toBeDefined();

    // Click Seat Customer
    component.seatCustomer(component.queueList[0]);
    const seatReq = httpMock.expectOne('/api/staff/queue/10/status?status=SEATED');
    seatReq.flush({ ...singleQueueEntry[0], status: 'SEATED', assignedTableId: 5 });
    const tableOccupiedReq = httpMock.expectOne('/api/staff/tables/5');
    tableOccupiedReq.flush({ id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 2, status: 'OCCUPIED' });
    httpMock.expectOne('/api/staff/queue').flush([{ ...singleQueueEntry[0], status: 'SEATED', assignedTableId: 5 }]);
    httpMock.expectOne('/api/staff/tables').flush([{ id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 2, status: 'Occupied' }]);
    fixture.detectChanges();

    // 4. In SEATED: single action button changes to Complete
    expect(component.queueList[0].status).toBe('Seated');
    const completeBtn = Array.from(compiled.querySelectorAll('.btn-assign')).find(
      (b) => b.textContent?.trim() === 'Complete'
    );
    expect(completeBtn).toBeDefined();

    // Click Complete
    component.completeQueue(component.queueList[0]);
    const completeReq = httpMock.expectOne('/api/staff/queue/10/status?status=COMPLETED');
    completeReq.flush({ ...singleQueueEntry[0], status: 'COMPLETED', assignedTableId: null });
    httpMock.expectOne('/api/staff/queue').flush([{ ...singleQueueEntry[0], status: 'COMPLETED', assignedTableId: null }]);
    httpMock.expectOne('/api/staff/tables').flush([{ id: 5, restaurantId: 1, tableNumber: 'T-05', capacity: 2, status: 'Available' }]);
    fixture.detectChanges();

    // 5. In COMPLETED: single progression button replaced with Completed badge
    expect(component.queueList[0].status).toBe('Completed');
    const completedBadge = compiled.querySelector('.status-completed');
    expect(completedBadge?.textContent?.trim()).toBe('Completed');
    const noMoreAssignBtns = Array.from(compiled.querySelectorAll('.btn-assign'));
    expect(noMoreAssignBtns.length).toBe(0);
  });
});
