import { apiErrorMessage } from '../../core/api/api-error';
import { HttpErrorResponse } from '@angular/common/http';

export function customerError(error: unknown): string {
  return apiErrorMessage(error, { 'not-found': 'Dieser Kunde wurde nicht gefunden.' });
}
export function isMissingCustomer(error: unknown) {
  return error instanceof HttpErrorResponse && error.status === 404;
}
export function customerId(value: string | null): number | null {
  if (!value || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return null;
  return Number(value);
}
