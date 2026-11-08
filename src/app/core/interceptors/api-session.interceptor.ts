import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SKIP_AUTH_REDIRECT } from '../auth/auth-context';
import { SessionState } from '../auth/session-state';
import { SessionNavigation } from '../auth/session-navigation';
import { API_BASE_URL } from '../api/api.config';

/** Preserve the backend's HttpOnly session and custom-header CSRF contract. */
export const apiSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const base = new URL(inject(API_BASE_URL), globalThis.location.origin);
  const target = new URL(request.url, globalThis.location.origin);
  const basePath = base.pathname.replace(/\/$/, '');
  if (
    target.origin !== base.origin ||
    !(target.pathname === basePath || target.pathname.startsWith(`${basePath}/`))
  ) {
    return next(request);
  }
  const session = inject(SessionState);
  const navigation = inject(SessionNavigation);
  const revision = session.revision;
  const authEndpoint = target.pathname.startsWith(`${basePath}/auth/`);
  const safe = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  return next(
    request.clone({
      withCredentials: true,
      ...(!safe ? { setHeaders: { 'X-CSRF-Protection': '1' } } : {}),
    }),
  ).pipe(
    catchError((error: unknown) => {
      if (
        !authEndpoint &&
        !request.context.get(SKIP_AUTH_REDIRECT) &&
        error instanceof HttpErrorResponse &&
        session.revision === revision &&
        session.status() === 'authenticated'
      ) {
        if (error.status === 401) {
          session.clear();
          navigation.redirect(401);
        } else if (error.status === 403) {
          navigation.redirect(403);
        }
      }
      return throwError(() => error);
    }),
  );
};
