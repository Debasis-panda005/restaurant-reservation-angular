import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TableManagement, BackendTable } from './table-management';

describe('TableManagement', () => {
  let component: TableManagement;
  let fixture: ComponentFixture<TableManagement>;
  let httpMock: HttpTestingController;

  const mockBackendTables: BackendTable[] = [
    { id: 1, restaurantId: 1, tableNumber: 'T-01', capacity: 2, status: 'AVAILABLE' },
    { id: 2, restaurantId: 1, tableNumber: 'T-02', capacity: 4, status: 'OCCUPIED' },
    { id: 3, restaurantId: 1, tableNumber: 'T-03', capacity: 6, status: 'RESERVED' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableManagement],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(TableManagement);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load tables from backend on initialization via GET /api/staff/tables', () => {
    expect(component.isLoading).toBe(true);

    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    expect(req.request.method).toBe('GET');
    req.flush(mockBackendTables);

    expect(component.isLoading).toBe(false);
    expect(component.tables.length).toBe(3);
    expect(component.tables[0].status).toBe('Available');
    expect(component.tables[1].status).toBe('Occupied');
    expect(component.tables[2].status).toBe('Reserved');
    expect(component.errorMessage).toBe('');
  });

  it('should handle API load error gracefully', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    req.error(new ProgressEvent('Network error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Unable to load table data. Check that the backend is running.'
    );
    expect(component.tables.length).toBe(0);
  });

  it('should toggle Available table to Occupied via PUT /api/staff/tables/:id', () => {
    fixture.detectChanges();

    const loadReq = httpMock.expectOne('/api/staff/tables');
    loadReq.flush(mockBackendTables);

    const targetTable = component.tables[0];
    expect(targetTable.status).toBe('Available');

    component.toggleStatus(targetTable);

    const putReq = httpMock.expectOne('/api/staff/tables/1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 2,
      status: 'OCCUPIED',
    });
    putReq.flush({
      id: 1,
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 2,
      status: 'OCCUPIED',
    });

    expect(targetTable.status).toBe('Occupied');
    expect(component.updatingTableId).toBeNull();
    expect(component.errorMessage).toBe('');
  });

  it('should toggle Occupied table to Available via PUT /api/staff/tables/:id', () => {
    fixture.detectChanges();

    const loadReq = httpMock.expectOne('/api/staff/tables');
    loadReq.flush(mockBackendTables);

    const targetTable = component.tables[1];
    expect(targetTable.status).toBe('Occupied');

    component.toggleStatus(targetTable);

    const putReq = httpMock.expectOne('/api/staff/tables/2');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 1,
      tableNumber: 'T-02',
      capacity: 4,
      status: 'AVAILABLE',
    });
    putReq.flush({
      id: 2,
      restaurantId: 1,
      tableNumber: 'T-02',
      capacity: 4,
      status: 'AVAILABLE',
    });

    expect(targetTable.status).toBe('Available');
    expect(component.updatingTableId).toBeNull();
  });

  it('should not send PUT request when table status is Reserved', () => {
    fixture.detectChanges();

    const loadReq = httpMock.expectOne('/api/staff/tables');
    loadReq.flush(mockBackendTables);

    const reservedTable = component.tables[2];
    expect(reservedTable.status).toBe('Reserved');

    component.toggleStatus(reservedTable);

    httpMock.expectNone('/api/staff/tables/3');
    expect(reservedTable.status).toBe('Reserved');
  });

  it('should handle PUT error gracefully and preserve previous status', () => {
    fixture.detectChanges();

    const loadReq = httpMock.expectOne('/api/staff/tables');
    loadReq.flush(mockBackendTables);

    const targetTable = component.tables[0];
    component.toggleStatus(targetTable);

    const putReq = httpMock.expectOne('/api/staff/tables/1');
    putReq.error(new ProgressEvent('Network error'), {
      status: 500,
      statusText: 'Server Error',
    });

    expect(targetTable.status).toBe('Available');
    expect(component.updatingTableId).toBeNull();
    expect(component.errorMessage).toContain(
      'Failed to update status for table T-01'
    );
  });

  it('should handle 401 Unauthorized error and display authentication message', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    req.error(new ProgressEvent('Unauthorized'), {
      status: 401,
      statusText: 'Unauthorized',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Authentication required. Please log in again.'
    );
    expect(component.tables.length).toBe(0);
  });

  it('should handle 403 Forbidden error and display access denied message', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    req.error(new ProgressEvent('Forbidden'), {
      status: 403,
      statusText: 'Forbidden',
    });

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe(
      'Access denied. Staff or Admin privileges are required.'
    );
    expect(component.tables.length).toBe(0);
  });

  it('should handle null or non-array backend response safely', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    req.flush(null);

    expect(component.isLoading).toBe(false);
    expect(component.tables.length).toBe(0);
    expect(component.errorMessage).toBe('');
  });

  it('should render empty state message when tables list is empty', () => {
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/staff/tables');
    req.flush([]);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tables-empty-state')).not.toBeNull();
    expect(compiled.querySelector('.tables-empty-state h3')?.textContent).toContain(
      'No Tables Found'
    );
  });

  it('should request restaurant-specific tables endpoint when restaurantId query param is present', () => {
    const route = TestBed.inject(ActivatedRoute);
    vi.spyOn(route.snapshot.queryParamMap, 'get').mockImplementation(
      (param: string) => (param === 'restaurantId' ? '2' : null)
    );

    component.fetchTables();

    const req = httpMock.expectOne('/api/staff/tables/restaurant/2');
    req.flush(mockBackendTables);

    expect(component.tables.length).toBe(3);
  });

  it('should toggle Add Table form visibility when toggle button is clicked', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/staff/tables');
    req.flush(mockBackendTables);
    fixture.detectChanges();

    expect(component.isAddFormVisible).toBe(false);
    expect(fixture.nativeElement.querySelector('.add-table-card')).toBeNull();

    const toggleBtn = fixture.nativeElement.querySelector('.btn-add-table');
    expect(toggleBtn.textContent).toContain('+ Add Table');

    toggleBtn.click();
    fixture.detectChanges();

    expect(component.isAddFormVisible).toBe(true);
    expect(fixture.nativeElement.querySelector('.add-table-card')).not.toBeNull();
    expect(toggleBtn.textContent).toContain('Cancel');

    toggleBtn.click();
    fixture.detectChanges();

    expect(component.isAddFormVisible).toBe(false);
    expect(fixture.nativeElement.querySelector('.add-table-card')).toBeNull();
  });

  it('should validate Add Table form fields correctly', () => {
    const form = component.addTableForm;
    expect(form.valid).toBe(false);

    form.controls.restaurantId.setValue(null);
    form.controls.tableNumber.setValue('');
    form.controls.capacity.setValue(null);
    expect(form.controls.restaurantId.hasError('required')).toBe(true);
    expect(form.controls.tableNumber.hasError('required')).toBe(true);
    expect(form.controls.capacity.hasError('required')).toBe(true);

    form.controls.restaurantId.setValue(0);
    form.controls.capacity.setValue(0);
    expect(form.controls.restaurantId.hasError('min')).toBe(true);
    expect(form.controls.capacity.hasError('min')).toBe(true);

    form.controls.restaurantId.setValue(2);
    form.controls.tableNumber.setValue('T-09');
    form.controls.capacity.setValue(4);
    expect(form.valid).toBe(true);
  });

  it('should not call POST API if Add Table form is invalid', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne('/api/staff/tables');
    req.flush(mockBackendTables);

    component.isAddFormVisible = true;
    component.onAddTableSubmit();

    httpMock.expectNone('/api/staff/tables');
    expect(component.addTableForm.touched).toBe(true);
  });

  it('should successfully create table via POST /api/staff/tables, reset form, and refresh table list', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.isAddFormVisible = true;
    component.addTableForm.setValue({
      restaurantId: 2,
      tableNumber: 'T-09',
      capacity: 4,
    });

    component.onAddTableSubmit();
    expect(component.isSubmitting).toBe(true);

    const postReq = httpMock.expectOne('/api/staff/tables');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual({
      restaurantId: 2,
      tableNumber: 'T-09',
      capacity: 4,
    });

    const newBackendTable: BackendTable = {
      id: 9,
      restaurantId: 2,
      tableNumber: 'T-09',
      capacity: 4,
      status: 'AVAILABLE',
    };
    postReq.flush(newBackendTable);

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(false);
    expect(component.formErrorMessage).toBe('');

    // Verifies table list refreshes from backend
    const refreshReq = httpMock.expectOne('/api/staff/tables');
    expect(refreshReq.request.method).toBe('GET');
    refreshReq.flush([...mockBackendTables, newBackendTable]);

    expect(component.tables.length).toBe(4);
    expect(component.tables[3].tableNumber).toBe('T-09');
  });

  it('should handle 404 Restaurant Not Found on table creation and preserve form input', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.isAddFormVisible = true;
    component.addTableForm.setValue({
      restaurantId: 999,
      tableNumber: 'T-99',
      capacity: 6,
    });

    component.onAddTableSubmit();

    const postReq = httpMock.expectOne('/api/staff/tables');
    postReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(true);
    expect(component.formErrorMessage).toContain(
      'Restaurant not found. Please verify that the Restaurant ID exists.'
    );
    // User inputs are preserved
    expect(component.addTableForm.controls.restaurantId.value).toBe(999);
    expect(component.addTableForm.controls.tableNumber.value).toBe('T-99');
    expect(component.addTableForm.controls.capacity.value).toBe(6);
  });

  it('should handle server error on table creation and preserve form input', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.isAddFormVisible = true;
    component.addTableForm.setValue({
      restaurantId: 2,
      tableNumber: 'T-10',
      capacity: 4,
    });

    component.onAddTableSubmit();

    const postReq = httpMock.expectOne('/api/staff/tables');
    postReq.error(new ProgressEvent('Internal Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.isSubmitting).toBe(false);
    expect(component.isAddFormVisible).toBe(true);
    expect(component.formErrorMessage).toContain('Failed to create table. Please check input values.');
    expect(component.addTableForm.controls.tableNumber.value).toBe('T-10');
  });

  it('should open Edit Table card pre-filled with table details when Edit button is clicked', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);
    fixture.detectChanges();

    expect(component.editingTable).toBeNull();
    expect(fixture.nativeElement.querySelector('.edit-table-card')).toBeNull();

    const editBtn = fixture.nativeElement.querySelector('.btn-edit-table');
    expect(editBtn).not.toBeNull();
    editBtn.click();
    fixture.detectChanges();

    expect(component.editingTable).toEqual(component.tables[0]);
    expect(component.editTableForm.controls.tableNumber.value).toBe('T-01');
    expect(component.editTableForm.controls.capacity.value).toBe(2);
    expect(component.editTableForm.controls.restaurantId.value).toBe(1);

    const editCard = fixture.nativeElement.querySelector('.edit-table-card');
    expect(editCard).not.toBeNull();
    expect(editCard.textContent).toContain('Edit Table: T-01');
  });

  it('should validate Edit Table form fields correctly', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.startEditTable(component.tables[0]);

    component.editTableForm.controls.restaurantId.setValue(null);
    component.editTableForm.controls.tableNumber.setValue('');
    component.editTableForm.controls.capacity.setValue(null);
    expect(component.editTableForm.valid).toBe(false);

    component.editTableForm.controls.restaurantId.setValue(0);
    component.editTableForm.controls.capacity.setValue(-1);
    expect(component.editTableForm.controls.restaurantId.hasError('min')).toBe(true);
    expect(component.editTableForm.controls.capacity.hasError('min')).toBe(true);

    component.editTableForm.controls.restaurantId.setValue(2);
    component.editTableForm.controls.tableNumber.setValue('T-01-Updated');
    component.editTableForm.controls.capacity.setValue(6);
    expect(component.editTableForm.valid).toBe(true);
  });

  it('should successfully update table via PUT /api/staff/tables/:id, preserving status, and refresh list', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    // Edit table 0 (Available)
    component.startEditTable(component.tables[0]);
    component.editTableForm.setValue({
      restaurantId: 2,
      tableNumber: 'T-01-Renamed',
      capacity: 5,
    });

    component.onEditTableSubmit();
    expect(component.isEditSubmitting).toBe(true);

    const putReq = httpMock.expectOne('/api/staff/tables/1');
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.body).toEqual({
      restaurantId: 2,
      tableNumber: 'T-01-Renamed',
      capacity: 5,
      status: 'AVAILABLE',
    });

    putReq.flush({
      id: 1,
      restaurantId: 2,
      tableNumber: 'T-01-Renamed',
      capacity: 5,
      status: 'AVAILABLE',
    });

    expect(component.isEditSubmitting).toBe(false);
    expect(component.editingTable).toBeNull();

    // Verifies table list refreshes
    const refreshReq = httpMock.expectOne('/api/staff/tables');
    refreshReq.flush([
      { id: 1, restaurantId: 2, tableNumber: 'T-01-Renamed', capacity: 5, status: 'AVAILABLE' },
      mockBackendTables[1],
      mockBackendTables[2],
    ]);

    expect(component.tables[0].tableNumber).toBe('T-01-Renamed');
    expect(component.tables[0].capacity).toBe(5);
  });

  it('should preserve OCCUPIED status when editing an occupied table', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    // Edit table 1 (Occupied)
    component.startEditTable(component.tables[1]);
    expect(component.tables[1].status).toBe('Occupied');

    component.editTableForm.patchValue({
      capacity: 8,
    });

    component.onEditTableSubmit();

    const putReq = httpMock.expectOne('/api/staff/tables/2');
    expect(putReq.request.body.status).toBe('OCCUPIED');
    expect(putReq.request.body.capacity).toBe(8);
    putReq.flush({
      ...mockBackendTables[1],
      capacity: 8,
    });

    const refreshReq = httpMock.expectOne('/api/staff/tables');
    refreshReq.flush(mockBackendTables);
  });

  it('should handle error on table update and preserve form input', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.startEditTable(component.tables[0]);
    component.editTableForm.setValue({
      restaurantId: 999,
      tableNumber: 'T-Invalid',
      capacity: 4,
    });

    component.onEditTableSubmit();

    const putReq = httpMock.expectOne('/api/staff/tables/1');
    putReq.error(new ProgressEvent('Not Found'), {
      status: 404,
      statusText: 'Not Found',
    });

    expect(component.isEditSubmitting).toBe(false);
    expect(component.editingTable).not.toBeNull();
    expect(component.editFormErrorMessage).toContain('Restaurant or table not found');
    expect(component.editTableForm.controls.tableNumber.value).toBe('T-Invalid');
  });

  it('should cancel editing when cancel button is clicked', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);

    component.startEditTable(component.tables[0]);
    expect(component.editingTable).not.toBeNull();

    component.cancelEditTable();
    expect(component.editingTable).toBeNull();
    expect(component.editFormErrorMessage).toBe('');
  });

  it('should show delete confirmation prompt when Delete button is clicked on table card', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);
    fixture.detectChanges();

    expect(component.tablePendingDelete).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-confirm-box')).toBeNull();

    const deleteBtn = fixture.nativeElement.querySelector('.btn-delete-table');
    deleteBtn.click();
    fixture.detectChanges();

    expect(component.tablePendingDelete).toEqual(component.tables[0]);
    const confirmBox = fixture.nativeElement.querySelector('.delete-confirm-box');
    expect(confirmBox).not.toBeNull();
    expect(confirmBox.textContent).toContain('Delete table T-01?');
  });

  it('should dismiss delete confirmation prompt when Cancel is clicked', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);
    fixture.detectChanges();

    component.promptDeleteTable(component.tables[0]);
    fixture.detectChanges();
    expect(component.tablePendingDelete).not.toBeNull();

    const cancelBtn = fixture.nativeElement.querySelector('.btn-cancel-delete');
    cancelBtn.click();
    fixture.detectChanges();

    expect(component.tablePendingDelete).toBeNull();
    expect(fixture.nativeElement.querySelector('.delete-confirm-box')).toBeNull();
  });

  it('should call DELETE /api/staff/tables/:id on confirm and refresh table list', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);
    fixture.detectChanges();

    component.promptDeleteTable(component.tables[0]);
    component.confirmDeleteTable(component.tables[0]);
    expect(component.deletingTableId).toBe(1);

    const deleteReq = httpMock.expectOne('/api/staff/tables/1');
    expect(deleteReq.request.method).toBe('DELETE');
    deleteReq.flush(null, { status: 204, statusText: 'No Content' });

    expect(component.deletingTableId).toBeNull();
    expect(component.tablePendingDelete).toBeNull();

    // Verifies list refreshes
    const refreshReq = httpMock.expectOne('/api/staff/tables');
    refreshReq.flush([mockBackendTables[1], mockBackendTables[2]]);

    expect(component.tables.length).toBe(2);
    expect(component.tables[0].tableNumber).toBe('T-02');
  });

  it('should handle DELETE error gracefully without removing table from list', () => {
    fixture.detectChanges();
    const initReq = httpMock.expectOne('/api/staff/tables');
    initReq.flush(mockBackendTables);
    fixture.detectChanges();

    component.deleteTable(component.tables[0]);

    const deleteReq = httpMock.expectOne('/api/staff/tables/1');
    deleteReq.error(new ProgressEvent('Server Error'), {
      status: 500,
      statusText: 'Internal Server Error',
    });

    expect(component.deletingTableId).toBeNull();
    expect(component.errorMessage).toContain('Failed to delete table T-01');
    expect(component.tables.length).toBe(3);
  });
});
