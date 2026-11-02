import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuditLog } from '../../../core/models/models';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Platform Audit Trail</h1>
          <p class="page-sub">Chronological immutable audit log of administrative decisions, verifications, and status changes.</p>
        </div>
      </div>

      <div class="turf-card p-0 overflow-hidden">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Administrator</th>
                <th>Action Type</th>
                <th>Target Owner / Arena</th>
                <th>Status Transition</th>
                <th>Reason / Verification Note</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="6" class="text-center py-4">Loading audit logs...</td>
              </tr>
              <tr *ngIf="!loading && logs.length === 0">
                <td colspan="6" class="text-center py-4 text-muted">No audit logs recorded yet.</td>
              </tr>
              <tr *ngFor="let l of logs">
                <td>
                  <div class="log-date">{{ l.created_at | date:'mediumDate' }}</div>
                  <small class="text-muted">{{ l.created_at | date:'shortTime' }}</small>
                </td>
                <td>
                  <div class="admin-name">{{ l.admin_name || 'Platform Admin' }}</div>
                  <small class="text-muted">{{ l.admin_email }}</small>
                </td>
                <td>
                  <span class="action-badge" [ngClass]="getActionClass(l.action)">
                    {{ l.action }}
                  </span>
                </td>
                <td>
                  <div class="owner-brand" *ngIf="l.owner_brand">{{ l.owner_brand }}</div>
                  <small class="text-muted">{{ l.owner_name }} (ID: {{ l.owner_id }})</small>
                </td>
                <td>
                  <div class="transition-pill">
                    <span class="prev-stat">{{ l.previous_status || 'Initial' }}</span>
                    <i class="bi bi-arrow-right"></i>
                    <span class="new-stat">{{ l.new_status }}</span>
                  </div>
                </td>
                <td>
                  <div class="reason-text">{{ l.reason_or_note || 'N/A' }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .page-title { font-size: 1.85rem; color: #0f172a; }
    .page-sub { color: #64748b; font-size: 0.95rem; margin-top: 0.2rem; }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .data-table th {
      background: #f8fafc;
      padding: 0.85rem 1rem;
      font-weight: 700;
      font-size: 0.8rem;
      color: #475569;
      border-bottom: 1px solid var(--border-color);
      text-align: left;
    }
    .data-table td {
      padding: 1rem;
      border-bottom: 1px solid var(--border-color);
      vertical-align: middle;
    }
    .log-date { font-weight: 700; color: #0f172a; font-size: 0.88rem; }
    .admin-name { font-weight: 600; color: #1e293b; font-size: 0.88rem; }
    .owner-brand { font-weight: 700; color: #0f172a; font-size: 0.9rem; }

    .action-badge {
      display: inline-block;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      padding: 0.25rem 0.55rem;
      border-radius: var(--radius-sm);
    }
    .action-badge.approve { background: #d1fae5; color: #065f46; }
    .action-badge.reject { background: #fee2e2; color: #991b1b; }
    .action-badge.suspend { background: #fef3c7; color: #92400e; }
    .action-badge.reactivate { background: #e0e7ff; color: #3730a3; }

    .transition-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: #334155;
    }
    .transition-pill i { color: #94a3b8; }
    .reason-text { font-size: 0.85rem; color: #334155; max-width: 320px; line-height: 1.35; }
  `]
})
export class AdminAuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  loading = false;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loading = true;
    this.adminService.getAuditLogs().subscribe({
      next: (res) => {
        this.logs = res.audit_logs;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  getActionClass(action: string): string {
    const act = (action || '').toUpperCase();
    if (act.includes('APPROVE')) return 'approve';
    if (act.includes('REJECT')) return 'reject';
    if (act.includes('SUSPEND')) return 'suspend';
    if (act.includes('REACTIVATE')) return 'reactivate';
    return '';
  }
}
