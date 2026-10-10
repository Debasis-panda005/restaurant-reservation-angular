import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { QueueService } from './queue.service';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueueStatusResponse } from '../models/queue-ticket.model';

describe('QueueService', () => {
  let service: QueueService;
  let httpTesting: HttpTestingController;

  const mockResponse: QueueStatusResponse = {
    id: 101,
    queueNumber: 'Q-101',
    ticketNumber: 'Q-101',
    customerId: 1,
    customerName: 'John Doe',
    restaurantId: 1,
    restaurantName: 'Spice Symphony Bistro',
    partySize: 2,
    guests: 2,
    status: 'WAITING',
    position: 1,
    peopleAhead: 0,
    estimatedWaitMinutes: 5,
    joinedAt: '2026-10-11T02:00:00Z',
    updatedAt: '2026-10-11T02:00:00Z'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        QueueService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(QueueService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should join queue via POST /api/queue/join', () => {
    service.joinQueue({ restaurantId: 1, partySize: 2 }).subscribe(ticket => {
      expect(ticket).toBeTruthy();
      expect(ticket.id).toBe(101);
      expect(ticket.ticketNumber).toBe('Q-101');
      expect(ticket.status).toBe('WAITING');
      expect(ticket.position).toBe(1);
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/join');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ restaurantId: 1, partySize: 2 });
    req.flush(mockResponse);
  });

  it('should get active queue status via GET /api/queue/my/active returning an array', () => {
    service.getQueueStatus().subscribe(ticket => {
      expect(ticket).toBeTruthy();
      expect(ticket?.id).toBe(101);
      expect(ticket?.ticketNumber).toBe('Q-101');
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/my/active');
    expect(req.request.method).toBe('GET');
    req.flush([mockResponse]);
  });

  it('should return undefined when GET /api/queue/my/active returns an empty array []', () => {
    service.getQueueStatus().subscribe(ticket => {
      expect(ticket).toBeUndefined();
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/my/active');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should get active queue status via GET /api/queue/my/active returning a single object', () => {
    service.getQueueStatus().subscribe(ticket => {
      expect(ticket).toBeTruthy();
      expect(ticket?.id).toBe(101);
      expect(ticket?.ticketNumber).toBe('Q-101');
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/my/active');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('should return undefined when active queue returns 404', () => {
    service.getQueueStatus().subscribe(ticket => {
      expect(ticket).toBeUndefined();
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/my/active');
    expect(req.request.method).toBe('GET');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should get queue history via GET /api/queue/my', () => {
    service.getMyQueue().subscribe(tickets => {
      expect(tickets.length).toBe(1);
      expect(tickets[0].id).toBe(101);
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/my');
    expect(req.request.method).toBe('GET');
    req.flush([mockResponse]);
  });

  it('should leave queue via DELETE /api/queue/{id}/leave', () => {
    service.leaveQueue(101).subscribe(result => {
      expect(result).toBe(true);
    });

    const req = httpTesting.expectOne('http://localhost:8080/api/queue/101/leave');
    expect(req.request.method).toBe('DELETE');
    req.flush({ ...mockResponse, status: 'CANCELLED' });
  });
});
