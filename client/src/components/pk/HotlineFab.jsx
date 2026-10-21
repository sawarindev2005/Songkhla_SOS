'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { HOTLINES } from '@/lib/format';
import { PhoneIcon, XIcon } from './icons';
import { cn } from './cn';

// ปุ่มกลม 44 px เท่าปุ่ม ◎ ให้ปุ่มเปิดกับปุ่มปิดทับกันพอดี
function FabButton({ label, icon, onClick, open, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc',
        open ? 'bg-white text-ink shadow-float' : 'bg-red text-white shadow-sos',
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}

/**
 * ปุ่มลอย "โทรฉุกเฉิน" (วางเหนือปุ่ม ◎) แตะแล้วรายการเบอร์ขอความช่วยเหลือเด้งขึ้นเหนือปุ่ม ปุ่มกลายเป็น ✕
 * แผ่นเบอร์ใช้ <dialog> แบบ modal: กด Esc / แตะพื้นหลัง / ✕ เพื่อปิด โฟกัสวนในแผ่น คืนโฟกัสให้ปุ่มเมื่อปิด
 * dialog คลุมเต็มจอเป็นพื้นหลังมืดเอง (แตะ ::backdrop ไม่ส่ง click มาที่ dialog) รายการเกาะปุ่มและขยับให้อยู่ในจอ
 */
export function HotlineFab() {
  const ref = useRef(null);
  const anchorRef = useRef(null);
  const popupRef = useRef(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();

    const viewport = window.visualViewport;
    const popup = popupRef.current;
    function positionPopup() {
      const anchor = anchorRef.current.getBoundingClientRect();
      const padding = getComputedStyle(dialog);
      const left = (viewport?.offsetLeft ?? 0) + parseFloat(padding.paddingLeft);
      const top = (viewport?.offsetTop ?? 0) + parseFloat(padding.paddingTop);
      const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? window.innerWidth) - parseFloat(padding.paddingRight);
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight) - parseFloat(padding.paddingBottom);
      popup.style.width = `${Math.min(272, Math.max(0, right - left))}px`;
      popup.style.maxHeight = `${Math.max(0, bottom - top)}px`;
      const rect = popup.getBoundingClientRect();
      const origin = dialog.getBoundingClientRect();
      popup.style.left = `${Math.max(left, Math.min(anchor.right - rect.width, right - rect.width)) - origin.left}px`;
      popup.style.top = `${Math.max(top, Math.min(anchor.bottom - rect.height, bottom - rect.height)) - origin.top}px`;
    }

    positionPopup();
    const observer = new ResizeObserver(positionPopup);
    observer.observe(dialog);
    observer.observe(popup);
    observer.observe(anchorRef.current);
    window.addEventListener('resize', positionPopup);
    viewport?.addEventListener('resize', positionPopup);
    viewport?.addEventListener('scroll', positionPopup);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', positionPopup);
      viewport?.removeEventListener('resize', positionPopup);
      viewport?.removeEventListener('scroll', positionPopup);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <span ref={anchorRef} className="flex">
        <FabButton label="โทรฉุกเฉิน" aria-haspopup="dialog" onClick={() => setOpen(true)} icon={<PhoneIcon size={20} weight="fill" aria-hidden />} />
      </span>

      {/* pointer-events-auto: ที่วางปุ่มอาจเป็น pointer-events-none (ให้ลากแผนที่ผ่านได้) ซึ่งสืบทอดลงมาถึง dialog */}
      <dialog
        ref={ref}
        aria-labelledby="hotline-title"
        onClose={close}
        // แตะพื้นหลังมืด (นอกรายการ) = ปิด
        onClick={(e) => e.target === e.currentTarget && close()}
        className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink/25 pt-[max(12px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pb-[max(12px,env(safe-area-inset-bottom))] pl-[max(12px,env(safe-area-inset-left))] text-ink backdrop:bg-transparent"
      >
        {open && (
          <div ref={popupRef} className="absolute flex min-h-0 flex-col items-end gap-3">
            <div className="flex min-h-0 w-full flex-col rounded-2xl bg-white px-3.5 pt-3 pb-1 shadow-sheet">
              <h2 id="hotline-title" className="shrink-0 text-sm font-semibold text-t3">
                โทรขอความช่วยเหลือ · แตะเพื่อโทร
              </h2>
              <ul className="flex min-h-0 flex-col overflow-y-auto overscroll-contain">
                {HOTLINES.map((h) => (
                  <li key={h.number} className="border-b border-line last:border-b-0">
                    <a href={`tel:${h.number}`} className="flex min-h-14 items-center gap-3 px-0.5 py-2 text-ink no-underline">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-red-bg text-red">
                        <PhoneIcon size={18} weight="fill" />
                      </span>
                      <span className="flex flex-1 flex-col">
                        <span className="text-5xl leading-tight font-bold tabular-nums">{h.number}</span>
                        <span className="font-body text-sm text-t2">{h.label}</span>
                      </span>
                      <span aria-hidden className="text-sm font-semibold text-red">โทร</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <FabButton label="ปิดเบอร์ฉุกเฉิน" open onClick={close} icon={<XIcon size={20} weight="bold" aria-hidden />} />
          </div>
        )}
      </dialog>
    </>
  );
}
