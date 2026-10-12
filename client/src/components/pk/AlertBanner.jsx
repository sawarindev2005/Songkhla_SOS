import { DropIcon, WarningIcon } from './icons';
import { cn } from './cn';

export const ALERT_LEVELS = {
  1: { label: 'เฝ้าระวัง', tone: 'text-amb-tx' },
  2: { label: 'เตรียมอพยพ', tone: 'text-org-tx' },
  3: { label: 'อพยพทันที', tone: 'text-white' },
};

/** ระดับ 3 เป็นแถบแดงทึบเพราะต้องทำทันที ระดับ 1-2 เป็นข้อความเรียบ ให้สีอยู่ที่หัวข้อเท่านั้น  label/meta เปลี่ยนคำได้ */
export function AlertBanner({ level, text, time, label, meta }) {
  const lv = ALERT_LEVELS[level];
  const urgent = level === 3;
  const Icon = urgent ? WarningIcon : DropIcon;
  return (
    <div role={urgent ? 'alert' : 'status'} className={cn('flex flex-col gap-0.5', urgent ? 'rounded-lg bg-red px-3.5 py-3 text-white' : 'py-0.5 text-ink')}>
      <span className="flex items-center gap-1.5">
        <Icon size={18} weight={urgent ? 'fill' : 'bold'} className={lv.tone} aria-hidden />
        <b className={cn('text-base font-bold', lv.tone)}>{label ?? lv.label}</b>
        {(meta || time) && (
          <span className={cn('ml-auto text-xs tabular-nums', urgent ? 'text-white' : 'text-t3')}>{meta ?? `ศูนย์บัญชาการ ${time}`}</span>
        )}
      </span>
      <p className={cn('pl-6 font-body text-md', urgent && 'font-medium')}>{text}</p>
    </div>
  );
}
