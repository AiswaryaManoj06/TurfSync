import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer">
      <div class="footer-container">
        <div class="footer-brand">
          <div class="brand-text">
            Turf<span class="highlight">Sync</span>
          </div>
          <p class="tagline">The Smart Turf Booking & Comprehensive Operations Platform.</p>
        </div>
        <div class="footer-meta">
          <div class="roles-badge">
            <span class="role-pill">Admin</span>
            <span class="role-pill">Turf Owner</span>
            <span class="role-pill">Player</span>
          </div>
          <div class="copy-text">
            &copy; 2026 TurfSync System. All rights reserved. Built with PostgreSQL Direct SQL & Angular.
          </div>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      background: #0f172a;
      color: #94a3b8;
      border-top: 1px solid #1e293b;
      padding: 2rem 1.5rem;
      margin-top: auto;
    }
    .footer-container {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
    }
    .brand-text {
      font-size: 1.25rem;
      font-weight: 800;
      color: #ffffff;
    }
    .brand-text .highlight {
      color: #10b981;
    }
    .tagline {
      font-size: 0.85rem;
      color: #64748b;
      margin-top: 0.25rem;
    }
    .roles-badge {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }
    .role-pill {
      font-size: 0.72rem;
      font-weight: 700;
      background: #1e293b;
      color: #cbd5e1;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
    }
    .copy-text {
      font-size: 0.8rem;
      color: #64748b;
    }
  `]
})
export class FooterComponent {}
