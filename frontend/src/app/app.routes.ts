import { Routes } from '@angular/router';
import { authGuard, adminGuard, ownerGuard, approvedOwnerGuard, playerGuard, playerOrGuestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Public Discovery & Home
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'search'
  },
  {
    path: 'search',
    canActivate: [playerOrGuestGuard],
    loadComponent: () => import('./features/player/search/player-search.component').then((m) => m.PlayerSearchComponent)
  },
  {
    path: 'turfs/:id',
    canActivate: [playerOrGuestGuard],
    loadComponent: () => import('./features/player/turf-details/turf-detail-view.component').then((m) => m.TurfDetailViewComponent)
  },

  // Authentication Routes
  {
    path: 'register',
    redirectTo: 'register/player',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register/owner',
    loadComponent: () => import('./features/auth/register-owner.component').then((m) => m.RegisterOwnerComponent)
  },
  {
    path: 'auth/register-owner',
    loadComponent: () => import('./features/auth/register-owner.component').then((m) => m.RegisterOwnerComponent)
  },
  {
    path: 'auth/register/owner',
    redirectTo: 'register/owner',
    pathMatch: 'full'
  },
  {
    path: 'register/player',
    loadComponent: () => import('./features/auth/register-player.component').then((m) => m.RegisterPlayerComponent)
  },
  {
    path: 'auth/register-player',
    loadComponent: () => import('./features/auth/register-player.component').then((m) => m.RegisterPlayerComponent)
  },
  {
    path: 'auth/register/player',
    redirectTo: 'register/player',
    pathMatch: 'full'
  },
  {
    path: 'player/search',
    redirectTo: 'search',
    pathMatch: 'full'
  },

  // Admin Portal Routes
  {
    path: 'admin',
    canActivate: [adminGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/admin/dashboard/admin-dashboard.component').then((m) => m.AdminDashboardComponent)
      },
      {
        path: 'owners',
        loadComponent: () => import('./features/admin/owners/admin-owners.component').then((m) => m.AdminOwnersComponent)
      },
      {
        path: 'verification/:id',
        loadComponent: () => import('./features/admin/verification/owner-verification-detail.component').then((m) => m.OwnerVerificationDetailComponent)
      },
      {
        path: 'owners/:id/verify',
        loadComponent: () => import('./features/admin/verification/owner-verification-detail.component').then((m) => m.OwnerVerificationDetailComponent)
      },
      {
        path: 'audit-logs',
        loadComponent: () => import('./features/admin/audit-logs/admin-audit-logs.component').then((m) => m.AdminAuditLogsComponent)
      }
    ]
  },

  // Turf Owner Portal Routes
  {
    path: 'owner',
    canActivate: [ownerGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/owner/dashboard/owner-dashboard.component').then((m) => m.OwnerDashboardComponent)
      },
      {
        path: 'turfs',
        canActivate: [approvedOwnerGuard],
        loadComponent: () => import('./features/owner/turfs/owner-turfs.component').then((m) => m.OwnerTurfsComponent)
      },
      {
        path: 'slots',
        canActivate: [approvedOwnerGuard],
        loadComponent: () => import('./features/owner/slots/owner-slots.component').then((m) => m.OwnerSlotsComponent)
      },
      {
        path: 'bookings',
        canActivate: [approvedOwnerGuard],
        loadComponent: () => import('./features/owner/bookings/owner-bookings.component').then((m) => m.OwnerBookingsComponent)
      }
    ]
  },

  // Player Portal Routes
  {
    path: 'player',
    canActivate: [playerGuard],
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/player/dashboard/player-dashboard.component').then((m) => m.PlayerDashboardComponent)
      },
      {
        path: 'my-bookings',
        loadComponent: () => import('./features/player/my-bookings/my-bookings.component').then((m) => m.MyBookingsComponent)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/player/notifications/notifications-view.component').then((m) => m.NotificationsViewComponent)
      }
    ]
  },

  // General In-App Notifications
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/player/notifications/notifications-view.component').then((m) => m.NotificationsViewComponent)
  },

  // Wildcard Fallback
  {
    path: '**',
    redirectTo: 'search'
  }
];
