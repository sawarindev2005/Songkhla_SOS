'use client';

import { House, LifeBuoy, Package, Siren } from 'lucide-react';
import { cx } from './ui';

export const LAYERS = [
  { key: 'requests', label: 'ขอช่วย', icon: Siren, color: 'text-brand' },
  { key: 'distributions', label: 'แจกจ่าย', icon: Package, color: 'text-supply' },
  { key: 'rescuers', label: 'กู้ภัย', icon: LifeBuoy, color: 'text-ink' },
  { key: 'shelters', label: 'ที่พัก', icon: House, color: 'text-shelter' },
];

// ปุ่มเปิด/ปิดชั้นข้อมูลบนแผนที่ พร้อมจำนวน
export default function MapChips({ counts, show, onToggle, layers = LAYERS, className }) {
  return (
    <div
      className={cx('no-scrollbar flex gap-2 overflow-x-auto px-3 py-1', className)}
      role="group"
      aria-label="ชั้นข้อมูลบนแผนที่"
    >
      {layers.map(({ key, label, icon: Icon, color }) => {
        const on = show[key] !== false;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(key)}
            className={cx(
              'flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold shadow-[var(--shadow-float)] ring-1 transition-colors',
              on ? 'bg-surface text-ink ring-line' : 'bg-slate-200/90 text-muted ring-transparent'
            )}
          >
            <Icon className={cx('size-4', on ? color : 'text-slate-400')} aria-hidden />
            {label}
            <span className="tabular">{counts[key] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
