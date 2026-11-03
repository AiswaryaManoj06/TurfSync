import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TurfService } from '../../../core/services/turf.service';
import { SlotService } from '../../../core/services/slot.service';
import { AlertService } from '../../../core/services/alert.service';
import { Turf, Slot } from '../../../core/models/models';

@Component({
  selector: 'app-owner-slots',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="turf-container">
      <div class="page-header">
        <div>
          <h1 class="page-title">Slot Generator & Schedule</h1>
          <p class="page-sub">Create bookable slot intervals, setup recurring generation (Daily/Weekly), and manage blocked maintenance hours.</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="openGeneratorModal()">
            <i class="bi bi-calendar-plus"></i> Generate Slots
          </button>
        </div>
      </div>

      <!-- Turf Selector Bar & Filters -->
      <div class="filters-card mb-4">
        <div class="filter-row">
          <div class="filter-item main-turf-select">
            <label class="filter-label">Select Sports Arena <span class="required">*</span></label>
            <select [(ngModel)]="selectedTurfId" (change)="onTurfSelected()" class="form-select">
              <option *ngFor="let t of turfs" [value]="t.id">{{ t.name }} ({{ t.sport }})</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Filter by Date</label>
            <input type="date" [(ngModel)]="selectedDate" (change)="loadSlots()" class="form-control" />
          </div>

          <div class="filter-item">
            <label class="filter-label">Slot Status</label>
            <select [(ngModel)]="statusFilter" (change)="loadSlots()" class="form-select">
              <option value="All">All Slots</option>
              <option value="Open">Open</option>
              <option value="Requested">Requested</option>
              <option value="Booked">Booked</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>

          <div class="filter-btn-group">
            <button class="btn btn-secondary btn-sm" (click)="setTodayDate()">Today</button>
            <button class="btn btn-primary btn-sm" (click)="loadSlots()">Refresh</button>
          </div>
        </div>
      </div>

      <!-- Slot State Legend -->
      <div class="legend-card mb-4">
        <div class="legend-title">SLOT STATUS LEGEND:</div>
        <div class="legend-items">
          <div class="legend-pill slot-badge-open">
            <i class="bi bi-circle-fill"></i> Open (Available for Players)
          </div>
          <div class="legend-pill slot-badge-requested">
            <i class="bi bi-hourglass-split"></i> Requested (Pending Approval)
          </div>
          <div class="legend-pill slot-badge-booked">
            <i class="bi bi-check-circle-fill"></i> Booked (Confirmed)
          </div>
          <div class="legend-pill slot-badge-blocked">
            <i class="bi bi-slash-circle-fill"></i> Blocked (Maintenance / Event)
          </div>
        </div>
      </div>

      <!-- Slots Visual Timeline / Grid -->
      <div *ngIf="loading" class="text-center py-5">
        <div class="spinner"></div> Loading schedule...
      </div>

      <div *ngIf="!loading && slots.length === 0" class="empty-slots-card">
        <i class="bi bi-calendar-x"></i>
        <h3>No Slots Found for This Date</h3>
        <p>No slots have been created for {{ selectedDate | date:'fullDate' }}. Use the slot generator to build intervals.</p>
        <button class="btn btn-primary" (click)="openGeneratorModal()">
          <i class="bi bi-plus-lg"></i> Generate Slots Now
        </button>
      </div>

      <div class="slots-grid" *ngIf="!loading && slots.length > 0">
        <div *ngFor="let s of slots" class="slot-tile" [ngClass]="'tile-' + s.status.toLowerCase()">
          <div class="slot-time-header">
            <span class="slot-time">{{ s.start_time.slice(0, 5) }} - {{ s.end_time.slice(0, 5) }}</span>
            <span class="peak-badge" *ngIf="s.is_peak_hour" title="Peak Hour Slot">
              <i class="bi bi-lightning-charge-fill"></i> Peak
            </span>
          </div>

          <div class="slot-details">
            <div class="duration-badge"><i class="bi bi-stopwatch"></i> {{ s.duration_minutes }} min</div>
            <div class="slot-price">₹{{ s.effective_price }}</div>
          </div>

          <div class="slot-status-row">
            <span class="badge" [ngClass]="'badge-' + s.status.toLowerCase()">{{ s.status }}</span>
            <span *ngIf="s.block_reason" class="block-reason-text" [title]="s.block_reason">
              {{ s.block_reason }}
            </span>
          </div>

          <!-- Slot Management Actions -->
          <div class="slot-tile-actions">
            <!-- If Open -> Can Block or Delete -->
            <button
              *ngIf="s.status === 'Open'"
              class="btn-icon"
              (click)="openBlockModal(s)"
              title="Block Slot (Maintenance/Event)"
            >
              <i class="bi bi-slash-circle"></i>
            </button>

            <!-- If Blocked -> Can Unblock -->
            <button
              *ngIf="s.status === 'Blocked'"
              class="btn-icon unblock"
              (click)="onUnblockSlot(s)"
              title="Unblock Slot"
            >
              <i class="bi bi-arrow-repeat"></i>
            </button>

            <!-- Delete Slot -->
            <button
              *ngIf="s.status !== 'Booked'"
              class="btn-icon delete"
              (click)="onDeleteSlot(s)"
              title="Delete Slot"
            >
              <i class="bi bi-trash"></i>
            </button>

            <span *ngIf="s.status === 'Booked'" class="locked-hint">
              <i class="bi bi-lock-fill"></i> Locked
            </span>
          </div>
        </div>
      </div>

      <!-- SLOT GENERATOR MODAL -->
      <div class="modal-overlay" *ngIf="showGeneratorModal">
        <div class="modal-dialog modal-lg">
          <div class="modal-header">
            <h2>Generate Slots Schedule</h2>
            <button class="close-btn" type="button" (click)="closeGeneratorModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>

          <form [formGroup]="genForm" (ngSubmit)="onGenerateSlots()" class="modal-form">
            <div class="form-grid">
              <div class="form-group full">
                <label class="form-label">Target Turf Arena <span class="required">*</span></label>
                <select formControlName="turf_id" class="form-select">
                  <option *ngFor="let t of turfs" [value]="t.id">
                    {{ t.name }} (Hours: {{ t.opening_time.slice(0, 5) }} - {{ t.closing_time.slice(0, 5) }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Slot Duration <span class="required">*</span></label>
                <select formControlName="duration_minutes" class="form-select">
                  <option [value]="30">30 Minutes</option>
                  <option [value]="60">60 Minutes (Standard)</option>
                  <option [value]="90">90 Minutes</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Repeat Mode <span class="required">*</span></label>
                <select formControlName="repeat_type" class="form-select">
                  <option value="Does Not Repeat">Does Not Repeat (Single Date)</option>
                  <option value="Daily">Daily (Consecutive Days)</option>
                  <option value="Weekly">Weekly (Specific Days)</option>
                  <option value="Custom">Custom Range</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Start Date <span class="required">*</span></label>
                <input type="date" formControlName="start_date" class="form-control" />
              </div>

              <div class="form-group" *ngIf="genForm.get('repeat_type')?.value !== 'Does Not Repeat'">
                <label class="form-label">End Date <span class="required">*</span></label>
                <input type="date" formControlName="end_date" class="form-control" />
              </div>
            </div>

            <!-- Weekly Days Selector -->
            <div class="form-group mt-3" *ngIf="genForm.get('repeat_type')?.value === 'Weekly'">
              <label class="form-label">Select Days of Week <span class="required">*</span></label>
              <div class="days-button-group">
                <button
                  type="button"
                  *ngFor="let day of weekDays; let i = index"
                  class="day-pill"
                  [class.active]="selectedDayIndices.includes(i)"
                  (click)="toggleDayIndex(i)"
                >
                  {{ day }}
                </button>
              </div>
            </div>

            <!-- Operating Times -->
            <div class="form-grid mt-3">
              <div class="form-group">
                <label class="form-label">Start Time <span class="required">*</span></label>
                <input type="time" formControlName="start_time" class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label">End Time <span class="required">*</span></label>
                <input type="time" formControlName="end_time" class="form-control" />
              </div>

              <div class="form-group">
                <label class="form-label">Price Override / hr (Optional)</label>
                <input type="number" formControlName="price_override" class="form-control" placeholder="Leave empty for turf rate" />
              </div>

              <div class="form-group">
                <label class="form-label">Max Players Override (Optional)</label>
                <input type="number" formControlName="max_players_override" class="form-control" placeholder="Cannot exceed turf max" />
              </div>
            </div>

            <div class="checkbox-row mt-3">
              <label class="checkbox-label">
                <input type="checkbox" formControlName="is_peak_hour" />
                <span>Mark generated intervals as Peak-Hour slots</span>
              </label>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="closeGeneratorModal()">Cancel</button>
              <button type="submit" class="btn btn-primary" [disabled]="genForm.invalid || generating">
                <span *ngIf="generating" class="spinner"></span>
                <i *ngIf="!generating" class="bi bi-calendar-check"></i>
                {{ generating ? 'Generating Slots...' : 'Generate Slots' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- BLOCK SLOT MODAL -->
      <div class="modal-overlay" *ngIf="showBlockModal">
        <div class="modal-dialog">
          <div class="modal-header">
            <h2>Block Slot Interval</h2>
            <button class="close-btn" type="button" (click)="closeBlockModal()" aria-label="Close modal"><i class="bi bi-x-lg"></i></button>
          </div>

          <div class="modal-form">
            <p class="text-sm text-muted mb-3">
              Blocking slot {{ slotToBlock?.start_time?.slice(0, 5) }} - {{ slotToBlock?.end_time?.slice(0, 5) }} on {{ slotToBlock?.slot_date }}.
              Players will not be able to book this slot.
            </p>

            <div class="form-group">
              <label class="form-label">Reason for Blocking <span class="required">*</span></label>
              <input
                type="text"
                [(ngModel)]="blockReason"
                maxlength="100"
                placeholder="e.g. Grass Maintenance, Private Tournament, Public Holiday"
                class="form-control"
              />
              <small class="text-muted">Maximum 100 characters.</small>
            </div>

            <div class="modal-actions">
              <button class="btn btn-secondary" (click)="closeBlockModal()">Cancel</button>
              <button class="btn btn-danger" [disabled]="!blockReason || blocking" (click)="onConfirmBlock()">
                {{ blocking ? 'Blocking...' : 'Confirm Block' }}
              </button>
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

    .filters-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.25rem;
    }
    .filter-row { display: flex; align-items: flex-end; gap: 1rem; flex-wrap: wrap; }
    .filter-item { min-width: 170px; flex: 1; }
    .filter-item.main-turf-select { flex: 2; min-width: 250px; }
    .filter-label { font-size: 0.78rem; font-weight: 700; color: #475569; margin-bottom: 0.35rem; display: block; }
    .filter-btn-group { display: flex; gap: 0.5rem; }

    .legend-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .legend-title { font-size: 0.75rem; font-weight: 800; color: #64748b; letter-spacing: 0.05em; }
    .legend-items { display: flex; gap: 0.75rem; flex-wrap: wrap; }
    .legend-pill {
      font-size: 0.78rem;
      font-weight: 700;
      padding: 0.3rem 0.75rem;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: 1rem;
    }
    .slot-tile {
      background: #ffffff;
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      border: 1.5px solid var(--border-color);
      transition: all 0.2s ease;
    }
    .slot-tile:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-sm);
    }
    .slot-tile.tile-open { border-color: #10b981; background: #fafdfb; }
    .slot-tile.tile-requested { border-color: #f59e0b; background: #fffdfa; }
    .slot-tile.tile-booked { border-color: #3b82f6; background: #fbfdff; }
    .slot-tile.tile-blocked { border-color: #94a3b8; background: #f8fafc; opacity: 0.8; }

    .slot-time-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .slot-time { font-weight: 800; font-size: 1.05rem; color: #0f172a; font-family: var(--font-heading); }
    .peak-badge {
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      background: #fef3c7;
      color: #b45309;
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
    }
    .slot-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .duration-badge { font-size: 0.75rem; color: #64748b; font-weight: 600; }
    .slot-price { font-size: 1.1rem; font-weight: 800; color: #059669; }
    .slot-status-row { display: flex; align-items: center; justify-content: space-between; gap: 0.4rem; }
    .block-reason-text {
      font-size: 0.72rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }
    .slot-tile-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.4rem;
      padding-top: 0.5rem;
      border-top: 1px solid #f1f5f9;
      align-items: center;
    }
    .btn-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: #ffffff;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.15s ease;
    }
    .btn-icon:hover { background: #f1f5f9; color: #0f172a; }
    .btn-icon.unblock:hover { color: #10b981; border-color: #10b981; }
    .btn-icon.delete:hover { color: #ef4444; border-color: #ef4444; }
    .locked-hint { font-size: 0.75rem; color: #3b82f6; font-weight: 700; }

    .empty-slots-card {
      text-align: center;
      padding: 4rem 2rem;
      background: #ffffff;
      border: 1px dashed #cbd5e1;
      border-radius: var(--radius-xl);
    }
    .empty-slots-card i { font-size: 3rem; color: #94a3b8; margin-bottom: 1rem; display: inline-block; }
    .empty-slots-card h3 { font-size: 1.5rem; color: #0f172a; margin-bottom: 0.5rem; }
    .empty-slots-card p { color: #64748b; margin-bottom: 1.5rem; }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
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
      max-width: 650px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      position: relative;
      margin: auto 0;
    }
    .modal-dialog.modal-lg { max-width: 780px; }
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
    .days-button-group { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.35rem; }
    .day-pill {
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: #f8fafc;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
    }
    .day-pill.active { background: #10b981; color: #ffffff; border-color: #10b981; }
    .checkbox-row { margin-top: 0.75rem; }
    .checkbox-label { font-size: 0.88rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }
    .spinner { width: 18px; height: 18px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class OwnerSlotsComponent implements OnInit {
  turfs: Turf[] = [];
  slots: Slot[] = [];
  loading = false;
  generating = false;
  blocking = false;

  selectedTurfId: number | null = null;
  selectedDate: string = new Date().toISOString().slice(0, 10);
  statusFilter = 'All';

  showGeneratorModal = false;
  genForm: FormGroup;
  weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  selectedDayIndices: number[] = [0, 1, 2, 3, 4, 5, 6];

  showBlockModal = false;
  slotToBlock: Slot | null = null;
  blockReason = '';

  constructor(
    private turfService: TurfService,
    private slotService: SlotService,
    private alert: AlertService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.genForm = this.fb.group({
      turf_id: ['', Validators.required],
      duration_minutes: [60, Validators.required],
      repeat_type: ['Daily', Validators.required],
      start_date: [this.selectedDate, Validators.required],
      end_date: [this.selectedDate, Validators.required],
      start_time: ['06:00', Validators.required],
      end_time: ['22:00', Validators.required],
      price_override: [''],
      max_players_override: [''],
      is_peak_hour: [false]
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const qTurfId = params['turf_id'];
      this.turfService.getTurfs({ status: 'Active' }).subscribe({
        next: (res) => {
          this.turfs = res.turfs;
          if (this.turfs.length > 0) {
            this.selectedTurfId = qTurfId ? Number(qTurfId) : this.turfs[0].id;
            this.genForm.patchValue({ turf_id: this.selectedTurfId });
            this.loadSlots();
          }
        }
      });
    });
  }

  setTodayDate(): void {
    this.selectedDate = new Date().toISOString().slice(0, 10);
    this.loadSlots();
  }

  onTurfSelected(): void {
    this.genForm.patchValue({ turf_id: this.selectedTurfId });
    this.loadSlots();
  }

  loadSlots(): void {
    if (!this.selectedTurfId) return;
    this.loading = true;
    this.slotService.getSlots(this.selectedTurfId, this.selectedDate, this.statusFilter).subscribe({
      next: (res) => {
        this.slots = res.slots;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  toggleDayIndex(idx: number): void {
    if (this.selectedDayIndices.includes(idx)) {
      this.selectedDayIndices = this.selectedDayIndices.filter((x) => x !== idx);
    } else {
      this.selectedDayIndices.push(idx);
    }
  }

  openGeneratorModal(): void {
    if (this.selectedTurfId) {
      this.genForm.patchValue({ turf_id: this.selectedTurfId });
    }
    this.showGeneratorModal = true;
  }

  closeGeneratorModal(): void {
    this.showGeneratorModal = false;
  }

  onGenerateSlots(): void {
    if (this.genForm.invalid) {
      this.alert.error('Incomplete Fields', 'Please complete all required generator fields.');
      return;
    }

    this.generating = true;
    const payload = {
      ...this.genForm.value,
      selected_days: this.selectedDayIndices
    };

    this.slotService.createSlots(payload).subscribe({
      next: (res) => {
        this.generating = false;
        this.alert.success(
          'Slots Generated!',
          `${res.message} (Skipped ${res.skipped_overlaps || 0} overlapping intervals)`
        );
        this.closeGeneratorModal();
        this.loadSlots();
      },
      error: (err) => {
        this.generating = false;
        this.alert.error('Generation Error', err.error?.error || 'Failed to generate slots.');
      }
    });
  }

  openBlockModal(slot: Slot): void {
    this.slotToBlock = slot;
    this.blockReason = 'Facility Maintenance';
    this.showBlockModal = true;
  }

  closeBlockModal(): void {
    this.showBlockModal = false;
    this.slotToBlock = null;
  }

  onConfirmBlock(): void {
    if (!this.slotToBlock || !this.blockReason.trim()) return;

    this.blocking = true;
    this.slotService.blockSlot(this.slotToBlock.id, this.blockReason.trim()).subscribe({
      next: (res) => {
        this.blocking = false;
        this.alert.success('Slot Blocked', res.message);
        this.closeBlockModal();
        this.loadSlots();
      },
      error: (err) => {
        this.blocking = false;
        this.alert.error('Cannot Block Slot', err.error?.error || 'Failed to block slot.');
      }
    });
  }

  onUnblockSlot(slot: Slot): void {
    this.slotService.unblockSlot(slot.id).subscribe({
      next: (res) => {
        this.alert.success('Slot Re-opened', res.message);
        this.loadSlots();
      },
      error: (err) => {
        this.alert.error('Error', err.error?.error || 'Failed to unblock slot.');
      }
    });
  }

  async onDeleteSlot(slot: Slot): Promise<void> {
    const confirm = await this.alert.confirm(
      'Delete Slot?',
      `Are you sure you want to remove the slot for ${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}?`,
      'Yes, Delete',
      '#ef4444'
    );
    if (!confirm) return;

    this.slotService.deleteSlot(slot.id).subscribe({
      next: (res) => {
        this.alert.success('Slot Deleted', res.message);
        this.loadSlots();
      },
      error: (err) => {
        this.alert.error('Delete Blocked', err.error?.error || 'Could not delete slot.');
      }
    });
  }
}
