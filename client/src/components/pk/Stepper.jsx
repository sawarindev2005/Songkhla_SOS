'use client';
import { MinusIcon, PlusIcon } from './icons';
import { IconButton } from './IconButton';

export function Stepper({ label, value, onChange, min = 1, max = 99, unit }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <IconButton label={`ลด${label}`} tone="outline" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <MinusIcon size={20} weight="bold" />
      </IconButton>
      <output aria-live="polite" className="min-w-12 text-center text-5xl font-bold tabular-nums">{value}</output>
      <IconButton label={`เพิ่ม${label}`} tone="outline" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <PlusIcon size={20} weight="bold" />
      </IconButton>
      {unit && <span className="text-lg text-t2">{unit}</span>}
    </div>
  );
}
