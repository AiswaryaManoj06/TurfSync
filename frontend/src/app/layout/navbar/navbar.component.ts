import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { User, NotificationItem } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="app-header">
      <div class="header-container">
        <!-- Brand Logo -->
        <a routerLink="/" class="brand-link">
          <div class="brand-icon">
            <i class="bi bi-geo-alt-fill"></i>
          </div>
          <div class="brand-text">
            <span class="brand-name">Turf<span class="highlight">Sync</span></span>
            <span class="brand-tag">SMART BOOKINGS</span>
          </div>
        </a>

        <!-- Middle Navigation Links -->
        <nav class="nav-links">
          <a *ngIf="currentUser?.role === 'admin'" routerLink="/admin/dashboard" routerLinkActive="active" class="nav-item">
            <i class="bi bi-shield-lock"></i> Admin Console
          </a>
          <a *ngIf="currentUser?.role === 'owner'" routerLink="/owner/dashboard" routerLinkActive="active" class="nav-item">
            <i class="bi bi-speedometer2"></i> Owner Portal
          </a>
          <a routerLink="/search" routerLinkActive="active" class="nav-item">
            <i class="bi bi-search"></i> Explore Turfs
          </a>
          <a *ngIf="currentUser?.role === 'player'" routerLink="/player/my-bookings" routerLinkActive="active" class="nav-item">
            <i class="bi bi-calendar2-check"></i> My Bookings
          </a>
        </nav>

        <!-- Right Side User Menu -->
        <div class="user-menu">
          <!-- Unauthenticated -->
          <ng-container *ngIf="!currentUser">
            <a routerLink="/login" class="btn btn-secondary btn-sm">
              <i class="bi bi-box-arrow-in-right"></i> Sign In
            </a>
            <div class="dropdown-wrapper">
              <button class="btn btn-primary btn-sm" type="button" (click)="toggleRegisterMenu($event)">
                <i class="bi bi-person-plus"></i> Register <i class="bi bi-chevron-down"></i>
              </button>
              <div class="dropdown-menu show" *ngIf="showRegisterMenu" (click)="$event.stopPropagation()">
                <a routerLink="/register/player" class="dropdown-item" (click)="showRegisterMenu = false">
                  <div class="item-icon player"><i class="bi bi-person-running"></i></div>
                  <div>
                    <div class="item-title">Join as Player</div>
                    <div class="item-sub">Discover turfs & book slots</div>
                  </div>
                </a>
                <a routerLink="/register/owner" class="dropdown-item" (click)="showRegisterMenu = false">
                  <div class="item-icon owner"><i class="bi bi-building"></i></div>
                  <div>
                    <div class="item-title">Register as Turf Owner</div>
                    <div class="item-sub">List your arenas & manage slots</div>
                  </div>
                </a>
              </div>
            </div>
          </ng-container>

          <!-- Authenticated -->
          <ng-container *ngIf="currentUser">
            <!-- Notifications Bell -->
            <div class="notifications-bell" (click)="toggleNotifications()">
              <i class="bi bi-bell"></i>
              <span class="notification-badge" *ngIf="unreadCount > 0">{{ unreadCount }}</span>
              
              <!-- Notifications Popover -->
              <div class="notifications-popover" *ngIf="showNotifications" (click)="$event.stopPropagation()">
                <div class="popover-header">
                  <span>Notifications ({{ unreadCount }} unread)</span>
                  <button class="btn-text" (click)="markAllAsRead()">Mark all read</button>
                </div>
                <div class="popover-body">
                  <div *ngIf="notifications.length === 0" class="empty-state">
                    No notifications yet.
                  </div>
                  <div *ngFor="let n of notifications" class="notification-row" [class.unread]="!n.is_read" (click)="markAsRead(n)">
                    <div class="notif-title">{{ n.title }}</div>
                    <div class="notif-msg">{{ n.message }}</div>
                    <div class="notif-time">{{ n.created_at | date:'short' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Profile Badge & Dropdown -->
            <div class="profile-pill">
              <div class="avatar" [ngClass]="currentUser.role">
                {{ getUserInitial() }}
              </div>
              <div class="user-info">
                <span class="name">{{ currentUser.full_name || currentUser.brand_name || currentUser.email }}</span>
                <span class="role-badge" [ngClass]="currentUser.role">{{ currentUser.role }}</span>
              </div>
              <button class="logout-btn" (click)="logout()" title="Logout">
                <i class="bi bi-power"></i>
              </button>
            </div>
          </ng-container>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      width: 100%;
      height: 74px;
      min-height: 74px;
      z-index: 1050;
      flex-shrink: 0;
    }

    .app-header {
      position: relative;
      width: 100%;
      height: 74px;
      min-height: 74px;
      box-sizing: border-box;

      background: #ffffff;
      border-bottom: 1px solid var(--border-color);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);

      display: flex;
      align-items: center;
    }
    .header-container {
      max-width: 1440px;
      width: 100%;
      margin: 0 auto;
      padding: 0 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }
    .brand-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      box-shadow: 0 4px 8px rgba(16, 185, 129, 0.25);
    }
    .brand-text {
      display: flex;
      flex-direction: column;
    }
    .brand-name {
      font-size: 1.35rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }
    .brand-name .highlight {
      color: #10b981;
    }
    .brand-tag {
      display: block;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: #3f75bfff;
    }
    .nav-links {
      display: flex;
      gap: 1.5rem;
    }
    .nav-item {
      font-family: var(--font-heading);
      font-size: 0.95rem;
      font-weight: 600;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .nav-item:hover, .nav-item.active {
      color: #0ddb96dc;
      background: #ecfdf5;
    }
    .user-menu {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .dropdown-wrapper {
      position: relative;
    }
    .dropdown-menu {
      display: block !important;
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 0.5rem;
      width: 260px;
      z-index: 1200;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .dropdown-item:hover {
      background: #f8fafc;
    }
    .item-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
    }
    .item-icon.player { background: #eff6ff; color: #2563eb; }
    .item-icon.owner { background: #ecfdf5; color: #059669; }
    .item-title { font-size: 0.9rem; font-weight: 600; color: #0f172a; }
    .item-sub { font-size: 0.75rem; color: #64748b; }

    .notifications-bell {
      position: relative;
      cursor: pointer;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #f1f5f9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      color: #334155;
      transition: background 0.2s ease;
    }
    .notifications-bell:hover { background: #e2e8f0; }
    .notification-badge {
      position: absolute;
      top: -2px;
      right: -2px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.7rem;
      font-weight: 700;
      border-radius: 9999px;
      padding: 1px 5px;
    }

    .notifications-popover {
      position: absolute;
      top: 45px;
      right: 0;
      width: 340px;
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 100;
      max-height: 400px;
      display: flex;
      flex-direction: column;
    }
    .popover-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 0.85rem;
    }
    .btn-text {
      background: none;
      border: none;
      color: #10b981;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .popover-body {
      overflow-y: auto;
      padding: 0.5rem;
    }
    .notification-row {
      padding: 0.6rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: background 0.15s ease;
      margin-bottom: 0.25rem;
    }
    .notification-row:hover { background: #f8fafc; }
    .notification-row.unread { background: #ecfdf5; }
    .notif-title { font-weight: 700; font-size: 0.82rem; color: #0f172a; }
    .notif-msg { font-size: 0.78rem; color: #475569; margin: 0.2rem 0; }
    .notif-time { font-size: 0.7rem; color: #94a3b8; }
    .empty-state { padding: 1.5rem; text-align: center; color: #94a3b8; font-size: 0.85rem; }

    .profile-pill {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.35rem 0.75rem;
      background: #f8fafc;
      border: 1px solid var(--border-color);
      border-radius: 9999px;
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.85rem;
      color: #ffffff;
    }
    .avatar.admin { background: #8b5cf6; }
    .avatar.owner { background: #059669; }
    .avatar.player { background: #2563eb; }
    .user-info {
      display: flex;
      flex-direction: column;
    }
    .user-info .name {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0f172a;
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .role-badge {
      font-size: 0.65rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .role-badge.admin { color: #8b5cf6; }
    .role-badge.owner { color: #059669; }
    .role-badge.player { color: #2563eb; }
    .logout-btn {
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
      transition: color 0.2s ease;
      padding: 0 0.25rem;
    }
    .logout-btn:hover { color: #ef4444; }
  `]
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  unreadCount = 0;
  notifications: NotificationItem[] = [];
  showRegisterMenu = false;
  showNotifications = false;

  private userSub!: Subscription;

  constructor(
    private auth: AuthService,
    private notifService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userSub = this.auth.currentUser$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadNotifications();
      }
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
  }

  getUserInitial(): string {
    const name = this.currentUser?.full_name || this.currentUser?.brand_name || this.currentUser?.email || 'U';
    return name.charAt(0).toUpperCase();
  }

  toggleRegisterMenu(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showRegisterMenu = !this.showRegisterMenu;
    this.showNotifications = false;
    this.cdr.detectChanges();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown-wrapper')) {
      this.showRegisterMenu = false;
    }
    if (!target.closest('.notifications-bell')) {
      this.showNotifications = false;
    }
    this.cdr.markForCheck();
  }

  toggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
    if (this.showNotifications) {
      this.loadNotifications();
    }
    this.cdr.markForCheck();
  }

  loadNotifications(): void {
    this.notifService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.notifications;
        this.unreadCount = res.unread_count;
        this.cdr.markForCheck();
      }
    });
  }

  markAsRead(n: NotificationItem): void {
    if (!n.is_read) {
      this.notifService.markAsRead(n.id).subscribe(() => {
        n.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.cdr.markForCheck();
      });
    }
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach((n) => (n.is_read = true));
      this.unreadCount = 0;
      this.cdr.markForCheck();
    });
  }

  logout(): void {
    this.auth.logout();
  }
}
