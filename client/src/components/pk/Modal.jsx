'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { XIcon } from './icons';
import { cn } from './cn';

// หน้าต่างฟอร์ม/รายละเอียด ใช้ <dialog> ของเบราว์เซอร์ (โฟกัส/Esc/backdrop มาให้ในตัว)
export function Modal({ open, title, onClose, children, footer, wide, busy = false, dirty = false }) {
  const ref = useRef(null);
  const titleId = useId();
  const [discardOpen, setDiscardOpen] = useState(false);

  function requestClose() {
    if (busy) return;
    if (dirty) setDiscardOpen(true);
    else onClose();
  }

  useEffect(() => {
    if (!open || !dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [open, dirty]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onClose={() => { if (open) requestClose(); }}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      className={cn(
        'form-modal m-auto w-[calc(100%-2rem)] rounded-xl bg-white p-0 text-ink shadow-float backdrop:bg-black/50',
        wide ? 'max-w-3xl' : 'max-w-lg'
      )}
    >
      {open && (
        <div className="form-modal-content flex flex-col">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id={titleId} className="text-2xl font-bold">
              {title}
            </h2>
            <button
              type="button"
              disabled={busy}
              onClick={requestClose}
              aria-label="ปิด"
              className="grid size-10 cursor-pointer place-items-center rounded-full text-t2 hover:bg-s2 disabled:cursor-wait disabled:opacity-40"
            >
              <XIcon size={20} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-line px-5 py-3">{typeof footer === 'function' ? footer(requestClose) : footer}</div>}
        </div>
      )}
    </dialog>
    <ConfirmDialog
      open={open && discardOpen}
      title="ยังไม่ได้บันทึกการแก้ไข"
      initialFocus="cancel"
      confirmLabel="ทิ้งการแก้ไข"
      cancelLabel="กลับไปแก้ไข"
      confirmVariant="dangerOutline"
      onConfirm={() => { setDiscardOpen(false); onClose(); }}
      onCancel={() => setDiscardOpen(false)}
    >
      <p>ข้อมูลที่แก้ไขยังไม่ได้บันทึก ต้องการทิ้งการแก้ไขและปิดฟอร์มหรือไม่?</p>
    </ConfirmDialog>
    </>
  );
}
