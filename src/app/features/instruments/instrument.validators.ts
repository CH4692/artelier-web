import { ValidatorFn } from '@angular/forms';
export const positiveMeasurement: ValidatorFn = (control) =>
  control.value === null || control.value === ''
    ? null
    : typeof control.value === 'number' && Number.isFinite(control.value) && control.value > 0
      ? null
      : { measurement: true };
export const manufactureYear: ValidatorFn = (control) =>
  control.value === null || control.value === ''
    ? null
    : Number.isInteger(control.value) && control.value >= 1 && control.value <= 9999
      ? null
      : { year: true };
export const optionalCustomerId: ValidatorFn = (control) =>
  control.value === null || (Number.isSafeInteger(control.value) && control.value > 0)
    ? null
    : { customer: true };
