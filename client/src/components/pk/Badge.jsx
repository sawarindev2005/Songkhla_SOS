import { cn } from './cn';

export const TONE_TEXT = {
  red: 'text-red',
  amber: 'text-amb-tx',
  orange: 'text-org-tx',
  accent: 'text-acc',
  ok: 'text-ok',
  gray: 'text-t3',
};

/** สถานะเป็นตัวหนังสือสี มีไอคอนนำหน้าเพื่อไม่ให้สื่อด้วยสีอย่างเดียว  boxed = ป้ายกรอบเทาสำหรับคำกำกับทั่วไป */
export function Badge({ tone = 'gray', icon, boxed = false, children, className }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap',
      boxed && 'rounded-xs border border-line2 px-1.5 py-px text-xs font-medium',
      TONE_TEXT[tone], className,
    )}>
      {icon}
      {children}
    </span>
  );
}
