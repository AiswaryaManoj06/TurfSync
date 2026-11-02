import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { TurfService } from '../../../core/services/turf.service';
import { SlotService } from '../../../core/services/slot.service';
import { BookingService } from '../../../core/services/booking.service';
import { AuthService } from '../../../core/services/auth.service';
import { AlertService } from '../../../core/services/alert.service';
import { Turf, Slot, AddOnItem } from '../../../core/models/models';

interface AvailableAddOn {
  name: string;
  price: number;
  description: string;
  selected: boolean;
}

@Component({
  selector: 'app-turf-detail-view',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="turf-detail-wrapper pb-5">
      <!-- TOP NAVIGATION BAR -->
      <div class="detail-nav-bar py-3 border-bottom border-dark-subtle">
        <div class="container d-flex justify-content-between align-items-center">
          <button class="btn btn-outline-secondary btn-sm" (click)="goBack()">
            <i class="bi bi-arrow-left me-1"></i> Back to Arenas
          </button>
          <div class="d-flex align-items-center gap-2" *ngIf="turf">
            <span class="badge bg-emerald-subtle text-emerald px-3 py-2 fw-semibold">
              <i class="bi bi-shield-check me-1"></i> Verified Turf & Host
            </span>
          </div>
        </div>
      </div>

      <div class="container py-4" *ngIf="loadingTurf">
        <div class="text-center py-5">
          <div class="spinner-border text-emerald" role="status"></div>
          <p class="text-muted mt-2">Loading turf details & live slot availability...</p>
        </div>
      </div>

      <div class="container py-4" *ngIf="!loadingTurf && turf">
        <!-- HEADER HERO -->
        <div class="row g-4 mb-4">
          <div class="col-lg-8">
            <div class="turf-main-image-card glass-panel position-relative overflow-hidden">
              <img
                [src]="currentPhoto"
                alt="{{ turf.name }}"
                class="w-100 object-fit-cover rounded-3 hero-image"
              />
              <span class="badge bg-dark-glass position-absolute top-0 start-0 m-3 px-3 py-2 fs-6">
                <i class="bi bi-trophy-fill text-warning me-1"></i> {{ turf.sport }}
              </span>
              <span class="badge position-absolute top-0 end-0 m-3 px-3 py-2 fs-6" [ngClass]="turf.turf_type === 'Indoor' ? 'bg-primary' : 'bg-emerald'">
                {{ turf.turf_type }} Arena
              </span>
            </div>

            <!-- THUMBNAIL GALLERY IF MULTIPLE PHOTOS -->
            <div *ngIf="turf.photos && turf.photos.length > 1" class="d-flex gap-2 mt-2">
              <img
                *ngFor="let p of turf.photos"
                [src]="p"
                class="gallery-thumb rounded"
                [class.active-thumb]="p === currentPhoto"
                (click)="currentPhoto = p"
              />
            </div>

            <!-- TITLE & METADATA -->
            <div class="turf-info-box glass-panel mt-3 p-4">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h2 class="fw-bold mb-1">{{ turf.name }}</h2>
                  <p class="text-muted mb-2">
                    <i class="bi bi-geo-alt-fill text-danger me-1"></i>
                    {{ turf.address }}, {{ turf.landmark ? turf.landmark + ', ' : '' }}{{ turf.city_name || 'City' }} - {{ turf.pincode }}
                  </p>
                </div>
                <div class="text-end">
                  <div class="fs-4 fw-bold text-emerald">₹{{ turf.weekday_price_per_hour }}<small class="text-muted fs-6">/hr</small></div>
                  <span class="badge bg-secondary-subtle text-dark">Weekend: ₹{{ turf.weekend_price_per_hour }}/hr</span>
                </div>
              </div>

              <div class="row g-3 py-3 border-top border-bottom border-dark-subtle my-2">
                <div class="col-sm-3 col-6">
                  <span class="text-muted small d-block">Surface</span>
                  <span class="fw-semibold text-light"><i class="bi bi-grid-3x3 me-1 text-emerald"></i> {{ turf.surface }}</span>
                </div>
                <div class="col-sm-3 col-6">
                  <span class="text-muted small d-block">Dimensions</span>
                  <span class="fw-semibold text-light"><i class="bi bi-bounding-box-circles me-1 text-emerald"></i> {{ turf.size }}</span>
                </div>
                <div class="col-sm-3 col-6">
                  <span class="text-muted small d-block">Max Players</span>
                  <span class="fw-semibold text-light"><i class="bi bi-people-fill me-1 text-emerald"></i> Up to {{ turf.max_players }}</span>
                </div>
                <div class="col-sm-3 col-6">
                  <span class="text-muted small d-block">Operating Hours</span>
                  <span class="fw-semibold text-light"><i class="bi bi-clock-history me-1 text-emerald"></i> {{ turf.opening_time.slice(0, 5) }} - {{ turf.closing_time.slice(0, 5) }}</span>
                </div>
              </div>

              <!-- DESCRIPTION -->
              <div class="mt-3">
                <h6 class="fw-bold text-light mb-2">About This Arena</h6>
                <p class="text-muted">{{ turf.description || 'Professional grade playing arena equipped with quality turf fibers, proper line markings, high-lux floodlighting, and player dugouts.' }}</p>
              </div>

              <!-- AMENITIES -->
              <div class="mt-4" *ngIf="turf.amenities && turf.amenities.length > 0">
                <h6 class="fw-bold text-light mb-2">Facility Amenities</h6>
                <div class="d-flex flex-wrap gap-2">
                  <span *ngFor="let am of turf.amenities" class="badge-amenity-lg">
                    <i class="bi bi-check-circle-fill text-emerald me-1"></i> {{ am }}
                  </span>
                </div>
              </div>

              <!-- RULES & CANCELLATION -->
              <div class="row g-3 mt-3">
                <div class="col-md-6" *ngIf="turf.rules">
                  <div class="p-3 rounded-3 bg-secondary-subtle">
                    <h6 class="fw-bold text-light mb-1"><i class="bi bi-shield-exclamation me-1 text-warning"></i> Ground Rules</h6>
                    <p class="small text-muted mb-0">{{ turf.rules }}</p>
                  </div>
                </div>
                <div class="col-md-6" *ngIf="turf.cancellation_policy">
                  <div class="p-3 rounded-3 bg-secondary-subtle">
                    <h6 class="fw-bold text-light mb-1"><i class="bi bi-info-circle me-1 text-info"></i> Cancellation Policy</h6>
                    <p class="small text-muted mb-0">{{ turf.cancellation_policy }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- BOOKING & LIVE SLOT PICKER COLUMN -->
          <div class="col-lg-4">
            <div class="sticky-booking-card glass-panel p-4">
              <h4 class="fw-bold text-light mb-3">
                <i class="bi bi-calendar2-check-fill text-emerald me-2"></i>Select Slots
              </h4>

              <!-- DATE PICKER -->
              <div class="mb-3">
                <label class="form-label text-muted small fw-semibold text-uppercase">Booking Date</label>
                <input
                  type="date"
                  class="form-control"
                  [min]="minDate"
                  [max]="maxDate"
                  [(ngModel)]="selectedDate"
                  (change)="onDateChange()"
                />
              </div>

              <!-- QUICK DATE PILLS -->
              <div class="d-flex gap-2 overflow-x-auto pb-2 mb-3">
                <button
                  *ngFor="let d of quickDates"
                  class="btn btn-sm text-nowrap"
                  [ngClass]="selectedDate === d.iso ? 'btn-emerald' : 'btn-outline-secondary'"
                  (click)="setQuickDate(d.iso)"
                >
                  {{ d.label }}
                </button>
              </div>

              <!-- SLOT STATUS LEGEND -->
              <div class="d-flex gap-2 justify-content-between small text-muted mb-3 py-2 border-top border-bottom border-dark-subtle">
                <span><span class="legend-dot bg-emerald"></span> Open</span>
                <span><span class="legend-dot bg-primary"></span> Selected</span>
                <span><span class="legend-dot bg-danger"></span> Booked</span>
                <span><span class="legend-dot bg-secondary"></span> Blocked</span>
              </div>

              <!-- LIVE SLOTS GRID -->
              <div *ngIf="loadingSlots" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-emerald"></div>
                <p class="small text-muted mt-2">Loading slots...</p>
              </div>

              <div *ngIf="!loadingSlots && slots.length === 0" class="text-center py-4">
                <i class="bi bi-clock-slash text-muted fs-3 mb-2"></i>
                <p class="small text-muted mb-0">No slots created for this date yet. Try another date!</p>
              </div>

              <div *ngIf="!loadingSlots && slots.length > 0" class="slots-grid-container mb-4">
                <div class="row g-2">
                  <div *ngFor="let slot of slots" class="col-6">
                    <button
                      type="button"
                      class="slot-btn w-100 text-start"
                      [class.slot-open]="slot.status === 'Open' && !isSlotSelected(slot.id)"
                      [class.slot-selected]="isSlotSelected(slot.id)"
                      [class.slot-booked]="slot.status === 'Booked' || slot.status === 'Requested'"
                      [class.slot-blocked]="slot.status === 'Blocked' || slot.status === 'Closed'"
                      [disabled]="slot.status !== 'Open'"
                      (click)="toggleSlot(slot)"
                    >
                      <div class="d-flex justify-content-between align-items-center">
                        <span class="slot-time fw-semibold">
                          {{ slot.start_time.slice(0, 5) }} - {{ slot.end_time.slice(0, 5) }}
                        </span>
                        <i *ngIf="isSlotSelected(slot.id)" class="bi bi-check-circle-fill text-white"></i>
                      </div>
                      <div class="d-flex justify-content-between align-items-center mt-1">
                        <small class="slot-price">₹{{ slot.effective_price || turf.weekday_price_per_hour }}</small>
                        <small class="badge-status">{{ isSlotSelected(slot.id) ? 'Selected' : slot.status }}</small>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <!-- SUMMARY BOX -->
              <div *ngIf="selectedSlots.length > 0" class="booking-summary-box p-3 rounded-3 mb-3">
                <h6 class="fw-bold text-light mb-2">Selected Slots ({{ selectedSlots.length }})</h6>
                <div *ngFor="let s of selectedSlots" class="d-flex justify-content-between small text-muted mb-1">
                  <span>{{ s.start_time.slice(0, 5) }} - {{ s.end_time.slice(0, 5) }}</span>
                  <span class="text-light fw-semibold">₹{{ s.effective_price || turf.weekday_price_per_hour }}</span>
                </div>

                <!-- ADD-ONS -->
                <div class="mt-3 pt-2 border-top border-dark-subtle">
                  <span class="small fw-semibold text-uppercase text-muted d-block mb-1">Optional Add-ons</span>
                  <div *ngFor="let addon of addOnsList" class="form-check small mb-1">
                    <input
                      class="form-check-input"
                      type="checkbox"
                      [id]="'addon_' + addon.name"
                      [(ngModel)]="addon.selected"
                      (change)="recalcTotal()"
                    />
                    <label class="form-check-label d-flex justify-content-between text-muted" [for]="'addon_' + addon.name">
                      <span>{{ addon.name }}</span>
                      <span class="text-light fw-semibold">+₹{{ addon.price }}</span>
                    </label>
                  </div>
                </div>

                <!-- TOTAL CALCULATION -->
                <div class="d-flex justify-content-between align-items-center mt-3 pt-2 border-top border-dark-subtle">
                  <span class="fw-bold text-light">Total Estimated:</span>
                  <span class="fs-4 fw-bold text-emerald">₹{{ totalAmount }}</span>
                </div>
              </div>

              <!-- PROCEED BUTTON -->
              <button
                class="btn btn-emerald w-100 py-3 fw-bold"
                [disabled]="selectedSlots.length === 0"
                (click)="openRequestModal()"
              >
                <i class="bi bi-lightning-charge-fill me-1"></i>
                Request to Book ({{ selectedSlots.length }} {{ selectedSlots.length === 1 ? 'Slot' : 'Slots' }})
              </button>
              <p class="text-muted small text-center mt-2 mb-0">
                <i class="bi bi-shield-lock me-1"></i> Slots are locked once host approves your request.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- BOOKING REQUEST MODAL -->
      <div *ngIf="showRequestModal" class="modal-backdrop-custom d-flex align-items-center justify-content-center p-3">
        <div class="modal-card-custom glass-panel p-4 w-100" style="max-width: 540px;">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="fw-bold mb-0 text-light">
              <i class="bi bi-send-check text-emerald me-2"></i>Submit Booking Request
            </h5>
            <button class="btn btn-sm btn-outline-secondary" (click)="showRequestModal = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <div class="booking-recap p-3 rounded mb-3 bg-secondary-subtle">
            <div class="d-flex justify-content-between text-light fw-semibold">
              <span>{{ turf?.name }}</span>
              <span class="text-emerald">₹{{ totalAmount }}</span>
            </div>
            <div class="small text-muted mt-1">
              <i class="bi bi-calendar-event me-1"></i> {{ selectedDate }} |
              {{ selectedSlots[0].start_time.slice(0, 5) }} - {{ selectedSlots[selectedSlots.length - 1].end_time.slice(0, 5) }}
              ({{ selectedSlots.length }} consecutive slots)
            </div>
          </div>

          <form (ngSubmit)="submitBooking()">
            <!-- PLAYERS COUNT -->
            <div class="mb-3">
              <label class="form-label text-muted small fw-semibold">
                Expected Number of Players * (Max {{ turf?.max_players }})
              </label>
              <input
                type="number"
                class="form-control"
                [(ngModel)]="numberOfPlayers"
                name="numberOfPlayers"
                [min]="1"
                [max]="turf?.max_players || 22"
                required
              />
              <small class="text-danger" *ngIf="numberOfPlayers > (turf?.max_players || 22)">
                Players count cannot exceed ground capacity of {{ turf?.max_players }}.
              </small>
            </div>

            <!-- TEAM NAME -->
            <div class="mb-3">
              <label class="form-label text-muted small fw-semibold">Team / Club Name (Optional)</label>
              <input
                type="text"
                class="form-control"
                placeholder="e.g. Thunder FC, Striker Kings"
                [(ngModel)]="teamName"
                name="teamName"
              />
            </div>

            <!-- PAYMENT PREFERENCE -->
            <div class="mb-3">
              <label class="form-label text-muted small fw-semibold">Payment Preference</label>
              <div class="d-flex gap-3">
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="payPref"
                    id="payAtTurf"
                    value="Pay at Turf"
                    [(ngModel)]="paymentPreference"
                  />
                  <label class="form-check-label small" for="payAtTurf">Pay at Turf</label>
                </div>
                <div class="form-check">
                  <input
                    class="form-check-input"
                    type="radio"
                    name="payPref"
                    id="payOnline"
                    value="Pay Online After Approval"
                    [(ngModel)]="paymentPreference"
                  />
                  <label class="form-check-label small" for="payOnline">Online After Approval</label>
                </div>
              </div>
            </div>

            <!-- SPECIAL REQUESTS -->
            <div class="mb-3">
              <label class="form-label text-muted small fw-semibold">Special Match Instructions</label>
              <textarea
                class="form-control"
                rows="2"
                placeholder="Need extra bibs, ball pump, or scoreboard assistance..."
                [(ngModel)]="specialRequests"
                name="specialRequests"
              ></textarea>
            </div>

            <!-- RULES CHECKBOX -->
            <div class="form-check mb-4">
              <input
                class="form-check-input"
                type="checkbox"
                id="agreeRules"
                [(ngModel)]="rulesAccepted"
                name="rulesAccepted"
                required
              />
              <label class="form-check-label small text-muted" for="agreeRules">
                I agree to the turf ground rules, code of conduct, and cancellation policies. *
              </label>
            </div>

            <!-- SUBMIT BUTTON -->
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-outline-secondary flex-grow-1" (click)="showRequestModal = false">
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-emerald flex-grow-1 fw-bold"
                [disabled]="submitting || !rulesAccepted || numberOfPlayers > (turf?.max_players || 22) || numberOfPlayers < 1"
              >
                <span *ngIf="submitting" class="spinner-border spinner-border-sm me-1"></span>
                Confirm & Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .detail-nav-bar {
      background: var(--bg-card);
    }
    .hero-image {
      height: 380px;
      background: #0f172a;
    }
    .gallery-thumb {
      width: 70px;
      height: 50px;
      object-fit: cover;
      cursor: pointer;
      opacity: 0.6;
      border: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .gallery-thumb.active-thumb {
      opacity: 1;
      border-color: #10b981;
    }
    .turf-info-box {
      border-radius: 14px;
    }
    .sticky-booking-card {
      border-radius: 14px;
      position: sticky;
      top: 90px;
    }
    .legend-dot {
      display: inline-block;
      width: 9px;
      height: 9px;
      border-radius: 50%;
      margin-right: 4px;
    }
    .slots-grid-container {
      max-height: 290px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .slot-btn {
      padding: 0.6rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      background: rgba(255, 255, 255, 0.03);
      color: #fff;
      transition: all 0.15s ease;
    }
    .slot-open:hover {
      border-color: #10b981;
      background: rgba(16, 185, 129, 0.08);
      transform: translateY(-2px);
    }
    .slot-selected {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
      border-color: #34d399 !important;
      color: #fff !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }
    .slot-selected .slot-price, .slot-selected .badge-status {
      color: #d1fae5 !important;
    }
    .slot-booked {
      opacity: 0.45;
      cursor: not-allowed;
      border-color: #ef4444 !important;
      background: rgba(239, 68, 68, 0.05);
    }
    .slot-blocked {
      opacity: 0.35;
      cursor: not-allowed;
      border-color: #6b7280;
    }
    .slot-time {
      font-size: 0.8rem;
    }
    .slot-price {
      font-size: 0.75rem;
      color: #10b981;
      font-weight: 600;
    }
    .badge-status {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: #9ca3af;
    }
    .booking-summary-box {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
    }
    .badge-amenity-lg {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.85rem;
      font-size: 0.85rem;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-color);
      color: #e5e7eb;
    }
    .bg-dark-glass {
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
    }
    .modal-backdrop-custom {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      z-index: 1050;
    }
    .modal-card-custom {
      border-radius: 16px;
      max-height: 90vh;
      overflow-y: auto;
    }
  `]
})
export class TurfDetailViewComponent implements OnInit {
  turfId!: number;
  turf: Turf | null = null;
  loadingTurf = true;
  currentPhoto = '';

  // Slot selector state
  selectedDate = '';
  minDate = '';
  maxDate = '';
  quickDates: { label: string; iso: string }[] = [];
  slots: Slot[] = [];
  loadingSlots = false;
  selectedSlots: Slot[] = [];

  // Add-ons list
  addOnsList: AvailableAddOn[] = [
    { name: 'Match Balls & Bibs Kit', price: 200, description: '2 pro footballs/cricket balls + 2 sets of team bibs', selected: false },
    { name: 'Certified Match Referee', price: 500, description: 'Official referee for your tournament or friendly', selected: false },
    { name: 'Mineral Water Crate (24 bottles)', price: 150, description: 'Chilled hydration pack for both teams', selected: false },
    { name: 'Goalkeeper Gloves / Batting Pads', price: 150, description: 'Standard sport gear set', selected: false }
  ];

  totalAmount = 0;

  // Modal form state
  showRequestModal = false;
  numberOfPlayers = 10;
  teamName = '';
  paymentPreference: 'Pay at Turf' | 'Pay Online After Approval' = 'Pay at Turf';
  specialRequests = '';
  rulesAccepted = false;
  submitting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private turfService: TurfService,
    private slotService: SlotService,
    private bookingService: BookingService,
    private authService: AuthService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.turfId = parseInt(id, 10);
      this.setupDates();
      this.loadTurf();
    }
  }

  setupDates(): void {
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.selectedDate = this.minDate;

    // Generate up to 7 quick date tabs
    this.quickDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      let label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      if (i === 0) label = 'Today';
      if (i === 1) label = 'Tomorrow';
      this.quickDates.push({ label, iso });
    }

    const max = new Date();
    max.setDate(today.getDate() + 30);
    this.maxDate = max.toISOString().split('T')[0];
  }

  loadTurf(): void {
    this.loadingTurf = true;
    this.turfService.getTurfById(this.turfId).subscribe({
      next: (res) => {
        this.turf = res.turf;
        this.numberOfPlayers = Math.min(10, this.turf.max_players || 10);
        if (this.turf.photos && this.turf.photos.length > 0) {
          this.currentPhoto = this.turf.photos[0];
        } else {
          this.currentPhoto = this.getDefaultTurfImage(this.turf.sport);
        }
        this.loadingTurf = false;
        this.cdr.detectChanges();
        this.loadSlots();
      },
      error: () => {
        this.loadingTurf = false;
        this.cdr.detectChanges();
        this.alertService.error('Error', 'Unable to load turf details.');
      }
    });
  }

  setQuickDate(iso: string): void {
    this.selectedDate = iso;
    this.onDateChange();
  }

  onDateChange(): void {
    this.selectedSlots = [];
    this.recalcTotal();
    this.loadSlots();
  }

  loadSlots(): void {
    if (!this.turfId || !this.selectedDate) return;
    this.loadingSlots = true;
    this.slotService.getSlots(this.turfId, this.selectedDate).subscribe({
      next: (res) => {
        this.slots = res.slots || [];
        this.loadingSlots = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.slots = [];
        this.loadingSlots = false;
        this.cdr.detectChanges();
      }
    });
  }

  isSlotSelected(slotId: number): boolean {
    return this.selectedSlots.some((s) => s.id === slotId);
  }

  toggleSlot(slot: Slot): void {
    if (slot.status !== 'Open') return;

    if (this.isSlotSelected(slot.id)) {
      // Remove slot
      this.selectedSlots = this.selectedSlots.filter((s) => s.id !== slot.id);
      this.recalcTotal();
      return;
    }

    // Attempting to select a new slot: check consecutive contiguity
    if (this.selectedSlots.length > 0) {
      // Create a test list of candidates
      const testList = [...this.selectedSlots, slot];
      testList.sort((a, b) => a.start_time.localeCompare(b.start_time));

      // Verify each slot connects end_time -> start_time
      let isContiguous = true;
      for (let i = 0; i < testList.length - 1; i++) {
        if (testList[i].end_time !== testList[i + 1].start_time) {
          isContiguous = false;
          break;
        }
      }

      if (!isContiguous) {
        this.alertService.warning(
          'Contiguous Slots Required',
          'Bookings must consist of consecutive time slots. Please select slots that are directly next to each other.'
        );
        return;
      }

      this.selectedSlots = testList;
    } else {
      this.selectedSlots = [slot];
    }

    this.recalcTotal();
  }

  recalcTotal(): void {
    let base = 0;
    this.selectedSlots.forEach((s) => {
      base += Number(s.effective_price || this.turf?.weekday_price_per_hour || 0);
    });

    let addOnsSum = 0;
    this.addOnsList.forEach((a) => {
      if (a.selected) addOnsSum += a.price;
    });

    this.totalAmount = base + addOnsSum;
  }

  openRequestModal(): void {
    if (!this.authService.isLoggedIn) {
      this.alertService.info('Authentication Required', 'Please log in to submit a booking request.');
      this.router.navigate(['/login'], { queryParams: { returnUrl: `/turfs/${this.turfId}` } });
      return;
    }

    if (this.selectedSlots.length === 0) {
      this.alertService.warning('No Slots Selected', 'Please pick at least one slot to request.');
      return;
    }

    this.showRequestModal = true;
  }

  submitBooking(): void {
    if (!this.rulesAccepted) {
      this.alertService.warning('Rules Agreement Required', 'You must accept the turf rules and cancellation policies.');
      return;
    }

    if (this.numberOfPlayers > (this.turf?.max_players || 22)) {
      this.alertService.error('Exceeds Limit', `Maximum allowed players is ${this.turf?.max_players}.`);
      return;
    }

    this.submitting = true;

    const selectedAddOns: AddOnItem[] = this.addOnsList
      .filter((a) => a.selected)
      .map((a) => ({ name: a.name, price: a.price }));

    const payload = {
      turf_id: this.turfId,
      booking_date: this.selectedDate,
      slot_ids: this.selectedSlots.map((s) => s.id),
      number_of_players: this.numberOfPlayers,
      team_name: this.teamName.trim(),
      payment_preference: this.paymentPreference,
      special_requests: this.specialRequests.trim(),
      add_ons: selectedAddOns,
      rules_accepted: this.rulesAccepted
    };

    this.bookingService.createBookingRequest(payload).subscribe({
      next: (res) => {
        this.submitting = false;
        this.showRequestModal = false;
        this.alertService.success(
          'Request Submitted!',
          `Your booking request [${res.booking_reference}] has been forwarded to the turf owner for approval.`
        );
        this.router.navigate(['/player/my-bookings']);
      },
      error: (err) => {
        this.submitting = false;
        const msg = err.error?.detail || err.error?.message || 'Failed to submit booking request.';
        this.alertService.error('Booking Error', msg);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/search']);
  }

  getDefaultTurfImage(sport: string): string {
    switch (sport) {
      case 'Football':
        return 'https://images.unsplash.com/photo-1529900248061-576b288a6984?w=800&auto=format&fit=crop&q=80';
      case 'Cricket':
        return 'https://images.unsplash.com/photo-1531415074868-036b1c57e329?w=800&auto=format&fit=crop&q=80';
      case 'Badminton':
        return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&auto=format&fit=crop&q=80';
      case 'Basketball':
        return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&auto=format&fit=crop&q=80';
      default:
        return 'https://images.unsplash.com/photo-1529900248061-576b288a6984?w=800&auto=format&fit=crop&q=80';
    }
  }
}
