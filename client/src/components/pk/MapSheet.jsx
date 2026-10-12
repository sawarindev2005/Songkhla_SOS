'use client';
import { cn } from './cn';

export function MapSheet({ children, summary, collapsed = false, onToggle, toolbar, className, label }) {
  return (
    <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex max-h-[calc(100%-112px)] flex-col', className)}>
      {toolbar && <div className="pointer-events-auto flex items-center justify-between px-3 pb-3">{toolbar}</div>}
      <section aria-label={label} className="pointer-events-auto flex min-h-0 flex-col gap-3.5 overflow-y-auto rounded-t-3xl bg-white px-4 pt-2 pb-4 shadow-sheet short:gap-2.5">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'ขยายแผ่นข้อมูล' : 'ย่อแผ่นข้อมูล'}
          className="-mt-1.5 -mb-2.5 flex justify-center pt-1 pb-1.5"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-line2" />
        </button>
        {collapsed ? summary : children}
      </section>
    </div>
  );
}
