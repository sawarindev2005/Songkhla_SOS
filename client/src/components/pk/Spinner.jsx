import { CircleNotchIcon } from './icons';
import { cn } from './cn';

export function Spinner({ label = 'กำลังโหลด…', className }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-8 text-t3', className)}>
      <CircleNotchIcon size={20} className="animate-spin" aria-hidden />
      <span className="text-base">{label}</span>
    </div>
  );
}
