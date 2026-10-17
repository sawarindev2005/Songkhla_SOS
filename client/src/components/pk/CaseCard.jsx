import Link from 'next/link';
import { BabyIcon, MapPinIcon, UsersIcon, WheelchairIcon } from './icons';
import { formatDistance, STATUS, timeAgo, URGENCY, vulnerableLabels } from '@/lib/format';
import { CaseStatusBadge, URGENCY_TEXT, UrgencyIcon, formatWait, waitMinutes } from './domain';
import { cn } from './cn';

const ROW = 'flex w-full items-start gap-3 border-b border-line bg-white px-1 py-3 text-left text-ink no-underline last:border-b-0 hover:bg-s1 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-acc short:py-2.25';

/**
 * แถวเคสในรายการ วางต่อกันได้เลย เส้นคั่นอยู่ในตัว  request = ข้อมูลเคสจาก API
 * detailed = แบบละเอียดสำหรับประชาชน: ป้ายสถานะ + รายละเอียดที่แจ้ง + แจ้งเมื่อไร + กลุ่มเปราะบาง (ไม่มีข้อมูลติดต่อ)
 */
export function CaseCard({ request: r, distance, href, onSelect, detailed = false }) {
  if (detailed) return <DetailedCaseRow r={r} distance={distance} href={href} onSelect={onSelect} />;
  const pending = r.status === 'pending';
  const wait = pending ? waitMinutes(r.created_at) : null;
  const vulnerable = r.has_children || r.has_elderly || r.has_disabled || r.has_patient;
  const VulIcon = r.has_children ? BabyIcon : WheelchairIcon;
  const body = (
    <>
      <UrgencyIcon urgency={r.urgency} className={cn('mt-0.5 shrink-0', URGENCY_TEXT[r.urgency] || URGENCY_TEXT.medium)} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-baseline gap-3">
          <span className="min-w-0 flex-1 truncate text-md font-bold">
            {r.case_no ? <>เคส <span className="tabular-nums">{r.case_no}</span> · </> : 'คำขอ · '}
            {URGENCY[r.urgency]?.label}
          </span>
          {pending ? (
            <span className={cn('shrink-0 text-sm tabular-nums', wait >= 30 ? 'font-semibold text-red' : 'text-t3')}>รอ {formatWait(wait)}</span>
          ) : (
            <span className="shrink-0 text-sm text-t3">{STATUS[r.status]?.label}</span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-t2">
          {(r.address_note || distance != null) && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPinIcon size={14} aria-hidden />
              <span className="truncate">{[r.address_note, formatDistance(distance)].filter(Boolean).join(' ')}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1"><UsersIcon size={14} aria-hidden />{r.people_count} คน</span>
          {vulnerable && <VulIcon size={16} aria-label="มีกลุ่มเปราะบาง" role="img" />}
        </span>
      </span>
    </>
  );
  if (href) return <Link href={href} className={ROW}>{body}</Link>;
  return <button type="button" onClick={onSelect} className={ROW}>{body}</button>;
}

function DetailedCaseRow({ r, distance, href, onSelect }) {
  const vulnerable = vulnerableLabels(r);
  const body = (
    <>
      <UrgencyIcon urgency={r.urgency} className={cn('mt-0.5 shrink-0', URGENCY_TEXT[r.urgency] || URGENCY_TEXT.medium)} />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-md font-bold">
            เคส <span className="tabular-nums">{r.case_no}</span> · {URGENCY[r.urgency]?.label}
          </span>
          <CaseStatusBadge status={r.status} />
        </span>
        {r.description && <span className="line-clamp-2 font-body text-sm text-ink">{r.description}</span>}
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-sm text-t2">
          {(r.address_note || distance != null) && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPinIcon size={14} aria-hidden />
              <span className="truncate">{[r.address_note, formatDistance(distance)].filter(Boolean).join(' ')}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1"><UsersIcon size={14} aria-hidden />{r.people_count} คน</span>
          {vulnerable.length > 0 && <span>{vulnerable.join(' · ')}</span>}
        </span>
        <span className="font-body text-xs text-t3 tabular-nums">แจ้งเมื่อ {timeAgo(r.created_at)}</span>
      </span>
    </>
  );
  if (href) return <Link href={href} className={ROW}>{body}</Link>;
  return <button type="button" onClick={onSelect} className={ROW}>{body}</button>;
}

/** แถวสถานที่ (ที่พักพิง / จุดแจกจ่าย) หน้าตาเดียวกับ CaseCard */
export function PlaceRow({ icon, title, meta, aside, onSelect, selected = false, id }) {
  return (
    <button type="button" id={id} onClick={onSelect} aria-current={selected || undefined}
      className={cn(ROW, 'items-center', selected && 'bg-acc-bg hover:bg-acc-bg')}>
      {icon}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-md font-bold">{title}</span>
        {meta && <span className="truncate font-body text-sm text-t2">{meta}</span>}
      </span>
      {aside && <span className="shrink-0 text-sm text-t3 tabular-nums">{aside}</span>}
    </button>
  );
}
