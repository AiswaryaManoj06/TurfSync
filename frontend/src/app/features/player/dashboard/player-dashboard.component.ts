import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BookingService } from '../../../core/services/booking.service';
import { TurfService } from '../../../core/services/turf.service';
import { BookingRequest, Turf, User } from '../../../core/models/models';

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="player-dashboard-wrapper py-4">
      <div class="container">
        <!-- WELCOME BANNER -->
        <div class="welcome-card glass-panel p-4 mb-4 rounded-4 position-relative overflow-hidden">
          <div class="row align-items-center">
            <div class="col-lg-8">
              <span class="badge bg-emerald-subtle text-emerald px-3 py-1 mb-2 fw-semibold">
                <i class="bi bi-person-badge me-1"></i> Player Portal
              </span>
              <h2 class="fw-bold text-light mb-1">
                Welcome back, <span class="gradient-text">{{ currentUser?.full_name || 'Champion' }}</span>!
              </h2>
              <p class="text-muted mb-3 max-w-md">
                Ready for game day? Explore top-tier arenas, track your match requests, and book hassle-free slots.
              </p>
              <div class="d-flex gap-2">
                <button class="btn btn-emerald fw-semibold px-4 py-2" routerLink="/search">
                  <i class="bi bi-search me-1"></i> Find Grounds
                </button>
                <button class="btn btn-outline-secondary fw-semibold px-4 py-2" routerLink="/player/my-bookings">
                  <i class="bi bi-calendar2-week me-1"></i> My Matches
                </button>
              </div>
            </div>
            <div class="col-lg-4 d-none d-lg-block text-end">
              <i class="bi bi-trophy display-1 text-emerald opacity-25"></i>
            </div>
          </div>
        </div>

        <!-- STATS METRICS -->
        <div class="row g-3 mb-4">
          <div class="col-md-4">
            <div class="stat-metric-card glass-panel p-3 rounded-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-semibold">Upcoming Matches</span>
                  <h3 class="fw-bold text-light mb-0 mt-1">{{ upcomingBookings.length }}</h3>
                </div>
                <div class="metric-icon-box bg-emerald-subtle text-emerald">
                  <i class="bi bi-calendar-check-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="stat-metric-card glass-panel p-3 rounded-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-semibold">Pending Approvals</span>
                  <h3 class="fw-bold text-warning mb-0 mt-1">{{ pendingBookings.length }}</h3>
                </div>
                <div class="metric-icon-box bg-warning-subtle text-warning">
                  <i class="bi bi-hourglass-split fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div class="col-md-4">
            <div class="stat-metric-card glass-panel p-3 rounded-4">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <span class="text-muted small text-uppercase fw-semibold">Total Requests</span>
                  <h3 class="fw-bold text-light mb-0 mt-1">{{ allBookings.length }}</h3>
                </div>
                <div class="metric-icon-box bg-primary-subtle text-primary">
                  <i class="bi bi-card-checklist fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MAIN DASHBOARD CONTENT -->
        <div class="row g-4">
          <!-- UPCOMING GAME SPOTLIGHT -->
          <div class="col-lg-7">
            <div class="glass-panel p-4 rounded-4 h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold text-light mb-0">
                  <i class="bi bi-fire text-danger me-2"></i>Next Confirmed Match
                </h5>
                <a routerLink="/player/my-bookings" class="small text-emerald text-decoration-none">View All</a>
              </div>

              <!-- IF THERE IS AN UPCOMING MATCH -->
              <div *ngIf="nextMatch" class="next-match-card p-3 rounded-3 bg-secondary-subtle">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    <span class="badge bg-emerald mb-1">Approved & Confirmed</span>
                    <h4 class="fw-bold text-light mb-0">{{ nextMatch.turf_name }}</h4>
                    <p class="text-muted small mb-0">
                      <i class="bi bi-geo-alt me-1 text-danger"></i> {{ nextMatch.turf_address || 'Arena Venue' }}
                    </p>
                  </div>
                  <span class="fs-5 fw-bold text-emerald">₹{{ nextMatch.total_amount }}</span>
                </div>

                <div class="row g-2 py-2 border-top border-dark-subtle mt-2">
                  <div class="col-6">
                    <span class="text-muted small d-block">Date</span>
                    <span class="fw-semibold text-light">{{ nextMatch.booking_date }}</span>
                  </div>
                  <div class="col-6">
                    <span class="text-muted small d-block">Squad</span>
                    <span class="fw-semibold text-light">{{ nextMatch.number_of_players }} Players</span>
                  </div>
                </div>

                <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-dark-subtle">
                  <span class="badge font-monospace bg-dark-glass text-light">{{ nextMatch.booking_reference }}</span>
                  <button class="btn btn-sm btn-emerald" routerLink="/player/my-bookings">
                    Manage Match
                  </button>
                </div>
              </div>

              <!-- IF NO UPCOMING MATCH -->
              <div *ngIf="!nextMatch" class="text-center py-5">
                <i class="bi bi-calendar-plus display-4 text-muted mb-2"></i>
                <h6 class="fw-bold text-light">No upcoming confirmed matches</h6>
                <p class="text-muted small max-w-sm mx-auto mb-3">
                  Find an open turf in your area and book your next football, cricket, or badminton slot!
                </p>
                <button class="btn btn-sm btn-emerald" routerLink="/search">
                  Browse Arenas
                </button>
              </div>
            </div>
          </div>

          <!-- RECENT ACTIVITY -->
          <div class="col-lg-5">
            <div class="glass-panel p-4 rounded-4 h-100">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold text-light mb-0">
                  <i class="bi bi-clock-history text-emerald me-2"></i>Recent Requests
                </h5>
                <a routerLink="/player/my-bookings" class="small text-emerald text-decoration-none">History</a>
              </div>

              <div *ngIf="recentBookings.length === 0" class="text-center py-4 text-muted small">
                No recent booking activities.
              </div>

              <div *ngFor="let b of recentBookings" class="recent-item p-3 rounded-3 mb-2 bg-secondary-subtle">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-semibold text-light text-truncate" style="max-width: 180px;">
                    {{ b.turf_name }}
                  </span>
                  <span class="badge-status-pill" [ngClass]="getStatusBadgeClass(b.status)">
                    {{ b.status }}
                  </span>
                </div>
                <div class="d-flex justify-content-between small text-muted mt-1">
                  <span>{{ b.booking_date }}</span>
                  <span class="text-emerald fw-semibold">₹{{ b.total_amount }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .player-dashboard-wrapper {
      min-height: calc(100vh - 140px);
      background-color: var(--bg-main);
    }
    .welcome-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(10, 15, 29, 0.6) 100%), var(--bg-card);
      border: 1px solid var(--border-color);
    }
    .gradient-text {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-metric-card {
      border: 1px solid var(--border-color);
    }
    .metric-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .badge-status-pill {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
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
  `]
})
export class PlayerDashboardComponent implements OnInit {
  currentUser: User | null = null;
  allBookings: BookingRequest[] = [];
  upcomingBookings: BookingRequest[] = [];
  pendingBookings: BookingRequest[] = [];
  recentBookings: BookingRequest[] = [];
  nextMatch: BookingRequest | null = null;

  constructor(
    private authService: AuthService,
    private bookingService: BookingService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getPlayerBookings().subscribe({
      next: (res) => {
        this.allBookings = res.bookings || [];
        this.pendingBookings = this.allBookings.filter((b) => b.status === 'Pending');
        this.upcomingBookings = this.allBookings.filter((b) => b.status === 'Approved');
        this.nextMatch = this.upcomingBookings.length > 0 ? this.upcomingBookings[0] : null;
        this.recentBookings = this.allBookings.slice(0, 5);
      },
      error: () => {}
    });
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
}
