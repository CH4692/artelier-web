import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'network'
  | 'bad-request'
  | 'unauthenticated'
  | 'forbidden'
  | 'csrf'
  | 'not-found'
  | 'conflict'
  | 'validation'
  | 'rate-limit'
  | 'server'
  | 'unknown';
export interface ApiValidationIssue {
  readonly location: readonly (string | number)[];
  readonly message: string;
}
const statusKinds: Partial<Record<number, ApiErrorKind>> = {
  400: 'bad-request',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'validation',
  429: 'rate-limit',
};
const messages: Record<ApiErrorKind, string> = {
  network:
    'Der Server ist nicht erreichbar. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  'bad-request': 'Die Anfrage konnte nicht verarbeitet werden. Bitte prüfen Sie Ihre Angaben.',
  unauthenticated: 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.',
  forbidden: 'Sie haben keine Berechtigung für diesen Vorgang.',
  csrf: 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
  'not-found': 'Der angeforderte Datensatz wurde nicht gefunden.',
  conflict:
    'Der Vorgang steht im Konflikt mit vorhandenen Daten. Bitte prüfen Sie den aktuellen Stand.',
  validation: 'Bitte prüfen Sie Ihre Angaben und die markierten Felder.',
  'rate-limit': 'Zu viele Anfragen. Bitte warten Sie und versuchen Sie es erneut.',
  server: 'Der Server ist derzeit nicht verfügbar. Bitte versuchen Sie es erneut.',
  unknown: 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.',
};
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
export function isCsrfFailure(error: HttpErrorResponse): boolean {
  // These exact, generic details are the existing backend's origin/header and HTTPS checks.
  return (
    error.status === 403 &&
    record(error.error) &&
    ['Request forbidden', 'HTTPS required'].includes(String(error.error['detail']))
  );
}
function validationIssues(body: unknown): ApiValidationIssue[] {
  if (!record(body) || !Array.isArray(body['detail'])) return [];
  return body['detail'].slice(0, 100).flatMap((item: unknown) => {
    if (
      !record(item) ||
      !Array.isArray(item['loc']) ||
      item['loc'].length > 20 ||
      !item['loc'].every((part: unknown) => typeof part === 'string' || typeof part === 'number')
    )
      return [];
    // Never retain msg, input or ctx: FastAPI can echo personal data or exception details there.
    return [
      { location: item['loc'] as (string | number)[], message: 'Bitte prüfen Sie diese Angabe.' },
    ];
  });
}
/** HttpErrorResponse compatibility preserves existing status-based consumers during migration. */
export class ApiError extends HttpErrorResponse {
  readonly kind: ApiErrorKind;
  readonly userMessage: string;
  readonly validation: readonly ApiValidationIssue[];
  constructor(error: HttpErrorResponse, kind?: ApiErrorKind) {
    super({
      status: error.status,
      statusText: error.statusText,
      url: error.url ?? undefined,
      headers: error.headers,
      error: null,
    });
    this.kind =
      kind ??
      (error.status === 0
        ? 'network'
        : isCsrfFailure(error)
          ? 'csrf'
          : (statusKinds[error.status] ?? (error.status >= 500 ? 'server' : 'unknown')));
    this.userMessage = messages[this.kind];
    this.validation = error.status === 422 ? validationIssues(error.error) : [];
  }
}
export function normalizeApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : error instanceof HttpErrorResponse
      ? new ApiError(error)
      : new ApiError(new HttpErrorResponse({ status: 0 }), 'unknown');
}
export function apiErrorMessage(
  error: unknown,
  overrides: Partial<Record<ApiErrorKind, string>> = {},
): string {
  const normalized = normalizeApiError(error);
  return overrides[normalized.kind] ?? normalized.userMessage;
}
