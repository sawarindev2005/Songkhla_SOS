import { CheckCircleIcon, HouseLineIcon, LifebuoyIcon, MapPinIcon, NavigationArrowIcon, PackageIcon } from './icons';
import { isUrgent, URGENCY_BG, UrgencyIcon } from './domain';
import { cn } from './cn';

const base = 'grid place-items-center border-[2.5px] border-white text-white';

/** หมุดเคส: รอ = สีตามความเร่งด่วน (แดง/ส้ม/เหลือง/เทา), ทีมกำลังไปสีน้ำเงิน, จบแล้วสีเทา  big = เคสที่กำลังดู */
export function CasePin({ urgency, status = 'pending', big = false }) {
  const finished = status === 'rescued' || status === 'cancelled';
  const going = status === 'assigned' || status === 'in_progress';
  const urgent = isUrgent(urgency);
  const s = big ? 18 : 16;
  return (
    <span className={cn(base, 'rounded-full',
      finished ? 'bg-t4' : going ? 'bg-acc' : URGENCY_BG[urgency] || URGENCY_BG.medium,
      big ? cn('size-9', urgent && !finished ? 'shadow-halo-red-lg' : 'shadow-halo-amb') : 'size-7.5',
      !big && (urgency === 'critical' && status === 'pending' ? 'shadow-halo-red' : 'shadow-pin'))}>
      {finished ? <CheckCircleIcon size={s} aria-hidden />
        : going ? <NavigationArrowIcon size={s} weight="fill" aria-hidden />
          : <UrgencyIcon urgency={urgency} size={s} />}
    </span>
  );
}

export function PlacePin({ kind, active = true, big = false }) {
  const Icon = kind === 'shelter' ? HouseLineIcon : PackageIcon;
  return (
    <span className={cn(base, 'rounded-sm', big ? 'size-9 shadow-halo-amb' : 'size-7.5 shadow-pin', active ? 'bg-acc' : 'bg-t4')}>
      <Icon size={big ? 18 : 16} weight="fill" aria-hidden />
    </span>
  );
}

export function TeamPin() {
  return (
    <span className={cn(base, 'size-7.5 rounded-full bg-ink shadow-pin')}>
      <LifebuoyIcon size={16} weight="fill" aria-hidden />
    </span>
  );
}

export function MePin() {
  return <span className="block size-4.5 rounded-full border-3 border-white bg-acc shadow-me" />;
}

export function PickPin() {
  return (
    <span className={cn(base, 'size-10 rounded-full bg-red shadow-halo-red')}>
      <MapPinIcon size={20} weight="fill" aria-hidden />
    </span>
  );
}

/** วงจำนวนคำขอในย่าน (cluster)  มีวงแดงถ้ามีเคสด่วน */
export function AreaBubble({ count, urgent = false }) {
  return (
    <span className={cn(base, 'size-9 rounded-full bg-ink text-base font-bold tabular-nums', urgent ? 'shadow-halo-red' : 'shadow-pin')}>
      {count}
    </span>
  );
}
