'use client';
import { useEffect, useRef, useState } from 'react';
import { HOTLINES } from '@/lib/format';
import { PhoneIcon, XIcon } from './icons';
import { cn } from './cn';

// ปุ่มกลม 40 px เท่าปุ่ม ◎ ใช้ทั้งปุ่มเปิด (โทร สีแดง) และปุ่มปิด (✕ สีขาว) ในแผ่นเบอร์ ให้ตำแหน่งทับกันพอดี
function FabButton({ label, icon, onClick, open, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'grid size-10 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc',
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
 * dialog คลุมเต็มจอเป็นพื้นหลังมืดเอง (แตะ ::backdrop ไม่ส่ง click มาที่ dialog) รายการวางตามตำแหน่งปุ่มตอนเปิด
 */
export function HotlineFab() {
  const ref = useRef(null);
  const anchorRef = useRef(null);
  const [pos, setPos] = useState(null); // { right, bottom } px จากขอบจอ — null = ปิด

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (pos && !dialog.open) dialog.showModal();
    if (!pos && dialog.open) dialog.close();
  }, [pos]);

  function openSheet() {
    const r = anchorRef.current.getBoundingClientRect();
    setPos({ right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom });
  }
  const close = () => setPos(null);

  return (
    <>
      <span ref={anchorRef} className="flex">
        <FabButton label="โทรฉุกเฉิน" aria-haspopup="dialog" onClick={openSheet} icon={<PhoneIcon size={20} weight="fill" aria-hidden />} />
      </span>

      {/* pointer-events-auto: ที่วางปุ่มอาจเป็น pointer-events-none (ให้ลากแผนที่ผ่านได้) ซึ่งสืบทอดลงมาถึง dialog */}
      <dialog
        ref={ref}
        aria-labelledby="hotline-title"
        onClose={close}
        // แตะพื้นหลังมืด (นอกรายการ) = ปิด
        onClick={(e) => e.target === e.currentTarget && close()}
        className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-ink/25 p-0 text-ink backdrop:bg-transparent"
      >
        {pos && (
          <div className="absolute flex flex-col items-end gap-3" style={{ right: pos.right, bottom: pos.bottom }}>
            <div className="w-68 rounded-2xl bg-white px-3.5 pt-3 pb-1 shadow-sheet">
              <h2 id="hotline-title" className="text-sm font-semibold text-t3">
                โทรขอความช่วยเหลือ · แตะเพื่อโทร
              </h2>
              <ul className="flex flex-col">
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
