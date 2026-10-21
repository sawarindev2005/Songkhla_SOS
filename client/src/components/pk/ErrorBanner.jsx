import { WarningIcon } from './icons';

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-line bg-red-bg p-3 text-base text-red-tx">
      <WarningIcon size={18} weight="bold" className="mt-px shrink-0" aria-hidden />
      <p className="flex-1">{error.message || String(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="cursor-pointer font-semibold underline">
          ลองใหม่
        </button>
      )}
    </div>
  );
}
