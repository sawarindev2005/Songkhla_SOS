'use client';

import { useEffect, useId, useRef } from 'react';
import { LoaderCircle, TriangleAlert, X } from 'lucide-react';
import { STATUS, URGENCY } from '@/lib/format';

export const TONE = {
  brand: 'bg-brand-soft text-brand-dark ring-brand/20',
  safety: 'bg-safety-soft text-safety-dark ring-safety/20',
  shelter: 'bg-shelter-soft text-shelter ring-shelter/20',
  supply: 'bg-supply-soft text-supply ring-supply/20',
  warn: 'bg-warn-soft text-warn ring-warn/25',
  muted: 'bg-slate-100 text-muted ring-slate-300/50',
};

export function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function Badge({ tone = 'muted', children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        TONE[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, map = STATUS }) {
  const s = map[status] || { label: status, tone: 'muted' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.medium;
  return (
    <Badge tone={u.tone}>
      {urgency === 'critical' && <TriangleAlert className="size-3.5" aria-hidden />}
      {u.label}
    </Badge>
  );
}

const BUTTON_VARIANT = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm',
  safety: 'bg-safety text-white hover:bg-safety-dark shadow-sm',
  dark: 'bg-ink text-white hover:bg-slate-800 shadow-sm',
  success: 'bg-shelter text-white hover:bg-green-800 shadow-sm',
  outline: 'bg-surface text-ink ring-1 ring-inset ring-line hover:bg-slate-50',
  ghost: 'text-muted hover:bg-slate-100 hover:text-ink',
  danger: 'bg-surface text-brand-dark ring-1 ring-inset ring-brand/30 hover:bg-brand-soft',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  as: Comp = 'button',
  ...props
}) {
  return (
    <Comp
      className={cx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        size === 'lg' ? 'min-h-12 px-5 text-base' : size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm',
        BUTTON_VARIANT[variant],
        className
      )}
      disabled={Comp === 'button' ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </Comp>
  );
}

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-brand"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1 text-sm text-brand-dark">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export const inputClass =
  'w-full min-h-11 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base text-ink placeholder:text-slate-400 focus:border-safety focus:outline-none focus:ring-2 focus:ring-safety/30 aria-[invalid=true]:border-brand';

export function Spinner({ label = 'กำลังโหลด…', className }) {
  return (
    <div role="status" className={cx('flex items-center justify-center gap-2 py-8 text-muted', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Icon && <Icon className="size-10 text-slate-300" aria-hidden />}
      <p className="font-semibold text-ink">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted">{children}</p>}
    </div>
  );
}

export function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-brand-dark"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="flex-1">{error.message || String(error)}</p>
      {onRetry && (
        <button onClick={onRetry} className="cursor-pointer font-semibold underline">
          ลองใหม่
        </button>
      )}
    </div>
  );
}

export function Modal({ open, title, onClose, children, footer, wide }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cx(
        'm-auto w-[calc(100%-2rem)] rounded-2xl bg-surface p-0 text-ink shadow-xl backdrop:bg-slate-900/50',
        wide ? 'max-w-3xl' : 'max-w-lg'
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 className="text-lg font-bold">{title}</h2>
            <button
              onClick={onClose}
              aria-label="ปิด"
              className="grid size-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-slate-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'muted', sub }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span className={cx('grid size-9 place-items-center rounded-xl ring-1 ring-inset', TONE[tone])}>
            <Icon className="size-5" aria-hidden />
          </span>
        )}
      </div>
      <p className="tabular mt-2 text-3xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}
