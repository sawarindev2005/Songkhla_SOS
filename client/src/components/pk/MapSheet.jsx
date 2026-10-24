'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { cn } from './cn';

// ระยะลาก (px) ที่ต้องเกินก่อนจะย่อ/ขยายแผ่น ถ้าน้อยกว่านี้จะเด้งกลับที่เดิม
const DRAG_THRESHOLD = 48;
// ความสูงแผ่นตอนครึ่งจอแบบ peek = เท่ากับแผ่นหน้าภาพรวม (ที่จับ + หัวข้อ + ตัวเลข 3 ช่อง) วัดจากจอจริง
// แก้หัวหรือตัวเลขหน้าภาพรวมแล้วความสูงเปลี่ยน ต้องวัดใหม่ให้สองหน้ายังเท่ากัน
const PEEK_HEIGHT = 'max-md:h-[167px] max-md:short:h-[156px]';

// จอกว้าง (ตรงกับ md ของ Tailwind = แท็บเล็ตขึ้นไป): แผ่นข้อมูลกลายเป็นแผงลอยด้านซ้ายเต็มสูง แทนแผ่นด้านล่าง
export const WIDE = '(min-width: 768px)';

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(WIDE);
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return wide;
}

/**
 * แผ่นข้อมูลด้านล่างแผนที่ 3 ระดับ: ย่อ (แถวสรุป) → ครึ่งจอ (ค่าเริ่มต้นเมื่อขยาย ยังเห็นแผนที่) → เต็มสูง
 * ลากที่จับขึ้น/ลงเพื่อเลื่อนทีละระดับ  collapsed/onToggle คุมการย่อจากภายนอก ส่วนครึ่งจอ/เต็มสูงคุมภายใน
 * header = หัวข้อที่ค้างอยู่ใต้ที่จับตอนเลื่อนเนื้อหา (ซ่อนตอนย่อ)  children = เนื้อหาที่เลื่อนได้
 * peek = ครึ่งจอเตี้ยเท่าแผ่นหน้าภาพรวม (แผนที่เห็นมากขึ้น) ลากหัวแผ่นขึ้นเพื่อขยาย หรือเลื่อนเนื้อหาเพื่อดูต่อ
 * expandable = false → มีแค่ ย่อ / ครึ่งจอ ลากขึ้นแล้วไม่ขยายเต็มสูง
 * hideToolbarWhenFull = ซ่อนปุ่มลอยตอนขยายเต็มสูง (เช่น ตอนดูรายละเอียดจุด ไม่ให้บังหมุดที่เลือก)
 * onFullChange(full) = แจ้งเมื่อแผ่นเข้า/ออกจากเต็มสูง (รวมตอนย่อแผ่น) เช่น ใช้ย่อรายการกลับตอนลากแผ่นลง
 * detailKey = เปลี่ยนจุดที่เลือกแล้วเปิดเต็มสูงและเริ่มเนื้อหาจากบนสุด; footer = ปุ่มค้างนอกส่วนเลื่อน
 * จอกว้าง: ไม่มีครึ่งจอ/เต็มสูง  กดหรือลากที่จับลง = ย่อเป็นการ์ดสรุปลอยมุมซ้ายล่าง | ลากการ์ดขึ้น = ขยาย
 */
