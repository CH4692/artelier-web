import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
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
  const safe = ['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  return next(
    request.clone({
      withCredentials: true,
      ...(!safe ? { setHeaders: { 'X-CSRF-Protection': '1' } } : {}),
    }),
  );
};
