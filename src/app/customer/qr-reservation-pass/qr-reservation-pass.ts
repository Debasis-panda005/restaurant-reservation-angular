import { Component, OnInit, OnDestroy, ChangeDetectorRef, Optional } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Reservation, QrVerificationResponseDto } from '../../core/models/reservation.model';
import { Restaurant } from '../../core/models/restaurant.model';
import { Table } from '../../core/models/table.model';
import { ReservationService } from '../../core/services/reservation.service';
import { RestaurantService } from '../../core/services/restaurant.service';
import { NotificationService } from '../../core/services/notification.service';
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
  unreadNotificationsCount: number = 0;

  // Decoupled loading and error states
  isLoading: boolean = true;       // Loading initial reservation details
  isQrLoading: boolean = false;    // Generating QR code data
  qrFailed: boolean = false;       // QR generation failed or unavailable
  notFound: boolean = false;
  errorTitle: string = 'Reservation Not Found';
  errorMessage: string = 'We could not locate the requested reservation in our registry. Please verify your reservation ID or consult your dining journal.';
  isCancelled: boolean = false;
  downloadSuccess: boolean = false;
  isMobileMenuOpen: boolean = false;

  // Backend QR verification states
  isVerifying: boolean = false;
  verificationSuccess: boolean = false;
  verificationResult: QrVerificationResponseDto | null = null;
  verificationError: string | null = null;

  private routeSub?: Subscription;
  private activeLoadId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private reservationService: ReservationService,
    private restaurantService: RestaurantService,
    private authService: AuthService,
    private reservationQrService: ReservationQrService,
    private cdr: ChangeDetectorRef,
    @Optional() private notificationService?: NotificationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadUnreadCount();
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

  loadUnreadCount(): void {
    const user = this.authService.getCurrentUser();
    const customerId = user ? user.id : 1;
    this.notificationService?.getUnreadCount(customerId).subscribe({
      next: (count) => {
        this.unreadNotificationsCount = count;
      },
    });
  }

  private async handleParamId(idParam: string | null | undefined): Promise<void> {
    if (!idParam || isNaN(Number(idParam)) || Number(idParam) <= 0) {
      this.notFound = true;
      this.errorTitle = 'Invalid Reservation Reference';
      this.errorMessage = 'The provided reservation reference is invalid. Please select a valid booking from your reservations list.';
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
    this.errorTitle = 'Reservation Not Found';
    this.errorMessage = 'We could not locate the requested reservation in our registry. Please verify your reservation ID or consult your dining journal.';
    this.isCancelled = false;
    this.qrFailed = false;
    this.qrCodeUrl = '';
    this.isVerifying = false;
    this.verificationSuccess = false;
    this.verificationResult = null;
    this.verificationError = null;
    this.cdr.markForCheck();

    return new Promise((resolve) => {
      this.reservationService.getReservationById(reservationId).subscribe({
        next: (res) => {
          if (!res) {
            this.notFound = true;
            this.errorTitle = 'Reservation Not Found';
            this.errorMessage = 'We could not locate the requested reservation in our registry. Please verify your reservation ID or consult your dining journal.';
            this.isLoading = false;
            this.isQrLoading = false;
            this.activeLoadId = null;
            this.cdr.markForCheck();
            resolve();
            return;
          }

          // 1. Immediately render reservation details
          this.reservation = res;
          if (res.tableNumber) {
            this.table = {
              id: res.tableId,
              restaurantId: res.restaurantId,
              tableNumber: res.tableNumber,
              capacity: res.guests,
              seatingType: (res.seatingType as any) || 'INDOOR',
              available: false,
            };
          }
          this.isLoading = false;
          this.cdr.markForCheck();

          // Fetch associated restaurant and table info for display
          this.restaurantService.getRestaurantById(res.restaurantId).subscribe((rest) => {
            this.restaurant = rest || null;
            this.cdr.markForCheck();
          });

          this.restaurantService.getTablesByRestaurantId(res.restaurantId).subscribe((tables) => {
            const found = tables.find((t) => t.id === res.tableId);
            if (found) {
              this.table = found;
            }
            this.cdr.markForCheck();
          });

          // Patron Name: prefer real response field customerName, else current user profile, else fallback
          if (res.customerName) {
            this.customerName = res.customerName;
          } else {
            const currentUser = this.authService.getCurrentUser();
            if (currentUser && (currentUser.fullName || currentUser.name)) {
              this.customerName = currentUser.fullName || currentUser.name;
            } else {
              this.customerName = 'Valued Patron';
            }
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
        error: (err) => {
          this.notFound = true;
          if (err?.status === 403) {
            this.errorTitle = 'Access Denied';
            this.errorMessage = 'You are not authorized to view this reservation pass. Please access reservations from your own dining journal.';
          } else if (err?.status === 404) {
            this.errorTitle = 'Reservation Not Found';
            this.errorMessage = 'We could not locate the requested reservation in our registry. Please verify your reservation ID or consult your dining journal.';
          } else {
            this.errorTitle = 'Unable to Load Pass';
            this.errorMessage = 'A network or server error occurred while retrieving your reservation pass. Please try again.';
          }
          this.isLoading = false;
          this.isQrLoading = false;
          this.activeLoadId = null;
          this.cdr.markForCheck();
          resolve();
        }
      });
    });
  }

  get statusDisplayLabel(): string {
    switch (this.reservation?.status) {
      case 'CONFIRMED':
        return 'RESERVATION CONFIRMED';
      case 'CHECKED_IN':
        return 'CHECKED IN';
      case 'PENDING':
        return 'RESERVATION PENDING';
      case 'COMPLETED':
        return 'RESERVATION COMPLETED';
      case 'CANCELLED':
        return 'RESERVATION CANCELLED';
      default:
        return this.reservation?.status ? `RESERVATION ${this.reservation.status}` : 'RESERVATION CONFIRMED';
    }
  }

  get statusBadgeClass(): string {
    switch (this.reservation?.status) {
      case 'CONFIRMED':
      case 'CHECKED_IN':
        return 'badge-confirmed';
      case 'PENDING':
        return 'badge-pending';
      case 'COMPLETED':
        return 'badge-completed';
      case 'CANCELLED':
        return 'badge-cancelled';
      default:
        return 'badge-confirmed';
    }
  }

  formatTableDisplay(): string {
    const tNum = this.table?.tableNumber || this.reservation?.tableNumber;
    if (tNum) {
      return tNum.toLowerCase().startsWith('table') ? tNum : `Table ${tNum}`;
    }
    if (this.reservation?.tableId) {
      return `Table #${this.reservation.tableId}`;
    }
    return 'Unassigned Table';
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
   * Performs authentic backend QR verification against POST /api/reservations/verify.
   * Sends the reservation ID and the server-generated verification token.
   * Authentication is handled automatically via the JWT HTTP interceptor.
   */
  verifyPass(): void {
    if (this.isVerifying) {
      return;
    }

    if (!this.reservation) {
      this.verificationError = 'No reservation details available to verify.';
      this.verificationSuccess = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.reservation.status === 'CANCELLED') {
      this.verificationError = 'Cannot verify a cancelled reservation.';
      this.verificationSuccess = false;
      this.cdr.markForCheck();
      return;
    }

    if (!this.reservation.qrToken || !this.reservation.qrToken.trim()) {
      this.verificationError = 'No server verification token assigned to this reservation.';
      this.verificationSuccess = false;
      this.cdr.markForCheck();
      return;
    }

    this.isVerifying = true;
    this.verificationError = null;
    this.cdr.markForCheck();

    this.reservationQrService.verifyReservation({
      reservationId: this.reservation.id,
      token: this.reservation.qrToken
    }).subscribe({
      next: (response: QrVerificationResponseDto) => {
        this.isVerifying = false;
        if (response && response.valid) {
          this.verificationSuccess = true;
          this.verificationResult = response;
          this.verificationError = null;
        } else {
          this.verificationSuccess = false;
          this.verificationResult = null;
          this.verificationError = response?.message || 'Verification could not be confirmed by the server.';
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.isVerifying = false;
        this.verificationSuccess = false;
        this.verificationResult = null;

        if (err?.status === 400) {
          this.verificationError = err.error?.message || err.message || 'Invalid verification token or reservation state.';
        } else if (err?.status === 401) {
          this.verificationError = 'Authentication required. Please log in again to verify your reservation.';
        } else if (err?.status === 403) {
          this.verificationError = err.error?.message || 'You are not authorized to verify this reservation.';
        } else if (err?.status === 404) {
          this.verificationError = err.error?.message || 'Reservation was not found on the server.';
        } else {
          this.verificationError = err.error?.message || 'Verification service is currently unavailable. Please try again.';
        }
        this.cdr.markForCheck();
      }
    });
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
