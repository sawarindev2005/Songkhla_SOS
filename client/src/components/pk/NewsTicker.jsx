'use client';
import { useEffect, useRef, useState } from 'react';
import { formatTime, timeAgo } from '@/lib/format';
import { Button } from './Button';
import { waitMinutes } from './domain';
import { CaretLeftIcon, CaretRightIcon, MegaphoneIcon, XIcon } from './icons';
import { cn } from './cn';

// เวลาที่แต่ละข่าวค้างก่อนเลื่อนไปข่าวถัดไป
const SHOW_MS = 12000;
// ระยะปัด (px) ที่นับเป็นการเปลี่ยนข่าว น้อยกว่านี้ข่าวเด้งกลับที่เดิม
const SWIPE_PX = 40;
// ข้อมูลสถานที่เก่ากว่านี้ (นาที) → เตือนว่าอาจไม่เป็นปัจจุบัน (เกณฑ์เดียวกับหน้ารายละเอียดสถานที่)
const STALE_MINUTES = 120;
// ทิศที่ข่าวใหม่เลื่อนเข้ามา: เปลี่ยนเอง = จากล่าง  ปัดซ้าย = จากขวา  ปัดขวา = จากซ้าย
// (เขียนชื่อคลาสเต็ม ให้ Tailwind หาเจอ)
const ENTER = {
  auto: 'motion-safe:animate-ticker-in',
  next: 'motion-safe:animate-ticker-from-right',
  prev: 'motion-safe:animate-ticker-from-left',
};

// แดง = ข่าวร้าย  ส้ม = เตือนภัย  เขียว = ข่าวดี
// icon = สีโทรโข่ง  pulse = วงสีที่กะพริบรอบโทรโข่ง  note = กล่องคำแนะนำในหน้ารายละเอียด
const TONE = {
  red: { icon: 'text-red', pulse: 'bg-red', text: 'text-red-tx', note: 'bg-red-bg text-red-tx' },
  org: { icon: 'text-org', pulse: 'bg-org', text: 'text-org-tx', note: 'bg-org-bg text-org-tx' },
  ok: { icon: 'text-ok', pulse: 'bg-ok', text: 'text-ok', note: 'bg-ok-bg text-ok' },
};

/**
 * แถบข่าวสารลอยบนแผนที่ แสดงทีละข่าว บรรทัดเดียว เลื่อนไปข่าวถัดไปเองทุก 12 วินาที
 * แตะ = เปิดรายละเอียดข่าว (หยุดหมุนระหว่างอ่าน)  ปัดซ้าย/ขวา = ข่าวถัดไป/ก่อนหน้า (ข่าวเลื่อนตามนิ้ว)
 * โปรแกรมอ่านหน้าจออ่านรายการข่าวทั้งหมดแทนข่าวที่หมุนอยู่  items จาก buildAnnouncements  updatedAt = เวลาข้อมูลล่าสุด
 * loading = ยังโหลดข้อมูลรอบแรกไม่เสร็จ → แสดงแถบว่างกันที่ไว้ ไม่ให้ของด้านล่างกระโดดลงตอนข่าวขึ้น
 */