export function MapSheet({
  ref, children, header, summary, collapsed = false, onToggle, toolbar, className, label,
  peek = false, expandable = true, hideToolbarWhenFull = false, onFullChange, detailKey = null, footer,
}) {
  const wide = useWide();
  const dragged = useRef(false); // กันไม่ให้ click หลังลากเสร็จ toggle ซ้ำ
  const [offset, setOffset] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [full, setFull] = useState(detailKey != null);
  const [previousDetailKey, setPreviousDetailKey] = useState(detailKey);
  const bodyId = useId(); // ให้ปุ่มที่จับบอกโปรแกรมอ่านหน้าจอว่าคุมเนื้อหาส่วนไหน
  if (previousDetailKey !== detailKey) {
    setPreviousDetailKey(detailKey);
    setFull(detailKey != null);
    setScrolled(false);
  }
  // ถูกย่อ (รวมถึงแตะแผนที่จากภายนอก) → ขยายครั้งถัดไปเริ่มที่ครึ่งจอเสมอ
  if (collapsed && full) setFull(false);
  // เลิกให้ขยาย (เช่น กลับจากรายละเอียดไปหน้าสรุป) → ลดกลับครึ่งจอ
  if (!expandable && full) setFull(false);
  const toolbarHidden = full && hideToolbarWhenFull;

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
      // ย่อ ↑ ครึ่งจอ ↑ เต็มสูง | เต็มสูง ↓ ครึ่งจอ ↓ ย่อ  (จอกว้างมีแค่ ย่อ ↔ แผงเต็มสูง)
      if (collapsed) {
        if (up) onToggle();
      } else if (full && !wide) {
        if (down) setFull(false);
      } else if (up) {
        if (expandable && !wide) setFull(true);
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
        'md:inset-x-auto md:inset-y-0 md:left-0 md:max-h-none md:w-80 lg:w-[25.5rem]',
        collapsed && 'md:justify-end',
        offset === 0 && 'transition-[transform,max-height] duration-200 ease-out motion-reduce:transition-none',
        className,
      )}
      style={offset ? { transform: `translateY(${offset}px)` } : undefined}
    >
      {/* เต็มสูง → ซ่อนปุ่มลอยและคืนพื้นที่แนวตั้งให้รายละเอียดบนมือถือ
          ลดกลับครึ่งจอ → แสดงอีกครั้ง; จอกว้างยังวางปุ่มลอยข้างแผงตามเดิม */}
      {toolbar && (
        <div
          className={cn(
            'flex items-center justify-between px-3 pb-3 transition-[opacity,visibility] duration-200 motion-reduce:transition-none',
            // จอกว้าง: ย้ายไปลอยมุมขวาล่างของแผนที่ (การ์ดเคส + ปุ่มตำแหน่ง/โทร) แบบปุ่มควบคุมของ Google Maps
            'md:pointer-events-auto md:visible md:absolute md:bottom-6 md:left-full md:w-[calc(100vw-20rem-5.5rem)] md:items-end md:justify-end md:gap-3 md:px-4 md:pb-0 md:opacity-100 md:[&>a]:max-w-sm md:[&>button]:max-w-sm lg:w-[calc(100vw-25.5rem-5.5rem)]',
            toolbarHidden ? 'hidden md:flex' : 'pointer-events-auto',
          )}
        >
          {toolbar}
        </div>
      )}
      <section
        aria-label={label}
        className={cn(
          'pointer-events-auto flex min-h-0 flex-col rounded-t-3xl bg-white shadow-sheet',
          // จอกว้าง: ขยาย = แผงซ้ายเต็มสูง | ย่อ = การ์ดสรุปลอยมุมซ้ายล่าง
          collapsed
            ? 'md:m-4 md:rounded-2xl md:shadow-float'
            : 'md:flex-1 md:rounded-none md:border-r md:border-line md:shadow-[4px_0_12px_rgb(15_23_42/0.08)]',
          peek && !full && !collapsed && PEEK_HEIGHT,
        )}
      >
        {/* หัวแผ่น (ที่จับ + header) อยู่กับที่ เลื่อนเฉพาะเนื้อหาด้านล่าง มีเส้นคั่นเมื่อเนื้อหาเลื่อนลอดหัว */}
        <div
          onPointerDown={handlePointerDown}
          className={cn(
            'relative z-10 flex shrink-0 touch-none flex-col gap-3.5 rounded-t-3xl border-b bg-white px-4 pt-2 pb-3 select-none short:pb-2 short:gap-2.5',
            collapsed ? 'md:rounded-t-2xl' : 'md:rounded-none',
            scrolled && !collapsed ? 'border-line' : 'border-transparent',
          )}
        >
          <button
            type="button"
            onClick={handleClick}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            aria-label={collapsed ? 'ขยายแผ่นข้อมูล' : expandable && !wide ? 'ย่อแผ่นข้อมูล (ลากขึ้นเพื่อขยายเต็มจอ)' : 'ย่อแผ่นข้อมูล'}
            className="-mt-2 -mb-4.5 flex cursor-grab touch-none justify-center pt-2 pb-3 active:cursor-grabbing"
          >
            <span aria-hidden className="h-1 w-9 rounded-full bg-line2" />
          </button>
          {!collapsed && header}
        </div>
        {/* ลูกทุกตัว shrink-0 → เนื้อหายาวแล้วเลื่อนแทนการบีบให้เตี้ยลง
            ขยายอยู่ → เว้นล่างให้พ้นปุ่มขอช่วยเหลือที่ยื่นขึ้นมาจากแถบเมนู เลื่อนแล้วเห็นแถวสุดท้ายครบ */}
        {/* ย่ออยู่ → แตะตรงไหนของแถวสรุปก็ขยาย (คีย์บอร์ดใช้ปุ่มที่จับด้านบน) */}
        <div
          key={detailKey ?? 'list'}
          id={bodyId}
          onScroll={(e) => {
            const top = e.currentTarget.scrollTop;
            setScrolled(top > 0);
            // ให้หัวแผ่นคุมขนาด: เปลี่ยนความสูงระหว่างเลื่อนจะทำให้ช่วง scroll หดและตำแหน่งกระโดด
          }}
          onClick={collapsed ? onToggle : undefined}
          className={cn('flex min-h-0 flex-col gap-3.5 overflow-y-auto overscroll-contain px-4 pt-3.5 short:gap-2.5 short:pt-2.5 [&>*]:shrink-0', collapsed ? 'cursor-pointer pb-4' : footer ? 'pb-3.5' : 'pb-10')}
        >
          {collapsed ? summary : children}
        </div>
        {!collapsed && footer && (
          <div className="shrink-0 border-t border-line bg-white px-4 pt-3 pb-10 md:pb-4">
            {footer}
          </div>
        )}
      </section>
    </div>
  );
}
