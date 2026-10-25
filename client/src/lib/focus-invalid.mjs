import { revealField } from './form-viewport.mjs';

// Scope validation focus to the submitted form, including a custom map control.
export function focusFirstInvalid(form, win = form?.ownerDocument.defaultView) {
  if (!form || !win) return false;
  for (const invalid of form.querySelectorAll('[aria-invalid="true"], [data-error="true"]')) {
    const control = invalid.matches('input, select, textarea, button, [tabindex]')
      ? invalid
      : invalid.querySelector('[data-error-focus], input, select, textarea, button, [tabindex]');
    if (!control || control.matches(':disabled') || control.getClientRects().length === 0) continue;
    control.focus({ preventScroll: true });
    revealField(control, win.visualViewport, win);
    return true;
  }
  return false;
}
