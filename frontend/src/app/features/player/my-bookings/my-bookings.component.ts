import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { AlertService } from '../../../core/services/alert.service';
import { BookingRequest, BookingHistory, Slot } from '../../../core/models/models';

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="my-bookings-wrapper py-4">
      <div class="container">
        <!-- HEADER -->
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <div>
            <h2 class="fw-bold text-light mb-1">My Bookings & Requests</h2>
            <p class="text-muted mb-0">Track real-time approval status, access match schedules, and review ground history.</p>
          </div>
          <button class="btn btn-emerald fw-semibold px-3 py-2" routerLink="/search">
            <i class="bi bi-plus-lg me-1"></i> Book New Turf
          </button>
        </div>

        <!-- STATUS TABS -->
        <div class="d-flex gap-2 overflow-x-auto pb-2 mb-4">
          <button
            class="btn btn-sm text-nowrap px-3 py-2"
            [ngClass]="activeTab === 'All' ? 'btn-emerald' : 'btn-outline-secondary'"
            (click)="setTab('All')"
          >
            All Bookings ({{ allBookings.length }})
          </button>
          <button
            class="btn btn-sm text-nowrap px-3 py-2"
            [ngClass]="activeTab === 'Pending' ? 'btn-warning text-dark' : 'btn-outline-secondary'"
            (click)="setTab('Pending')"
          >
            Pending Approval ({{ countByStatus('Pending') }})
          </button>
          <button
            class="btn btn-sm text-nowrap px-3 py-2"
            [ngClass]="activeTab === 'Approved' ? 'btn-emerald' : 'btn-outline-secondary'"
            (click)="setTab('Approved')"
          >
            Approved ({{ countByStatus('Approved') }})
          </button>
          <button
            class="btn btn-sm text-nowrap px-3 py-2"
            [ngClass]="activeTab === 'Completed' ? 'btn-primary' : 'btn-outline-secondary'"
            (click)="setTab('Completed')"
          >
            Completed ({{ countByStatus('Completed') }})
          </button>
          <button
            class="btn btn-sm text-nowrap px-3 py-2"
            [ngClass]="activeTab === 'Cancelled' ? 'btn-secondary' : 'btn-outline-secondary'"
            (click)="setTab('Cancelled')"
          >
            Cancelled / Rejected ({{ countCancelledOrRejected() }})
          </button>
        </div>

        <!-- LOADING STATE -->
        <div *ngIf="loading" class="text-center py-5">
          <div class="spinner-border text-emerald" role="status"></div>
          <p class="text-muted mt-2">Fetching your match bookings...</p>
        </div>

        <!-- EMPTY STATE -->
        <div *ngIf="!loading && displayedBookings.length === 0" class="glass-panel text-center py-5 rounded-4">
          <i class="bi bi-calendar-x display-3 text-muted mb-3"></i>
          <h4 class="fw-bold text-light">No Bookings Found</h4>
          <p class="text-muted max-w-sm mx-auto mb-4">
            You don't have any bookings matching this filter. Explore venues and lock in your next match now.
          </p>
          <button class="btn btn-emerald px-4 py-2 fw-semibold" routerLink="/search">
            Explore Grounds & Book
          </button>
        </div>

        <!-- BOOKINGS LIST -->
        <div *ngIf="!loading && displayedBookings.length > 0" class="row g-4">
          <div *ngFor="let b of displayedBookings" class="col-12">
            <div class="booking-card glass-panel p-4 rounded-4">
              <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                <div>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge bg-secondary-subtle text-light font-monospace">
                      {{ b.booking_reference }}
                    </span>
                    <span class="badge-status-pill" [ngClass]="getStatusBadgeClass(b.status)">
                      {{ b.status }}
                    </span>
                    <span *ngIf="b.advance_payment_received" class="badge bg-success-subtle text-success small">
                      <i class="bi bi-check2-all me-1"></i> Advance Paid
                    </span>
                  </div>
                  <h4 class="fw-bold text-light mb-0">{{ b.turf_name }}</h4>
                  <p class="text-muted small mb-0">
                    <i class="bi bi-geo-alt me-1 text-danger"></i> {{ b.turf_address || 'Arena Address' }}
                  </p>
                </div>

                <div class="text-sm-end">
                  <div class="fs-4 fw-bold text-emerald">₹{{ b.total_amount }}</div>
                  <span class="badge bg-dark-glass text-muted small">
                    {{ b.payment_preference }}
                  </span>
                </div>
              </div>

              <!-- MATCH DETAILS GRID -->
              <div class="row g-3 py-3 border-top border-bottom border-dark-subtle my-2 bg-secondary-subtle rounded-3 p-3">
                <div class="col-md-3 col-6">
                  <span class="text-muted small d-block">Match Date</span>
                  <span class="fw-semibold text-light">
                    <i class="bi bi-calendar-check me-1 text-emerald"></i> {{ b.booking_date }}
                  </span>
                </div>
                <div class="col-md-3 col-6">
                  <span class="text-muted small d-block">Reserved Slots</span>
                  <span class="fw-semibold text-light">
                    <i class="bi bi-clock me-1 text-emerald"></i>
                    {{ formatSlotTimes(b) }}
                  </span>
                </div>
                <div class="col-md-3 col-6">
                  <span class="text-muted small d-block">Squad Players</span>
                  <span class="fw-semibold text-light">
                    <i class="bi bi-people me-1 text-emerald"></i> {{ b.number_of_players }} Players
                    {{ b.team_name ? '(' + b.team_name + ')' : '' }}
                  </span>
                </div>
                <div class="col-md-3 col-6">
                  <span class="text-muted small d-block">Host Brand</span>
                  <span class="fw-semibold text-light">
                    <i class="bi bi-building me-1 text-emerald"></i> {{ b.owner_brand || 'Turf Owner' }}
                  </span>
                </div>
              </div>

              <!-- REASON CALLOUTS IF REJECTED / CANCELLED -->
              <div *ngIf="b.status === 'Rejected' && (b.rejection_category || b.rejection_reason)" class="alert alert-danger py-2 px-3 small mt-2 mb-0">
                <strong>Rejection Reason ({{ b.rejection_category || 'Other' }}):</strong> {{ b.rejection_reason }}
              </div>
              <div *ngIf="b.status === 'Cancelled' && b.cancellation_reason" class="alert alert-warning py-2 px-3 small mt-2 mb-0">
                <strong>Cancellation Reason:</strong> {{ b.cancellation_reason }}
              </div>

              <!-- ACTION BUTTONS -->
              <div class="d-flex flex-wrap justify-content-between align-items-center mt-3 pt-2">
                <div class="d-flex gap-2">
                  <button class="btn btn-sm btn-outline-info" (click)="viewTimeline(b)">
                    <i class="bi bi-clock-history me-1"></i> Audit Timeline
                  </button>
                  <button *ngIf="b.turf_id" class="btn btn-sm btn-outline-emerald" [routerLink]="['/turfs', b.turf_id]">
                    <i class="bi bi-arrow-repeat me-1"></i> Book Again
                  </button>
                </div>

                <div class="d-flex gap-2">
                  <!-- WITHDRAW BUTTON (ONLY FOR PENDING) -->
                  <button
                    *ngIf="b.status === 'Pending'"
                    class="btn btn-sm btn-outline-danger"
                    (click)="withdrawRequest(b)"
                  >
                    <i class="bi bi-x-circle me-1"></i> Withdraw Request
                  </button>

                  <!-- CANCEL BUTTON (ONLY FOR APPROVED) -->
                  <button
                    *ngIf="b.status === 'Approved'"
                    class="btn btn-sm btn-outline-danger"
                    (click)="cancelBooking(b)"
                  >
                    <i class="bi bi-calendar-x me-1"></i> Cancel Booking
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TIMELINE MODAL -->
      <div *ngIf="selectedBookingTimeline" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card-custom glass-panel p-4 w-100" style="max-width: 600px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0 text-light">
              <i class="bi bi-clock-history text-emerald me-2"></i>Booking Status Lifecycle
            </h5>
            <button class="btn btn-sm btn-outline-secondary" (click)="selectedBookingTimeline = null">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="mb-3 text-muted small">
            Ref: <strong>{{ activeBookingDetail?.booking_reference }}</strong> | {{ activeBookingDetail?.turf_name }}
          </div>

          <div class="timeline-container py-2">
            <div *ngFor="let item of selectedBookingTimeline; let isLast = last" class="timeline-item position-relative ps-4 pb-3">
              <div class="timeline-dot"></div>
              <div class="timeline-content p-2 rounded bg-secondary-subtle">
                <div class="d-flex justify-content-between align-items-center mb-1">
                  <span class="badge bg-emerald-subtle text-emerald fw-semibold">
                    {{ item.to_status }}
                  </span>
                  <small class="text-muted">{{ item.created_at | date:'medium' }}</small>
                </div>
                <div class="small text-light" *ngIf="item.reason_or_note">
                  {{ item.reason_or_note }}
                </div>
                <div class="small text-muted mt-1" *ngIf="item.changed_by_email">
                  Updated by: {{ item.changed_by_email }} ({{ item.changed_by_role }})
                </div>
              </div>
            </div>
          </div>

          <div class="text-end mt-3">
            <button class="btn btn-outline-secondary btn-sm" (click)="selectedBookingTimeline = null">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-bookings-wrapper {
      min-height: calc(100vh - 140px);
      background-color: var(--bg-main);
    }
    .booking-card {
      border: 1px solid var(--border-color);
      transition: border-color 0.2s ease;
    }
    .booking-card:hover {
      border-color: rgba(16, 185, 129, 0.4);
    }
    .badge-status-pill {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.65rem;
      border-radius: 50px;
    }
    .badge-pending {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .badge-approved {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .badge-rejected, .badge-cancelled {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .badge-completed {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .badge-expired {
      background: rgba(107, 114, 128, 0.15);
      color: #9ca3af;
      border: 1px solid rgba(107, 114, 128, 0.3);
    }
    .bg-dark-glass {
      background: rgba(0, 0, 0, 0.4);
    }
    .timeline-container {
      position: relative;
    }
    .timeline-item::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 14px;
      bottom: 0;
      width: 2px;
      background: var(--border-color);
    }
    .timeline-item:last-child::before {
      display: none;
    }
    .timeline-dot {
      position: absolute;
      left: 0;
      top: 4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
    }
    .modal-backdrop-custom {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 1050;
    }
    .modal-card-custom {
      border-radius: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }
  `]
})
export class MyBookingsComponent implements OnInit {
  allBookings: BookingRequest[] = [];
  displayedBookings: BookingRequest[] = [];
  loading = true;
  activeTab = 'All';

  selectedBookingTimeline: BookingHistory[] | null = null;
  activeBookingDetail: BookingRequest | null = null;

  constructor(
    private bookingService: BookingService,
    private alertService: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading = true;
    this.bookingService.getPlayerBookings().subscribe({
      next: (res) => {
        this.allBookings = res.bookings || [];
        this.filterBookings();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.alertService.error('Error', 'Unable to retrieve your bookings.');
      }
    });
  }

  setTab(tab: string): void {
    this.activeTab = tab;
    this.filterBookings();
  }

  countByStatus(status: string): number {
    return this.allBookings.filter((b) => b.status === status).length;
  }

  countCancelledOrRejected(): number {
    return this.allBookings.filter((b) => b.status === 'Cancelled' || b.status === 'Rejected' || b.status === 'Expired').length;
  }

  filterBookings(): void {
    if (this.activeTab === 'All') {
      this.displayedBookings = [...this.allBookings];
    } else if (this.activeTab === 'Cancelled') {
      this.displayedBookings = this.allBookings.filter(
        (b) => b.status === 'Cancelled' || b.status === 'Rejected' || b.status === 'Expired'
      );
    } else {
      this.displayedBookings = this.allBookings.filter((b) => b.status === this.activeTab);
    }
  }

  formatSlotTimes(b: BookingRequest): string {
    if (b.slot_start_times && b.slot_start_times.length > 0 && b.slot_end_times && b.slot_end_times.length > 0) {
      const start = b.slot_start_times[0].slice(0, 5);
      const end = b.slot_end_times[b.slot_end_times.length - 1].slice(0, 5);
      return `${start} - ${end} (${b.slot_start_times.length} slots)`;
    }
    return 'Times confirmed';
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'Pending':
        return 'badge-pending';
      case 'Approved':
        return 'badge-approved';
      case 'Completed':
        return 'badge-completed';
      case 'Rejected':
        return 'badge-rejected';
      case 'Cancelled':
        return 'badge-cancelled';
      case 'Expired':
        return 'badge-expired';
      default:
        return 'badge-pending';
    }
  }

  withdrawRequest(b: BookingRequest): void {
    this.alertService
      .confirm(
        'Withdraw Booking Request?',
        `Are you sure you want to withdraw request ${b.booking_reference}? This action cannot be undone.`
      )
      .then((confirmed) => {
        if (confirmed) {
          this.bookingService.withdrawBooking(b.id).subscribe({
            next: () => {
              this.alertService.success('Withdrawn', 'Your request has been withdrawn.');
              this.loadBookings();
            },
            error: (err) => {
              this.alertService.error('Error', err.error?.detail || 'Failed to withdraw booking request.');
            }
          });
        }
      });
  }

  cancelBooking(b: BookingRequest): void {
    this.alertService
      .promptText(
        'Cancel Approved Booking',
        'Please enter a reason for cancelling this match. Note: Cancellation may be subject to the venue policy.'
      )
      .then((reason: string | null) => {
        if (reason && reason.trim()) {
          this.bookingService.cancelBooking(b.id, reason.trim()).subscribe({
            next: () => {
              this.alertService.success('Cancelled', 'Your booking has been cancelled.');
              this.loadBookings();
            },
            error: (err) => {
              this.alertService.error('Error', err.error?.detail || 'Failed to cancel booking.');
            }
          });
        }
      });
  }

  viewTimeline(b: BookingRequest): void {
    this.activeBookingDetail = b;
    this.bookingService.getBookingDetails(b.id).subscribe({
      next: (res) => {
        this.selectedBookingTimeline = res.timeline || [];
      },
      error: () => {
        this.alertService.error('Error', 'Unable to fetch audit timeline.');
      }
    });
  }
}
