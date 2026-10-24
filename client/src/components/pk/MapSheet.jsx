'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { CaretLeftIcon, CaretRightIcon } from './icons';
import { cn } from './cn';

// ตั้งแต่ md (แท็บเล็ตขึ้นไป) แผ่นข้อมูลเปลี่ยนจาก bottom sheet เป็นแผงด้านซ้ายความสูงเต็ม
const WIDE_QUERY = '(min-width: 768px)';
// พื้นที่แผนที่บนจอกว้าง = ถัดจากแผงข้าง (ความกว้างต้องตรงกับ md:w-90 lg:w-100 ของแผง) | ปิดแผงอยู่ = เต็มกว้าง
export const mapArea = (closed) => (closed ? '' : 'md:left-90 lg:left-100');
export const isWide = () => typeof window !== 'undefined' && window.matchMedia(WIDE_QUERY).matches;

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

// ระยะลาก (px) ที่ต้องเกินก่อนจะย่อ/ขยายแผ่น ถ้าน้อยกว่านี้จะเด้งกลับที่เดิม
const DRAG_THRESHOLD = 48;
// ความสูงแผ่นตอนครึ่งจอแบบ peek = เท่ากับแผ่นหน้าภาพรวม (ที่จับ + หัวข้อ + ตัวเลข 3 ช่อง) วัดจากจอจริง
// แก้หัวหรือตัวเลขหน้าภาพรวมแล้วความสูงเปลี่ยน ต้องวัดใหม่ให้สองหน้ายังเท่ากัน
const PEEK_HEIGHT = 'max-md:h-[167px] max-md:short:h-[156px]';

/**
 * แผ่นข้อมูลด้านล่างแผนที่ 3 ระดับ: ย่อ (แถวสรุป) → ครึ่งจอ (ค่าเริ่มต้นเมื่อขยาย ยังเห็นแผนที่) → เต็มสูง
 * ลากที่จับขึ้น/ลงเพื่อเลื่อนทีละระดับ  collapsed/onToggle คุมการย่อจากภายนอก ส่วนครึ่งจอ/เต็มสูงคุมภายใน
 * header = หัวข้อที่ค้างอยู่ใต้ที่จับตอนเลื่อนเนื้อหา (ซ่อนตอนย่อ)  children = เนื้อหาที่เลื่อนได้
 * peek = ครึ่งจอเตี้ยเท่าแผ่นหน้าภาพรวม (แผนที่เห็นมากขึ้น) ลากขึ้น/เลื่อนเนื้อหาเพื่อดูต่อ
 * expandable = false → มีแค่ ย่อ / ครึ่งจอ ลากขึ้นหรือเลื่อนแล้วไม่ขยายเต็มสูง
 * hideToolbarWhenFull = ซ่อนปุ่มลอยตอนขยายเต็มสูง (เช่น ตอนดูรายละเอียดจุด ไม่ให้บังหมุดที่เลือก)
 * onFullChange(full) = แจ้งเมื่อแผ่นเข้า/ออกจากเต็มสูง (รวมตอนย่อแผ่น) เช่น ใช้ย่อรายการกลับตอนลากแผ่นลง
 * md+ = แผงข้างซ้ายเต็มสูง ไม่มีครึ่งจอ/เต็มสูง  collapsed = ซ่อนแผง เปิด/ปิดด้วยปุ่มแท็บที่ขอบแผง
 */
