import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AlertService } from '../../core/services/alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="card-header-custom">
          <div class="brand-badge">
            <i class="bi bi-shield-lock-fill"></i>
          </div>
          <h2>Welcome Back</h2>
          <p class="subtitle">Sign in to your TurfSync account to proceed.</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <div class="input-with-icon">
              <i class="bi bi-envelope"></i>
              <input
                type="email"
                formControlName="email"
                class="form-control"
                placeholder="name@domain.com"
                [class.is-invalid]="(f['email'].dirty && f['email'].invalid) || (f['email'].touched && f['email'].invalid)"
              />
            </div>
            <div class="warning-feedback" *ngIf="f['email'].dirty && f['email'].invalid">
              <i class="bi bi-exclamation-triangle-fill"></i>
              <span>Please enter a valid email address (e.g. name@domain.com).</span>
            </div>
            <div class="invalid-feedback" *ngIf="f['email'].touched && f['email'].errors?.['required']">
              Email address is required.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Password <span class="required">*</span></label>
            <div class="input-with-icon">
              <i class="bi bi-lock"></i>
              <input
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                class="form-control"
                placeholder="••••••••"
                [class.is-invalid]="f['password'].touched && f['password'].invalid"
              />
              <button type="button" class="toggle-pw-btn" (click)="showPassword = !showPassword">
                <i class="bi" [ngClass]="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
              </button>
            </div>
            <div class="invalid-feedback" *ngIf="f['password'].touched && f['password'].invalid">
              Password is required.
            </div>
          </div>

          <button type="submit" class="btn btn-primary btn-block" [disabled]="loginForm.invalid || loading">
            <span *ngIf="loading" class="spinner"></span>
            <i *ngIf="!loading" class="bi bi-box-arrow-in-right"></i>
            {{ loading ? 'Signing In...' : 'Sign In' }}
          </button>
        </form>

        <!-- Fast Test Login Presets -->
        <div class="presets-section">
          <div class="divider"><span>DEMO CREDENTIALS PRESETS</span></div>
          <div class="preset-buttons">
            <button type="button" class="preset-btn admin" (click)="quickLogin('admin@turfsync.com', 'Admin@123')">
              <i class="bi bi-shield-fill"></i> Admin
            </button>
            <button type="button" class="preset-btn owner" (click)="quickLogin('owner@turfsync.com', 'Owner@123')">
              <i class="bi bi-building"></i> Turf Owner
            </button>
            <button type="button" class="preset-btn player" (click)="quickLogin('player@turfsync.com', 'Player@123')">
              <i class="bi bi-person-running"></i> Player
            </button>
          </div>
        </div>

        <div class="auth-footer-links">
          <span>Need an account?</span>
          <a routerLink="/auth/register/player" class="auth-link">Join as Player</a>
          <span class="dot">•</span>
          <a routerLink="/auth/register/owner" class="auth-link">Register Turf</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      min-height: calc(100vh - 140px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background: radial-gradient(circle at top, #f1f5f9 0%, #e2e8f0 100%);
    }
    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-xl);
      padding: 2.5rem 2rem;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
    }
    .card-header-custom {
      text-align: center;
      margin-bottom: 2rem;
    }
    .brand-badge {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: #ffffff;
      font-size: 1.5rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.25);
    }
    .card-header-custom h2 {
      font-size: 1.75rem;
      color: #0f172a;
    }
    .subtitle {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    .input-with-icon {
      position: relative;
    }
    .input-with-icon i:first-child {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .input-with-icon .form-control {
      padding-left: 2.5rem;
      padding-right: 2.5rem;
    }
    .toggle-pw-btn {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
    }
    .btn-block {
      width: 100%;
      margin-top: 0.5rem;
      padding: 0.75rem;
      font-size: 1rem;
    }
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #ffffff;
      border-bottom-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: rotation 1s linear infinite;
    }
    @keyframes rotation {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .presets-section {
      margin-top: 1.75rem;
    }
    .divider {
      text-align: center;
      position: relative;
      margin-bottom: 1rem;
    }
    .divider::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      width: 100%;
      height: 1px;
      background: #e2e8f0;
    }
    .divider span {
      position: relative;
      background: #ffffff;
      padding: 0 0.75rem;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #94a3b8;
    }
    .preset-buttons {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
    }
    .preset-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.3rem;
      padding: 0.6rem 0.4rem;
      font-size: 0.75rem;
      font-weight: 700;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-color);
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .preset-btn i { font-size: 1rem; }
    .preset-btn.admin { color: #8b5cf6; }
    .preset-btn.owner { color: #059669; }
    .preset-btn.player { color: #2563eb; }
    .preset-btn:hover {
      background: #ffffff;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transform: translateY(-1px);
    }
    .auth-footer-links {
      margin-top: 1.5rem;
      text-align: center;
      font-size: 0.85rem;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
    }
    .auth-link {
      color: #10b981;
      font-weight: 600;
    }
    .auth-link:hover { text-decoration: underline; }
    .dot { color: #cbd5e1; }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  get f() {
    return this.loginForm.controls;
  }

  quickLogin(email: string, pw: string): void {
    this.loginForm.patchValue({ email, password: pw });
    this.loginForm.markAsDirty();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.auth.login(this.loginForm.value).subscribe({
      next: (res) => {
        this.loading = false;
        this.alert.success('Signed in successfully!', `Welcome, ${res.user.full_name || res.user.email}`);

        // Redirect based on role
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else if (res.user.role === 'owner') {
          this.router.navigate(['/owner/dashboard']);
        } else {
          const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/player/search';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.error || 'Invalid credentials. Please verify your email and password.';
        this.alert.error('Sign In Failed', msg);
      }
    });
  }
}
