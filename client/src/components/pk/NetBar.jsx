import { CircleNotchIcon, WifiSlashIcon } from './icons';

export function NetBar({ online, queued = 0, lastSync }) {
  if (online && queued === 0) return null;
  return (
    <div role="status" className="relative z-[600] flex shrink-0 items-center gap-2 bg-ink px-3.5 py-2 text-sm text-white">
      {online
        ? <CircleNotchIcon size={16} className="motion-safe:animate-spin" aria-hidden />
        : <WifiSlashIcon size={16} weight="bold" aria-hidden />}
      <span className="min-w-0 flex-1">
        {online ? `มีสัญญาณแล้ว กำลังส่ง ${queued} รายการ` : lastSync ? `ไม่มีสัญญาณ ข้อมูลล่าสุด ${lastSync}` : 'ไม่มีสัญญาณ ข้อมูลบนจออาจไม่เป็นปัจจุบัน'}
      </span>
      {!online && queued > 0 && <b className="font-semibold">รอส่ง {queued}</b>}
    </div>
  );
}
