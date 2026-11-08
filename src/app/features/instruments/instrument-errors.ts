import { HttpErrorResponse } from '@angular/common/http';
export function instrumentError(error: unknown): string {
  switch (error instanceof HttpErrorResponse ? error.status : 0) {
    case 401:
      return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
    case 403:
      return 'Sie haben keine Berechtigung für diesen Vorgang.';
    case 404:
      return 'Das Instrument oder der zugeordnete Kunde wurde nicht gefunden.';
    case 409:
      return 'Der Vorgang steht im Konflikt mit vorhandenen Daten. Bitte prüfen Sie den aktuellen Stand.';
    case 422:
      return 'Bitte prüfen Sie die Angaben, die Maße und die Eigentumszuordnung.';
    default:
      return 'Die Daten konnten nicht verarbeitet werden. Bitte versuchen Sie es erneut.';
  }
}
export function instrumentId(value: string | null): number | null {
  return value && /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : null;
}
export function responseTotal(header: string | null): number | null {
  return header !== null && /^\d+$/.test(header) && Number.isSafeInteger(Number(header))
    ? Number(header)
    : null;
}