export function NewsTicker({ items, updatedAt, loading = false, className }) {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState('auto');
  const [dragX, setDragX] = useState(0);
  const [open, setOpen] = useState(false);
  const drag = useRef(null); // { x, moved } ระหว่างปัด / หลังปัดจนกว่าจะกันการแตะซ้อนเสร็จ
  const count = items.length;
  const i = count ? index % count : 0;

  // นับเวลาใหม่ทุกครั้งที่ข่าวเปลี่ยน (รวมตอนปัด) ข่าวจึงค้างครบ 12 วินาทีเสมอ เปิดรายละเอียดอยู่ = หยุด
  useEffect(() => {
    if (count < 2 || open) return;
    const t = setTimeout(() => {
      setDir('auto');
      setIndex(i + 1);
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [i, count, open]);

  if (count === 0) {
    if (!loading) return null;
    return (
      <div className={className} aria-hidden>
        <div className="flex min-h-11 items-center gap-2.5 rounded-2xl bg-white/90 py-2 pr-3 pl-2 shadow-chip ring-1 ring-ink/5">
          <span className="size-8 shrink-0 rounded-full bg-s2 motion-safe:animate-pulse" />
          <span className="h-3.5 w-2/3 rounded-full bg-s2 motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  const item = items[i];
  const tone = TONE[item.tone] || TONE.ok;
  const many = count > 1;
  const go = (step) => {
    setDir(step > 0 ? 'next' : 'prev');
    setIndex(i + step + count); // + count กันติดลบตอนย้อนจากข่าวแรก
  };

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e) {
    const d = drag.current;
    if (!d || d.done || !many) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 6) d.moved = true;
    if (d.moved) setDragX(dx);
  }
  function handlePointerUp(e) {
    const d = drag.current;
    if (!d || d.done) return;
    const dx = e.clientX - d.x;
    setDragX(0);
    if (!d.moved) {
      drag.current = null;
      return;
    }
    d.done = true; // ให้ click ที่ตามมาหลังปัดถูกข้าม
    if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
  }
  function handleClick() {
    if (drag.current?.moved) {
      drag.current = null;
      return;
    }
    setOpen(true);
  }

  return (
    <div className={cn('pointer-events-auto', className)}>
      <ul className="sr-only" aria-label="ประกาศจากศูนย์บัญชาการ">
        {items.map((a) => (
          <li key={a.id}>{a.text}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragX(0);
        }}
        aria-haspopup="dialog"
        aria-label={`ดูรายละเอียดประกาศ: ${item.text}`}
        // ปัดแนวนอนให้แถบข่าวรับเอง (แนวตั้งยังเป็นของเบราว์เซอร์) ตั้งที่ style เพราะ globals.css
        // ตั้ง touch-action: manipulation ให้ทุกปุ่มแบบไม่อยู่ใน layer ซึ่งชนะคลาส touch-pan-y
        style={{ touchAction: 'pan-y' }}
        className="relative flex min-h-11 w-full items-center gap-2.5 overflow-hidden rounded-2xl bg-white/90 py-2 pr-3 pl-2 text-left shadow-chip ring-1 ring-ink/5 backdrop-blur-md select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc"
      >
        {/* โทรโข่งสีตามข่าว + วงสีเดียวกันกะพริบรอบๆ แบบกำลังประกาศ (ลดการเคลื่อนไหว → วงจางนิ่ง) */}
        <span aria-hidden className="relative grid size-8 shrink-0 place-items-center">
          <span key={item.tone} className={cn('absolute size-6 rounded-full opacity-25 motion-safe:animate-ping', tone.pulse)} />
          <span className={cn('absolute size-7 rounded-full opacity-15', tone.pulse)} />
          <MegaphoneIcon size={20} weight="fill" className={cn('relative transition-colors duration-300', tone.icon)} />
        </span>
        <span aria-hidden className="min-w-0 flex-1 overflow-hidden">
          <span
            key={item.id}
            style={dragX ? { transform: `translateX(${dragX}px)`, opacity: Math.max(0.3, 1 - Math.abs(dragX) / 200) } : undefined}
            className={cn('block truncate text-md font-semibold', ENTER[dir], tone.text)}
          >
            {item.text}
          </span>
        </span>
        {many && (
          <span aria-hidden className="shrink-0 text-xs text-t3 tabular-nums">
            {i + 1}/{count}
          </span>
        )}
        {/* บอกว่าแตะดูต่อได้ */}
        <CaretRightIcon size={16} weight="bold" className="-ml-1 shrink-0 text-t3" aria-hidden />
      </button>

      <NewsDetail
        open={open}
        item={item}
        position={many ? `${i + 1}/${count}` : null}
        updatedAt={updatedAt}
        onPrev={many ? () => go(-1) : null}
        onNext={many ? () => go(1) : null}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

/** แผ่นรายละเอียดประกาศขึ้นจากด้านล่าง: หัวข้อ รายการสถานที่ คำแนะนำ ปุ่มไปหน้าที่เกี่ยวข้อง และเลื่อนดูข่าวอื่นได้ */
function NewsDetail({ open, item, position, updatedAt, onPrev, onNext, onClose }) {
  const ref = useRef(null);
  const tone = TONE[item.tone] || TONE.ok;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const navBtn = 'grid size-10 place-items-center rounded-full bg-s2 text-chip-tx focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc';

  return (
    // คลุมเต็มจอเป็นพื้นหลังมืดเอง (แตะ ::backdrop ไม่ส่ง click มาที่ dialog) แผ่นวางชิดล่าง
    <dialog
      ref={ref}
      aria-labelledby="news-detail-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="pointer-events-auto fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-scrim p-0 text-ink backdrop:bg-transparent"
    >
      {open && (
        <section className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[85dvh] max-w-120 flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] shadow-sheet">
          <div className="flex items-center gap-2">
            <MegaphoneIcon size={18} weight="fill" className={tone.icon} aria-hidden />
            <p className="flex-1 font-body text-sm text-t3">
              ประกาศจากศูนย์บัญชาการ{updatedAt && ` · ดึงข้อมูล ${formatTime(updatedAt)}`}
            </p>
            <button type="button" aria-label="ปิด" onClick={onClose} className={navBtn}>
              <XIcon size={18} weight="bold" aria-hidden />
            </button>
          </div>

          <h2 id="news-detail-title" className={cn('text-5xl leading-snug font-bold', tone.text)}>
            {item.text}
          </h2>

          {item.detail?.lines?.length > 0 && (
            <ul className="flex flex-col border-y border-line">
              {item.detail.lines.map((l) => {
                const stale = l.at && waitMinutes(l.at) >= STALE_MINUTES;
                return (
                  <li key={l.title} className="flex flex-col gap-0.5 border-b border-line py-2.5 last:border-b-0">
                    <span className="text-md font-semibold">{l.title}</span>
                    {l.sub && <span className="font-body text-sm text-t2">{l.sub}</span>}
                    {/* ข้อมูลสถานที่แก้ล่าสุดเมื่อไร เก่าเกินไปขึ้นสีเหลืองเตือน */}
                    {l.at && (
                      <span className={cn('font-body text-xs', stale ? 'font-semibold text-amb-tx' : 'text-t3')}>
                        อัปเดตข้อมูล {timeAgo(l.at)}
                        {stale && ' · ข้อมูลอาจไม่เป็นปัจจุบัน'}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {item.detail?.note && <p className={cn('rounded-xl px-3 py-2.5 font-body text-sm', tone.note)}>{item.detail.note}</p>}

          {item.action && (
            <Button href={item.action.href} variant="primary" size="sm" onClick={onClose}>
              {item.action.label}
            </Button>
          )}

          {position && (
            <div className="flex items-center justify-between">
              <button type="button" aria-label="ประกาศก่อนหน้า" onClick={onPrev} className={navBtn}>
                <CaretLeftIcon size={18} weight="bold" aria-hidden />
              </button>
              <span className="text-sm text-t3 tabular-nums">ประกาศ {position}</span>
              <button type="button" aria-label="ประกาศถัดไป" onClick={onNext} className={navBtn}>
                <CaretRightIcon size={18} weight="bold" aria-hidden />
              </button>
            </div>
          )}
        </section>
      )}
    </dialog>
  );
}
