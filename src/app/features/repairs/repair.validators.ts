import { AbstractControl, ValidationErrors } from '@angular/forms';
export function descriptionValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return !value || [...value].length > 10000 ? { description: true } : null;
}
export function notesValidator(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'string' && [...control.value].length <= 10000
    ? null
    : { notes: true };
}
export function dateValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return { date: true };
  const date = new Date(value + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? null
    : { date: true };
}
export function requiredReference(control: AbstractControl): ValidationErrors | null {
  return typeof control.value === 'number' &&
    Number.isSafeInteger(control.value) &&
    control.value > 0
    ? null
    : { reference: true };
}
