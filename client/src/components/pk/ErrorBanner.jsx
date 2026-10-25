'use client';

import { useRef, useState } from 'react';
import { WarningIcon } from './icons';

export function ErrorBanner({ error, onRetry }) {
  const [retrying, setRetrying] = useState(false);
  const pending = useRef(false);
  async function retry() {
    if (pending.current) return;
    pending.current = true;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      pending.current = false;
      setRetrying(false);
    }
  }
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-line bg-red-bg p-3 text-base text-red-tx">
      <WarningIcon size={18} weight="bold" className="mt-px shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 break-words">{error.message || String(error)}</p>
      {onRetry && (
        <button type="button" onClick={retry} disabled={retrying} aria-busy={retrying || undefined} className="min-h-11 shrink-0 cursor-pointer font-semibold underline disabled:cursor-wait disabled:no-underline">
          {retrying ? 'กำลังลองใหม่…' : 'ลองใหม่'}
        </button>
      )}
    </div>
  );
}
