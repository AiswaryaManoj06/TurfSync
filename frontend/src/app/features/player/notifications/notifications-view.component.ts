import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { NotificationItem } from '../../../core/models/models';

@Component({
  selector: 'app-notifications-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notifications-page-wrapper py-4">
      <div class="container">
        <div class="d-flex flex-wrap justify-content-between align-items-center mb-4">
          <div>
            <h2 class="fw-bold text-light mb-1">Notifications & System Alerts</h2>
            <p class="text-muted mb-0">Stay informed on booking approvals, schedule updates, and account status.</p>
          </div>
          <button
            class="btn btn-outline-secondary btn-sm"
            [disabled]="unreadCount === 0"
            (click)="markAllAsRead()"
          >
            <i class="bi bi-check2-all me-1"></i> Mark All as Read
          </button>
        </div>

        <div *ngIf="loading" class="text-center py-5">
          <div class="spinner-border text-emerald" role="status"></div>
          <p class="text-muted mt-2">Loading alerts...</p>
        </div>

        <div *ngIf="!loading && notifications.length === 0" class="glass-panel text-center py-5 rounded-4">
          <i class="bi bi-bell-slash display-3 text-muted mb-3"></i>
          <h4 class="fw-bold text-light">No Notifications</h4>
          <p class="text-muted max-w-sm mx-auto mb-0">
            You're all caught up! New booking updates and activity alerts will appear here.
          </p>
        </div>

        <div *ngIf="!loading && notifications.length > 0" class="row g-3">
          <div *ngFor="let item of notifications" class="col-12">
            <div
              class="notification-card glass-panel p-3 rounded-3 d-flex justify-content-between align-items-center"
              [class.notification-unread]="!item.is_read"
            >
              <div class="d-flex align-items-center gap-3">
                <div class="notification-icon-box" [ngClass]="getIconBg(item.type)">
                  <i class="bi" [ngClass]="getIconClass(item.type)"></i>
                </div>
                <div>
                  <h6 class="fw-bold text-light mb-1">{{ item.title }}</h6>
                  <p class="text-muted small mb-1">{{ item.message }}</p>
                  <span class="text-muted font-monospace" style="font-size: 0.72rem;">
                    {{ item.created_at | date:'medium' }}
                  </span>
                </div>
              </div>

              <div>
                <button
                  *ngIf="!item.is_read"
                  class="btn btn-sm btn-outline-emerald text-nowrap"
                  (click)="markAsRead(item)"
                >
                  Mark read
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-page-wrapper {
      min-height: calc(100vh - 140px);
      background-color: var(--bg-main);
    }
    .notification-card {
      border: 1px solid var(--border-color);
      transition: all 0.2s ease;
    }
    .notification-unread {
      border-color: rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.05);
    }
    .notification-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }
  `]
})
export class NotificationsViewComponent implements OnInit {
  notifications: NotificationItem[] = [];
  unreadCount = 0;
  loading = true;

  constructor(
    private notificationService: NotificationService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.loading = true;
    this.notificationService.getNotifications().subscribe({
      next: (res) => {
        this.notifications = res.notifications || [];
        this.unreadCount = res.unread_count || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  markAsRead(item: NotificationItem): void {
    this.notificationService.markAsRead(item.id).subscribe({
      next: () => {
        item.is_read = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
      }
    });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach((n) => (n.is_read = true));
        this.unreadCount = 0;
        this.alertService.toastSuccess('All notifications marked as read.');
      }
    });
  }

  getIconClass(type: string): string {
    switch (type) {
      case 'booking_request':
        return 'bi-send-check text-warning';
      case 'booking_approved':
        return 'bi-check-circle-fill text-success';
      case 'booking_rejected':
        return 'bi-x-circle-fill text-danger';
      case 'booking_cancelled':
        return 'bi-slash-circle text-secondary';
      case 'account_approved':
        return 'bi-patch-check-fill text-success';
      case 'account_rejected':
        return 'bi-shield-x text-danger';
      default:
        return 'bi-bell-fill text-info';
    }
  }

  getIconBg(type: string): string {
    switch (type) {
      case 'booking_approved':
      case 'account_approved':
        return 'bg-success-subtle';
      case 'booking_rejected':
      case 'account_rejected':
        return 'bg-danger-subtle';
      case 'booking_request':
        return 'bg-warning-subtle';
      default:
        return 'bg-secondary-subtle';
    }
  }
}
