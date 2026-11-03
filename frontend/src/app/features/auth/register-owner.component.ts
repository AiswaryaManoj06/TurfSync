import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { Country, State, City } from '../../core/models/models';

function passwordValidator(control: AbstractControl) {
  const val = control.value || '';
  if (!val) return null;
  const hasUpper = /[A-Z]/.test(val);
  const hasLower = /[a-z]/.test(val);
  const hasNumber = /[0-9]/.test(val);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
  const isLongEnough = val.length >= 8;
  const valid = hasUpper && hasLower && hasNumber && hasSpecial && isLongEnough;
  return valid ? null : { passwordComplexity: true };
}

function age18Validator(control: AbstractControl) {
  if (!control.value) return null;
  const dob = new Date(control.value);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18 ? null : { under18: true };
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

function gstValidator(control: AbstractControl) {
  const val = (control.value || '').trim();
  if (!val) return null; // Optional: empty string is valid

  // Disallow any special characters or whitespace
  if (/[^a-zA-Z0-9]/.test(val)) {
    return { specialChar: true };
  }

  // Strict 15-character GSTIN regex:
  // 2 digits (State Code) + 5 letters + 4 digits + 1 letter (PAN) + 1 entity char + 'Z' + 1 checksum char
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
  if (!gstRegex.test(val)) {
    return { invalidGst: true };
  }

  return null;
}

@Component({
  selector: 'app-register-owner',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="reg-page-wrapper">
      <div class="reg-card">
        <div class="reg-header">
          <div class="icon-circle">
            <i class="bi bi-building-fill-check"></i>
          </div>
          <h2>Turf Owner Registration</h2>
          <p class="subtitle">Join TurfSync to list your sports arenas and receive player bookings.</p>
        </div>

        <form [formGroup]="ownerForm" (ngSubmit)="onSubmit()" class="reg-form">
          <!-- 1. Owner & Brand Information -->
          <div class="form-section">
            <h3 class="section-title"><i class="bi bi-person-lines-fill"></i> 1. Basic & Brand Details</h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Full Name <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="full_name"
                  class="form-control"
                  placeholder="e.g. Vikram Malhotra (letters & spaces only)"
                  [class.is-invalid]="(f['full_name'].errors?.['pattern'] && (f['full_name'].dirty || f['full_name'].touched)) || (f['full_name'].touched && f['full_name'].invalid)"
                />
                <div class="warning-feedback" *ngIf="f['full_name'].errors?.['pattern'] && (f['full_name'].dirty || f['full_name'].touched)">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Special characters and numbers are not allowed. Please enter letters and spaces only.</span>
                </div>
                <div class="invalid-feedback" *ngIf="f['full_name'].errors?.['required'] && (f['full_name'].touched || submitted)">
                  Full name is required.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Brand / Business Name <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="brand_name"
                  class="form-control"
                  placeholder="e.g. Apex Sports Arena"
                  [class.is-invalid]="f['brand_name'].touched && f['brand_name'].invalid"
                />
                <div class="invalid-feedback" *ngIf="f['brand_name'].touched && f['brand_name'].invalid">
                  Brand name is required.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Address <span class="required">*</span></label>
                <input
                  type="email"
                  formControlName="email"
                  class="form-control"
                  placeholder="owner@domain.com"
                  [class.is-invalid]="f['email'].errors?.['duplicate'] || (f['email'].dirty && (f['email'].errors?.['invalidEmail'] || f['email'].errors?.['invalidTld'] || f['email'].errors?.['email'])) || (f['email'].touched && f['email'].invalid)"
                />
                <div class="warning-feedback" *ngIf="f['email'].errors?.['duplicate']">
                  <i class="bi bi-exclamation-octagon-fill"></i>
                  <span>This email address is already registered. Please use a different email or log in.</span>
                </div>
                <div class="warning-feedback" *ngIf="!f['email'].errors?.['duplicate'] && f['email'].dirty && f['email'].errors?.['invalidTld']">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Please enter a valid domain extension (e.g., .com, .in, .org, .net, .co, .io).</span>
                </div>
                <div class="warning-feedback" *ngIf="!f['email'].errors?.['duplicate'] && f['email'].dirty && f['email'].errors?.['invalidEmail'] && !f['email'].errors?.['invalidTld']">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Please enter a complete and valid email address (e.g., owner@domain.com).</span>
                </div>
                <div class="invalid-feedback" *ngIf="!f['email'].errors?.['duplicate'] && f['email'].errors?.['required'] && (f['email'].touched || submitted)">
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
                  [class.is-invalid]="f['mobile'].errors?.['duplicate'] || (f['mobile'].dirty && f['mobile'].errors?.['pattern'] && f['mobile'].value) || (f['mobile'].touched && f['mobile'].invalid)"
                />
                <div class="warning-feedback" *ngIf="f['mobile'].errors?.['duplicate']">
                  <i class="bi bi-exclamation-octagon-fill"></i>
                  <span>This mobile number is already registered. Mobile number must be unique for each user.</span>
                </div>
                <div class="warning-feedback" *ngIf="!f['mobile'].errors?.['duplicate'] && f['mobile'].dirty && f['mobile'].errors?.['pattern'] && f['mobile'].value">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Mobile number must contain exactly 10 digits (no letters or special characters).</span>
                </div>
                <div class="invalid-feedback" *ngIf="!f['mobile'].errors?.['duplicate'] && f['mobile'].errors?.['required'] && (f['mobile'].touched || submitted)">
                  Mobile number is required.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Date of Birth (Age 18+) <span class="required">*</span></label>
                <input
                  type="date"
                  formControlName="date_of_birth"
                  class="form-control"
                  [class.is-invalid]="f['date_of_birth'].touched && f['date_of_birth'].invalid"
                />
                <div class="invalid-feedback" *ngIf="f['date_of_birth'].touched && f['date_of_birth'].invalid">
                  You must be at least 18 years of age.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">GST Number (Optional, 15 Chars)</label>
                <input
                  type="text"
                  formControlName="gst_number"
                  class="form-control text-uppercase"
                  placeholder="27ABCDE1234F1Z5"
                  maxlength="15"
                  [class.is-invalid]="(f['gst_number'].dirty && f['gst_number'].invalid && f['gst_number'].value) || (f['gst_number'].touched && f['gst_number'].invalid && f['gst_number'].value)"
                />
                <!-- Immediate warning for special characters -->
                <div class="warning-feedback" *ngIf="f['gst_number'].dirty && f['gst_number'].errors?.['specialChar'] && f['gst_number'].value">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Special characters are not allowed in GST number. Enter letters and digits only.</span>
                </div>
                <!-- Immediate warning for invalid GST format -->
                <div class="warning-feedback" *ngIf="f['gst_number'].dirty && f['gst_number'].errors?.['invalidGst'] && !f['gst_number'].errors?.['specialChar'] && f['gst_number'].value">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                  <span>Invalid GST format (must be 15 alphanumeric characters: 2 state digits + 10-char PAN + 1 entity code + Z + 1 checksum, e.g. 27ABCDE1234F1Z5).</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Banking Details -->
          <div class="form-section">
            <h3 class="section-title"><i class="bi bi-bank2"></i> 2. Bank Account Details</h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Bank Account Number <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="bank_account_number"
                  class="form-control"
                  placeholder="9 to 18 digit account number"
                  maxlength="18"
                  [class.is-invalid]="f['bank_account_number'].errors?.['duplicate'] || (f['bank_account_number'].touched && f['bank_account_number'].invalid)"
                />
                <div class="warning-feedback" *ngIf="f['bank_account_number'].errors?.['duplicate']">
                  <i class="bi bi-exclamation-octagon-fill"></i>
                  <span>This bank account number is already registered. Bank account must be unique for each user.</span>
                </div>
                <div class="invalid-feedback" *ngIf="!f['bank_account_number'].errors?.['duplicate'] && f['bank_account_number'].touched && f['bank_account_number'].invalid">
                  Account number must be between 9 and 18 digits.
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Bank IFSC Code <span class="required">*</span></label>
                <input
                  type="text"
                  formControlName="bank_ifsc"
                  class="form-control text-uppercase"
                  placeholder="e.g. HDFC0001234 (11 chars)"
                  maxlength="11"
                  [class.is-invalid]="f['bank_ifsc'].errors?.['duplicate'] || (f['bank_ifsc'].touched && f['bank_ifsc'].invalid)"
                />
                <div class="warning-feedback" *ngIf="f['bank_ifsc'].errors?.['duplicate']">
                  <i class="bi bi-exclamation-octagon-fill"></i>
                  <span>This bank account & IFSC code combination is already registered.</span>
                </div>
                <div class="invalid-feedback" *ngIf="!f['bank_ifsc'].errors?.['duplicate'] && f['bank_ifsc'].touched && f['bank_ifsc'].invalid">
                  Please enter a valid 11-character IFSC code (e.g. HDFC0001234).
                </div>
              </div>
            </div>
          </div>

          <!-- 3. Dependent Geography (Country -> State -> City) -->
          <div class="form-section">
            <h3 class="section-title"><i class="bi bi-geo-alt-fill"></i> 3. Location & Business Profile</h3>
            <div class="form-grid three-col">
              <div class="form-group">
                <label class="form-label">Country <span class="required">*</span></label>
                <select formControlName="country_id" class="form-select" (change)="onCountryChange()">
                  <option value="">Select Country</option>
                  <option *ngFor="let c of countries" [value]="c.id">{{ c.name }}</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">State <span class="required">*</span></label>
                <select formControlName="state_id" class="form-select" (change)="onStateChange()">
                  <option value="">Select State</option>
                  <option *ngFor="let s of filteredStates" [value]="s.id">{{ s.name }}</option>
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

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">ID Proof Type <span class="required">*</span></label>
                <select formControlName="id_proof_type" class="form-select">
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="PAN">PAN Card</option>
                  <option value="Passport">Passport</option>
                  <option value="Driving Licence">Driving Licence</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Owner Type <span class="required">*</span></label>
                <div class="radio-group">
                  <label class="radio-label">
                    <input type="radio" formControlName="owner_type" value="Individual" /> Individual
                  </label>
                  <label class="radio-label">
                    <input type="radio" formControlName="owner_type" value="Partnership" /> Partnership
                  </label>
                  <label class="radio-label">
                    <input type="radio" formControlName="owner_type" value="Company" /> Company
                  </label>
                </div>
              </div>
            </div>

            <!-- Sports Offered Checkboxes -->
            <div class="form-group mt-3">
              <label class="form-label">Sports Offered (Select at least one) <span class="required">*</span></label>
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
              <div class="invalid-feedback" *ngIf="selectedSports.length === 0 && submitted">
                Please select at least one sport.
              </div>
            </div>
          </div>

          <!-- 4. Mandatory Document Uploads -->
          <div class="form-section">
            <h3 class="section-title"><i class="bi bi-file-earmark-arrow-up-fill"></i> 4. Verification Documents</h3>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">
                  ID Proof Document (JPG/PNG/PDF, max 2MB) <span class="required">*</span>
                </label>
                <input
                  type="file"
                  (change)="onIdProofSelected($event)"
                  class="form-control"
                  accept=".jpg,.jpeg,.png,.pdf"
                />
                <small class="text-muted">Government ID proof matching selected type.</small>
              </div>

              <div class="form-group">
                <label class="form-label">
                  Business / Ownership Proof (PDF only, max 5MB) <span class="required">*</span>
                </label>
                <input
                  type="file"
                  (change)="onBusinessProofSelected($event)"
                  class="form-control"
                  accept=".pdf"
                />
                <small class="text-muted">Electricity bill, lease deed, or incorporation certificate.</small>
              </div>
            </div>
          </div>

          <!-- 5. Security & Password -->
          <div class="form-section">
            <h3 class="section-title"><i class="bi bi-key-fill"></i> 5. Set Password</h3>
            <div class="form-grid">
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
                  Password must be at least 8 chars and include uppercase, lowercase, digit, and special char.
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
                <div class="invalid-feedback" *ngIf="ownerForm.hasError('mismatch') && f['confirm_password'].touched">
                  Passwords do not match.
                </div>
              </div>
            </div>
          </div>

          <!-- Buttons -->
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="onReset()">
              <i class="bi bi-arrow-counterclockwise"></i> Reset Form
            </button>
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading">
              <span *ngIf="loading" class="spinner"></span>
              <i *ngIf="!loading" class="bi bi-check2-circle"></i>
              {{ loading ? 'Submitting Registration...' : 'Register as Turf Owner' }}
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
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 2.5rem;
      box-shadow: var(--shadow-md);
    }
    .reg-header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    .icon-circle {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: #ffffff;
      font-size: 1.6rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.25);
    }
    .reg-header h2 {
      font-size: 2rem;
      color: #0f172a;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.95rem;
      margin-top: 0.25rem;
    }
    .form-section {
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      margin-bottom: 1.75rem;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .section-title i {
      color: #10b981;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
    }
    .form-grid.three-col {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      .form-grid, .form-grid.three-col {
        grid-template-columns: 1fr;
      }
    }
    .radio-group {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      padding-top: 0.5rem;
    }
    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-top: 0.5rem;
    }
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.5rem 0.75rem;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .checkbox-label:hover {
      border-color: #10b981;
    }
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
export class RegisterOwnerComponent implements OnInit {
  ownerForm: FormGroup;
  loading = false;
  loadingCities = false;
  submitted = false;

  countries: Country[] = [];
  states: State[] = [];
  cities: City[] = [];
  filteredStates: State[] = [];
  filteredCities: City[] = [];

  availableSports = ['Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'];
  selectedSports: string[] = ['Football'];

  idProofFile: File | null = null;
  businessProofFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.ownerForm = this.fb.group(
      {
        full_name: ['', [Validators.required, Validators.pattern(/^[A-Za-z\s]+$/)]],
        brand_name: ['', Validators.required],
        email: ['', [Validators.required, strictEmailValidator]],
        mobile: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        gst_number: ['', [gstValidator]],
        bank_account_number: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
        bank_ifsc: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
        country_id: ['', Validators.required],
        state_id: ['', Validators.required],
        city_id: ['', Validators.required],
        id_proof_type: ['Aadhaar', Validators.required],
        owner_type: ['Individual', Validators.required],
        date_of_birth: ['', [Validators.required, age18Validator]],
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
    this.loadLocations();
  }

  get f() {
    return this.ownerForm.controls;
  }

  loadLocations(): void {
    this.auth.getLocations().subscribe({
      next: (res) => {
        this.countries = res.countries;
        this.states = res.states;
        this.cities = res.cities;

        // Auto select India by default if available
        if (this.countries.length > 0) {
          const india = this.countries.find((c) => c.code === 'IN') || this.countries[0];
          this.ownerForm.patchValue({ country_id: india.id });
          this.onCountryChange();
        }
      }
    });
  }

  onCountryChange(): void {
    const cId = Number(this.ownerForm.get('country_id')?.value);
    this.filteredStates = this.states.filter((s) => s.country_id === cId);
    this.ownerForm.patchValue({ state_id: '', city_id: '' });
    this.filteredCities = [];
  }

  onStateChange(): void {
    const sId = Number(this.ownerForm.get('state_id')?.value);
    if (!sId) {
      this.filteredCities = [];
      this.ownerForm.patchValue({ city_id: '' });
      return;
    }

    const selectedState = this.states.find((s) => s.id === sId);
    this.ownerForm.patchValue({ city_id: '' });
    this.loadingCities = true;

    // Dynamically fetch cities from external location API
    this.auth.getExternalCities(sId, selectedState?.name).subscribe({
      next: (res) => {
        this.filteredCities = res.cities || [];
        this.loadingCities = false;
      },
      error: () => {
        // Fallback to local database cache
        this.filteredCities = this.cities.filter((c) => c.state_id === sId);
        this.loadingCities = false;
      }
    });
  }

  isSportSelected(sport: string): boolean {
    return this.selectedSports.includes(sport);
  }

  toggleSport(sport: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.selectedSports.includes(sport)) {
        this.selectedSports.push(sport);
      }
    } else {
      this.selectedSports = this.selectedSports.filter((s) => s !== sport);
    }
  }

  onIdProofSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.alert.error('File Too Large', 'ID proof document cannot exceed 2 MB.');
        event.target.value = '';
        this.idProofFile = null;
        return;
      }
      this.idProofFile = file;
    }
  }

  onBusinessProofSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        this.alert.error('File Too Large', 'Business proof PDF cannot exceed 5 MB.');
        event.target.value = '';
        this.businessProofFile = null;
        return;
      }
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        this.alert.error('Invalid Format', 'Business proof document must be a PDF file.');
        event.target.value = '';
        this.businessProofFile = null;
        return;
      }
      this.businessProofFile = file;
    }
  }

  onReset(): void {
    this.ownerForm.reset({
      id_proof_type: 'Aadhaar',
      owner_type: 'Individual'
    });
    this.selectedSports = ['Football'];
    this.idProofFile = null;
    this.businessProofFile = null;
    this.submitted = false;
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.ownerForm.invalid) {
      this.alert.error('Incomplete Form', 'Please review all highlighted fields before submitting.');
      return;
    }

    if (this.selectedSports.length === 0) {
      this.alert.error('Sports Required', 'Please select at least one sport offered by your facility.');
      return;
    }

    if (!this.idProofFile) {
      this.alert.error('ID Proof Required', 'Please upload your ID proof document.');
      return;
    }

    if (!this.businessProofFile) {
      this.alert.error('Business Proof Required', 'Please upload your business/ownership proof document (PDF).');
      return;
    }

    this.loading = true;
    const formData = new FormData();
    const val = this.ownerForm.value;

    Object.keys(val).forEach((k) => {
      if (val[k] !== null && val[k] !== undefined) {
        formData.append(k, val[k]);
      }
    });

    this.selectedSports.forEach((sport) => {
      formData.append('sports_offered', sport);
    });

    formData.append('id_proof_file', this.idProofFile);
    formData.append('business_proof_file', this.businessProofFile);

    this.auth.registerOwner(formData).subscribe({
      next: (res) => {
        this.loading = false;
        this.alert.success(
          'Registration Submitted!',
          'Your account has been created with status Pending Approval. Platform administrators will review your documents.'
        ).then(() => {
          this.router.navigate(['/auth/login']);
        });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.error || 'Registration failed. Please check your inputs.';
        const field = err.error?.field;

        // Reset previous duplicate errors
        ['email', 'mobile', 'bank_account_number', 'bank_ifsc'].forEach((fName) => {
          const control = this.ownerForm.get(fName);
          if (control?.hasError('duplicate')) {
            const errs = { ...control.errors };
            delete errs['duplicate'];
            control.setErrors(Object.keys(errs).length ? errs : null);
          }
        });

        // Set duplicate error on specific control and mark as dirty/touched
        if (field && this.ownerForm.get(field)) {
          this.ownerForm.get(field)?.setErrors({ duplicate: true });
          this.ownerForm.get(field)?.markAsTouched();
          this.ownerForm.get(field)?.markAsDirty();
        } else {
          const lower = msg.toLowerCase();
          if (lower.includes('email')) {
            this.ownerForm.get('email')?.setErrors({ duplicate: true });
            this.ownerForm.get('email')?.markAsTouched();
            this.ownerForm.get('email')?.markAsDirty();
          } else if (lower.includes('mobile') || lower.includes('phone')) {
            this.ownerForm.get('mobile')?.setErrors({ duplicate: true });
            this.ownerForm.get('mobile')?.markAsTouched();
            this.ownerForm.get('mobile')?.markAsDirty();
          } else if (lower.includes('bank account') || lower.includes('bank details') || lower.includes('ifsc')) {
            this.ownerForm.get('bank_account_number')?.setErrors({ duplicate: true });
            this.ownerForm.get('bank_account_number')?.markAsTouched();
            this.ownerForm.get('bank_account_number')?.markAsDirty();
            if (lower.includes('ifsc')) {
              this.ownerForm.get('bank_ifsc')?.setErrors({ duplicate: true });
              this.ownerForm.get('bank_ifsc')?.markAsTouched();
              this.ownerForm.get('bank_ifsc')?.markAsDirty();
            }
          }
        }

        this.cdr.detectChanges();
        this.cdr.markForCheck();
        this.alert.error('Duplicate Found', msg);
      }
    });
  }
}
