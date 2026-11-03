import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { Owner, AuditLog } from '../../../core/models/models';

@Component({
  selector: 'app-owner-verification-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="turf-container" *ngIf="owner">
      <!-- Breadcrumb & Top Bar -->
      <div class="top-nav">
        <a routerLink="/admin/owners" class="back-link">
          <i class="bi bi-arrow-left"></i> Back to Owners Directory
        </a>
        <div class="status-indicator d-flex align-items-center gap-2">
          <span class="badge" [ngClass]="'badge-' + owner.account_status.toLowerCase().replace(' ', '-')">
            {{ owner.account_status }}
          </span>
          <button class="btn btn-outline-danger btn-sm" (click)="onDeleteOwner()" title="Soft-delete this owner">
            <i class="bi bi-trash"></i> Delete Owner
          </button>
        </div>
      </div>

      <!-- Main Profile Banner -->
      <div class="profile-banner">
        <div class="banner-main">
          <div class="brand-avatar">
            <i class="bi bi-building"></i>
          </div>
          <div>
            <h1 class="brand-name">{{ owner.brand_name }}</h1>
            <div class="owner-meta">
              <span><i class="bi bi-person"></i> {{ owner.full_name }}</span>
              <span><i class="bi bi-envelope"></i> {{ owner.email }}</span>
              <span><i class="bi bi-phone"></i> {{ owner.mobile }}</span>
              <span><i class="bi bi-geo-alt"></i> {{ owner.city_name }}, {{ owner.state_name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="content-columns">
        <!-- Left Column: Business & Banking Details -->
        <div class="details-column">
          <!-- Business & Tax Info -->
          <div class="turf-card mb-4">
            <h2 class="card-title"><i class="bi bi-info-circle-fill"></i> Organization & Identity</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Owner Type</span>
                <span class="info-val">{{ owner.owner_type }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Date of Birth</span>
                <span class="info-val">{{ owner.date_of_birth }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">GST Number</span>
                <span class="info-val">{{ owner.gst_number || 'Not Provided (Unregistered)' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">ID Proof Type</span>
                <span class="info-val">{{ owner.id_proof_type }}</span>
              </div>
              <div class="info-item full">
                <span class="info-label">Sports Offered</span>
                <div class="sports-tags">
                  <span *ngFor="let s of owner.sports_offered" class="sport-tag">{{ s }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bank Account Info -->
          <div class="turf-card mb-4">
            <h2 class="card-title"><i class="bi bi-bank2"></i> Bank Settlement Details</h2>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Masked Account Number</span>
                <span class="info-val font-mono">{{ owner.masked_bank_account }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">IFSC Code</span>
                <span class="info-val font-mono">{{ owner.bank_ifsc }}</span>
              </div>
            </div>
          </div>

          <!-- Uploaded Documents Preview -->
          <div class="turf-card mb-4">
            <h2 class="card-title"><i class="bi bi-file-earmark-text-fill"></i> Uploaded Verification Documents</h2>
            <div class="docs-grid">
              <div class="doc-card">
                <div class="doc-icon"><i class="bi bi-file-earmark-person"></i></div>
                <div class="doc-info">
                  <div class="doc-name">Government ID Proof ({{ owner.id_proof_type }})</div>
                  <div class="doc-meta">Uploaded document file</div>
                </div>
                <div class="doc-action">
                  <a [href]="owner.id_proof_file" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-box-arrow-up-right"></i> View Document
                  </a>
                </div>
              </div>

              <div class="doc-card">
                <div class="doc-icon"><i class="bi bi-file-earmark-pdf"></i></div>
                <div class="doc-info">
                  <div class="doc-name">Business / Ownership Proof</div>
                  <div class="doc-meta">Commercial proof (PDF)</div>
                </div>
                <div class="doc-action">
                  <a [href]="owner.business_proof_file" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-box-arrow-up-right"></i> View PDF
                  </a>
                </div>
              </div>
            </div>
          </div>

          <!-- Registered Arenas & Turfs -->
          <div class="turf-card mb-4">
            <h2 class="card-title"><i class="bi bi-flag-fill text-primary"></i> Registered Arenas & Turfs ({{ turfs.length }})</h2>
            <div *ngIf="turfs.length === 0" class="text-muted text-sm py-2">
              This owner has not registered any sports turfs yet.
            </div>
            <div class="table-responsive" *ngIf="turfs.length > 0">
              <table class="table align-middle">
                <thead>
                  <tr>
                    <th>Turf Name</th>
                    <th>Sport</th>
                    <th>Location</th>
                    <th>Rates</th>
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of turfs">
                    <td>
                      <div class="fw-bold">{{ t.name }}</div>
                      <small class="text-muted">{{ t.size }} • {{ t.surface }}</small>
                    </td>
                    <td><span class="badge bg-light text-dark">{{ t.sport }}</span></td>
                    <td>{{ t.city_name }}, {{ t.state_name }}</td>
                    <td>
                      <div>Weekday: ₹{{ t.weekday_price_per_hour }}/hr</div>
                      <div>Weekend: ₹{{ t.weekend_price_per_hour }}/hr</div>
                    </td>
                    <td>
                      <span class="badge" [ngClass]="t.status === 'Active' ? 'badge-approved' : 'badge-rejected'">
                        {{ t.status }}
                      </span>
                    </td>
                    <td class="text-right">
                      <button class="btn btn-outline-danger btn-sm" (click)="onDeleteTurf(t)" title="Delete Turf (Soft Delete)">
                        <i class="bi bi-trash"></i> Delete Turf
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Audit Decision History -->
          <div class="turf-card">
            <h2 class="card-title"><i class="bi bi-clock-history"></i> Decision Audit Log</h2>
            <div *ngIf="auditLogs.length === 0" class="text-muted text-sm py-2">
              No previous administrative actions recorded.
            </div>
            <div class="timeline" *ngIf="auditLogs.length > 0">
              <div class="timeline-item" *ngFor="let log of auditLogs">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <div class="timeline-title">
                    <span class="action-name">{{ log.action }}</span>
                    <span class="timeline-date">{{ log.created_at | date:'medium' }}</span>
                  </div>
                  <div class="timeline-reason">{{ log.reason_or_note }}</div>
                  <div class="timeline-admin">Action by: {{ log.admin_name || log.admin_email }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Verification Checklist & Action Console -->
        <div class="actions-column">
          <!-- VERIFICATION CHECKLIST CARD -->
          <div class="turf-card action-card">
            <h2 class="card-title"><i class="bi bi-patch-check-fill text-primary"></i> Verification Checklist</h2>
            <p class="checklist-desc">
              All 3 compliance checks below must be verified and checked before the <b>Approve</b> action is enabled.
            </p>

            <div class="checklist-items">
              <label class="check-item" [class.checked]="chkId">
                <input type="checkbox" [(ngModel)]="chkId" />
                <div class="check-text">
                  <div class="check-title">1. ID Proof Document Verified</div>
                  <div class="check-sub">Matches legal name, date of birth (18+), and photo.</div>
                </div>
              </label>

              <label class="check-item" [class.checked]="chkOwnership">
                <input type="checkbox" [(ngModel)]="chkOwnership" />
                <div class="check-text">
                  <div class="check-title">2. Ownership / Business Proof Verified</div>
                  <div class="check-sub">Valid property ownership, lease deed, or incorporation.</div>
                </div>
              </label>

              <label class="check-item" [class.checked]="chkBank">
                <input type="checkbox" [(ngModel)]="chkBank" />
                <div class="check-text">
                  <div class="check-title">3. Bank Details Verified</div>
                  <div class="check-sub">Account number and IFSC verified for payouts.</div>
                </div>
              </label>
            </div>

            <!-- Optional Admin Note -->
            <div class="form-group mt-3">
              <label class="form-label">Admin Approval Note (Optional, max 250 chars)</label>
              <textarea
                [(ngModel)]="adminNote"
                class="form-control"
                rows="2"
                maxlength="250"
                placeholder="Optional verification note or comments..."
              ></textarea>
            </div>

            <div class="approval-cta">
              <button
                class="btn btn-primary btn-block"
                [disabled]="!isChecklistComplete || approving"
                (click)="onApprove()"
              >
                <i class="bi bi-check-circle-fill"></i>
                {{ approving ? 'Approving Owner...' : 'Approve Owner Account' }}
              </button>
              <div *ngIf="!isChecklistComplete" class="checklist-warning">
                <i class="bi bi-info-circle"></i> Tick all 3 verification checklist items above to enable Approve.
              </div>
            </div>

            <hr class="section-divider" />

            <!-- REJECTION CONSOLE -->
            <h3 class="reject-title"><i class="bi bi-x-circle text-danger"></i> Reject Application</h3>
            <p class="text-sm text-muted mb-2">
              Provide a valid category and mandatory rejection reason to inform the owner.
            </p>

            <div class="form-group">
              <label class="form-label">Rejection Category <span class="required">*</span></label>
              <select [(ngModel)]="rejectCategory" class="form-select">
                <option value="Invalid ID Proof">Invalid ID Proof</option>
                <option value="Invalid Ownership Proof">Invalid Ownership Proof</option>
                <option value="Incorrect Bank Details">Incorrect Bank Details</option>
                <option value="Incomplete Details">Incomplete Details</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Rejection Reason <span class="required">*</span></label>
              <textarea
                [(ngModel)]="rejectReason"
                class="form-control"
                rows="3"
                maxlength="250"
                placeholder="Specify exact reason for rejection (max 250 chars)..."
              ></textarea>
            </div>

            <button
              class="btn btn-danger btn-block"
              [disabled]="!rejectReason || rejecting"
              (click)="onReject()"
            >
              <i class="bi bi-slash-circle"></i>
              {{ rejecting ? 'Rejecting...' : 'Reject Application' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .top-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .back-link {
      color: #64748b;
      font-weight: 600;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .back-link:hover { color: #10b981; }

    .profile-banner {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 1.75rem 2rem;
      margin-bottom: 1.75rem;
      box-shadow: var(--shadow-sm);
    }
    .banner-main {
      display: flex;
      align-items: center;
      gap: 1.5rem;
    }
    .brand-avatar {
      width: 64px;
      height: 64px;
      border-radius: 16px;
      background: #ecfdf5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }
    .brand-name { font-size: 1.85rem; color: #0f172a; margin-bottom: 0.35rem; }
    .owner-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 1.25rem;
      font-size: 0.9rem;
      color: #64748b;
    }
    .owner-meta span { display: inline-flex; align-items: center; gap: 0.35rem; }

    .content-columns {
      display: grid;
      grid-template-columns: 1.6fr 1.2fr;
      gap: 1.5rem;
    }
    @media (max-width: 992px) {
      .content-columns { grid-template-columns: 1fr; }
    }

    .card-title {
      font-size: 1.2rem;
      color: #0f172a;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    .info-item.full { grid-column: span 2; }
    .info-label { font-size: 0.78rem; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; margin-bottom: 0.2rem; }
    .info-val { font-size: 0.95rem; font-weight: 600; color: #0f172a; }
    .font-mono { font-family: monospace; letter-spacing: 0.05em; }

    .sports-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
    .sport-tag {
      background: #f1f5f9;
      color: #334155;
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.25rem 0.6rem;
      border-radius: var(--radius-sm);
    }

    .docs-grid { display: flex; flex-direction: column; gap: 0.75rem; }
    .doc-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .doc-icon { font-size: 1.8rem; color: #3b82f6; }
    .doc-info { flex: 1; }
    .doc-name { font-weight: 700; font-size: 0.92rem; color: #0f172a; }
    .doc-meta { font-size: 0.75rem; color: #64748b; }

    .action-card {
      position: sticky;
      top: 85px;
      border-top: 4px solid #10b981;
    }
    .checklist-desc {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 1.25rem;
      line-height: 1.4;
    }
    .checklist-items {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }
    .check-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.85rem;
      background: #f8fafc;
      border: 1.5px solid var(--border-color);
      border-radius: var(--radius-md);
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .check-item.checked {
      background: #ecfdf5;
      border-color: #10b981;
    }
    .check-item input[type="checkbox"] {
      margin-top: 0.2rem;
      width: 18px;
      height: 18px;
      accent-color: #10b981;
      cursor: pointer;
    }
    .check-title { font-weight: 700; font-size: 0.9rem; color: #0f172a; }
    .check-sub { font-size: 0.78rem; color: #64748b; margin-top: 0.15rem; }

    .checklist-warning {
      font-size: 0.78rem;
      color: #d97706;
      margin-top: 0.5rem;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
    }
    .section-divider {
      margin: 1.75rem 0;
      border: 0;
      height: 1px;
      background: #e2e8f0;
    }
    .reject-title { font-size: 1.1rem; color: #dc2626; margin-bottom: 0.35rem; }
    .btn-block { width: 100%; }

    .timeline {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      position: relative;
      padding-left: 1.25rem;
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 4px;
      top: 6px;
      bottom: 6px;
      width: 2px;
      background: #e2e8f0;
    }
    .timeline-item { position: relative; }
    .timeline-dot {
      position: absolute;
      left: -1.25rem;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      border: 2px solid #ffffff;
    }
    .timeline-title { display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; }
    .action-name { color: #0f172a; }
    .timeline-date { color: #94a3b8; font-size: 0.75rem; }
    .timeline-reason { font-size: 0.82rem; color: #475569; margin: 0.2rem 0; }
    .timeline-admin { font-size: 0.75rem; color: #64748b; font-style: italic; }
  `]
})
export class OwnerVerificationDetailComponent implements OnInit {
  owner: Owner | null = null;
  turfs: any[] = [];
  auditLogs: AuditLog[] = [];
  ownerId!: number;

  // Verification Checklist State
  chkId = false;
  chkOwnership = false;
  chkBank = false;
  adminNote = '';
  approving = false;

  // Rejection State
  rejectCategory = 'Incomplete Details';
  rejectReason = '';
  rejecting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private adminService: AdminService,
    private alert: AlertService
  ) {}

  ngOnInit(): void {
    this.ownerId = Number(this.route.snapshot.paramMap.get('ownerId'));
    this.loadOwner();
  }

  get isChecklistComplete(): boolean {
    return this.chkId && this.chkOwnership && this.chkBank;
  }

  loadOwner(): void {
    this.adminService.getOwnerDetail(this.ownerId).subscribe({
      next: (res) => {
        this.owner = res.owner;
        this.turfs = (res as any).turfs || [];
        this.auditLogs = res.audit_logs;
        // Pre-fill checkboxes if already verified
        if (this.owner) {
          this.chkId = this.owner.verification_id_proof;
          this.chkOwnership = this.owner.verification_ownership_proof;
          this.chkBank = this.owner.verification_bank_details;
          this.adminNote = this.owner.admin_note || '';
        }
      },
      error: () => {
        this.alert.error('Not Found', 'Owner account details could not be loaded.');
        this.router.navigate(['/admin/owners']);
      }
    });
  }

  onApprove(): void {
    if (!this.isChecklistComplete) {
      this.alert.error('Checklist Incomplete', 'All 3 items must be verified before approval.');
      return;
    }

    this.approving = true;
    this.adminService
      .verifyOwner(this.ownerId, {
        verification_id_proof: this.chkId,
        verification_ownership_proof: this.chkOwnership,
        verification_bank_details: this.chkBank,
        admin_note: this.adminNote
      })
      .subscribe({
        next: (res) => {
          this.approving = false;
          this.alert.success('Owner Approved!', res.message);
          this.loadOwner();
        },
        error: (err) => {
          this.approving = false;
          this.alert.error('Approval Error', err.error?.error || 'Failed to approve owner.');
        }
      });
  }

  onReject(): void {
    if (!this.rejectReason.trim()) {
      this.alert.error('Reason Required', 'Please enter a clear rejection reason.');
      return;
    }

    this.rejecting = true;
    this.adminService
      .rejectOwner(this.ownerId, {
        rejection_category: this.rejectCategory,
        rejection_reason: this.rejectReason.trim()
      })
      .subscribe({
        next: (res) => {
          this.rejecting = false;
          this.alert.success('Application Rejected', res.message);
          this.loadOwner();
        },
        error: (err) => {
          this.rejecting = false;
          this.alert.error('Rejection Error', err.error?.error || 'Failed to reject owner.');
        }
      });
  }

  async onDeleteOwner(): Promise<void> {
    if (!this.owner) return;
    const confirm = await this.alert.confirm(
      `Delete Owner: ${this.owner.brand_name}?`,
      'This will soft-delete the owner and all their registered turfs. Active bookings must be resolved first. Are you sure?',
      'Yes, Delete Owner',
      '#ef4444'
    );
    if (!confirm) return;

    this.adminService.deleteOwner(this.owner.id, 'Admin soft-delete action').subscribe({
      next: (res) => {
        this.alert.success('Deleted', res.message || 'Owner deleted successfully.');
        this.router.navigate(['/admin/owners']);
      },
      error: (err) => {
        this.alert.error('Cannot Delete', err.error?.error || 'Failed to delete owner.');
      }
    });
  }

  async onDeleteTurf(turf: any): Promise<void> {
    const confirm = await this.alert.confirm(
      `Delete Turf: ${turf.name}?`,
      'This will soft-delete the turf from the platform. Active bookings must be resolved first. Are you sure?',
      'Yes, Delete Turf',
      '#ef4444'
    );
    if (!confirm) return;

    this.adminService.deleteTurf(turf.id).subscribe({
      next: (res) => {
        this.alert.success('Deleted', res.message || 'Turf deleted successfully.');
        this.loadOwner();
      },
      error: (err) => {
        this.alert.error('Cannot Delete', err.error?.error || 'Failed to delete turf.');
      }
    });
  }
}
