import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="turf-container">
      <!-- Approval Status Alert for Pending / Suspended Owners -->
      <div *ngIf="dashboardData?.account_status === 'Pending Approval'" class="notice-banner pending">
        <div class="banner-icon"><i class="bi bi-hourglass-split"></i></div>
        <div class="banner-content">
          <h3>Account Under Review</h3>
          <p>Your registration is currently pending admin verification. Once your ID, ownership proof, and bank details are verified, you will be able to add turfs and manage slots.</p>
        </div>
      </div>

      <div *ngIf="dashboardData?.account_status === 'Suspended'" class="notice-banner suspended">
        <div class="banner-icon"><i class="bi bi-exclamation-octagon-fill"></i></div>
        <div class="banner-content">
          <h3>Account Suspended</h3>
          <p>Your owner account has been suspended by the platform administrator. Your turfs are hidden from search and cannot receive new booking requests.</p>
        </div>
      </div>

      <div class="page-header">
        <div>
          <h1 class="page-title">Arena Operations Dashboard</h1>
          <p class="page-sub">Monitor pending player booking requests, today's schedule, and arena revenues.</p>
        </div>
        <div class="header-actions" *ngIf="dashboardData?.account_status === 'Approved'">
          <a routerLink="/owner/bookings" [queryParams]="{ status: 'Pending' }" class="btn btn-primary">
            <i class="bi bi-inbox-fill"></i> Review Requests
            <span class="badge badge-light" *ngIf="dashboardData?.pending_requests_count > 0">
              {{ dashboardData?.pending_requests_count }}
            </span>
          </a>
          <a routerLink="/owner/turfs" class="btn btn-secondary">
            <i class="bi bi-plus-circle"></i> Manage Turfs
          </a>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        <div class="stat-card pending">
          <div class="stat-icon"><i class="bi bi-clock-history"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ dashboardData?.pending_requests_count || 0 }}</div>
            <div class="stat-label">Pending Requests</div>
          </div>
        </div>

        <div class="stat-card today">
          <div class="stat-icon"><i class="bi bi-calendar2-check-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ dashboardData?.today_bookings_count || 0 }}</div>
            <div class="stat-label">Today's Bookings</div>
          </div>
        </div>

        <div class="stat-card revenue">
          <div class="stat-icon"><i class="bi bi-currency-rupee"></i></div>
          <div class="stat-body">
            <div class="stat-num">₹{{ dashboardData?.today_revenue || 0 }}</div>
            <div class="stat-label">Today's Revenue</div>
          </div>
        </div>

        <div class="stat-card upcoming">
          <div class="stat-icon"><i class="bi bi-calendar-week-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ dashboardData?.upcoming_bookings_count || 0 }}</div>
            <div class="stat-label">Upcoming Confirmed</div>
          </div>
        </div>

        <div class="stat-card turfs">
          <div class="stat-icon"><i class="bi bi-flag-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ dashboardData?.total_turfs_count || 0 }}</div>
            <div class="stat-label">Active Turfs</div>
          </div>
        </div>
      </div>

      <!-- Recent Booking Requests -->
      <div class="turf-card mt-4 p-0 overflow-hidden">
        <div class="card-header-bar">
          <h2 class="section-heading">Recent Booking Requests</h2>
          <a routerLink="/owner/bookings" class="view-all-link">View All Requests <i class="bi bi-arrow-right"></i></a>
        </div>
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Player & Team</th>
                <th>Arena Turf</th>
                <th>Booking Date</th>
                <th>Players</th>
                <th>Amount</th>
                <th>Status</th>
                <th class="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="dashboardData?.recent_requests?.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">No booking requests submitted yet.</td>
              </tr>
              <tr *ngFor="let r of dashboardData?.recent_requests">
                <td><span class="font-mono font-bold">{{ r.booking_reference }}</span></td>
                <td>
                  <div class="font-bold">{{ r.player_name }}</div>
                  <small class="text-muted">{{ r.team_name || r.player_mobile }}</small>
                </td>
                <td><span class="turf-tag">{{ r.turf_name }}</span></td>
                <td>{{ r.booking_date | date:'mediumDate' }}</td>
                <td>{{ r.number_of_players }} Players</td>
                <td><span class="amount-tag">₹{{ r.total_amount }}</span></td>
                <td>
                  <span class="badge" [ngClass]="'badge-' + r.status.toLowerCase()">
                    {{ r.status }}
                  </span>
                </td>
                <td class="text-right">
                  <a [routerLink]="['/owner/bookings']" class="btn btn-sm btn-secondary">
                    Review
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- My Arenas Overview -->
      <div class="section-heading mt-4">
        <h2>My Sports Arenas</h2>
      </div>
      <div class="turfs-overview-grid">
        <div *ngFor="let t of dashboardData?.turfs" class="turf-summary-card">
          <div class="turf-sum-header">
            <div>
              <h3>{{ t.name }}</h3>
              <span class="sport-badge">{{ t.sport }}</span>
            </div>
            <span class="badge" [ngClass]="t.status === 'Active' ? 'badge-approved' : 'badge-rejected'">
              {{ t.status }}
            </span>
          </div>
          <div class="turf-metrics">
            <div class="metric-pill">
              <span class="metric-val text-warning">{{ t.pending_count || 0 }}</span>
              <span class="metric-lbl">Pending Requests</span>
            </div>
            <div class="metric-pill">
              <span class="metric-val text-primary">{{ t.today_count || 0 }}</span>
              <span class="metric-lbl">Today's Bookings</span>
            </div>
            <div class="metric-pill">
              <span class="metric-val text-info">{{ t.upcoming_count || 0 }}</span>
              <span class="metric-lbl">Upcoming</span>
            </div>
          </div>
          <div class="turf-actions-footer">
            <a [routerLink]="['/owner/slots']" [queryParams]="{ turf_id: t.id }" class="btn btn-sm btn-outline-primary">
              <i class="bi bi-calendar3"></i> Manage Slots
            </a>
            <a [routerLink]="['/owner/bookings']" [queryParams]="{ turf_id: t.id }" class="btn btn-sm btn-secondary">
              <i class="bi bi-inbox"></i> Requests
            </a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notice-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
    }
    .notice-banner.pending { background: #fef3c7; border: 1px solid #fde68a; color: #92400e; }
    .notice-banner.suspended { background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; }
    .banner-icon { font-size: 1.8rem; margin-top: 0.1rem; }
    .banner-content h3 { font-size: 1.15rem; margin-bottom: 0.25rem; }
    .banner-content p { font-size: 0.9rem; line-height: 1.4; }

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
    .header-actions { display: flex; gap: 0.75rem; align-items: center; }

    .badge-light {
      background: #ffffff;
      color: #059669;
      font-size: 0.75rem;
      font-weight: 800;
      border-radius: 9999px;
      padding: 0.15rem 0.5rem;
      margin-left: 0.35rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }
    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }
    .stat-card.pending .stat-icon { background: #fef3c7; color: #d97706; }
    .stat-card.today .stat-icon { background: #ecfdf5; color: #059669; }
    .stat-card.revenue .stat-icon { background: #eff6ff; color: #2563eb; }
    .stat-card.upcoming .stat-icon { background: #f5f3ff; color: #7c3aed; }
    .stat-card.turfs .stat-icon { background: #f0fdf4; color: #16a34a; }

    .stat-num { font-size: 1.65rem; font-weight: 800; color: #0f172a; font-family: var(--font-heading); }
    .stat-label { font-size: 0.8rem; font-weight: 600; color: #64748b; }

    .card-header-bar {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-heading { font-size: 1.25rem; color: #0f172a; }
    .view-all-link { color: #10b981; font-weight: 600; font-size: 0.88rem; display: flex; align-items: center; gap: 0.35rem; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1.25rem;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }
    .data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }
    .font-mono { font-family: monospace; }
    .font-bold { font-weight: 700; color: #0f172a; }
    .turf-tag { font-weight: 600; color: #334155; }
    .amount-tag { font-weight: 700; color: #059669; }
    .text-right { text-align: right; }

    .turfs-overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }
    .turf-summary-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .turf-sum-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    .turf-sum-header h3 { font-size: 1.15rem; color: #0f172a; }
    .sport-badge {
      display: inline-block;
      font-size: 0.75rem;
      font-weight: 700;
      color: #2563eb;
      background: #eff6ff;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      margin-top: 0.25rem;
    }
    .turf-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .metric-pill {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.4rem;
      text-align: center;
    }
    .metric-val { font-size: 1.2rem; font-weight: 800; display: block; font-family: var(--font-heading); }
    .metric-lbl { font-size: 0.68rem; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .turf-actions-footer {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  dashboardData: any = null;

  constructor(private http: HttpClient, public auth: AuthService) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/owner/dashboard/`).subscribe({
      next: (res) => (this.dashboardData = res)
    });
  }
}
