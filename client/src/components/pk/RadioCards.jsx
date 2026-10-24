'use client';
import { useRef } from 'react';
import { nextValue } from './roving';
import { cn } from './cn';

export function RadioCards({ label, options, value, onChange }) {
  const refs = useRef([]);
  const values = options.map(o => o.value);
  const onKey = (e) => {
    const n = nextValue(values, value, e.key);
    if (n === null) return;
    e.preventDefault();
    onChange(n);
    refs.current[values.indexOf(n)]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex flex-col gap-2">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-left short:py-2.25',
              on ? 'border-acc bg-acc-bg ring-1 ring-acc ring-inset' : 'border-line bg-white',
            )}
          >
            <span aria-hidden className={cn('grid size-5.5 shrink-0 place-items-center rounded-full border-2', on ? 'border-acc bg-acc' : 'border-t3 bg-white')}>
              {on && <span className="size-2 rounded-full bg-white" />}
            </span>
            {o.icon}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex items-center gap-2">
                <span className={cn('text-md', on ? 'font-semibold text-acc-tx' : 'font-medium text-ink')}>{o.title}</span>
                {o.badge}
              </span>
              {o.description && <span className={cn('font-body text-sm text-t2', o.hideDescriptionOnShort && 'short:hidden')}>{o.description}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
