import { apiErrorMessage } from '../../core/api/api-error';
export function instrumentError(error: unknown): string {
  return apiErrorMessage(error, {
    'not-found': 'Das Instrument oder der zugeordnete Kunde wurde nicht gefunden.',
    validation: 'Bitte prüfen Sie die Angaben, die Maße und die Eigentumszuordnung.',
  });
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
