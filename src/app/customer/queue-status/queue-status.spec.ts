import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { QueueStatus } from './queue-status';
import { QueueService } from '../../core/services/queue.service';
import { RestaurantService } from '../../core/services/restaurant.service';

describe('QueueStatus', () => {
  let component: QueueStatus;
  let fixture: ComponentFixture<QueueStatus>;
  let queueService: QueueService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QueueStatus],
      providers: [provideRouter([]), QueueService, RestaurantService],
    }).compileComponents();

    fixture = TestBed.createComponent(QueueStatus);
    component = fixture.componentInstance;
    queueService = TestBed.inject(QueueService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial active queue ticket', () => {
    expect(component.currentTicket).toBeTruthy();
    expect(component.currentTicket?.ticketNumber).toBe('Q-104');
    expect(component.currentTicket?.status).toBe('WAITING');
  });

  it('should calculate queue position correctly', () => {
    expect(component.queuePosition).toBe(3); // 2 people ahead + 1
  });

  it('should calculate progress percentage', () => {
    expect(component.progressPercentage).toBeGreaterThan(0);
  });

  it('should allow customer to leave queue', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.leaveQueue();
    expect(component.currentTicket).toBeNull();
    expect(component.notificationMessage).toContain('successfully left the queue');
  });
});
