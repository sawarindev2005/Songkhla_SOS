'use client';

import { useEffect, useId, useRef } from 'react';
import { XIcon } from './icons';
import { cn } from './cn';

// หน้าต่างฟอร์ม/รายละเอียด ใช้ <dialog> ของเบราว์เซอร์ (โฟกัส/Esc/backdrop มาให้ในตัว)
export function Modal({ open, title, onClose, children, footer, wide }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className={cn(
        'm-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 text-ink shadow-float backdrop:bg-black/50',
        wide ? 'max-w-3xl' : 'max-w-lg'
      )}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-2xl font-bold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิด"
              className="grid size-10 cursor-pointer place-items-center rounded-full text-t2 hover:bg-s2"
            >
              <XIcon size={20} aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
