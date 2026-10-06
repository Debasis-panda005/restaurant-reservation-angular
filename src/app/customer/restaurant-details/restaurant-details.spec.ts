import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RestaurantDetails } from './restaurant-details';
import { RestaurantService } from '../../core/services/restaurant.service';
import { ReservationService } from '../../core/services/reservation.service';
import { Table } from '../../core/models/table.model';

describe('RestaurantDetails', () => {
  let component: RestaurantDetails;
  let fixture: ComponentFixture<RestaurantDetails>;
  let reservationService: ReservationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RestaurantDetails],
      providers: [provideRouter([]), RestaurantService, ReservationService],
    }).compileComponents();

    fixture = TestBed.createComponent(RestaurantDetails);
    component = fixture.componentInstance;
    reservationService = TestBed.inject(ReservationService);
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should not allow selecting an occupied table', () => {
    const occupiedTable: Table = {
      id: 999,
      restaurantId: 1,
      tableNumber: 'T-99',
      capacity: 4,
      seatingType: 'INDOOR',
      available: false,
    };

    component.selectTable(occupiedTable);
    expect(component.selectedTable).toBeNull();
    expect(component.errorMessage).toContain('occupied');
  });

  it('should allow selecting an available table', () => {
    const availableTable: Table = {
      id: 101,
      restaurantId: 1,
      tableNumber: 'T-01',
      capacity: 4,
      seatingType: 'WINDOW',
      available: true,
    };

    component.selectTable(availableTable);
    expect(component.selectedTable).toEqual(availableTable);
    expect(component.errorMessage).toBe('');
  });

  it('should create a reservation when valid form is submitted', () => {
    const availableTable: Table = {
      id: 102,
      restaurantId: 1,
      tableNumber: 'T-02',
      capacity: 4,
      seatingType: 'AC',
      available: true,
    };

    component.selectTable(availableTable);
    component.bookingDate = component.minDate || '2026-10-06';
    component.bookingTime = '19:30';
    component.guestsCount = 2;

    component.submitReservation();

    expect(component.bookingSuccess).toBe(true);
    expect(component.createdReservation).toBeTruthy();
    expect(component.createdReservation?.tableId).toBe(102);
    expect(component.createdReservation?.status).toBe('CONFIRMED');
    expect(availableTable.available).toBe(false);
  });
});
