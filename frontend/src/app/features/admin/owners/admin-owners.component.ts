import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Owner, State, City } from '../../../core/models/models';

@Component({
  selector: 'app-admin-owners',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Turf Owners Directory</h1>
          <p class="page-sub">Review registration documents, execute verification checklists, and govern owner accounts.</p>
        </div>
      </div>

      <!-- Filters Bar -->
      <div class="filters-card">
        <div class="filter-row">
          <div class="filter-item search">
            <label class="filter-label">Search Directory</label>
            <div class="input-icon">
              <i class="bi bi-search"></i>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (input)="onSearchInput()"
                (keyup.enter)="loadOwners()"
                placeholder="Search by brand, name, email or mobile..."
                class="form-control"
              />
            </div>
          </div>

          <div class="filter-item">
            <label class="filter-label">Account Status</label>
            <select [(ngModel)]="statusFilter" (change)="loadOwners()" class="form-select">
              <option value="All">All Statuses</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Owner Type</label>
            <select [(ngModel)]="ownerTypeFilter" (change)="loadOwners()" class="form-select">
              <option value="All">All Types</option>
              <option value="Individual">Individual</option>
              <option value="Partnership">Partnership</option>
              <option value="Company">Company</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">State</label>
            <select [(ngModel)]="stateFilter" (change)="onStateFilterChange()" class="form-select">
              <option value="">All States</option>
              <option *ngFor="let s of states" [value]="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">City</label>
            <select [(ngModel)]="cityFilter" (change)="loadOwners()" class="form-select">
              <option value="">All Cities</option>
              <option *ngFor="let c of filteredCities" [value]="c.id">{{ c.name }}</option>
            </select>
          </div>

          <div class="filter-btn-group">
            <button class="btn btn-secondary btn-sm" (click)="resetFilters()">
              <i class="bi bi-arrow-counterclockwise"></i> Reset
            </button>
          </div>
        </div>
      </div>

      <!-- Owners Table -->
      <div class="turf-card p-0 mt-3 overflow-hidden">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Brand / Arena</th>
                <th>Owner Name</th>
                <th>Contact Information</th>
                <th>Location</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registered</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngIf="loading">
                <td colspan="8" class="text-center py-4">
                  <span class="spinner-border"></span> Loading owners directory...
                </td>
              </tr>
              <tr *ngIf="!loading && owners.length === 0">
                <td colspan="8" class="text-center py-4 text-muted">
                  No owners found matching your filter criteria.
                </td>
              </tr>
              <tr *ngFor="let o of owners">
                <td>
                  <div class="brand-title">{{ o.brand_name }}</div>
                  <button
                    type="button"
                    class="turf-count-btn"
                    *ngIf="o.turf_count !== undefined"
                    (click)="openTurfsModal(o)"
                    title="View & Delete Turfs"
                  >
                    <i class="bi bi-flag"></i> {{ o.turf_count }} Turf(s)
                  </button>
                </td>
                <td>
                  <div class="owner-name">{{ o.full_name }}</div>
                  <small class="text-muted">DOB: {{ o.date_of_birth }}</small>
                </td>
                <td>
                  <div><i class="bi bi-envelope text-muted"></i> {{ o.email }}</div>
                  <div><i class="bi bi-phone text-muted"></i> {{ o.mobile }}</div>
                </td>
                <td>
                  <div>{{ o.city_name || 'N/A' }}</div>
                  <small class="text-muted">{{ o.state_name }}</small>
                </td>
                <td>
                  <span class="type-pill">{{ o.owner_type }}</span>
                </td>
                <td>
                  <span
                    class="badge"
                    [ngClass]="{
                      'badge-pending': o.account_status === 'Pending Approval',
                      'badge-approved': o.account_status === 'Approved',
                      'badge-suspended': o.account_status === 'Suspended',
                      'badge-rejected': o.account_status === 'Rejected'
                    }"
                  >
                    {{ o.account_status === 'Pending Approval' ? 'PENDING' : o.account_status }}
                  </span>
                </td>
                <td>
                  <small>{{ o.created_at | date:'mediumDate' }}</small>
                </td>
                <td class="text-right">
                  <div class="action-buttons">
                    <button
                      class="btn btn-sm btn-outline-info"
                      (click)="openTurfsModal(o)"
                      title="View & Delete Turfs"
                    >
                      <i class="bi bi-geo-alt"></i> Turfs
                    </button>

                    <a
                      [routerLink]="['/admin/owners', o.id, 'verify']"
                      class="btn btn-sm"
                      [ngClass]="o.account_status === 'Pending Approval' ? 'btn-primary' : 'btn-secondary'"
                      title="Review Checklist & Documents"
                    >
                      <i class="bi bi-shield-check"></i>
                      {{ o.account_status === 'Pending Approval' ? 'Verify' : 'Review' }}
                    </a>

                    <button
                      *ngIf="o.account_status === 'Approved' || o.account_status === 'Suspended'"
                      class="btn btn-sm"
                      [ngClass]="o.account_status === 'Approved' ? 'btn-outline-warning' : 'btn-outline-primary'"
                      (click)="onToggleSuspend(o)"
                      [title]="o.account_status === 'Approved' ? 'Suspend Owner' : 'Reactivate Owner'"
                    >
                      <i class="bi" [ngClass]="o.account_status === 'Approved' ? 'bi-pause-circle' : 'bi-play-circle'"></i>
                      {{ o.account_status === 'Approved' ? 'Suspend' : 'Reactivate' }}
                    </button>

                    <button
                      class="btn btn-sm btn-outline-danger"
                      (click)="onDeleteOwner(o)"
                      title="Delete Owner (Soft Delete)"
                    >
                      <i class="bi bi-trash"></i> Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Turfs Management Modal for Admin -->
      <div class="modal-backdrop" *ngIf="showTurfsModal" (click)="closeTurfsModal()">
        <div class="modal-card wide-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <h2 class="modal-title">
                <i class="bi bi-geo-alt text-primary"></i>
                Turfs for {{ selectedOwnerForTurfs?.brand_name }}
              </h2>
              <p class="modal-sub">
                Owner: <strong>{{ selectedOwnerForTurfs?.full_name }}</strong> ({{ selectedOwnerForTurfs?.email }})
              </p>
            </div>
            <button class="modal-close" (click)="closeTurfsModal()">&times;</button>
          </div>

          <div class="modal-body">
            <div *ngIf="loadingTurfs" class="text-center py-4">
              <span class="spinner-border"></span> Loading turfs...
            </div>

            <div *ngIf="!loadingTurfs && ownerTurfs.length === 0" class="text-center py-4 text-muted">
              <i class="bi bi-info-circle display-6 d-block mb-2"></i>
              No registered turfs found for this owner.
            </div>

            <div class="table-responsive" *ngIf="!loadingTurfs && ownerTurfs.length > 0">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Turf Name</th>
                    <th>Sport</th>
                    <th>Location</th>
                    <th>Pricing</th>
                    <th>Status</th>
                    <th class="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of ownerTurfs">
                    <td>
                      <strong>{{ t.name }}</strong>
                      <div class="text-muted small">{{ t.size }} • {{ t.surface }}</div>
                    </td>
                    <td><span class="badge bg-light text-dark">{{ t.sport }}</span></td>
                    <td>{{ t.city_name || 'N/A' }}, {{ t.state_name || '' }}</td>
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
                      <button
                        class="btn btn-sm btn-outline-danger"
                        (click)="onDeleteTurfFromModal(t)"
                        title="Delete Turf (Admin)"
                      >
                        <i class="bi bi-trash"></i> Delete Turf
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeTurfsModal()">Close</button>
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
    .header-actions { display: flex; gap: 0.75rem; }

    .filters-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .filter-row {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 1rem;
    }
    .filter-item {
      flex: 1;
      min-width: 150px;
    }
    .filter-item.search {
      min-width: 280px;
      flex: 2;
    }
    .filter-label {
      font-size: 0.78rem;
      font-weight: 700;
      color: #475569;
      margin-bottom: 0.35rem;
      display: block;
    }
    .input-icon {
      position: relative;
    }
    .input-icon i {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
    }
    .input-icon .form-control {
      padding-left: 2.2rem;
    }
    .filter-btn-group {
      display: flex;
      gap: 0.5rem;
    }

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
    .row-selected {
      background-color: #f0fdf4 !important;
    }
    .brand-title {
      font-weight: 700;
      color: #0f172a;
      font-size: 0.95rem;
    }
    .turf-count {
      font-size: 0.75rem;
      color: #059669;
      font-weight: 600;
      margin-top: 0.15rem;
    }
    .turf-count-btn {
      font-size: 0.75rem;
      color: #059669;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 4px;
      font-weight: 600;
      margin-top: 0.25rem;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      transition: all 0.2s;
    }
    .turf-count-btn:hover {
      background: #059669;
      color: #ffffff;
    }
    .owner-name { font-weight: 600; color: #1e293b; }
    .type-pill {
      font-size: 0.75rem;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }
    .action-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
    }
    .text-right { text-align: right; }

    .modal-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
      padding: 1rem;
    }
    .modal-card {
      background: #ffffff;
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 650px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      overflow: hidden;
    }
    .modal-card.wide-modal {
      max-width: 850px;
    }
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .modal-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 0; }
    .modal-sub { color: #64748b; font-size: 0.85rem; margin-top: 0.25rem; }
    .modal-close {
      background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #94a3b8;
    }
    .modal-close:hover { color: #0f172a; }
    .modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; }
    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }
  `]
})
export class AdminOwnersComponent implements OnInit {
  owners: Owner[] = [];
  loading = false;
  selectedOwnerIds: number[] = [];

  // Filters
  searchQuery = '';
  statusFilter = 'All';
  ownerTypeFilter = 'All';
  stateFilter = '';
  cityFilter = '';

  states: State[] = [];
  cities: City[] = [];
  filteredCities: City[] = [];

  constructor(
    private adminService: AdminService,
    private auth: AuthService,
    private alert: AlertService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check query params (e.g. status='Pending Approval')
    this.route.queryParams.subscribe((params) => {
      if (params['status']) {
        this.statusFilter = params['status'];
      }
      this.loadLocations();
      this.loadOwners();
    });
  }

  loadLocations(): void {
    this.auth.getLocations().subscribe({
      next: (res) => {
        this.states = res.states;
        this.cities = res.cities;
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }
    });
  }

  onStateFilterChange(): void {
    if (this.stateFilter) {
      this.filteredCities = this.cities.filter((c) => c.state_id === Number(this.stateFilter));
    } else {
      this.filteredCities = [];
    }
    this.cityFilter = '';
    this.loadOwners();
  }

  loadOwners(): void {
    this.loading = true;
    const filters: Record<string, any> = {
      search: this.searchQuery,
      status: this.statusFilter,
      owner_type: this.ownerTypeFilter,
      state_id: this.stateFilter,
      city_id: this.cityFilter
    };

    this.adminService.getOwners(filters).subscribe({
      next: (res) => {
        this.owners = res.owners;
        this.loading = false;
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.cdr.markForCheck();
      }
    });
  }

  searchTimeout: any = null;

  onSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadOwners();
    }, 300);
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = 'All';
    this.ownerTypeFilter = 'All';
    this.stateFilter = '';
    this.cityFilter = '';
    this.filteredCities = [];
    this.loadOwners();
  }

  // Selection
  isSelected(id: number): boolean {
    return this.selectedOwnerIds.includes(id);
  }

  toggleSelect(id: number): void {
    if (this.isSelected(id)) {
      this.selectedOwnerIds = this.selectedOwnerIds.filter((x) => x !== id);
    } else {
      this.selectedOwnerIds.push(id);
    }
  }

  isAllSelected(): boolean {
    return this.owners.length > 0 && this.selectedOwnerIds.length === this.owners.length;
  }

  toggleSelectAll(e: Event): void {
    const checked = (e.target as HTMLInputElement).checked;
    this.selectedOwnerIds = checked ? this.owners.map((o) => o.id) : [];
  }

  async onToggleSuspend(owner: Owner): Promise<void> {
    const isApproved = owner.account_status === 'Approved';
    const actionText = isApproved ? 'Suspend' : 'Reactivate';
    const confirm = await this.alert.confirm(
      `${actionText} ${owner.brand_name}?`,
      isApproved
        ? 'Suspending will immediately hide all their turfs from player search and block new booking requests.'
        : 'Reactivating will make their turfs visible in player searches again.'
    );
    if (!confirm) return;

    this.adminService.toggleSuspend(owner.id, `Admin ${actionText} action`).subscribe({
      next: (res) => {
        owner.account_status = res.account_status;
        this.alert.success(`Owner ${res.account_status}`);
      },
      error: (err) => this.alert.error('Failed', err.error?.error || 'Action failed')
    });
  }

  async onDeleteOwner(owner: Owner): Promise<void> {
    const confirm = await this.alert.confirm(
      `Delete Owner: ${owner.brand_name}?`,
      'This will delete the owner account and deactivate their turfs. Existing player bookings will remain preserved and affected players will be notified automatically.',
      'Yes, Delete Owner',
      '#ef4444'
    );
    if (!confirm) return;

    this.adminService.deleteOwner(owner.id, 'Admin soft-delete action').subscribe({
      next: (res) => {
        this.alert.toastSuccess(res.message || 'Owner deleted successfully.');
        this.loadOwners();
      },
      error: (err) => {
        this.alert.error('Cannot Delete', err.error?.error || 'Failed to delete owner.');
      }
    });
  }

  async onBulkApprove(): Promise<void> {
    const confirm = await this.alert.confirm(
      'Bulk Approve Owners?',
      `Are you sure you want to approve all ${this.selectedOwnerIds.length} selected owner(s)? This will mark ID proof, ownership proof, and bank details as verified.`,
      'Approve All',
      '#10b981'
    );
    if (!confirm) return;

    this.adminService
      .bulkAction({ owner_ids: this.selectedOwnerIds, action: 'approve' })
      .subscribe({
        next: (res) => {
          this.alert.success('Bulk Approval Complete', res.message);
          this.selectedOwnerIds = [];
          this.loadOwners();
        },
        error: (err) => this.alert.error('Error', err.error?.error || 'Failed')
      });
  }

  async onBulkReject(): Promise<void> {
    const confirm = await this.alert.confirm(
      'Bulk Reject Owners?',
      `Are you sure you want to reject ${this.selectedOwnerIds.length} selected owner(s)?`,
      'Reject All',
      '#ef4444'
    );
    if (!confirm) return;

    this.adminService
      .bulkAction({
        owner_ids: this.selectedOwnerIds,
        action: 'reject',
        rejection_category: 'Incomplete Details',
        reason: 'Bulk rejection by administrator'
      })
      .subscribe({
        next: (res) => {
          this.alert.success('Bulk Rejection Complete', res.message);
          this.selectedOwnerIds = [];
          this.loadOwners();
        },
        error: (err) => this.alert.error('Error', err.error?.error || 'Failed')
      });
  }

  showTurfsModal = false;
  selectedOwnerForTurfs: Owner | null = null;
  ownerTurfs: any[] = [];
  loadingTurfs = false;

  openTurfsModal(owner: Owner): void {
    this.selectedOwnerForTurfs = owner;
    this.showTurfsModal = true;
    this.loadingTurfs = true;
    this.ownerTurfs = [];
    this.adminService.getOwnerDetail(owner.id).subscribe({
      next: (res: any) => {
        this.ownerTurfs = res.turfs || [];
        this.loadingTurfs = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loadingTurfs = false;
        this.alert.error('Failed', err.error?.error || 'Could not fetch owner turfs.');
        this.cdr.detectChanges();
      }
    });
  }

  closeTurfsModal(): void {
    this.showTurfsModal = false;
    this.selectedOwnerForTurfs = null;
    this.ownerTurfs = [];
  }

  async onDeleteTurfFromModal(turf: any): Promise<void> {
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
        this.ownerTurfs = this.ownerTurfs.filter((t) => t.id !== turf.id);
        if (this.selectedOwnerForTurfs && this.selectedOwnerForTurfs.turf_count !== undefined) {
          this.selectedOwnerForTurfs.turf_count = Math.max(0, this.selectedOwnerForTurfs.turf_count - 1);
        }
        // Also update in the main owners list
        const match = this.owners.find((o) => o.id === this.selectedOwnerForTurfs?.id);
        if (match && match.turf_count !== undefined) {
          match.turf_count = Math.max(0, match.turf_count - 1);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.alert.error('Cannot Delete', err.error?.error || 'Failed to delete turf.');
      }
    });
  }
}
