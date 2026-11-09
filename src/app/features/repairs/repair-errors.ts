import { apiErrorMessage } from '../../core/api/api-error';
export function repairError(error: unknown): string {
  return apiErrorMessage(error, {
    'not-found': 'Der Auftrag oder ein zugehöriger Datensatz wurde nicht gefunden.',
    conflict:
      'Die Änderung ist im aktuellen Zustand nicht erlaubt. Bitte laden Sie den Auftrag erneut.',
  });
}
