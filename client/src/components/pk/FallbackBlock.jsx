import { ChatCircleTextIcon } from './icons';
import { Button } from './Button';
import { HOTLINES } from '@/lib/format';

/** ส่งไม่ได้ → ช่องทางสำรอง: SMS ที่ใส่ข้อความให้แล้ว + เบอร์ฉุกเฉิน */
export function FallbackBlock({ smsBody, title = 'ยังส่งไม่ได้ ขอความช่วยเหลือทางอื่น', note }) {
  return (
    <section aria-labelledby="fallback-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 id="fallback-title" className="text-lg font-bold">{title}</h2>
        {note && <p className="font-body text-sm text-t2 short:hidden">{note}</p>}
      </div>
      {smsBody && (
        <Button variant="danger" href={`sms:?&body=${encodeURIComponent(smsBody)}`} icon={<ChatCircleTextIcon size={20} aria-hidden />}>
          ส่งทาง SMS
        </Button>
      )}
      <HotlineRow />
    </section>
  );
}

export function HotlineRow() {
  return (
    <div className="grid grid-cols-3 divide-x divide-line border-y border-line">
      {HOTLINES.map(h => (
        <a key={h.number} href={`tel:${h.number}`} aria-label={`โทร ${h.number} ${h.label}`}
          className="flex flex-col items-center py-2.5 text-ink no-underline active:bg-s1">
          <span className="text-2xl font-bold text-red tabular-nums">{h.number}</span>
          <span className="text-xs text-t2">{h.label}</span>
        </a>
      ))}
    </div>
  );
}
