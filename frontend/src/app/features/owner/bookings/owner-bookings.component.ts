import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { BookingService } from '../../../core/services/booking.service';
import { TurfService } from '../../../core/services/turf.service';
import { AlertService } from '../../../core/services/alert.service';
import { BookingRequest, Turf, BookingHistory, Slot } from '../../../core/models/models';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Booking Requests & Confirmed Reservations</h1>
          <p class="page-sub">Review incoming player requests, confirm slots, track offline advance payments, and close completed matches.</p>
        </div>
        <div class="header-actions">
          <div class="pending-badge-counter" *ngIf="pendingCount > 0">
            <span class="pulsing-dot"></span>
            <b>{{ pendingCount }}</b> Pending Request(s)
          </div>
        </div>
      </div>

      <!-- Filters Card -->
      <div class="filters-card mb-4">
        <div class="filter-row">
          <div class="filter-item search">
            <label class="filter-label">Search Requests</label>
            <div class="input-icon">
              <i class="bi bi-search"></i>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="loadBookings()"
                placeholder="Search by player, mobile or booking ID..."
                class="form-control"
              />
            </div>
          </div>

          <div class="filter-item">
            <label class="filter-label">Arena Turf</label>
            <select [(ngModel)]="turfFilter" (change)="loadBookings()" class="form-select">
              <option value="">All Turfs</option>
              <option *ngFor="let t of turfs" [value]="t.id">{{ t.name }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Status</label>
            <select [(ngModel)]="statusFilter" (change)="loadBookings()" class="form-select">
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Approval</option>
              <option value="Approved">Approved (Confirmed)</option>
              <option value="Completed">Completed</option>
              <option value="No-Show">No-Show</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Rejected">Rejected</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Sort By</label>
            <select [(ngModel)]="sortBy" (change)="loadBookings()" class="form-select">
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          <div class="filter-btn-group">
            <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Reset Filters</button>
          </div>
        </div>
      </div>

      <!-- Bookings Table -->
      <div class="turf-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Booking Reference</th>
                <th>Player & Team</th>
                <th>Arena Turf</th>
                <th>Match Date & Times</th>
                <th>Players</th>
                <th>Total Price</th>
                <th>Advance Paid</th>
                <th>Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="9" class="text-center py-4">Loading booking requests...</td>
              </tr>
              <tr *ngIf="!loading && bookings.length === 0">
                <td colspan="9" class="text-center py-4 text-muted">No booking requests found matching criteria.</td>
              </tr>
              <tr *ngFor="let b of bookings">
                <td>
                  <span class="font-mono font-bold">{{ b.booking_reference }}</span>
                  <div class="text-muted text-xs">{{ b.created_at | date:'short' }}</div>
                </td>
                <td>
                  <div class="font-bold">{{ b.player_name }}</div>
                  <div class="text-muted text-xs"><i class="bi bi-phone"></i> {{ b.player_mobile }}</div>
                  <small *ngIf="b.team_name" class="team-badge">{{ b.team_name }}</small>
                </td>
                <td>
                  <div class="turf-title">{{ b.turf_name }}</div>
                  <small class="text-muted">{{ b.turf_sport }}</small>
                </td>
                <td>
                  <div class="date-tag">{{ b.booking_date | date:'mediumDate' }}</div>
                  <div class="slot-times" *ngIf="b.slot_start_times?.length">
                    <span *ngFor="let st of b.slot_start_times; let idx = index" class="time-pill">
                      {{ st.slice(0, 5) }} - {{ b.slot_end_times?.[idx]?.slice(0, 5) }}
                    </span>
                  </div>
                </td>
                <td>{{ b.number_of_players }} Players</td>
                <td><span class="amount-val">₹{{ b.total_amount }}</span></td>
                <td>
                  <span class="badge" [ngClass]="b.advance_payment_received ? 'badge-approved' : 'badge-expired'">
                    {{ b.advance_payment_received ? 'Received' : 'Pending' }}
                  </span>
                </td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + b.status.toLowerCase()">
                    {{ b.status }}
                  </span>
                </td>
                <td class="text-right">
                  <div class="action-dropdown-btn">
                    <!-- If Pending -> Approve / Reject buttons -->
                    <ng-container *ngIf="b.status === 'Pending'">
                      <button class="btn btn-sm btn-primary" (click)="openApproveModal(b)">
                        <i class="bi bi-check2"></i> Approve
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="openRejectModal(b)">
                        <i class="bi bi-x"></i> Reject
                      </button>
                    </ng-container>

                    <!-- If Approved -> Complete, No-Show, Cancel -->
                    <ng-container *ngIf="b.status === 'Approved'">
                      <button class="btn btn-sm btn-secondary" (click)="onCloseBooking(b, 'Completed')" title="Mark Completed">
                        <i class="bi bi-check-circle"></i> Complete
                      </button>
                      <button class="btn btn-sm btn-outline-warning" (click)="onCloseBooking(b, 'No-Show')" title="Mark No-Show">
                        <i class="bi bi-person-x"></i> No-Show
                      </button>
                      <button class="btn btn-sm btn-outline-danger" (click)="openCancelModal(b)" title="Cancel Booking">
                        <i class="bi bi-x-circle"></i>
                      </button>
                    </ng-container>

                    <!-- View Details -->
                    <button class="btn btn-sm btn-icon" (click)="viewDetails(b)" title="View Booking Details">
                      <i class="bi bi-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- APPROVE MODAL -->
      <div class="modal-overlay" *ngIf="showApproveModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>Approve Booking: {{ activeBooking?.booking_reference }}</h2>
            <button class="close-btn" type="button" (click)="closeApproveModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-form">
            <p class="text-sm text-muted mb-3">
              Approving will <b>lock the slot</b> as Booked and <b>automatically reject</b> any competing pending requests for this slot.
            </p>

            <div class="form-group">
              <label class="form-label">Owner Note to Player (Optional, max 250 chars)</label>
              <textarea
                [(ngModel)]="ownerNote"
                rows="2"
                maxlength="250"
                class="form-control"
                placeholder="e.g. Booking confirmed! Please arrive 10 mins before slot start."
              ></textarea>
            </div>

            <div class="checkbox-row mt-3">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="advancePaymentReceived" />
                <span>Mark <b>Advance Payment Received</b> (Offline / UPI / Cash)</span>
              </label>
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeApproveModal()">Cancel</button>
              <button class="btn btn-primary" [disabled]="approving" (click)="onConfirmApprove()">
                {{ approving ? 'Approving...' : 'Confirm & Lock Slot' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- REJECT MODAL -->
      <div class="modal-overlay" *ngIf="showRejectModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>Reject Booking Request</h2>
            <button class="close-btn" type="button" (click)="closeRejectModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-form">
            <div class="form-group">
              <label class="form-label">Rejection Category <span class="required">*</span></label>
              <select [(ngModel)]="rejectionCategory" class="form-select">
                <option value="Slot Unavailable">Slot Unavailable</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Private Event">Private Event</option>
                <option value="Incomplete Details">Incomplete Details</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Rejection Reason <span class="required">*</span></label>
              <textarea
                [(ngModel)]="rejectionReason"
                rows="3"
                maxlength="250"
                class="form-control"
                placeholder="Explain why the booking request is being rejected..."
              ></textarea>
              <small class="text-muted">Maximum 250 characters.</small>
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeRejectModal()">Cancel</button>
              <button class="btn btn-danger" [disabled]="!rejectionReason.trim() || rejecting" (click)="onConfirmReject()">
                {{ rejecting ? 'Rejecting...' : 'Reject Request' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CANCEL APPROVED BOOKING MODAL -->
      <div class="modal-overlay" *ngIf="showCancelModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>Cancel Approved Booking</h2>
            <button class="close-btn" type="button" (click)="closeCancelModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-form">
            <p class="text-sm text-danger mb-3">
              Cancelling will release the slot back to <b>Open</b> and notify the player.
            </p>

            <div class="form-group">
              <label class="form-label">Cancellation Reason <span class="required">*</span></label>
              <textarea
                [(ngModel)]="cancellationReason"
                rows="3"
                maxlength="250"
                class="form-control"
                placeholder="State reason for cancelling this confirmed match..."
              ></textarea>
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeCancelModal()">Back</button>
              <button class="btn btn-danger" [disabled]="!cancellationReason.trim() || cancelling" (click)="onConfirmCancel()">
                {{ cancelling ? 'Cancelling...' : 'Cancel Booking' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- VIEW DETAILS MODAL -->
      <div class="modal-overlay" *ngIf="showDetailModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h2>Booking Details: {{ detailedBooking?.booking?.booking_reference }}</h2>
            <button class="close-btn" type="button" (click)="closeDetailModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="modal-form" *ngIf="detailedBooking">
            <div class="details-top-summary mb-4">
              <div class="summary-chip">
                <span class="chip-lbl">Player</span>
                <span class="chip-val">{{ detailedBooking.booking.player_name }} ({{ detailedBooking.booking.player_mobile }})</span>
              </div>
              <div class="summary-chip">
                <span class="chip-lbl">Turf</span>
                <span class="chip-val">{{ detailedBooking.booking.turf_name }}</span>
              </div>
              <div class="summary-chip">
                <span class="chip-lbl">Date</span>
                <span class="chip-val">{{ detailedBooking.booking.booking_date | date:'mediumDate' }}</span>
              </div>
              <div class="summary-chip">
                <span class="chip-lbl">Total Amount</span>
                <span class="chip-val text-primary">₹{{ detailedBooking.booking.total_amount }}</span>
              </div>
            </div>

            <!-- Add-ons & Special Requests -->
            <div class="turf-card mb-3 p-3" *ngIf="detailedBooking.booking.special_requests || detailedBooking.booking.add_ons?.length">
              <div *ngIf="detailedBooking.booking.special_requests" class="mb-2">
                <b>Special Requests:</b> {{ detailedBooking.booking.special_requests }}
              </div>
              <div *ngIf="detailedBooking.booking.add_ons?.length">
                <b>Add-ons:</b>
                <span *ngFor="let ao of detailedBooking.booking.add_ons" class="pill-sm">
                  {{ ao.name }} (₹{{ ao.price }})
                </span>
              </div>
            </div>

            <!-- Status Timeline -->
            <h3>Status Lifecycle Timeline</h3>
            <div class="timeline mt-3">
              <div class="timeline-item" *ngFor="let h of detailedBooking.timeline">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <div class="timeline-head">
                    <span class="badge" [ngClass]="'badge-' + h.to_status.toLowerCase()">{{ h.to_status }}</span>
                    <span class="timeline-time">{{ h.created_at | date:'medium' }}</span>
                  </div>
                  <div class="timeline-msg">{{ h.reason_or_note || 'Status updated.' }}</div>
                  <small class="text-muted" *ngIf="h.changed_by_email">By: {{ h.changed_by_email }}</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .page-title { font-size: 1.85rem; color: #0f172a; }
    .page-sub { color: #64748b; font-size: 0.95rem; margin-top: 0.2rem; }
    .header-actions { display: flex; align-items: center; gap: 0.75rem; }

    .pending-badge-counter {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #fef3c7;
      color: #92400e;
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 700;
    }
    .pulsing-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #d97706;
      box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7);
      animation: pulse 1.6s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(217, 119, 6, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(217, 119, 6, 0); }
    }

    .filters-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .filter-row { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    .filter-item { flex: 1; min-width: 160px; }
    .filter-item.search { flex: 2; min-width: 250px; }
    .filter-label { font-size: 0.78rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block; }
    .input-icon { position: relative; }
    .input-icon i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
    .input-icon .form-control { padding-left: 2.2rem; }
    .filter-btn-group { display: flex; gap: 0.5rem; }

    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
    .row-selected { background: #f0fdf4 !important; }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .text-xs { font-size: 0.75rem; }
    .team-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 600;
      background: #eff6ff;
      color: #2563eb;
      padding: 0.1rem 0.4rem;
      border-radius: 4px;
      margin-top: 0.15rem;
    }
    .turf-title { font-weight: 700; color: #1e293b; }
    .date-tag { font-weight: 600; color: #0f172a; }
    .slot-times { display: flex; flex-direction: column; gap: 0.15rem; margin-top: 0.2rem; }
    .time-pill { font-size: 0.75rem; font-weight: 700; color: #059669; }
    .amount-val { font-weight: 800; color: #059669; font-size: 0.95rem; }
    .action-dropdown-btn { display: flex; justify-content: flex-end; gap: 0.35rem; align-items: center; }
    .btn-icon { width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border-color); background: #ffffff; cursor: pointer; display: flex; align-items: center; justify-content: center; }

    /* Modals */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(4px); z-index: 1050; display: flex; align-items: flex-start; justify-content: center; padding: 2rem 1rem; overflow-y: auto;
    }
    .modal-dialog { background: #ffffff; border-radius: var(--radius-xl); max-height: calc(100vh - 4rem); overflow-y: auto; width: 100%; max-width: 550px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); position: relative; margin: auto 0; pointer-events: auto; }
    .modal-dialog.modal-lg { max-width: 720px; }
    .modal-header { position: sticky; top: 0; background: #ffffff; z-index: 20; padding: 1.25rem 1.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
    .modal-header h2 { font-size: 1.25rem; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; }
    .modal-form { padding: 1.5rem 1.75rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

    .details-top-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .summary-chip { background: #f8fafc; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.6rem 0.8rem; }
    .chip-lbl { font-size: 0.7rem; text-transform: uppercase; font-weight: 700; color: #64748b; display: block; }
    .chip-val { font-size: 0.92rem; font-weight: 700; color: #0f172a; }
    .pill-sm { font-size: 0.75rem; background: #e2e8f0; padding: 0.15rem 0.45rem; border-radius: 4px; margin-left: 0.35rem; }

    .timeline { display: flex; flex-direction: column; gap: 1rem; padding-left: 1rem; position: relative; }
    .timeline::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 2px; background: #e2e8f0; }
    .timeline-item { position: relative; padding-left: 1rem; }
    .timeline-dot { position: absolute; left: -1.25rem; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #10b981; }
    .timeline-head { display: flex; justify-content: space-between; align-items: center; }
    .timeline-time { font-size: 0.75rem; color: #94a3b8; }
    .timeline-msg { font-size: 0.85rem; color: #334155; margin-top: 0.25rem; }
  `]
})
export class OwnerBookingsComponent implements OnInit {
  bookings: BookingRequest[] = [];
  turfs: Turf[] = [];
  loading = false;
  pendingCount = 0;
  selectedBookingIds: number[] = [];

  // Filters
  searchQuery = '';
  turfFilter = '';
  statusFilter = 'All';
  sortBy = 'newest';

  // Modals state
  showApproveModal = false;
  activeBooking: BookingRequest | null = null;
  ownerNote = '';
  advancePaymentReceived = false;
  approving = false;

  showRejectModal = false;
  rejectionCategory = 'Slot Unavailable';
  rejectionReason = '';
  rejecting = false;

  showCancelModal = false;
  cancellationReason = '';
  cancelling = false;

  showDetailModal = false;
  detailedBooking: any = null;

  constructor(
    private bookingService: BookingService,
    private turfService: TurfService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['status']) this.statusFilter = params['status'];
      if (params['turf_id']) this.turfFilter = params['turf_id'];
      this.loadTurfs();
      this.loadBookings();
    });
  }

  loadTurfs(): void {
    this.turfService.getTurfs().subscribe({
      next: (res) => {
        this.turfs = res.turfs || [];
        this.cdr.detectChanges();
      },
      error: () => this.cdr.detectChanges()
    });
  }

  loadBookings(): void {
    this.loading = true;
    this.cdr.detectChanges();
    const filters: Record<string, any> = {
      search: this.searchQuery,
      turf_id: this.turfFilter,
      status: this.statusFilter,
      sort_by: this.sortBy
    };

    this.bookingService.getOwnerBookings(filters).subscribe({
      next: (res) => {
        this.bookings = res.requests || [];
        this.pendingCount = res.pending_count || 0;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.turfFilter = '';
    this.statusFilter = 'All';
    this.sortBy = 'newest';
    this.loadBookings();
  }

  // Selection
  isSelected(id: number): boolean {
    return this.selectedBookingIds.includes(id);
  }

  toggleSelect(id: number): void {
    if (this.isSelected(id)) {
      this.selectedBookingIds = this.selectedBookingIds.filter((x) => x !== id);
    } else {
      this.selectedBookingIds.push(id);
    }
  }

  isAllSelected(): boolean {
    const pendingIds = this.bookings.filter((b) => b.status === 'Pending').map((b) => b.id);
    return pendingIds.length > 0 && pendingIds.every((id) => this.selectedBookingIds.includes(id));
  }

  toggleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    const pendingIds = this.bookings.filter((b) => b.status === 'Pending').map((b) => b.id);
    this.selectedBookingIds = checked ? pendingIds : [];
  }

  // Modals Open/Close
  openApproveModal(b: BookingRequest): void {
    this.activeBooking = b;
    this.ownerNote = '';
    this.advancePaymentReceived = false;
    this.showApproveModal = true;
    this.cdr.detectChanges();
  }
  closeApproveModal(): void {
    this.showApproveModal = false;
    this.activeBooking = null;
    this.cdr.detectChanges();
  }

  onConfirmApprove(): void {
    if (!this.activeBooking) return;
    const bookingId = this.activeBooking.id;
    const payload = {
      owner_note: this.ownerNote,
      advance_payment_received: this.advancePaymentReceived
    };
    this.closeApproveModal();
    this.bookingService.approveBooking(bookingId, payload).subscribe({
      next: (res) => {
        this.alert.toastSuccess('Booking approved successfully!');
        this.loadBookings();
      },
      error: (err) => {
        this.alert.error('Approval Error', err.error?.error || 'Failed to approve booking.');
        this.loadBookings();
      }
    });
  }

  openRejectModal(b: BookingRequest): void {
    this.activeBooking = b;
    this.rejectionCategory = 'Slot Unavailable';
    this.rejectionReason = '';
    this.showRejectModal = true;
    this.cdr.detectChanges();
  }
  closeRejectModal(): void {
    this.showRejectModal = false;
    this.activeBooking = null;
    this.cdr.detectChanges();
  }

  onConfirmReject(): void {
    if (!this.activeBooking || !this.rejectionReason.trim()) return;
    const bookingId = this.activeBooking.id;
    const payload = {
      rejection_category: this.rejectionCategory,
      rejection_reason: this.rejectionReason.trim()
    };
    this.closeRejectModal();
    this.bookingService.rejectBooking(bookingId, payload).subscribe({
      next: (res) => {
        this.alert.toastSuccess('Booking request rejected.');
        this.loadBookings();
      },
      error: (err) => {
        this.alert.error('Rejection Error', err.error?.error || 'Failed to reject booking.');
        this.loadBookings();
      }
    });
  }

  openCancelModal(b: BookingRequest): void {
    this.activeBooking = b;
    this.cancellationReason = '';
    this.showCancelModal = true;
    this.cdr.detectChanges();
  }
  closeCancelModal(): void {
    this.showCancelModal = false;
    this.activeBooking = null;
    this.cdr.detectChanges();
  }

  onConfirmCancel(): void {
    if (!this.activeBooking || !this.cancellationReason.trim()) return;
    const bookingId = this.activeBooking.id;
    const reason = this.cancellationReason.trim();
    this.closeCancelModal();
    this.bookingService.cancelBooking(bookingId, reason).subscribe({
      next: (res) => {
        this.alert.toastSuccess('Booking cancelled.');
        this.loadBookings();
      },
      error: (err) => {
        this.alert.error('Cancellation Failed', err.error?.error || 'Failed to cancel booking.');
        this.loadBookings();
      }
    });
  }

  async onCloseBooking(b: BookingRequest, action: 'Completed' | 'No-Show'): Promise<void> {
    const confirm = await this.alert.confirm(
      `Mark as ${action}?`,
      `Are you sure you want to close booking ${b.booking_reference} as ${action}?`,
      `Yes, Mark ${action}`
    );
    if (!confirm) return;

    this.bookingService.closeBooking(b.id, action).subscribe({
      next: (res) => {
        this.alert.toastSuccess(`Booking closed as ${action}.`);
        this.loadBookings();
      },
      error: (err) => this.alert.error('Error', err.error?.error || 'Action failed.')
    });
  }

  viewDetails(b: BookingRequest): void {
    this.bookingService.getBookingDetails(b.id).subscribe({
      next: (res) => {
        this.detailedBooking = res;
        this.showDetailModal = true;
        this.cdr.detectChanges();
      }
    });
  }
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailedBooking = null;
    this.cdr.detectChanges();
  }

  // Bulk Actions
  async onBulkApprove(): Promise<void> {
    const confirm = await this.alert.confirm(
      'Bulk Approve Requests?',
      `Are you sure you want to approve ${this.selectedBookingIds.length} request(s)? Conflicting requests will be automatically rejected.`,
      'Approve All'
    );
    if (!confirm) return;

    this.bookingService.bulkAction({ booking_ids: this.selectedBookingIds, action: 'approve' }).subscribe({
      next: (res) => {
        this.alert.toastSuccess('Selected requests approved successfully!');
        this.selectedBookingIds = [];
        this.loadBookings();
      },
      error: (err) => this.alert.error('Error', err.error?.error || 'Bulk action failed.')
    });
  }

  async onBulkReject(): Promise<void> {
    const confirm = await this.alert.confirm(
      'Bulk Reject Requests?',
      `Are you sure you want to reject ${this.selectedBookingIds.length} request(s)?`,
      'Reject All',
      '#ef4444'
    );
    if (!confirm) return;

    this.bookingService
      .bulkAction({
        booking_ids: this.selectedBookingIds,
        action: 'reject',
        category: 'Slot Unavailable',
        reason: 'Bulk rejection by turf owner.'
      })
      .subscribe({
        next: (res) => {
          this.alert.toastSuccess('Selected requests rejected.');
          this.selectedBookingIds = [];
          this.loadBookings();
        },
        error: (err) => this.alert.error('Error', err.error?.error || 'Bulk action failed.')
      });
  }
}
