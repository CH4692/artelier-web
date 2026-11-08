import { HttpErrorResponse } from '@angular/common/http';

export function customerError(error: unknown): string {
  const status = error instanceof HttpErrorResponse ? error.status : 0;
  switch (status) {
    case 401:
      return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
    case 403:
      return 'Sie haben keine Berechtigung für diesen Vorgang.';
    case 404:
      return 'Dieser Kunde wurde nicht gefunden.';
    case 409:
      return 'Der Vorgang steht im Konflikt mit vorhandenen Daten. Bitte prüfen Sie den aktuellen Stand.';
    case 422:
      return 'Bitte prüfen Sie Ihre Angaben und die markierten Felder.';
    default:
      return 'Der Vorgang konnte nicht abgeschlossen werden. Bitte versuchen Sie es erneut.';
  }
}
export function isMissingCustomer(error: unknown) {
  return error instanceof HttpErrorResponse && error.status === 404;
}
export function customerId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return null;
  return Number(value);
}
