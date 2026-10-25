'use client';

import { useCallback, useEffect, useState } from 'react';
import { focusFirstInvalid } from '@/lib/focus-invalid.mjs';

export function useInvalidFormFocus(formId) {
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (attempt) focusFirstInvalid(document.getElementById(formId));
  }, [attempt, formId]);
  return useCallback(() => setAttempt((value) => value + 1), []);
}
