import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { TurfService } from '../../../core/services/turf.service';
import { AuthService } from '../../../core/services/auth.service';
import { Turf, City, State } from '../../../core/models/models';

@Component({
  selector: 'app-player-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="search-page-wrapper">
      <!-- HERO DISCOVERY HEADER -->
      <section class="hero-search-section">
        <div class="container hero-content">
          <span class="badge-pill mb-2"><i class="bi bi-geo-alt-fill me-1"></i> Real-time Turf Availability</span>
          <h1 class="hero-title">Find & Book Your <span class="gradient-text">Perfect Ground</span></h1>
          <p class="hero-subtitle">
            Instant booking requests for verified football, cricket, badminton, and multi-sport turfs in your city.
          </p>

          <!-- QUICK SEARCH BAR -->
          <div class="search-bar-card glass-panel">
            <div class="row g-2 align-items-center">
              <div class="col-md-4">
                <div class="search-input-group">
                  <i class="bi bi-search text-muted"></i>
                  <input
                    type="text"
                    class="form-control clean-input"
                    placeholder="Search by turf name, area, landmark..."
                    [(ngModel)]="searchQuery"
                    (input)="applyFilters()"
                  />
                </div>
              </div>

              <div class="col-md-3">
                <div class="search-input-group">
                  <i class="bi bi-dribbble text-muted"></i>
                  <select class="form-select clean-input" [(ngModel)]="selectedSport" (change)="applyFilters()">
                    <option value="">All Sports</option>
                    <option *ngFor="let s of sports" [value]="s">{{ s }}</option>
                  </select>
                </div>
              </div>

              <div class="col-md-3">
                <div class="search-input-group">
                  <i class="bi bi-pin-map text-muted"></i>
                  <select class="form-select clean-input" [(ngModel)]="selectedCity" (change)="applyFilters()">
                    <option value="">All Cities</option>
                    <option *ngFor="let c of cities" [value]="c.name">{{ c.name }}</option>
                  </select>
                </div>
              </div>

              <div class="col-md-2">
                <button class="btn btn-emerald w-100 py-2 fw-semibold" (click)="resetFilters()">
                  <i class="bi bi-arrow-counterclockwise me-1"></i> Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- MAIN CONTENT SECTION -->
      <div class="container py-4">
        <div class="row g-4">
          <!-- FILTER SIDEBAR -->
          <div class="col-lg-3">
            <div class="filter-card glass-panel">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="fw-bold mb-0"><i class="bi bi-funnel me-2 text-emerald"></i>Filters</h5>
                <span class="badge bg-secondary-subtle text-dark">{{ filteredTurfs.length }} Results</span>
              </div>

              <!-- TURF TYPE -->
              <div class="filter-group mb-4">
                <label class="filter-label">Turf Environment</label>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="turfType" id="allTypes" value="" [(ngModel)]="selectedTurfType" (change)="applyFilters()">
                  <label class="form-check-label" for="allTypes">All</label>
                </div>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="turfType" id="outdoor" value="Outdoor" [(ngModel)]="selectedTurfType" (change)="applyFilters()">
                  <label class="form-check-label" for="outdoor">Outdoor</label>
                </div>
                <div class="form-check custom-radio">
                  <input class="form-check-input" type="radio" name="turfType" id="indoor" value="Indoor" [(ngModel)]="selectedTurfType" (change)="applyFilters()">
                  <label class="form-check-label" for="indoor">Indoor</label>
                </div>
              </div>

              <!-- SURFACE -->
              <div class="filter-group mb-4">
                <label class="filter-label">Surface Type</label>
                <select class="form-select form-select-sm" [(ngModel)]="selectedSurface" (change)="applyFilters()">
                  <option value="">Any Surface</option>
                  <option value="Artificial Turf">Artificial Turf</option>
                  <option value="Natural Grass">Natural Grass</option>
                  <option value="Wooden">Wooden</option>
                  <option value="Synthetic">Synthetic</option>
                </select>
              </div>

              <!-- SIZE -->
              <div class="filter-group mb-4">
                <label class="filter-label">Turf Size</label>
                <select class="form-select form-select-sm" [(ngModel)]="selectedSize" (change)="applyFilters()">
                  <option value="">Any Size</option>
                  <option value="5-a-side">5-a-side</option>
                  <option value="7-a-side">7-a-side</option>
                  <option value="9-a-side">9-a-side</option>
                  <option value="Full Size">Full Size</option>
                </select>
              </div>

              <!-- PRICE RANGE -->
              <div class="filter-group mb-4">
                <div class="d-flex justify-content-between align-items-center">
                  <label class="filter-label mb-0">Max Rate / Hr</label>
                  <span class="text-emerald fw-bold">₹{{ maxPrice }}</span>
                </div>
                <input
                  type="range"
                  class="form-range custom-range"
                  min="500"
                  max="4000"
                  step="100"
                  [(ngModel)]="maxPrice"
                  (input)="applyFilters()"
                />
              </div>

              <!-- AMENITIES -->
              <div class="filter-group mb-2">
                <label class="filter-label mb-2">Popular Amenities</label>
                <div *ngFor="let amenity of availableAmenities" class="form-check mb-1">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    [id]="'amenity_' + amenity"
                    [checked]="selectedAmenities.includes(amenity)"
                    (change)="toggleAmenity(amenity)"
                  />
                  <label class="form-check-label small" [for]="'amenity_' + amenity">{{ amenity }}</label>
                </div>
              </div>
            </div>
          </div>

          <!-- TURFS GRID -->
          <div class="col-lg-9">
            <!-- RESULTS HEADER -->
            <div class="d-flex justify-content-between align-items-center mb-3">
              <span class="text-muted small">Showing <strong>{{ filteredTurfs.length }}</strong> verified sports facilities</span>
              <div class="d-flex align-items-center gap-2">
                <span class="text-muted small">Sort by:</span>
                <select class="form-select form-select-sm w-auto" [(ngModel)]="sortBy" (change)="applyFilters()">
                  <option value="recommended">Recommended</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="name">Name (A-Z)</option>
                </select>
              </div>
            </div>

            <!-- LOADING SPINNER -->
            <div *ngIf="loading" class="text-center py-5">
              <div class="spinner-border text-emerald" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="text-muted mt-2">Loading verified arenas...</p>
            </div>

            <!-- EMPTY STATE -->
            <div *ngIf="!loading && filteredTurfs.length === 0" class="empty-state-box text-center py-5 glass-panel">
              <i class="bi bi-search display-3 text-muted mb-3"></i>
              <h4 class="fw-bold">No Turfs Found</h4>
              <p class="text-muted max-w-sm mx-auto">
                We couldn't find any grounds matching your filters. Try clearing your filters or changing your city search.
              </p>
              <button class="btn btn-outline-emerald mt-2" (click)="resetFilters()">
                Clear All Filters
              </button>
            </div>

            <!-- TURF CARDS GRID -->
            <div *ngIf="!loading && filteredTurfs.length > 0" class="row g-4">
              <div *ngFor="let turf of filteredTurfs" class="col-md-6">
                <div class="turf-card glass-panel h-100 d-flex flex-column">
                  <!-- CARD BANNER -->
                  <div class="turf-card-image position-relative">
                    <img
                      [src]="turf.photos && turf.photos.length > 0 ? turf.photos[0] : getDefaultTurfImage(turf.sport)"
                      alt="{{ turf.name }}"
                      class="card-img-top object-fit-cover"
                      style="height: 190px;"
                    />
                    <span class="badge bg-dark-glass position-absolute top-0 start-0 m-2">
                      <i class="bi bi-trophy-fill text-warning me-1"></i> {{ turf.sport }}
                    </span>
                    <span class="badge position-absolute top-0 end-0 m-2" [ngClass]="turf.turf_type === 'Indoor' ? 'bg-primary' : 'bg-emerald'">
                      {{ turf.turf_type }}
                    </span>
                    <div class="price-overlay position-absolute bottom-0 start-0 end-0 p-2 d-flex justify-content-between align-items-center">
                      <span class="badge bg-black-subtle text-white">
                        <i class="bi bi-aspect-ratio me-1"></i> {{ turf.size }}
                      </span>
                      <span class="fw-bold text-emerald fs-6 bg-dark-glass px-2 py-1 rounded">
                        ₹{{ turf.weekday_price_per_hour }}<small class="text-light fw-normal">/hr</small>
                      </span>
                    </div>
                  </div>

                  <!-- CARD BODY -->
                  <div class="card-body p-3 d-flex flex-column flex-grow-1">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                      <h5 class="fw-bold mb-0 text-truncate" title="{{ turf.name }}">{{ turf.name }}</h5>
                    </div>

                    <p class="text-muted small mb-2 text-truncate">
                      <i class="bi bi-geo-alt me-1 text-danger"></i> {{ turf.address }}, {{ turf.city_name || 'City' }}
                    </p>

                    <p class="small text-muted line-clamp-2 mb-3">
                      {{ turf.description || 'Modern athletic ground with premium turf surface and floodlights.' }}
                    </p>

                    <!-- AMENITIES PILLS -->
                    <div class="d-flex flex-wrap gap-1 mb-3">
                      <span *ngFor="let item of turf.amenities?.slice(0, 3)" class="badge-amenity">
                        {{ item }}
                      </span>
                      <span *ngIf="turf.amenities && turf.amenities.length > 3" class="badge-amenity text-muted">
                        +{{ turf.amenities.length - 3 }} more
                      </span>
                    </div>

                    <!-- FOOTER ACTIONS -->
                    <div class="mt-auto pt-2 border-top border-dark-subtle d-flex justify-content-between align-items-center">
                      <span class="small text-muted">
                        <i class="bi bi-clock me-1"></i> {{ turf.opening_time.slice(0, 5) }} - {{ turf.closing_time.slice(0, 5) }}
                      </span>
                      <button class="btn btn-sm btn-emerald fw-semibold px-3" [routerLink]="['/turfs', turf.id]">
                        View Slots <i class="bi bi-arrow-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-page-wrapper {
      min-height: calc(100vh - 140px);
      background-color: var(--bg-main);
    }
    .hero-search-section {
      background: linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.95) 100%), #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 2.75rem 0 2.25rem 0;
    }
    .hero-title {
      font-size: 2.3rem;
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 0.5rem;
    }
    .gradient-text {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .hero-subtitle {
      color: #94a3b8;
      max-width: 650px;
      font-size: 1rem;
    }
    .search-bar-card {
      margin-top: 1.5rem;
      padding: 1rem 1.25rem;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(8px);
    }
    .search-input-group {
      display: flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.16);
      border-radius: 10px;
      padding: 0.25rem 0.75rem;
    }
    .clean-input {
      background: transparent !important;
      border: none !important;
      color: #ffffff !important;
      box-shadow: none !important;
    }
    .clean-input::placeholder {
      color: #94a3b8;
    }
    .clean-input option {
      background: #0f172a;
      color: #ffffff;
    }
    .filter-card {
      padding: 1.25rem;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 85px;
      z-index: 20;
    }
    @media (max-width: 991px) {
      .filter-card {
        position: static;
        margin-bottom: 1.5rem;
      }
    }
    .filter-label {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      display: block;
    }
    .custom-range::-webkit-slider-thumb {
      background: #10b981;
    }
    .badge-pill {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 50px;
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .turf-card {
      border-radius: 14px;
      overflow: hidden;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
    }
    .turf-card:hover {
      transform: translateY(-4px);
      border-color: rgba(16, 185, 129, 0.4);
      box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.5);
    }
    .bg-dark-glass {
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
    }
    .price-overlay {
      background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%);
    }
    .badge-amenity {
      font-size: 0.72rem;
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #9ca3af;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `]
})
export class PlayerSearchComponent implements OnInit {
  allTurfs: Turf[] = [];
  filteredTurfs: Turf[] = [];
  loading = true;

