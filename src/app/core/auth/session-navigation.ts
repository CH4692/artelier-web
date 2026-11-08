import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { safeReturnUrl } from './return-url';

@Injectable({ providedIn: 'root' })
export class SessionNavigation {
  private readonly router = inject(Router);
  private redirecting = false;

  redirect(status: 401 | 403) {
    if (this.redirecting) return;
    const target = status === 401 ? '/login' : '/access-denied';
    if (this.router.url.split('?')[0] === target) return;
    this.redirecting = true;
    const returnUrl = safeReturnUrl(this.router.url);
    void this.router
      .navigate([target], {
        replaceUrl: true,
        ...(status === 401 ? { queryParams: { returnUrl, reason: 'session-expired' } } : {}),
      })
      .catch(() => false)
      .finally(() => {
        this.redirecting = false;
      });
  }
}
