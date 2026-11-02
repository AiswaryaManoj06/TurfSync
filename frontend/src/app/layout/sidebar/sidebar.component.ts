import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="app-sidebar" *ngIf="currentUser && (currentUser.role === 'admin' || currentUser.role === 'owner')">
      <!-- Role Title Header -->
      <div class="sidebar-header">
        <span class="role-tag" [ngClass]="currentUser.role">
          <i class="bi" [ngClass]="currentUser.role === 'admin' ? 'bi-shield-lock-fill' : 'bi-building-fill'"></i>
          {{ currentUser.role === 'admin' ? 'ADMIN CONSOLE' : 'OWNER PORTAL' }}
        </span>
      </div>

      <!-- Navigation Links -->
      <nav class="sidebar-nav">
        <!-- ADMIN MENU -->
        <ng-container *ngIf="currentUser.role === 'admin'">
          <div class="nav-section-title">MANAGEMENT</div>
          <a routerLink="/admin/dashboard" routerLinkActive="active" class="side-item">
            <i class="bi bi-grid-1x2-fill"></i> Dashboard
          </a>
          <a routerLink="/admin/owners" routerLinkActive="active" class="side-item">
            <i class="bi bi-person-badge-fill"></i> Turf Owners
          </a>
          <a routerLink="/admin/audit-logs" routerLinkActive="active" class="side-item">
            <i class="bi bi-journal-text"></i> Audit Logs
          </a>
        </ng-container>

        <!-- OWNER MENU -->
        <ng-container *ngIf="currentUser.role === 'owner'">
          <div class="nav-section-title">ARENA OPERATIONS</div>
          <a routerLink="/owner/dashboard" routerLinkActive="active" class="side-item">
            <i class="bi bi-speedometer2"></i> Overview
          </a>
          <a routerLink="/owner/turfs" routerLinkActive="active" class="side-item">
            <i class="bi bi-flag-fill"></i> My Turfs
          </a>
          <a routerLink="/owner/slots" routerLinkActive="active" class="side-item">
            <i class="bi bi-calendar3"></i> Slot Management
          </a>
          <a routerLink="/owner/bookings" routerLinkActive="active" class="side-item">
            <i class="bi bi-inbox-fill"></i> Booking Requests
          </a>
        </ng-container>
      </nav>

      <!-- Account Status Badge for Owner -->
      <div class="sidebar-footer" *ngIf="currentUser.role === 'owner'">
        <div class="status-box" [ngClass]="currentUser.account_status">
          <div class="status-label">Account Status</div>
          <div class="status-val">{{ currentUser.account_status || 'Pending Approval' }}</div>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .app-sidebar {
      width: 250px;
      height: calc(100vh - 74px);
      position: sticky;
      top: 74px;
      overflow-y: auto;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      border-right: 1px solid #1e293b;
      z-index: 40;
    }
    .sidebar-header {
      padding: 1.25rem 1rem 0.75rem;
    }
    .role-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
    }
    .role-tag.admin { background: rgba(139, 92, 246, 0.15); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.3); }
    .role-tag.owner { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }

    .sidebar-nav {
      flex: 1;
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }
    .nav-section-title {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #64748b;
      margin: 0.8rem 0.5rem 0.4rem;
    }
    .side-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.7rem 0.9rem;
      border-radius: var(--radius-md);
      font-size: 0.92rem;
      font-weight: 600;
      color: #94a3b8;
      transition: all 0.2s ease;
    }
    .side-item i {
      font-size: 1.15rem;
    }
    .side-item:hover {
      background: #1e293b;
      color: #ffffff;
    }
    .side-item.active {
      background: #10b981;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid #1e293b;
    }
    .status-box {
      padding: 0.75rem;
      border-radius: var(--radius-md);
      background: #1e293b;
    }
    .status-box.Approved { border-left: 4px solid #10b981; }
    .status-box.Pending\\ Approval { border-left: 4px solid #f59e0b; }
    .status-box.Suspended, .status-box.Rejected { border-left: 4px solid #ef4444; }
    .status-label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
    .status-val { font-size: 0.85rem; font-weight: 700; color: #ffffff; margin-top: 0.15rem; }
  `]
})
export class SidebarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  private sub!: Subscription;

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.sub = this.auth.currentUser$.subscribe((u) => (this.currentUser = u));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
