'use client';
import { useRef } from 'react';
import { nextValue } from './roving';
import { cn } from './cn';

export function Segmented({ label, options, value, onChange }) {
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
    <div role="radiogroup" aria-label={label} onKeyDown={onKey} className="flex gap-0.75 rounded-md bg-s2 p-0.75">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={el => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-sm px-1 py-1.75 text-center text-sm',
              on ? 'bg-white font-semibold text-ink shadow-seg' : 'font-medium text-t2',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
