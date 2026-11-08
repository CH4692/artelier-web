import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './auth.service';
import { UserRole } from './session-state';
import { safeReturnUrl } from './return-url';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restore().pipe(
    map(() => {
      if (auth.session.status() !== 'authenticated') {
        return router.createUrlTree(['/login'], {
          queryParams: { returnUrl: safeReturnUrl(state.url) },
        });
      }
      const roles = route.data['roles'] as readonly UserRole[] | undefined;
      return !roles || auth.session.hasRole(roles) || router.createUrlTree(['/access-denied']);
    }),
  );
};

export const loginGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.restore().pipe(
    map(() => {
      if (auth.session.status() !== 'authenticated') return true;
      if (!auth.session.workshopAccess()) return router.createUrlTree(['/access-denied']);
      const returnUrl = router.parseUrl(state.url).queryParams['returnUrl'] as string | undefined;
      return router.parseUrl(safeReturnUrl(returnUrl ?? null));
    }),
  );
};
