import { Component, OnInit } from '@angular/core';
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
        <div class="header-actions">
          <button
            class="btn btn-primary btn-sm"
            [disabled]="selectedOwnerIds.length === 0"
            (click)="onBulkApprove()"
          >
            <i class="bi bi-check2-all"></i> Bulk Approve ({{ selectedOwnerIds.length }})
          </button>
          <button
            class="btn btn-outline-danger btn-sm"
            [disabled]="selectedOwnerIds.length === 0"
            (click)="onBulkReject()"
          >
            <i class="bi bi-x-circle"></i> Bulk Reject ({{ selectedOwnerIds.length }})
          </button>
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
            <button class="btn btn-primary btn-sm" (click)="loadOwners()">
              <i class="bi bi-funnel-fill"></i> Filter
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
                <th width="40">
                  <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll($event)" />
                </th>
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
                <td colspan="9" class="text-center py-4">
                  <span class="spinner-border"></span> Loading owners directory...
                </td>
              </tr>
              <tr *ngIf="!loading && owners.length === 0">
                <td colspan="9" class="text-center py-4 text-muted">
                  No owners found matching your filter criteria.
                </td>
              </tr>
              <tr *ngFor="let o of owners" [class.row-selected]="isSelected(o.id)">
                <td>
                  <input type="checkbox" [checked]="isSelected(o.id)" (change)="toggleSelect(o.id)" />
                </td>
                <td>
                  <div class="brand-title">{{ o.brand_name }}</div>
                  <div class="turf-count" *ngIf="o.turf_count !== undefined">
                    <i class="bi bi-flag"></i> {{ o.turf_count }} Turf(s)
                  </div>
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
                  <span class="badge" [ngClass]="'badge-' + o.account_status.toLowerCase().replace(' ', '-')">
                    {{ o.account_status }}
                  </span>
                </td>
                <td>
                  <small>{{ o.created_at | date:'mediumDate' }}</small>
                </td>
                <td class="text-right">
                  <div class="action-buttons">
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
    private route: ActivatedRoute
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
      },
      error: () => (this.loading = false)
    });
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
      'This will soft-delete the owner and all their registered turfs. Active bookings must be resolved first. Are you sure?',
      'Yes, Delete Owner',
      '#ef4444'
    );
    if (!confirm) return;

    this.adminService.deleteOwner(owner.id, 'Admin soft-delete action').subscribe({
      next: (res) => {
        this.alert.success('Deleted', res.message || 'Owner deleted successfully.');
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
}
