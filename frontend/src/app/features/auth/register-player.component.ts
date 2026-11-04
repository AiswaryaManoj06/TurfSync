import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { State, City } from '../../core/models/models';

function passwordValidator(control: AbstractControl) {
  const val = control.value || '';
  if (!val) return null;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
  const isLongEnough = val.length >= 8;
  return hasUpper && hasLower && hasNumber && hasSpecial && isLongEnough ? null : { passwordComplexity: true };
}

function age16Validator(control: AbstractControl) {
  if (!control.value) return null;
  const dob = new Date(control.value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 16 ? null : { under16: true };
}

function strictEmailValidator(control: AbstractControl) {
  const val = (control.value || '').trim();
  if (!val) return null;

  // Strict email format: name@domain.tld
  const emailRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
  if (!emailRegex.test(val)) {
    return { invalidEmail: true };
  }

  // TLD check - must have recognized domain extension
  const parts = val.split('@');
  if (parts.length !== 2) return { invalidEmail: true };

  const domainParts = parts[1].split('.');
  if (domainParts.length < 2) return { invalidEmail: true };

  const tld = domainParts[domainParts.length - 1].toLowerCase();
  const validTlds = new Set([
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'in', 'co', 'io', 'ai', 'me', 'app', 'dev', 'tech', 'info', 'biz', 'online',
    'store', 'site', 'club', 'xyz', 'live', 'pro', 'us', 'uk', 'ca', 'au', 'de',
    'fr', 'jp', 'cn', 'ru', 'br', 'za', 'sg', 'ae', 'nz', 'ch', 'se', 'no', 'nl', 'es',
    'it', 'mx', 'tv', 'cc'
  ]);

  if (!validTlds.has(tld)) {
    return { invalidTld: true };
  }

  return null;
}

@Component({
  selector: 'app-register-player',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="reg-page-wrapper">
      <div class="reg-card">
        <div class="reg-header">
          <div class="icon-circle">
            <i class="bi bi-person-running"></i>
          </div>
          <h2>Player Registration</h2>
          <p class="subtitle">Join the sports community. Discover top turfs and book slots instantly.</p>
        </div>

        <form [formGroup]="playerForm" (ngSubmit)="onSubmit()" class="reg-form">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input
                type="text"
                formControlName="full_name"
                class="form-control"
                placeholder="e.g. Rahul Sharma (letters & spaces only)"
                [class.is-invalid]="(f['full_name'].errors?.['pattern'] && (f['full_name'].dirty || f['full_name'].touched)) || (f['full_name'].touched && f['full_name'].invalid)"
              />
              <!-- Sudden Warning Message when numbers or special characters are typed -->
              <div class="warning-feedback" *ngIf="f['full_name'].errors?.['pattern'] && (f['full_name'].dirty || f['full_name'].touched)">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>Special characters and numbers are not allowed. Please enter letters and spaces only.</span>
              </div>
              <div class="invalid-feedback" *ngIf="f['full_name'].errors?.['required'] && (f['full_name'].touched || submitted)">
                Full name is required.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input
                type="email"
                formControlName="email"
                class="form-control"
                placeholder="player@domain.com"
                [class.is-invalid]="(f['email'].dirty && (f['email'].errors?.['invalidEmail'] || f['email'].errors?.['invalidTld'] || f['email'].errors?.['email'])) || (f['email'].touched && f['email'].invalid)"
              />
              <div class="warning-feedback" *ngIf="f['email'].dirty && f['email'].errors?.['invalidTld']">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>Please enter a valid domain extension (e.g., .com, .in, .org, .net, .co, .io).</span>
              </div>
              <div class="warning-feedback" *ngIf="f['email'].dirty && f['email'].errors?.['invalidEmail'] && !f['email'].errors?.['invalidTld']">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>Please enter a complete and valid email address (e.g., player@domain.com).</span>
              </div>
              <div class="invalid-feedback" *ngIf="f['email'].errors?.['required'] && (f['email'].touched || submitted)">
                Email address is required.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Mobile Number <span class="required">*</span></label>
              <input
                type="text"
                formControlName="mobile"
                class="form-control"
                placeholder="10-digit mobile number"
                maxlength="10"
                [class.is-invalid]="(f['mobile'].dirty && f['mobile'].errors?.['pattern'] && f['mobile'].value) || (f['mobile'].touched && f['mobile'].invalid)"
              />
              <!-- Sudden Warning Message for mobile -->
              <div class="warning-feedback" *ngIf="f['mobile'].dirty && f['mobile'].errors?.['pattern'] && f['mobile'].value">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <span>Mobile number must contain exactly 10 digits (no letters or special characters).</span>
              </div>
              <div class="invalid-feedback" *ngIf="f['mobile'].errors?.['required'] && (f['mobile'].touched || submitted)">
                Mobile number is required.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Team Name (Optional, max 30 chars)</label>
              <input
                type="text"
                formControlName="team_name"
                class="form-control"
                placeholder="e.g. Thunder Strikers"
                maxlength="30"
                [class.is-invalid]="f['team_name'].touched && f['team_name'].invalid"
              />
              <div class="invalid-feedback" *ngIf="f['team_name'].touched && f['team_name'].invalid">
                Team name cannot exceed 30 characters.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Gender <span class="required">*</span></label>
              <select formControlName="gender" class="form-select">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Date of Birth (Age 16+) <span class="required">*</span></label>
              <input
                type="date"
                formControlName="date_of_birth"
                class="form-control"
                [class.is-invalid]="f['date_of_birth'].touched && f['date_of_birth'].invalid"
              />
              <div class="invalid-feedback" *ngIf="f['date_of_birth'].touched && f['date_of_birth'].invalid">
                Players must be at least 16 years of age.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label d-flex justify-content-between align-items-center">
                <span>State <span class="required">*</span></span>
                <span class="text-emerald small" *ngIf="loadingStates">
                  <span class="spinner-border spinner-border-sm me-1"></span> Loading states...
                </span>
              </label>
              <select formControlName="state_id" class="form-select" (change)="onStateChange()" [disabled]="loadingStates">
                <option value="">{{ loadingStates ? 'Loading states...' : 'Select State' }}</option>
                <option *ngFor="let s of states" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label d-flex justify-content-between align-items-center">
                <span>City <span class="required">*</span></span>
                <span class="badge bg-emerald-subtle text-emerald small" *ngIf="!loadingCities && filteredCities.length > 0">
                  <i class="bi bi-broadcast me-1"></i> {{ filteredCities.length }} cities
                </span>
                <span class="text-emerald small" *ngIf="loadingCities">
                  <span class="spinner-border spinner-border-sm me-1"></span> Fetching cities...
                </span>
              </label>
              <select formControlName="city_id" class="form-select" [disabled]="loadingCities">
                <option value="">{{ loadingCities ? 'Loading cities...' : 'Select City' }}</option>
                <option *ngFor="let ct of filteredCities" [value]="ct.id">{{ ct.name }}</option>
              </select>
            </div>
          </div>

          <!-- Preferred Sports -->
          <div class="form-group mt-3">
            <label class="form-label">Preferred Sports</label>
            <div class="checkbox-grid">
              <label *ngFor="let sport of availableSports" class="checkbox-label">
                <input
                  type="checkbox"
                  [checked]="isSportSelected(sport)"
                  (change)="toggleSport(sport, $event)"
                />
                <span>{{ sport }}</span>
              </label>
            </div>
          </div>

          <!-- Profile Photo (Optional) -->
          <div class="form-group mt-3">
            <label class="form-label">Profile Photo (Optional, JPG/PNG up to 1 MB)</label>
            <input
              type="file"
              (change)="onPhotoSelected($event)"
              class="form-control"
              accept=".jpg,.jpeg,.png"
            />
          </div>

          <!-- Password & Confirm -->
          <div class="form-grid mt-3">
            <div class="form-group">
              <label class="form-label">Password <span class="required">*</span></label>
              <input
                type="password"
                formControlName="password"
                class="form-control"
                placeholder="Min 8 chars with Upper, Lower, Number & Special"
                [class.is-invalid]="f['password'].touched && f['password'].invalid"
              />
              <div class="invalid-feedback" *ngIf="f['password'].touched && f['password'].invalid">
                Password must be at least 8 chars with uppercase, lowercase, digit, and special char.
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Confirm Password <span class="required">*</span></label>
              <input
                type="password"
                formControlName="confirm_password"
                class="form-control"
                placeholder="Re-enter password"
                [class.is-invalid]="f['confirm_password'].touched && f['confirm_password'].invalid"
              />
              <div class="invalid-feedback" *ngIf="playerForm.hasError('mismatch') && f['confirm_password'].touched">
                Passwords do not match.
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="onReset()">
              <i class="bi bi-arrow-counterclockwise"></i> Reset Form
            </button>
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading">
              <span *ngIf="loading" class="spinner"></span>
              <i *ngIf="!loading" class="bi bi-check2-circle"></i>
              {{ loading ? 'Creating Account...' : 'Register as Player' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .reg-page-wrapper {
      padding: 2.5rem 1rem;
      background: #f8fafc;
      flex: 1;
      width: 100%;
    }
    .reg-card {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: var(--shadow-md);
    }
    .reg-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .icon-circle {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #ffffff;
      font-size: 1.6rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.75rem;
      box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
    }
    .reg-header h2 { font-size: 1.85rem; color: #0f172a; }
    .subtitle { color: #64748b; font-size: 0.9rem; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    @media (max-width: 640px) {
      .form-grid { grid-template-columns: 1fr; }
    }
    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 0.65rem;
      margin-top: 0.4rem;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
    }
    .checkbox-label:hover { border-color: #2563eb; }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #ffffff;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  `]
})
export class RegisterPlayerComponent implements OnInit {
  playerForm: FormGroup;
  loading = false;
  loadingStates = false;
  loadingCities = false;
  states: State[] = [];
  cities: City[] = [];
  filteredCities: City[] = [];

  availableSports = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'];
  selectedSports: string[] = ['Football', 'Cricket'];
  profilePhoto: File | null = null;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.playerForm = this.fb.group(
      {
        full_name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
        email: ['', [Validators.required, strictEmailValidator]],
        mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        team_name: ['', [Validators.maxLength(30)]],
        gender: ['Male', Validators.required],
        date_of_birth: ['', [Validators.required, age16Validator]],
        state_id: ['', Validators.required],
        city_id: ['', Validators.required],
        password: ['', [Validators.required, passwordValidator]],
        confirm_password: ['', Validators.required]
      },
      {
        validators: (form: AbstractControl) => {
          const pw = form.get('password')?.value;
          const cpw = form.get('confirm_password')?.value;
          return pw === cpw ? null : { mismatch: true };
        }
      }
    );
  }

  ngOnInit(): void {
    this.loadingStates = true;
    this.auth.getLocations().subscribe({
      next: (res) => {
        this.states = res.states || [];
        this.cities = res.cities || [];
        this.loadingStates = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingStates = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  get f() {
    return this.playerForm.controls;
  }

  onStateChange(): void {
    const sId = Number(this.playerForm.get('state_id')?.value);
    if (!sId) {
      this.filteredCities = [];
      this.playerForm.patchValue({ city_id: '' });
      this.cdr.markForCheck();
      return;
    }

    this.playerForm.patchValue({ city_id: '' });

    // Instant local memory filter (0ms - zero delay)
    const local = this.cities.filter((c) => c.state_id === sId);
    if (local && local.length > 0) {
      this.filteredCities = local;
      this.loadingCities = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      return;
    }

    const selectedState = this.states.find((s) => s.id === sId);
    this.loadingCities = true;
    this.cdr.markForCheck();

    // Dynamically fetch cities from external location API only if not in local cache
    this.auth.getExternalCities(sId, selectedState?.name).subscribe({
      next: (res) => {
        this.filteredCities = res.cities || [];
        this.loadingCities = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      },
      error: () => {
        this.filteredCities = [];
        this.loadingCities = false;
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      }
    });
  }

  isSportSelected(sport: string): boolean {
    return this.selectedSports.includes(sport);
  }

  toggleSport(sport: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedSports.includes(sport)) this.selectedSports.push(sport);
    } else {
      this.selectedSports = this.selectedSports.filter((s) => s !== sport);
    }
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 1 * 1024 * 1024) {
        this.alert.error('File Too Large', 'Profile photo cannot exceed 1 MB.');
        event.target.value = '';
        this.profilePhoto = null;
        return;
      }
      this.profilePhoto = file;
    }
  }

  onReset(): void {
    this.submitted = false;
    this.playerForm.reset({ gender: 'Male' });
    this.selectedSports = ['Football', 'Cricket'];
    this.profilePhoto = null;
  }

  onSubmit(): void {
    this.submitted = true;
    this.playerForm.markAllAsTouched();
    if (this.playerForm.invalid) {
      this.alert.error('Incomplete Details', 'Please complete all required fields correctly.');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const val = this.playerForm.value;

    Object.keys(val).forEach((k) => {
      if (val[k] !== null && val[k] !== undefined) {
        formData.append(k, val[k]);
      }
    });

    this.selectedSports.forEach((sport) => {
      formData.append('preferred_sports', sport);
    });

    if (this.profilePhoto) {
      formData.append('profile_photo', this.profilePhoto);
    }

    this.auth.registerPlayer(formData).subscribe({
      next: (res) => {
        this.loading = false;
        this.alert.success('Welcome to TurfSync!', 'Account created successfully. Explore available turfs now!').then(() => {
          this.router.navigate(['/player/search']);
        });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.error || 'Registration failed.';
        this.alert.error('Error', msg);
      }
    });
  }
}
