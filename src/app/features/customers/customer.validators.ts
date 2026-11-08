import { FormControl, ValidatorFn, Validators } from '@angular/forms';

/** Apply Angular validators to the same trimmed names/email used by FastAPI. */
const trimmed =
  (validator: ValidatorFn): ValidatorFn =>
  (control) =>
    validator(new FormControl(String(control.value ?? '').trim()));
// Python/Pydantic counts Unicode code points rather than UTF-16 code units.
const nameLength: ValidatorFn = (control) => {
  const actualLength = [...String(control.value ?? '').trim()].length;
  return actualLength > 100 ? { maxlength: { requiredLength: 100, actualLength } } : null;
};
export const nameValidators = [trimmed(Validators.required), nameLength];
export const emailValidators = [trimmed(Validators.email), trimmed(Validators.maxLength(254))];
export const phoneValidator: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (value.length > 64) return { maxlength: true };
  if (!value.trim()) return null;
  let number = value.replace(/[\s()./-]/g, '');
  if (number.startsWith('00')) number = '+' + number.slice(2);
  return /^(?:\+[1-9][0-9]{2,14}|[0-9]{3,15})$/.test(number) ? null : { phone: true };
};
