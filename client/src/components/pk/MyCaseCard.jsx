import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { CaretRightIcon, XIcon } from './icons';
import { cn } from './cn';
import { CaseStatusBadge, UrgencyBadge } from './domain';

/**
 * การ์ดลอยเคสของฉัน (เคสล่าสุด) บนขอบแผ่นข้อมูล ใช้ในหน้าภาพรวม แจกจ่าย และที่พักพิง
 * รายละเอียดแบบแถวเคสเดิม: เลขเคส + สถานะ / ความด่วน · เวลาที่แจ้ง · ทีม
 * more = จำนวนเคสอื่นที่แจ้งไว้  href = ลิงก์หน้าติดตามเคส
 * ไม่มีปุ่มโทรหาทีมโดยตั้งใจ: ให้ทีมกู้ภัยเป็นฝ่ายโทรหาผู้แจ้ง กันสายโทรเร่งระหว่างทีมปฏิบัติงาน
 */
export function MyCaseCard({ data, more = 0, href, onDismiss, className }) {
  const finished = data.status === 'rescued' || data.status === 'cancelled';
  const cls = cn(
    'mr-2 flex min-w-0 flex-1 items-center rounded-2xl bg-white text-left text-ink shadow-float',
    finished ? 'gap-1 px-2 py-2' : 'gap-3 px-3.5 py-2.5',
    className,
  );
  const body = (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {/* บอกให้รู้ว่าการ์ดนี้คือเคสของตัวเอง แตะเพื่อดูสถานะ */}
        <span className="-mb-0.5 text-sm font-semibold text-acc">เคสที่ฉันแจ้ง</span>
        <span className={cn('flex items-center', finished ? 'gap-1' : 'gap-3')}>
          <span className={cn('text-base font-bold', finished ? 'shrink-0 whitespace-nowrap' : 'min-w-0 flex-1 truncate')}>
            เคส <span className="tabular-nums">{data.case_no}</span>
          </span>
          <CaseStatusBadge status={data.status} />
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-t2">
          <UrgencyBadge urgency={data.urgency} />
          <span className="tabular-nums">แจ้งเมื่อ {formatDateTime(data.created_at)}</span>
          {data.rescuer_team && <span className="font-semibold text-acc">ทีม {data.rescuer_team}</span>}
          {more > 0 && <span className="text-t3 tabular-nums">+อีก {more} เคส</span>}
        </span>
      </span>
      {!finished && <CaretRightIcon size={18} className="shrink-0 text-t3" aria-hidden />}
    </>
  );
  // ไม่ใส่ aria-label: ให้โปรแกรมอ่านหน้าจออ่านข้อความบนการ์ดทั้งหมด (สถานะ ความด่วน ทีม) ตรงกับที่ตาเห็น
  return (
    <div className={cls}>
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-ink no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc">
        {body}
      </Link>
      {finished && (
        <button
          type="button"
          aria-label="ซ่อนการ์ดเคสนี้"
          onClick={() => onDismiss?.(data.case_no)}
          className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-t2 hover:bg-s2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc"
        >
          <XIcon size={20} aria-hidden />
        </button>
      )}
    </div>
  );
}
