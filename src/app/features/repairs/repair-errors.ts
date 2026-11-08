import { HttpErrorResponse } from '@angular/common/http';
export function repairError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse))
    return 'Die Auftragsdaten konnten nicht geladen oder gespeichert werden. Bitte versuchen Sie es erneut.';
  switch (error.status) {
    case 401:
      return 'Ihre Sitzung ist abgelaufen. Bitte melden Sie sich erneut an.';
    case 403:
      return 'Sie haben keine Berechtigung für diese Aktion.';
    case 404:
      return 'Der Auftrag oder ein zugehöriger Datensatz wurde nicht gefunden.';
    case 409:
      return 'Die Änderung ist im aktuellen Zustand nicht erlaubt. Bitte laden Sie den Auftrag erneut.';
    case 422:
      return 'Bitte prüfen Sie Ihre Angaben. Die Änderung wurde nicht übernommen.';
    default:
      return 'Die Auftragsdaten sind derzeit nicht verfügbar. Bitte versuchen Sie es erneut.';
  }
}
