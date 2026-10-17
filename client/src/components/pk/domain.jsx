// แปลงข้อมูลจาก API ให้เป็นภาษาภาพของต้นแบบ: แดง = ด่วน, เหลือง = รอ, น้ำเงิน = ทีมกำลังไป, เขียว = เสร็จ, ที่เหลือเทา
import { DIST_STATUS, SHELTER_STATUS, STATUS, URGENCY } from '@/lib/format';
import {
  CheckCircleIcon, DropIcon, HourglassMediumIcon, NavigationArrowIcon, WarningCircleIcon, XCircleIcon,
} from './icons';
import { Badge } from './Badge';

export const isUrgent = (urgency) => urgency === 'critical' || urgency === 'high';

// วิกฤต = แดง, เร่งด่วน = ส้ม, ปานกลาง = เหลือง, ไม่เร่งด่วน = เทา
export const URGENCY_TONE = { critical: 'red', high: 'orange', medium: 'yellow', low: 'gray' };
export const URGENCY_TEXT = { critical: 'text-red', high: 'text-org', medium: 'text-yel', low: 'text-t3' };
export const URGENCY_BG = { critical: 'bg-red', high: 'bg-org', medium: 'bg-yel', low: 'bg-t3' };

export function UrgencyIcon({ urgency, size = 20, className }) {
  if (isUrgent(urgency)) return <WarningCircleIcon size={size} weight="fill" className={className} aria-hidden />;
  return <DropIcon size={size} weight="fill" className={className} aria-hidden />;
}

export function UrgencyBadge({ urgency }) {
  const u = URGENCY[urgency] || URGENCY.medium;
  return (
    <Badge tone={URGENCY_TONE[urgency] || 'yellow'} icon={<UrgencyIcon urgency={urgency} size={15} />}>
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
