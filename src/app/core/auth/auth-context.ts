import { HttpContextToken } from '@angular/common/http';

/** Auth endpoints handle their own errors; public callers can opt out of redirects. */
export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);
