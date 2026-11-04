import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn) {
    return true;
  }

  router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn && auth.isAdmin) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const ownerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn && auth.isOwner) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const approvedOwnerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn && auth.isApprovedOwner) {
    return true;
  }

  // Redirect to owner dashboard where approval status and notice is shown
  router.navigate(['/owner/dashboard']);
  return false;
};

export const playerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn && auth.isPlayer) {
    return true;
  }

  router.navigate(['/auth/login']);
  return false;
};

export const playerOrGuestGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    return true; // Unauthenticated guest can explore for registration
  }
  if (auth.isPlayer) {
    return true; // Players can explore
  }
  if (auth.isAdmin) {
    router.navigate(['/admin/dashboard']);
    return false;
  }
  if (auth.isOwner) {
    router.navigate(['/owner/dashboard']);
    return false;
  }
  return true;
};
