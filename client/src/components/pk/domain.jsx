// แปลงข้อมูลจาก API ให้เป็นภาษาภาพของต้นแบบ: แดง = ด่วน, เหลือง = รอ, น้ำเงิน = ทีมกำลังไป, เขียว = เสร็จ, ที่เหลือเทา
import { DIST_STATUS, SHELTER_STATUS, STATUS, URGENCY } from '@/lib/format';
import {
  CheckCircleIcon, DropIcon, HourglassMediumIcon, NavigationArrowIcon, WarningCircleIcon, XCircleIcon,
} from './icons';
import { Badge } from './Badge';

export const isUrgent = (urgency) => urgency === 'critical' || urgency === 'high';

// สีตามระดับความด่วน: วิกฤต แดง | เร่งด่วน ส้ม | ปานกลาง เหลือง | ไม่เร่งด่วน เทา
// ตัวหนังสือใช้โทนเข้ม (อ่านชัดบนพื้นขาว) ไอคอน/หมุดใช้โทนสด ให้แยกส้มกับเหลืองออกง่าย
export const URGENCY_TONE = { critical: 'red', high: 'orange', medium: 'amber', low: 'gray' };
export const URGENCY_ICON_TEXT = { critical: 'text-red', high: 'text-org', medium: 'text-amb', low: 'text-t3' };
export const URGENCY_PIN_BG = { critical: 'bg-red', high: 'bg-org', medium: 'bg-amb', low: 'bg-t3' };

export function UrgencyIcon({ urgency, size = 20, className }) {
  if (isUrgent(urgency)) return <WarningCircleIcon size={size} weight="fill" className={className} aria-hidden />;
  return <DropIcon size={size} weight="fill" className={className} aria-hidden />;
}

export function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.medium;
  return (
    <Badge
      tone={URGENCY_TONE[urgency] || 'amber'}
      icon={<UrgencyIcon urgency={urgency} size={15} className={URGENCY_ICON_TEXT[urgency] || URGENCY_ICON_TEXT.medium} />}
    >
      {u.label}
    </Badge>
  );
}

const STATUS_UI = {
  pending: { tone: 'amber', icon: HourglassMediumIcon },
  assigned: { tone: 'accent', icon: NavigationArrowIcon },
  in_progress: { tone: 'accent', icon: NavigationArrowIcon },
  rescued: { tone: 'ok', icon: CheckCircleIcon },
  cancelled: { tone: 'gray', icon: XCircleIcon },
};

export function CaseStatusBadge({ status }) {
  const ui = STATUS_UI[status] || STATUS_UI.pending;
  const Icon = ui.icon;
  return (
    <Badge tone={ui.tone} icon={<Icon size={15} weight={status === 'rescued' ? 'fill' : 'bold'} aria-hidden />}>
      {STATUS[status]?.label || status}
    </Badge>
  );
}

const PLACE_UI = {
  open: { tone: 'ok', icon: CheckCircleIcon },
  active: { tone: 'ok', icon: CheckCircleIcon },
  full: { tone: 'red', icon: XCircleIcon },
  closed: { tone: 'gray', icon: XCircleIcon },
};

export function PlaceStatusBadge({ kind, status }) {
  const map = kind === 'shelter' ? SHELTER_STATUS : DIST_STATUS;
  const ui = PLACE_UI[status] || PLACE_UI.closed;
  const Icon = ui.icon;
  return (
    <Badge tone={ui.tone} icon={<Icon size={15} weight="bold" aria-hidden />}>
      {map[status]?.label || status}
    </Badge>
  );
}

// นาทีที่รอตั้งแต่แจ้ง
export const waitMinutes = (createdAt) =>
  createdAt ? Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000)) : null;

export function formatWait(mins) {
  if (mins == null) return '-';
  if (mins < 60) return `${mins} นาที`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} ชม.` : `${Math.floor(h / 24)} วัน`;
}

// เวลาเปิดแจก "07:00–20:00 น." (ไม่มีข้อมูลเวลา → null)
const hhmm = (t) => (t ? String(t).slice(0, 5) : null);
export const openHours = (d) =>
  hhmm(d.open_time) && hhmm(d.close_time) ? `${hhmm(d.open_time)}–${hhmm(d.close_time)} น.` : null;

// ที่พักพิงใกล้เต็ม: ยังว่างอยู่แต่เหลือน้อยกว่า 10% ของที่รับได้
const NEAR_FULL_RATIO = 0.1;
export const shelterFree = (s) => Math.max(s.capacity - s.current_occupancy, 0);
export const isNearFull = (s) => {
  const free = shelterFree(s);
  return free > 0 && s.capacity > 0 && free / s.capacity < NEAR_FULL_RATIO;
};
