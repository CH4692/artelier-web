import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, defer, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { SKIP_AUTH_REDIRECT } from './auth-context';
import { SessionState, SessionUser } from './session-state';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL).replace(/\/$/, '');
  readonly session = inject(SessionState);
  private restoration?: Observable<void>;
  private readonly options = { context: new HttpContext().set(SKIP_AUTH_REDIRECT, true) };

  /** Share one server validation across concurrent guards on initial navigation. */
  restore(): Observable<void> {
    if (this.session.status() !== 'loading') return of(undefined);
    if (!this.restoration) {
      const revision = this.session.revision;
      this.restoration = this.http.get<SessionUser>(`${this.base}/auth/me`, this.options).pipe(
        tap((user) => {
          if (this.session.revision === revision) this.session.authenticate(user);
        }),
        map(() => undefined),
        catchError((error: unknown) => {
          if (this.session.revision === revision) {
            this.session.clear();
            this.session.restorationFailed.set(
              !(error instanceof HttpErrorResponse && error.status === 401),
            );
          }
          return of(undefined);
        }),
        finalize(() => {
          this.restoration = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.restoration;
  }

  login(email: string, password: string): Observable<void> {
    return defer(() => {
      const revision = this.session.revision;
      return this.http
        .post<SessionUser>(`${this.base}/auth/login`, { email, password }, this.options)
        .pipe(
          tap((user) => {
            if (this.session.revision === revision) this.session.authenticate(user);
          }),
          map(() => undefined),
        );
    });
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.base}/auth/logout`, {}, this.options)
      .pipe(tap(() => this.session.clear()));
  }
}
