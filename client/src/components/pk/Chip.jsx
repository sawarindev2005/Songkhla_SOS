'use client';
import { useRef } from 'react';
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

/**
 * แถวชิปเลื่อนแนวนอน: มือถือปัดนิ้วได้เอง  เมาส์ลากแถวเพื่อเลื่อนได้ และหมุนล้อเมาส์ = เลื่อนซ้าย/ขวา
 * ลากแล้วปล่อยบนชิป → ไม่นับเป็นการกดชิป
 */
export function ChipRow({ children, label, className }) {
  const drag = useRef(null);

  function handlePointerDown(e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return; // นิ้ว/ปากกาใช้การเลื่อนของเบราว์เซอร์
    const el = e.currentTarget;
    const start = { x: e.clientX, left: el.scrollLeft, moved: false };
    drag.current = start;
    const move = (ev) => {
      const dx = ev.clientX - start.x;
      if (Math.abs(dx) > 5) start.moved = true;
      if (start.moved) el.scrollLeft = start.left - dx;
    };
    const end = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
  }

  return (
    <div
      role="group"
      aria-label={label}
      onPointerDown={handlePointerDown}
      onClickCapture={(e) => {
        if (!drag.current?.moved) return;
        e.preventDefault();
        e.stopPropagation();
        drag.current = null;
      }}
      onWheel={(e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
      }}
      className={cn('flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
    >
      {children}
    </div>
  );
}
