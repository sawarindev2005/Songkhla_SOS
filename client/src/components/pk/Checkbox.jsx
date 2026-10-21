'use client';
import { CheckIcon } from './icons';
import { cn } from './cn';

export function Checkbox({ checked, onChange, children, className }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={() => onChange(!checked)}
      className={cn('flex w-full items-center gap-3 text-left', className)}>
      <span aria-hidden className={cn('grid size-5 shrink-0 place-items-center rounded-xs border-2 text-white', checked ? 'border-acc bg-acc' : 'border-t3 bg-white')}>
        {checked && <CheckIcon size={14} weight="bold" />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
