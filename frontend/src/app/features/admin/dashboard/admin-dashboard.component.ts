import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="dashboard-header">
        <div>
          <h1 class="page-title">Platform Administration</h1>
          <p class="page-sub">Review owner applications, manage verification checklists, and inspect platform audits.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/owners" [queryParams]="{ status: 'Pending Approval' }" class="btn btn-primary">
            <i class="bi bi-person-check-fill"></i> Review Pending Owners ({{ stats?.pending_owners || 0 }})
          </a>
        </div>
      </div>

      <!-- Pending Verification Alert Banner -->
      <div *ngIf="stats?.pending_owners > 0" class="pending-alert-banner">
        <div class="banner-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
        <div class="banner-text">
          <strong>Action Required:</strong> You have <b>{{ stats.pending_owners }}</b> turf owner account(s) pending document verification and approval.
        </div>
        <a routerLink="/admin/owners" [queryParams]="{ status: 'Pending Approval' }" class="btn btn-sm btn-primary">
          Review Now
        </a>
      </div>

      <!-- Metrics Grid -->
      <div class="stats-grid">
        <div class="stat-card pending">
          <div class="stat-icon"><i class="bi bi-clock-history"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ stats?.pending_owners || 0 }}</div>
            <div class="stat-label">Pending Approval</div>
          </div>
        </div>

        <div class="stat-card approved">
          <div class="stat-icon"><i class="bi bi-check-circle-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ stats?.approved_owners || 0 }}</div>
            <div class="stat-label">Approved Owners</div>
          </div>
        </div>

        <div class="stat-card suspended">
          <div class="stat-icon"><i class="bi bi-pause-circle-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ stats?.suspended_owners || 0 }}</div>
            <div class="stat-label">Suspended Owners</div>
          </div>
        </div>

        <div class="stat-card turfs">
          <div class="stat-icon"><i class="bi bi-flag-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ stats?.total_turfs || 0 }}</div>
            <div class="stat-label">Registered Turfs</div>
          </div>
        </div>

        <div class="stat-card bookings">
          <div class="stat-icon"><i class="bi bi-calendar2-event-fill"></i></div>
          <div class="stat-body">
            <div class="stat-num">{{ stats?.total_bookings || 0 }}</div>
            <div class="stat-label">Total Bookings</div>
          </div>
        </div>
      </div>

      <!-- Quick Navigation Cards -->
      <div class="section-heading mt-4">
        <h2>Quick Administrative Modules</h2>
      </div>
      <div class="modules-grid">
        <div class="module-card">
          <div class="module-icon"><i class="bi bi-person-lines-fill"></i></div>
          <h3>Owner Verification & Directory</h3>
          <p>Filter owners by approval status, verify uploaded IDs & business documents, approve or reject applications.</p>
          <a routerLink="/admin/owners" class="btn btn-outline-primary btn-sm">Open Directory</a>
        </div>

        <div class="module-card">
          <div class="module-icon"><i class="bi bi-journal-check"></i></div>
          <h3>Administrative Audit Trail</h3>
          <p>Every admin approval, rejection, and suspension decision is logged with timestamps, reasons, and notes.</p>
          <a routerLink="/admin/audit-logs" class="btn btn-outline-primary btn-sm">View Audit Trail</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .page-title { font-size: 1.85rem; color: #0f172a; }
    .page-sub { color: #64748b; font-size: 0.95rem; margin-top: 0.2rem; }

    .pending-alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: var(--radius-lg);
      margin-bottom: 1.5rem;
      color: #92400e;
    }
    .banner-icon { font-size: 1.5rem; color: #d97706; }
    .banner-text { flex: 1; font-size: 0.92rem; }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
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
    .stat-card.approved .stat-icon { background: #ecfdf5; color: #059669; }
    .stat-card.suspended .stat-icon { background: #fee2e2; color: #dc2626; }
    .stat-card.turfs .stat-icon { background: #eff6ff; color: #2563eb; }
    .stat-card.bookings .stat-icon { background: #f5f3ff; color: #7c3aed; }

    .stat-num { font-size: 1.75rem; font-weight: 800; color: #0f172a; font-family: var(--font-heading); }
    .stat-label { font-size: 0.8rem; font-weight: 600; color: #64748b; }

    .section-heading h2 { font-size: 1.35rem; color: #0f172a; margin-bottom: 1rem; }
    .modules-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 768px) {
      .modules-grid { grid-template-columns: 1fr; }
    }
    .module-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
    }
    .module-icon {
      font-size: 2rem;
      color: #10b981;
      margin-bottom: 0.75rem;
    }
    .module-card h3 { font-size: 1.15rem; color: #0f172a; margin-bottom: 0.4rem; }
    .module-card p { font-size: 0.88rem; color: #64748b; margin-bottom: 1rem; line-height: 1.4; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  stats: any = null;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getDashboardStats().subscribe({
      next: (res) => (this.stats = res)
    });
  }
}
