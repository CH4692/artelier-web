import { computed, Injectable, signal } from '@angular/core';

import type { components } from '../api/generated/schema';

export type SessionUser = Required<components['schemas']['UserRead']>;
export type UserRole = SessionUser['role'];
type Session =
  | { status: 'loading'; user: null }
  | { status: 'unauthenticated'; user: null }
  | { status: 'authenticated'; user: SessionUser };

/** In-memory metadata only. The server alone owns the session cookie. */
@Injectable({ providedIn: 'root' })
export class SessionState {
  private readonly session = signal<Session>({ status: 'loading', user: null });
  readonly status = computed(() => this.session().status);
  readonly user = computed(() => this.session().user);
  readonly workshopAccess = computed(() => this.hasRole(['admin', 'employee']));
  readonly restorationFailed = signal(false);
  private generation = 0;

  get revision() {
    return this.generation;
  }

  hasRole(roles: readonly UserRole[]): boolean {
    const user = this.user();
    return !!user?.is_active && roles.includes(user.role);
  }

  authenticate(user: SessionUser) {
    this.generation++;
    this.restorationFailed.set(false);
    this.session.set(
      user.is_active
        ? { status: 'authenticated', user }
        : { status: 'unauthenticated', user: null },
    );
  }

  clear() {
    this.generation++;
    this.session.set({ status: 'unauthenticated', user: null });
  }
}
