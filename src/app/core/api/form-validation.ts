import { FormGroup } from '@angular/forms';
import { normalizeApiError } from './api-error';

/** Map only direct body fields; nested/query/model errors remain in the form-level alert. */
export function applyApiValidation(form: FormGroup, error: unknown): number {
  let mapped = 0;
  for (const issue of normalizeApiError(error).validation) {
    const [source, field] = issue.location;
    if (
      source !== 'body' ||
      issue.location.length !== 2 ||
      typeof field !== 'string' ||
      !Object.hasOwn(form.controls, field)
    )
      continue;
    const control = form.controls[field];
    if (control.disabled) continue;
    control.setErrors({ ...control.errors, server: issue.message });
    control.markAsTouched();
    mapped++;
  }
  return mapped;
}