export function MapSheet({
  ref, children, header, summary, collapsed: collapsedProp = false, onToggle: onToggleProp, toolbar, className, label,
  peek = false, expandable = true, hideToolbarWhenFull = false, onFullChange,
}) {
  const wide = useWide();
  // collapsed = ย่อเป็นแถวสรุป (มือถือ) | sideClosed = ซ่อนแผงข้าง (md+) ไม่ลาก ใช้ปุ่มแท็บแทน
  const collapsed = collapsedProp && !wide;
  const sideClosed = collapsedProp && wide;
  const onToggle = wide ? undefined : onToggleProp;
  const dragged = useRef(false); // กันไม่ให้ click หลังลากเสร็จ toggle ซ้ำ
  const [offset, setOffset] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [full, setFull] = useState(false);
  const bodyId = useId(); // ให้ปุ่มที่จับบอกโปรแกรมอ่านหน้าจอว่าคุมเนื้อหาส่วนไหน
  // ถูกย่อ (รวมถึงแตะแผนที่จากภายนอก) → ขยายครั้งถัดไปเริ่มที่ครึ่งจอเสมอ
  if (collapsed && full) setFull(false);
  // เลิกให้ขยาย (เช่น กลับจากรายละเอียดไปหน้าสรุป) → ลดกลับครึ่งจอ
  if (!expandable && full) setFull(false);
  const toolbarHidden = full && hideToolbarWhenFull && !wide;

  // แจ้งออกไปเฉพาะตอนระดับเปลี่ยนจริง (เก็บ callback ล่าสุดไว้ใน ref ไม่ให้ทำงานซ้ำทุก render)
  const onFullChangeRef = useRef(onFullChange);
  useEffect(() => {
    onFullChangeRef.current = onFullChange;
  });
  useEffect(() => {
    onFullChangeRef.current?.(full);
  }, [full]);

  // ลากได้ทั้งหัวแผ่น (ที่จับ + header) เริ่มกดแล้วติดตามการขยับทั้งหน้าต่าง นิ้วหลุดออกนอกหัวแผ่นก็ยังลากต่อได้
  // ไม่จับ pointer ไว้กับหัวแผ่น ปุ่มในหัว (เช่น "กลับ") จึงยังกดได้ตามปกติ
  function handlePointerDown(e) {
    if (!onToggle || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const startY = e.clientY;
    let moved = false;
    dragged.current = false;

    const move = (ev) => {
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dy) > 4) moved = true;
      // ขยายอยู่ → แผ่นเลื่อนลงตามนิ้ว | ย่ออยู่ → ไม่ขยับ ปล่อยแล้วค่อยขยาย
      if (moved && !collapsed) setOffset(Math.max(dy, 0));
    };
    const end = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      setOffset(0);
      if (!moved || ev.type === 'pointercancel') return;
      dragged.current = true;
      const dy = ev.clientY - startY;
      const up = dy <= -DRAG_THRESHOLD;
      const down = dy >= DRAG_THRESHOLD;
      // ย่อ ↑ ครึ่งจอ ↑ เต็มสูง | เต็มสูง ↓ ครึ่งจอ ↓ ย่อ
      if (collapsed) {
        if (up) onToggle();
      } else if (full) {
        if (down) setFull(false);
      } else if (up) {
        if (expandable) setFull(true);
      } else if (down) {
        onToggle();
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  function handleClick() {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onToggle?.();
  }

  return (
    <div
      ref={ref}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col',
        full ? 'max-h-[calc(100%-112px)]' : 'max-h-[50%]',
        // md+: แผงข้างซ้ายเต็มสูง (แผนที่เริ่มถัดจากแผง ดู MAP_AREA) การ์ดเคสของฉัน + ปุ่มลอยอยู่มุมขวาล่างของแผนที่
        'md:inset-0 md:max-h-none',
        offset === 0 && 'transition-[transform,max-height] duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
    >
      {/* hideToolbarWhenFull + ขยายเต็มสูง → ซ่อนปุ่มลอย ไม่ให้บังแผนที่ที่เหลือน้อยและหมุดที่เลือก
          invisible = ออกจากลำดับ Tab ด้วย  ลดกลับครึ่งจอ → แสดงอีกครั้ง */}
      {toolbar && (
        <div
          aria-hidden={toolbarHidden || undefined}
          className={cn(
            'flex items-center justify-between px-3 pb-3 md:absolute md:right-4 md:bottom-6 md:justify-end md:px-0 md:pb-0 transition-[opacity,visibility] duration-200 motion-reduce:transition-none',
            toolbarHidden ? 'invisible opacity-0' : 'pointer-events-auto',
          )}
        >
          {toolbar}
        </div>
      )}
      <section
        aria-label={label}
        className={cn(
          'pointer-events-auto flex min-h-0 flex-col rounded-t-3xl bg-white shadow-sheet md:absolute md:inset-y-0 md:left-0 md:w-90 md:rounded-none md:border-r md:border-line md:shadow-none lg:w-100',
          peek && !full && !collapsed && PEEK_HEIGHT,
          'md:transition-[translate,visibility] md:duration-200 md:ease-out motion-reduce:transition-none',
          sideClosed && 'md:invisible md:-translate-x-full',
        )}
      >
        {/* หัวแผ่น (ที่จับ + header) อยู่กับที่ เลื่อนเฉพาะเนื้อหาด้านล่าง มีเส้นคั่นเมื่อเนื้อหาเลื่อนลอดหัว */}
        <div
          onPointerDown={handlePointerDown}
          className={cn('flex shrink-0 touch-none flex-col gap-3.5 border-b px-4 pt-2 select-none md:px-5 md:pt-5 short:gap-2.5', scrolled && !collapsed ? 'border-line' : 'border-transparent')}
        >
          <button
            type="button"
            onClick={handleClick}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={collapsed ? 'ขยายแผ่นข้อมูล' : expandable ? 'ย่อแผ่นข้อมูล (ลากขึ้นเพื่อขยายเต็มจอ)' : 'ย่อแผ่นข้อมูล'}
            className="-mt-2 -mb-4.5 flex cursor-grab md:hidden touch-none justify-center pt-2 pb-3 active:cursor-grabbing"
          >
            <span aria-hidden className="h-1 w-9 rounded-full bg-line2" />
          </button>
          {!collapsed && header}
        </div>
        {/* ลูกทุกตัว shrink-0 → เนื้อหายาวแล้วเลื่อนแทนการบีบให้เตี้ยลง
            ขยายอยู่ → เว้นล่างให้พ้นปุ่มขอช่วยเหลือที่ยื่นขึ้นมาจากแถบเมนู เลื่อนแล้วเห็นแถวสุดท้ายครบ */}
        {/* ย่ออยู่ → แตะตรงไหนของแถวสรุปก็ขยาย (คีย์บอร์ดใช้ปุ่มที่จับด้านบน) */}
        <div
          id={bodyId}
          onScroll={(e) => {
            const top = e.currentTarget.scrollTop;
            setScrolled(top > 0);
            // ครึ่งจออยู่แล้วเลื่อนดูเนื้อหาต่อ → ขยายเต็มสูงให้เห็นมากขึ้น
            if (top > 0 && expandable && !full && !collapsed) setFull(true);
          }}
          onClick={collapsed ? onToggle : undefined}
          className={cn('flex min-h-0 flex-col gap-3.5 overflow-y-auto px-4 pt-3.5 md:px-5 short:gap-2.5 short:pt-2.5 [&>*]:shrink-0', collapsed ? 'cursor-pointer pb-4' : 'pb-10')}
        >
          {collapsed ? summary : children}
        </div>
      </section>
      {/* md+: แท็บที่ขอบขวาของแผง เปิด/ปิดแผงข้าง ปิดแล้วแท็บอยู่ขอบซ้ายของจอ */}
      {onToggleProp && (
        <button
          type="button"
          onClick={onToggleProp}
          aria-expanded={!sideClosed}
          aria-controls={bodyId}
          aria-label={sideClosed ? `แสดง${label ?? 'แผงข้อมูล'}` : `ซ่อน${label ?? 'แผงข้อมูล'}`}
          title={sideClosed ? 'แสดงแผง' : 'ซ่อนแผง'}
          className={cn(
            'pointer-events-auto absolute top-1/2 hidden h-12 w-6 -translate-y-1/2 place-items-center rounded-r-lg border border-l-0 border-line bg-white text-t2 shadow-float hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc md:grid',
            'transition-[left] duration-200 ease-out motion-reduce:transition-none',
            sideClosed ? 'left-0' : 'left-90 lg:left-100',
          )}
        >
          {sideClosed ? <CaretRightIcon size={16} weight="bold" aria-hidden /> : <CaretLeftIcon size={16} weight="bold" aria-hidden />}
        </button>
      )}
    </div>
  );
}
