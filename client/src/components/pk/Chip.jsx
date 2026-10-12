'use client';
import { cn } from './cn';

/** soft = ตัวกรองในหน้ารายการ  map = ปุ่มลอยบนแผนที่  layer = ปุ่มเปิดปิดชั้นข้อมูล (muted คือปิดอยู่) */
export function Chip({ selected = false, muted = false, layer = false, count, icon, variant = 'soft', onClick, children, className }) {
  const map = variant === 'map';
  return (
    <button
      type="button"
      aria-pressed={layer ? !muted : selected}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.75 text-sm font-medium whitespace-nowrap',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc',
        map && 'shadow-chip',
        selected ? 'bg-ink text-white [&_svg]:text-white'
          : muted ? 'bg-white/85 text-t4 [&_svg]:text-t4'
            : map ? 'bg-white text-chip-tx' : 'bg-s2 text-chip-tx',
        className,
      )}
    >
      {icon}
      {children}
      {count != null && <span className={cn('tabular-nums', selected ? 'text-line2' : 'text-t3')}>{count}</span>}
    </button>
  );
}

export function ChipRow({ children, label, className }) {
  return (
    <div role="group" aria-label={label} className={cn('flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {children}
    </div>
  );
}
