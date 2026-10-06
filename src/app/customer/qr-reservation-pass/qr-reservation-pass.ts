import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Reservation } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { AuthService } from '../../core/services/auth.service';
import { ReservationQrService } from '../../core/services/reservation-qr.service';

@Component({
  selector: 'app-qr-reservation-pass',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './qr-reservation-pass.html',
  styleUrl: './qr-reservation-pass.css'
})
export class QrReservationPass implements OnInit, OnDestroy {
  reservation: Reservation | null = null;
  restaurant: Restaurant | null = null;
  table: Table | null = null;
  customerName: string = 'Valued Patron';
  qrCodeUrl: string = '';

  // Decoupled loading and error states
  isLoading: boolean = true;       // Loading initial reservation details
  isQrLoading: boolean = false;    // Generating QR code data
  qrFailed: boolean = false;       // QR generation failed or unavailable
  notFound: boolean = false;
  isCancelled: boolean = false;
  downloadSuccess: boolean = false;
  isMobileMenuOpen: boolean = false;

  private routeSub?: Subscription;
  private activeLoadId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private reservationQrService: ReservationQrService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.route.paramMap) {
      this.routeSub = this.route.paramMap.subscribe(async (params) => {
        const idParam = params.get('id');
        await this.handleParamId(idParam);
      });
    } else {
      const idParam = this.route.snapshot?.paramMap?.get('id');
      await this.handleParamId(idParam);
    }
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  private async handleParamId(idParam: string | null | undefined): Promise<void> {
    if (!idParam || isNaN(Number(idParam))) {
      this.notFound = true;
      this.isLoading = false;
      this.isQrLoading = false;
      this.cdr.markForCheck();
      return;
    }

    const reservationId = Number(idParam);
    // Avoid redundant duplicate load if the same reservation is already active
    if (this.reservation?.id === reservationId && !this.isLoading) {
      return;
    }
    await this.loadReservationPass(reservationId);
  }

  /**
   * Loads reservation details first. The pass card renders immediately once found,
   * without blocking on QR generation.
   */
  async loadReservationPass(reservationId: number): Promise<void> {
    if (this.activeLoadId === reservationId && (this.isLoading || this.isQrLoading)) {
      return;
    }

    this.activeLoadId = reservationId;
    this.isLoading = true;
    this.notFound = false;
    this.isCancelled = false;
    this.qrFailed = false;
    this.qrCodeUrl = '';
    this.cdr.markForCheck();

    return new Promise((resolve) => {
      this.reservationService.getReservationById(reservationId).subscribe({
        next: (res) => {
          if (!res) {
            this.notFound = true;
            this.isLoading = false;
            this.isQrLoading = false;
            this.activeLoadId = null;
            this.cdr.markForCheck();
            resolve();
            return;
          }

          // 1. Immediately render reservation details
          this.reservation = res;
          this.isLoading = false;
          this.cdr.markForCheck();

          // Fetch associated restaurant and table info for display
          this.restaurantService.getRestaurantById(res.restaurantId).subscribe((rest) => {
            this.restaurant = rest || null;
            this.cdr.markForCheck();
          });

          this.restaurantService.getTablesByRestaurantId(res.restaurantId).subscribe((tables) => {
            this.table = tables.find((t) => t.id === res.tableId) || null;
            this.cdr.markForCheck();
          });

          const currentUser = this.authService.getCurrentUser();
          if (currentUser && currentUser.name) {
            this.customerName = currentUser.name;
          }

          // Cancelled reservations must not generate an active QR pass
          if (res.status === 'CANCELLED') {
            this.isCancelled = true;
            this.isQrLoading = false;
            this.activeLoadId = null;
            this.cdr.markForCheck();
            resolve();
            return;
          }

          // 2. Generate QR code independently without blocking reservation details
          this.generateQrCode(res).finally(() => {
            this.activeLoadId = null;
            resolve();
          });
        },
        error: () => {
          this.notFound = true;
          this.isLoading = false;
          this.isQrLoading = false;
          this.activeLoadId = null;
          this.cdr.markForCheck();
          resolve();
        }
      });
    });
  }

  /**
   * Generates QR Code data URL independently.
   * Updates isQrLoading and qrFailed flags reliably.
   */
  async generateQrCode(reservation: Reservation): Promise<void> {
    this.isQrLoading = true;
    this.qrFailed = false;
    this.cdr.markForCheck();

    try {
      const url = await this.reservationQrService.generateQrData(reservation);
      if (url && url.length > 0) {
        this.qrCodeUrl = url;
        this.qrFailed = false;
      } else {
        this.qrCodeUrl = '';
        this.qrFailed = true;
      }
    } catch (err) {
      console.error('Failed to generate pass QR:', err);
      this.qrCodeUrl = '';
      this.qrFailed = true;
    } finally {
      this.isQrLoading = false;
      this.cdr.markForCheck();
    }
  }

  /**
   * Retries QR generation if it previously failed.
   */
  async retryQrGeneration(): Promise<void> {
    if (this.reservation && this.reservation.status !== 'CANCELLED') {
      await this.generateQrCode(this.reservation);
    }
  }

  /**
   * Downloads the generated scannable QR pass image.
   */
  downloadPass(): void {
    if (!this.qrCodeUrl || !this.reservation) {
      return;
    }

    const link = document.createElement('a');
    link.href = this.qrCodeUrl;
    link.download = `Reservation-Pass-RES-${this.reservation.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.downloadSuccess = true;
    this.cdr.markForCheck();
    setTimeout(() => {
      this.downloadSuccess = false;
      this.cdr.markForCheck();
    }, 4000);
  }

  backToReservations(): void {
    this.router.navigate(['/customer/reservations']);
  }

  goToRestaurants(): void {
    this.router.navigate(['/customer/restaurants']);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
