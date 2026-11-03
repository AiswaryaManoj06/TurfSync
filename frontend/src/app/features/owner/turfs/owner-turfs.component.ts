import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TurfService } from '../../../core/services/turf.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Turf, State, City } from '../../../core/models/models';

function closingTimeValidator(control: AbstractControl) {
  const opening = control.get('opening_time')?.value;
  const closing = control.get('closing_time')?.value;
  if (opening && closing && closing <= opening) {
    return { closingNotLater: true };
  }
  return null;
}

@Component({
  selector: 'app-owner-turfs',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Manage Arenas & Turfs</h1>
          <p class="page-sub">Create, configure, and maintain your sports pitches, facilities, and hourly rates.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openAddModal()">
            <i class="bi bi-plus-circle-fill"></i> Add New Turf
          </button>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="filters-card mb-4">
        <div class="filter-row">
          <div class="filter-item">
            <label class="filter-label">Filter by Sport</label>
            <select [(ngModel)]="sportFilter" (change)="loadTurfs()" class="form-select">
              <option value="All">All Sports</option>
              <option *ngFor="let s of sportsList" [value]="s">{{ s }}</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Status</label>
            <select [(ngModel)]="statusFilter" (change)="loadTurfs()" class="form-select">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div class="filter-btn-group">
            <button class="btn btn-secondary btn-sm" (click)="resetFilters()">Reset</button>
            <button class="btn btn-primary btn-sm" (click)="loadTurfs()">Filter</button>
          </div>
        </div>
      </div>

      <!-- Turfs Grid -->
      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner"></div> Loading your turfs...
      </div>

      <div *ngIf="!loading && turfs.length === 0" class="empty-turfs-card">
        <i class="bi bi-flag"></i>
        <h3>No Turfs Created Yet</h3>
        <p>Get started by listing your first sports turf. Set custom weekday and weekend pricing, opening hours, and amenities.</p>
        <button class="btn btn-primary" (click)="openAddModal()">
          <i class="bi bi-plus-lg"></i> Add Your First Turf
        </button>
      </div>

      <div class="turfs-cards-grid" *ngIf="!loading && turfs.length > 0">
        <div *ngFor="let t of turfs" class="turf-card-item">
          <!-- Image Carousel / Cover -->
          <div class="turf-cover-image" [style.background-image]="'url(' + (t.photos[0] || defaultPhoto) + ')'">
            <span class="sport-badge-overlay">{{ t.sport }}</span>
            <span class="status-badge-overlay" [ngClass]="t.status === 'Active' ? 'badge-approved' : 'badge-rejected'">
              {{ t.status }}
            </span>
          </div>

          <div class="turf-body">
            <div class="turf-header-row">
              <h3 class="turf-name">{{ t.name }}</h3>
              <span class="type-badge">{{ t.turf_type }}</span>
            </div>
            <div class="turf-location">
              <i class="bi bi-geo-alt"></i> {{ t.address }}, {{ t.city_name }} ({{ t.pincode }})
            </div>

            <!-- Specs Grid -->
            <div class="specs-grid">
              <div class="spec-item">
                <span class="spec-lbl">Surface</span>
                <span class="spec-val">{{ t.surface }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-lbl">Size</span>
                <span class="spec-val">{{ t.size }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-lbl">Max Players</span>
                <span class="spec-val">{{ t.max_players }}</span>
              </div>
              <div class="spec-item">
                <span class="spec-lbl">Timing</span>
                <span class="spec-val">{{ t.opening_time.slice(0, 5) }} - {{ t.closing_time.slice(0, 5) }}</span>
              </div>
            </div>

            <!-- Pricing Badges -->
            <div class="pricing-row">
              <div class="price-box">
                <span class="price-label">Weekday / hr</span>
                <span class="price-val">₹{{ t.weekday_price_per_hour }}</span>
              </div>
              <div class="price-box weekend">
                <span class="price-label">Weekend / hr</span>
                <span class="price-val">₹{{ t.weekend_price_per_hour }}</span>
              </div>
            </div>

            <!-- Amenities Tags -->
            <div class="amenities-tags" *ngIf="t.amenities?.length">
              <span *ngFor="let a of t.amenities.slice(0, 4)" class="amenity-tag">
                <i class="bi bi-check2"></i> {{ a }}
              </span>
              <span *ngIf="t.amenities.length > 4" class="amenity-tag extra">
                +{{ t.amenities.length - 4 }} more
              </span>
            </div>

            <!-- Action Buttons -->
            <div class="turf-card-actions">
              <a [routerLink]="['/owner/slots']" [queryParams]="{ turf_id: t.id }" class="btn btn-outline-primary btn-sm">
                <i class="bi bi-calendar-plus"></i> Manage Slots
              </a>
              <button class="btn btn-secondary btn-sm" (click)="openEditModal(t)" title="Edit Arena">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger btn-sm" (click)="onDeleteTurf(t)" title="Delete Arena">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ADD / EDIT TURF MODAL -->
      <div class="modal-overlay" *ngIf="showModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h2>{{ isEditing ? 'Edit Sports Arena' : 'Add New Sports Arena' }}</h2>
            <button class="close-btn" type="button" (click)="closeModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>

          <form [formGroup]="turfForm" (ngSubmit)="onSaveTurf()" class="modal-form">
            <!-- Basic Info -->
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">Arena / Turf Name (Unique per city) <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="name"
                  class="form-control"
                  placeholder="e.g. Apex Arena 1 - FIFA AstroTurf"
                  [class.is-invalid]="f['name'].touched && f['name'].invalid"
                />
                <div class="invalid-feedback" *ngIf="f['name'].touched && f['name'].invalid">
                  Turf name is required.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Sport <span class="required">*</span></label>
                <select formControlName="sport" class="form-select">
                  <option *ngFor="let s of sportsList" [value]="s">{{ s }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Playing Surface <span class="required">*</span></label>
                <select formControlName="surface" class="form-select">
                  <option *ngFor="let sf of surfaceList" [value]="sf">{{ sf }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Turf Size <span class="required">*</span></label>
                <select formControlName="size" class="form-select">
                  <option *ngFor="let sz of sizeList" [value]="sz">{{ sz }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Turf Environment <span class="required">*</span></label>
                <select formControlName="turf_type" class="form-select">
                  <option value="Outdoor">Outdoor</option>
                  <option value="Indoor">Indoor</option>
                </select>
              </div>
            </div>

            <!-- Location & Contact -->
            <div class="form-grid mt-3">
              <div class="form-group full">
                <label class="form-label">Full Address <span class="required">*</span></label>
                <textarea
                  formControlName="address"
                  class="form-control"
                  rows="2"
                  placeholder="Street address, locality, landmark..."
                  [class.is-invalid]="f['address'].touched && f['address'].invalid"
                ></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Landmark (Optional)</label>
                <input type="text" formControlName="landmark" class="form-control" placeholder="Near Metro Station" />
              </div>

              <div class="form-group">
                <label class="form-label">Arena Contact Number <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="contact_number"
                  class="form-control"
                  placeholder="10-digit phone"
                  maxlength="10"
                  [class.is-invalid]="f['contact_number'].touched && f['contact_number'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">State <span class="required">*</span></label>
                <select formControlName="state_id" class="form-select" (change)="onModalStateChange()">
                  <option value="">Select State</option>
                  <option *ngFor="let s of states" [value]="s.id">{{ s.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">City <span class="required">*</span></label>
                <select formControlName="city_id" class="form-select">
                  <option value="">Select City</option>
                  <option *ngFor="let ct of modalCities" [value]="ct.id">{{ ct.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Pincode (6 digits) <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="pincode"
                  class="form-control"
                  maxlength="6"
                  placeholder="400053"
                  [class.is-invalid]="f['pincode'].touched && f['pincode'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Google Maps Link (Optional)</label>
                <input type="url" formControlName="google_maps_link" class="form-control" placeholder="https://maps.google.com/..." />
              </div>
            </div>

            <!-- Pricing, Capacities & Operating Times -->
            <div class="form-grid mt-3">
              <div class="form-group">
                <label class="form-label">Weekday Price / hr (₹) <span class="required">*</span></label>
                <input
                  type="number"
                  formControlName="weekday_price_per_hour"
                  class="form-control"
                  placeholder="1200"
                  [class.is-invalid]="f['weekday_price_per_hour'].touched && f['weekday_price_per_hour'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Weekend Price / hr (₹) <span class="required">*</span></label>
                <input
                  type="number"
                  formControlName="weekend_price_per_hour"
                  class="form-control"
                  placeholder="1500"
                  [class.is-invalid]="f['weekend_price_per_hour'].touched && f['weekend_price_per_hour'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Max Players Permitted <span class="required">*</span></label>
                <input
                  type="number"
                  formControlName="max_players"
                  class="form-control"
                  placeholder="14"
                  [class.is-invalid]="f['max_players'].touched && f['max_players'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Advance Booking Limit (1–90 days) <span class="required">*</span></label>
                <input
                  type="number"
                  formControlName="advance_booking_limit_days"
                  class="form-control"
                  min="1"
                  max="90"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Opening Time <span class="required">*</span></label>
                <input
                  type="time"
                  formControlName="opening_time"
                  class="form-control"
                  [class.is-invalid]="f['opening_time'].touched && f['opening_time'].invalid"
                />
              </div>

              <div class="form-group">
                <label class="form-label">Closing Time (Must be later) <span class="required">*</span></label>
                <input
                  type="time"
                  formControlName="closing_time"
                  class="form-control"
                  [class.is-invalid]="(f['closing_time'].touched && f['closing_time'].invalid) || turfForm.hasError('closingNotLater')"
                />
                <div class="invalid-feedback" *ngIf="turfForm.hasError('closingNotLater')">
                  Closing time must be later than opening time.
                </div>
              </div>
            </div>

            <!-- Photos & Amenities -->
            <div class="form-group mt-3">
              <label class="form-label">Turf Photo URL (At least 1 required) <span class="required">*</span></label>
              <input
                type="text"
                formControlName="photo_url"
                class="form-control"
                placeholder="https://images.unsplash.com/... or media path"
              />
              <small class="text-muted">Enter a direct image URL or upload image path.</small>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Amenities Available</label>
              <div class="checkbox-grid">
                <label *ngFor="let am of amenitiesList" class="checkbox-label">
                  <input
                    type="checkbox"
                    [checked]="isAmenitySelected(am)"
                    (change)="toggleAmenity(am, $event)"
                  />
                  <span>{{ am }}</span>
                </label>
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Status</label>
              <select formControlName="status" class="form-select">
                <option value="Active">Active (Visible to Players)</option>
                <option value="Inactive">Inactive (Hidden from Players)</option>
              </select>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="turfForm.invalid || saving">
                <span *ngIf="saving" class="spinner"></span>
                <i *ngIf="!saving" class="bi bi-check-lg"></i>
                {{ isEditing ? 'Update Turf' : 'Save & Publish Turf' }}
              </button>
            </div>
          </form>
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

    .filters-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1rem 1.25rem;
    }
    .filter-row { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    .filter-item { min-width: 180px; }
    .filter-label { font-size: 0.78rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block; }
    .filter-btn-group { display: flex; gap: 0.5rem; }

    .turfs-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }
    .turf-card-item {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      display: flex;
      flex-direction: column;
      transition: all 0.2s ease;
    }
    .turf-card-item:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
    .turf-cover-image {
      height: 180px;
      background-size: cover;
      background-position: center;
      position: relative;
      padding: 0.75rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .sport-badge-overlay {
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-sm);
      backdrop-filter: blur(4px);
    }
    .status-badge-overlay {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 0.25rem 0.65rem;
      border-radius: var(--radius-sm);
    }
    .turf-body {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .turf-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.35rem;
    }
    .turf-name { font-size: 1.2rem; color: #0f172a; }
    .type-badge { font-size: 0.75rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 0.15rem 0.5rem; border-radius: 4px; }
    .turf-location { font-size: 0.82rem; color: #64748b; margin-bottom: 1rem; }

    .specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
      background: #f8fafc;
      padding: 0.75rem;
      border-radius: var(--radius-md);
      margin-bottom: 1rem;
    }
    .spec-item { display: flex; flex-direction: column; }
    .spec-lbl { font-size: 0.68rem; color: #64748b; text-transform: uppercase; font-weight: 700; }
    .spec-val { font-size: 0.85rem; font-weight: 700; color: #1e293b; }

    .pricing-row {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 1rem;
    }
    .price-box {
      flex: 1;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-sm);
      display: flex;
      flex-direction: column;
    }
    .price-box.weekend { background: #ecfdf5; border-color: #a7f3d0; }
    .price-label { font-size: 0.7rem; color: #64748b; font-weight: 600; }
    .price-val { font-size: 1.15rem; font-weight: 800; color: #059669; font-family: var(--font-heading); }

    .amenities-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 1.25rem; }
    .amenity-tag {
      font-size: 0.72rem;
      background: #f1f5f9;
      color: #334155;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .amenity-tag.extra { background: #e2e8f0; }

    .turf-card-actions {
      display: flex;
      gap: 0.5rem;
      margin-top: auto;
      padding-top: 0.75rem;
      border-top: 1px solid #f1f5f9;
    }
    .turf-card-actions .btn:first-child { flex: 1; }

    .empty-turfs-card {
      text-align: center;
      padding: 4rem 2rem;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: var(--radius-xl);
    }
    .empty-turfs-card i { font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; display: inline-block; }
    .empty-turfs-card h3 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.5rem; }
    .empty-turfs-card p { color: #64748b; max-width: 500px; margin: 0 auto 1.5rem; font-size: 0.95rem; }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1050;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem 1rem;
      overflow-y: auto;
    }
    .modal-dialog {
      background: #ffffff;
      border-radius: var(--radius-xl);
      max-height: calc(100vh - 4rem);
      overflow-y: auto;
      width: 100%;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
    }
    .modal-dialog.modal-lg { max-width: 820px; }
    .modal-header {
      position: sticky;
      top: 0;
      background: #ffffff;
      z-index: 20;
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h2 { font-size: 1.35rem; color: #0f172a; }
    .close-btn { background: none; border: none; font-size: 1.25rem; color: #94a3b8; cursor: pointer; }
    .modal-form { padding: 1.75rem; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; }
    .form-grid .full { grid-column: span 2; }
    .checkbox-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem; margin-top: 0.35rem; }
    .checkbox-label { font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem; }
    .spinner { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class OwnerTurfsComponent implements OnInit {
  turfs: Turf[] = [];
  loading = false;
  saving = false;

  sportFilter = 'All';
  statusFilter = 'All';

  sportsList = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'];
  surfaceList = ['Natural Grass', 'Artificial Turf', 'Wooden', 'Synthetic'];
  sizeList = ['5-a-side', '7-a-side', '9-a-side', 'Full Size'];
  amenitiesList = ['Floodlights', 'Changing Room', 'Washroom', 'Drinking Water', 'Parking', 'Equipment Rental', 'Cafeteria'];

  selectedAmenities: string[] = ['Floodlights', 'Changing Room', 'Washroom', 'Drinking Water'];

  states: State[] = [];
  cities: City[] = [];
  modalCities: City[] = [];

  showModal = false;
  isEditing = false;
  editingTurfId: number | null = null;
  turfForm: FormGroup;

  defaultPhoto = 'https://images.unsplash.com/photo-1529900240041-dd2c1bb52b11?auto=format&fit=crop&w=800&q=80';

  constructor(
    private turfService: TurfService,
    private auth: AuthService,
    private alert: AlertService,
    private fb: FormBuilder
  ) {
    this.turfForm = this.fb.group(
      {
        name: ['', Validators.required],
        address: ['', Validators.required],
        landmark: [''],
        contact_number: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        google_maps_link: [''],
        sport: ['Football', Validators.required],
        surface: ['Artificial Turf', Validators.required],
        size: ['5-a-side', Validators.required],
        turf_type: ['Outdoor', Validators.required],
        state_id: ['', Validators.required],
        city_id: ['', Validators.required],
        pincode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
        weekday_price_per_hour: [1200, [Validators.required, Validators.min(1)]],
        weekend_price_per_hour: [1500, [Validators.required, Validators.min(1)]],
        max_players: [14, [Validators.required, Validators.min(1)]],
        advance_booking_limit_days: [30, [Validators.required, Validators.min(1), Validators.max(90)]],
        opening_time: ['06:00', Validators.required],
        closing_time: ['23:00', Validators.required],
        photo_url: [this.defaultPhoto, Validators.required],
        status: ['Active', Validators.required]
      },
      { validators: closingTimeValidator }
    );
  }

  ngOnInit(): void {
    this.loadLocations();
    this.loadTurfs();
  }

  get f() {
    return this.turfForm.controls;
  }

  loadLocations(): void {
    this.auth.getLocations().subscribe({
      next: (res) => {
        this.states = res.states;
        this.cities = res.cities;
      }
    });
  }

  loadTurfs(): void {
    this.loading = true;
    this.turfService.getTurfs({ sport: this.sportFilter, status: this.statusFilter }).subscribe({
      next: (res) => {
        this.turfs = res.turfs;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  resetFilters(): void {
    this.sportFilter = 'All';
    this.statusFilter = 'All';
    this.loadTurfs();
  }

  onModalStateChange(): void {
    const sId = Number(this.turfForm.get('state_id')?.value);
    this.modalCities = this.cities.filter((c) => c.state_id === sId);
    this.turfForm.patchValue({ city_id: '' });
  }

  isAmenitySelected(am: string): boolean {
    return this.selectedAmenities.includes(am);
  }

  toggleAmenity(am: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedAmenities.includes(am)) this.selectedAmenities.push(am);
    } else {
      this.selectedAmenities = this.selectedAmenities.filter((x) => x !== am);
    }
  }

  openAddModal(): void {
    if (!this.states || this.states.length === 0) {
      this.loadLocations();
    }
    this.isEditing = false;
    this.editingTurfId = null;
    this.turfForm.reset({
      name: '',
      address: '',
      landmark: '',
      contact_number: '',
      google_maps_link: '',
      sport: 'Football',
      surface: 'Artificial Turf',
      size: '5-a-side',
      turf_type: 'Outdoor',
      state_id: '',
      city_id: '',
      pincode: '',
      weekday_price_per_hour: 1200,
      weekend_price_per_hour: 1500,
      max_players: 14,
      advance_booking_limit_days: 30,
      opening_time: '06:00',
      closing_time: '23:00',
      photo_url: this.defaultPhoto,
      status: 'Active'
    });
    this.selectedAmenities = ['Floodlights', 'Changing Room', 'Washroom', 'Drinking Water'];
    this.modalCities = [];
    this.showModal = true;
  }

  openEditModal(t: Turf): void {
    if (!this.states || this.states.length === 0) {
      this.loadLocations();
    }
    this.isEditing = true;
    this.editingTurfId = t.id;
    this.modalCities = this.cities.filter((c) => c.state_id === t.state_id);
    this.selectedAmenities = [...(t.amenities || [])];

    this.turfForm.patchValue({
      name: t.name,
      address: t.address,
      landmark: t.landmark,
      contact_number: t.contact_number,
      google_maps_link: t.google_maps_link,
      sport: t.sport,
      surface: t.surface,
      size: t.size,
      turf_type: t.turf_type,
      state_id: t.state_id,
      city_id: t.city_id,
      pincode: t.pincode,
      weekday_price_per_hour: t.weekday_price_per_hour,
      weekend_price_per_hour: t.weekend_price_per_hour,
      max_players: t.max_players,
      advance_booking_limit_days: t.advance_booking_limit_days,
      opening_time: t.opening_time.slice(0, 5),
      closing_time: t.closing_time.slice(0, 5),
      photo_url: t.photos?.[0] || this.defaultPhoto,
      status: t.status
    });
    this.showModal = true;
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close if user clicked directly on the dark backdrop, not inside the modal dialog
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.showModal = false;
  }

  onSaveTurf(): void {
    if (this.turfForm.invalid) {
      this.alert.error('Incomplete Details', 'Please review all highlighted fields.');
      return;
    }

    this.saving = true;
    const formVal = this.turfForm.value;
    const payload: any = {
      ...formVal,
      amenities: this.selectedAmenities,
      photos: [formVal.photo_url || this.defaultPhoto]
    };

    if (this.isEditing && this.editingTurfId) {
      this.turfService.updateTurf(this.editingTurfId, payload).subscribe({
        next: (res) => {
          this.saving = false;
          this.alert.success('Turf Updated!', res.message);
          this.closeModal();
          this.loadTurfs();
        },
        error: (err) => {
          this.saving = false;
          this.alert.error('Save Failed', err.error?.error || 'Failed to update turf.');
        }
      });
    } else {
      this.turfService.createTurf(payload).subscribe({
        next: (res) => {
          this.saving = false;
          this.alert.success('Turf Created!', 'Your arena has been added and published.');
          this.closeModal();
          this.loadTurfs();
        },
        error: (err) => {
          this.saving = false;
          this.alert.error('Creation Failed', err.error?.error || 'Failed to create turf.');
        }
      });
    }
  }

  async onDeleteTurf(turf: Turf): Promise<void> {
    const confirm = await this.alert.confirm(
      `Delete "${turf.name}"?`,
      'This will delete the turf and all associated slots. Note: If upcoming approved bookings exist, deletion will be blocked by system rules.',
      'Yes, Delete',
      '#ef4444'
    );
    if (!confirm) return;

    this.turfService.deleteTurf(turf.id).subscribe({
      next: (res) => {
        this.alert.success('Turf Deleted', res.message);
        this.loadTurfs();
      },
      error: (err) => {
        this.alert.error('Deletion Blocked', err.error?.error || 'Could not delete turf.');
      }
    });
  }
}
