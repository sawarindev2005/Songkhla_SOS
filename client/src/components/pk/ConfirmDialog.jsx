'use client';

import { useEffect, useRef } from 'react';
import { Button } from './Button';

// กล่องยืนยันก่อนทำรายการสำคัญ ใช้ <dialog> ของเบราว์เซอร์ (โฟกัส/Esc/backdrop มาให้ในตัว)
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel = 'ยืนยัน',
  cancelLabel = 'ยกเลิก',
  confirmVariant = 'primary',
  confirmIcon,
  loading = false,
  onConfirm,
  onCancel,
  initialFocus = 'confirm',
}) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector('[data-initial-focus="true"]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-0 text-ink shadow-float backdrop:bg-black/50"
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col gap-4 overflow-y-auto p-5">
          <h2 id="confirm-dialog-title" className="text-2xl font-bold">
            {title}
          </h2>
          <div className="font-body text-md text-t2">{children}</div>
          <div className="flex flex-col gap-2">
            <Button variant={confirmVariant} icon={confirmIcon} loading={loading} onClick={onConfirm} data-initial-focus={initialFocus === 'confirm'}>
              {confirmLabel}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={loading} data-initial-focus={initialFocus === 'cancel'}>
              {cancelLabel}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