  // Filter Models
  searchQuery = '';
  selectedSport = '';
  selectedCity = '';
  selectedTurfType = '';
  selectedSurface = '';
  selectedSize = '';
  maxPrice = 3000;
  sortBy = 'recommended';
  selectedAmenities: string[] = [];

  // Options
  sports = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'];
  cities: City[] = [];
  availableAmenities = ['Floodlights', 'Parking', 'Changing Room', 'Shower', 'Drinking Water', 'First Aid', 'Dugout'];

  constructor(
    private turfService: TurfService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCities();
    this.loadTurfs();
  }

  loadCities(): void {
    this.authService.getLocations().subscribe({
      next: (res) => {
        this.cities = res.cities || [];
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadTurfs(): void {
    this.loading = true;
    this.turfService.getTurfs().subscribe({
      next: (res) => {
        this.allTurfs = res.turfs || [];
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleAmenity(amenity: string): void {
    if (this.selectedAmenities.includes(amenity)) {
      this.selectedAmenities = this.selectedAmenities.filter((a) => a !== amenity);
    } else {
      this.selectedAmenities.push(amenity);
    }
    this.applyFilters();
  }

  applyFilters(): void {
    let result = [...this.allTurfs];

    // Search query
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q) ||
          (t.landmark && t.landmark.toLowerCase().includes(q)) ||
          (t.city_name && t.city_name.toLowerCase().includes(q))
      );
    }

    // Sport
    if (this.selectedSport) {
      result = result.filter((t) => t.sport === this.selectedSport);
    }

    // City
    if (this.selectedCity) {
      result = result.filter((t) => t.city_name?.toLowerCase() === this.selectedCity.toLowerCase());
    }

    // Turf Type
    if (this.selectedTurfType) {
      result = result.filter((t) => t.turf_type === this.selectedTurfType);
    }

    // Surface
    if (this.selectedSurface) {
      result = result.filter((t) => t.surface === this.selectedSurface);
    }

    // Size
    if (this.selectedSize) {
      result = result.filter((t) => t.size === this.selectedSize);
    }

    // Price
    if (this.maxPrice) {
      result = result.filter((t) => Number(t.weekday_price_per_hour) <= Number(this.maxPrice));
    }

    // Amenities
    if (this.selectedAmenities.length > 0) {
      result = result.filter((t) =>
        this.selectedAmenities.every((amenity) => t.amenities && t.amenities.includes(amenity))
      );
    }

    // Sorting
    if (this.sortBy === 'price_asc') {
      result.sort((a, b) => Number(a.weekday_price_per_hour) - Number(b.weekday_price_per_hour));
    } else if (this.sortBy === 'price_desc') {
      result.sort((a, b) => Number(b.weekday_price_per_hour) - Number(a.weekday_price_per_hour));
    } else if (this.sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    this.filteredTurfs = result;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedSport = '';
    this.selectedCity = '';
    this.selectedTurfType = '';
    this.selectedSurface = '';
    this.selectedSize = '';
    this.maxPrice = 3000;
    this.sortBy = 'recommended';
    this.selectedAmenities = [];
    this.applyFilters();
  }

  getDefaultTurfImage(sport: string): string {
    switch (sport) {
      case 'Football':
        return 'https://images.unsplash.com/photo-1529900248061-576b288a6984?w=600&auto=format&fit=crop&q=80';
      case 'Cricket':
        return 'https://images.unsplash.com/photo-1531415074868-036b1c57e329?w=600&auto=format&fit=crop&q=80';
      case 'Badminton':
        return 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&auto=format&fit=crop&q=80';
      case 'Basketball':
        return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&auto=format&fit=crop&q=80';
      case 'Tennis':
      case 'Pickleball':
        return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80';
      default:
        return 'https://images.unsplash.com/photo-1529900248061-576b288a6984?w=600&auto=format&fit=crop&q=80';
    }
  }
}
