import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { apiBaseUrl, isTrustedApiUrl } from '../api/api-url';
import { normalizeApiError } from '../api/api-error';

/** Normalize once, without global notifications or automatic write retries. */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isTrustedApiUrl(request.url, apiBaseUrl(inject(API_BASE_URL)))) return next(request);
  return next(request).pipe(
    catchError((error: unknown) => throwError(() => normalizeApiError(error))),
  );
};
