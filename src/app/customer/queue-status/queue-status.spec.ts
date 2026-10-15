import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QueueStatus } from './queue-status';
import { QueueService } from '../../core/services/queue.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueueTicket } from '../../core/models/queue-ticket.model';

describe('QueueStatus', () => {
  let component: QueueStatus;
  let fixture: ComponentFixture<QueueStatus>;
  let queueServiceMock: any;
  let restaurantServiceMock: any;
  let authServiceMock: any;

  const mockTicket: QueueTicket = {
    id: 501,
    customerId: 1,
    restaurantId: 1,
    restaurantName: 'Spice Symphony Bistro',
    ticketNumber: 'Q-104',
    queueNumber: 'Q-104',
    guests: 3,
    partySize: 3,
    peopleAhead: 2,
    position: 3,
    estimatedWaitMinutes: 15,
    status: 'WAITING',
    joinedAt: '2026-10-11T01:30:00Z'
  };

  beforeEach(async () => {
    queueServiceMock = {
      getQueueStatus: vi.fn().mockReturnValue(of(mockTicket)),
      advanceQueue: vi.fn().mockReturnValue(of(mockTicket)),
      joinQueue: vi.fn().mockReturnValue(of(mockTicket)),
      leaveQueue: vi.fn().mockReturnValue(of(true)),
      getMyQueue: vi.fn().mockReturnValue(of([mockTicket]))
    };

    restaurantServiceMock = {
      getRestaurants: vi.fn().mockReturnValue(of([
        { id: 1, name: 'Spice Symphony Bistro', location: 'Bhubaneswar' }
      ])),
      getRestaurantById: vi.fn().mockReturnValue(of({
        id: 1,
        name: 'Spice Symphony Bistro',
        location: 'Bhubaneswar',
        cuisine: 'North Indian'
      }))
    };

    authServiceMock = {
      getCurrentUser: vi.fn().mockReturnValue({ id: 1, fullName: 'John Doe', email: 'john@example.com' }),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [QueueStatus],
      providers: [
        provideRouter([]),
        { provide: QueueService, useValue: queueServiceMock },
        { provide: RestaurantService, useValue: restaurantServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QueueStatus);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial active queue ticket', () => {
    expect(component.currentTicket).toBeTruthy();
    expect(component.currentTicket?.ticketNumber).toBe('Q-104');
    expect(component.currentTicket?.status).toBe('WAITING');
    expect(component.isLoading).toBe(false);
  });

  it('should calculate queue position correctly', () => {
    expect(component.queuePosition).toBe(3);
  });

  it('should calculate progress percentage', () => {
    expect(component.progressPercentage).toBeGreaterThan(0);
  });

  it('should allow customer to leave queue', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.leaveQueue();
    expect(queueServiceMock.leaveQueue).toHaveBeenCalledWith(501);
    expect(component.currentTicket).toBeNull();
    expect(component.notificationMessage).toContain('left the queue');
  });

  it('should allow customer to join new queue', () => {
    component.currentTicket = null;
    component.selectedRestaurantId = 1;
    component.joinGuestsCount = 4;

    component.joinNewQueue();
    expect(queueServiceMock.joinQueue).toHaveBeenCalled();
    expect(component.currentTicket).toBeTruthy();
    expect(component.notificationMessage).toContain('Joined waitlist successfully');
  });

  it('should display error message when joining fails with 409 conflict', () => {
    queueServiceMock.joinQueue.mockReturnValue(throwError(() => ({
      status: 409,
      error: { message: 'You already have an active waitlist ticket at this restaurant.' }
    })));

    component.joinNewQueue();
    expect(component.errorMessage).toContain('already have an active waitlist ticket');
  });

  it('should handle empty active queue by turning off loading and displaying empty state', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(of(undefined));
    component.loadQueueStatus();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.currentTicket).toBeNull();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No Active Waitlist Token');
  });

  it('should handle getQueueStatus error by clearing loading state and displaying error message', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(throwError(() => ({
      status: 500,
      error: { message: 'Internal server error' }
    })));
    component.loadQueueStatus();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Internal server error');
  });

  it('should prevent overlapping requests in refreshStatus when already refreshing or loading', () => {
    queueServiceMock.getQueueStatus.mockClear();
    component.isRefreshing = true;
    component.refreshStatus(false);
    expect(queueServiceMock.getQueueStatus).not.toHaveBeenCalled();

    component.isRefreshing = false;
    component.isLoading = true;
    component.refreshStatus(false);
    expect(queueServiceMock.getQueueStatus).not.toHaveBeenCalled();
  });

  it('should refresh status and update queue metrics, lastRefreshedAt, and feedback message', () => {
    const updatedTicket: QueueTicket = {
      ...mockTicket,
      peopleAhead: 0,
      position: 1,
      estimatedWaitMinutes: 5,
      status: 'WAITING'
    };
    queueServiceMock.getQueueStatus.mockReturnValue(of(updatedTicket));

    component.refreshStatus(false);
    fixture.detectChanges();

    expect(queueServiceMock.getQueueStatus).toHaveBeenCalledWith(1);
    expect(component.currentTicket?.position).toBe(1);
    expect(component.currentTicket?.peopleAhead).toBe(0);
    expect(component.currentTicket?.estimatedWaitMinutes).toBe(5);
    expect(component.queuePosition).toBe(1);
    expect(component.lastRefreshedAt).toBeTruthy();
    expect(component.notificationMessage).toContain('Queue status refreshed: #1 in line (0 parties ahead, ~5m wait)');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('#1');
    expect(compiled.textContent).toContain('~5m');
  });

  it('should show table ready notification when refreshed ticket status is NOTIFIED', () => {
    const readyTicket: QueueTicket = {
      ...mockTicket,
      status: 'NOTIFIED',
      position: 1,
      peopleAhead: 0,
      estimatedWaitMinutes: 0
    };
    queueServiceMock.getQueueStatus.mockReturnValue(of(readyTicket));

    component.refreshStatus(false);
    fixture.detectChanges();

    expect(component.notificationMessage).toContain('Your table is ready');
    expect(component.queuePosition).toBe(1);
  });

  it('should handle empty waitlist on refresh by clearing ticket and setting notification', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(of(undefined));

    component.refreshStatus(false);
    fixture.detectChanges();

    expect(component.currentTicket).toBeNull();
    expect(component.notificationMessage).toContain('No active waitlist ticket found');
  });

  it('should display error message when refresh fails', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(throwError(() => ({
      status: 500,
      error: { message: 'Server communication error' }
    })));

    component.refreshStatus(false);
    fixture.detectChanges();

    expect(component.isRefreshing).toBe(false);
    expect(component.errorMessage).toBe('Server communication error');
  });

  it('should display session expired error and pause polling when receiving 401 Unauthorized', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(throwError(() => ({
      status: 401,
      error: { message: 'Full authentication is required' }
    })));

    component.loadQueueStatus();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.isPollingPaused).toBe(true);
    expect(component.errorMessage).toContain('session has expired or authentication is required');

    // Subsequent silent refresh should be blocked while polling is paused
    queueServiceMock.getQueueStatus.mockClear();
    component.refreshStatus(true);
    expect(queueServiceMock.getQueueStatus).not.toHaveBeenCalled();
  });

  it('should display access denied error and pause polling when receiving 403 Forbidden', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(throwError(() => ({
      status: 403,
      error: { message: 'Access denied' }
    })));

    component.loadQueueStatus();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.isPollingPaused).toBe(true);
    expect(component.errorMessage).toContain('Access denied');
  });

  it('should display network connection message when receiving network error or Failed to fetch', () => {
    queueServiceMock.getQueueStatus.mockReturnValue(throwError(() => ({
      status: 0,
      message: 'TypeError: Failed to fetch'
    })));

    component.loadQueueStatus();
    fixture.detectChanges();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toContain('Unable to connect to the live queue service');
  });

  it('should calculate progressPercentage dynamically from backend QueueStatus without hardcoding 70%', () => {
    // Null ticket
    component.currentTicket = null;
    expect(component.progressPercentage).toBe(0);

    // TICKET_ISSUED -> 0%
    component.currentTicket = { ...mockTicket, status: 'TICKET_ISSUED' };
    expect(component.progressPercentage).toBe(0);

    // WAITING (in line) -> 25%
    component.currentTicket = { ...mockTicket, peopleAhead: 2, position: 3, status: 'WAITING' };
    expect(component.progressPercentage).toBe(25);
    expect(component.queuePosition).toBe(3);

    // WAITING with 0 ahead -> still 25% based on WAITING status (never hardcoded 50% or 70%)
    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 1, status: 'WAITING' };
    expect(component.progressPercentage).toBe(25);
    expect(component.queuePosition).toBe(1);

    // Table ready (NOTIFIED, TABLE_READY or SERVING) -> 50%
    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 1, status: 'NOTIFIED' };
    expect(component.progressPercentage).toBe(50);
    expect(component.queuePosition).toBe(1);

    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 1, status: 'TABLE_READY' };
    expect(component.progressPercentage).toBe(50);

    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 1, status: 'SERVING' };
    expect(component.progressPercentage).toBe(50);

    // Seated (dining in progress) -> 75%
    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 0, status: 'SEATED' };
    expect(component.progressPercentage).toBe(75);
    expect(component.queuePosition).toBe(0);

    // Completed -> 100%
    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 0, status: 'COMPLETED' };
    expect(component.progressPercentage).toBe(100);
    expect(component.queuePosition).toBe(0);

    // Cancelled / Left -> 0%
    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 0, status: 'CANCELLED' };
    expect(component.progressPercentage).toBe(0);
    expect(component.queuePosition).toBe(0);

    component.currentTicket = { ...mockTicket, peopleAhead: 0, position: 0, status: 'LEFT' };
    expect(component.progressPercentage).toBe(0);
  });

  it('should clean up polling subscriptions on destroy', () => {
    const destroySpy = vi.spyOn((component as any).destroy$, 'next');
    const completeSpy = vi.spyOn((component as any).destroy$, 'complete');
    component.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should render loading spinner while isLoading is true', () => {
    component.isLoading = true;
    component.currentTicket = null;
    (component as any).cdr.markForCheck();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.queue-loading-state')).toBeTruthy();
    expect(compiled.querySelector('.queue-spinner')).toBeTruthy();
    expect(compiled.textContent).toContain('Connecting to digital concierge waitlist...');
  });

  it('should render empty state card with Join Waiting Queue button when there is no active ticket', () => {
    component.isLoading = false;
    component.currentTicket = null;
    (component as any).cdr.markForCheck();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.queue-empty-card')).toBeTruthy();
    expect(compiled.querySelector('.queue-join-form-wrapper')).toBeTruthy();
    expect(compiled.textContent).toContain('Join Waiting Queue');
    expect(compiled.textContent).toContain('No Active Waitlist Token');
  });

  it('should render error banner with error message when errorMessage is present', () => {
    component.errorMessage = 'Service temporarily unavailable';
    (component as any).cdr.markForCheck();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Service temporarily unavailable');
  });

  it('should synchronize progress percentage and journey steps correctly for WAITING and NOTIFIED', () => {
    // WAITING: 25%
    component.currentTicket = { ...mockTicket, status: 'WAITING' };
    expect(component.progressPercentage).toBe(25);
    (component as any).cdr.markForCheck();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('25%');

    // NOTIFIED: 50%
    component.currentTicket = { ...mockTicket, status: 'NOTIFIED' };
    expect(component.progressPercentage).toBe(50);
    (component as any).cdr.markForCheck();
    fixture.detectChanges();
    expect(compiled.textContent).toContain('50%');
  });
});
