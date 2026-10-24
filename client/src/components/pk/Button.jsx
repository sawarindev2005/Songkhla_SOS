import Link from 'next/link';
import { CircleNotchIcon } from './icons';
import { cn } from './cn';

const VARIANT = {
  primary: 'rounded-lg font-semibold bg-acc text-white',
  danger: 'rounded-lg font-semibold bg-red text-white',
  // ลบ / คืนเคส ในรายการ: เตือนด้วยสีแดงแต่ไม่แย่งสายตาเท่าปุ่มหลัก
  dangerOutline: 'rounded-lg font-semibold border border-red-line bg-white text-red-tx hover:bg-red-bg',
  ghost: 'rounded-lg font-semibold text-t2 hover:bg-s2 hover:text-ink',
  success: 'rounded-lg font-semibold bg-ok text-white',
  ink: 'rounded-lg font-semibold bg-ink text-white',
  outline: 'rounded-lg font-semibold border border-line2 bg-white text-ink',
  line: 'rounded-lg font-semibold bg-line-g text-white',
  float: 'rounded-full bg-white font-medium text-ink shadow-float',
};
const SIZE = {
  md: 'px-4 py-3.5 text-lg short:py-2.75',
  sm: 'px-3.5 py-2.5 text-md',
};

export function buttonClass({ variant = 'primary', size = 'md', block = true, disabled = false, className } = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 text-center no-underline select-none',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc',
    SIZE[size],
    block && 'w-full',
    disabled ? 'cursor-not-allowed rounded-lg bg-s2 font-semibold text-t4' : cn(VARIANT[variant], 'active:translate-y-px'),
    className,
  );
}

export function Button({ variant, size, icon, block, className, children, href, external, loading = false, disabled, type = 'button', ...rest }) {
  if (typeof href === 'string') {
    const cls = buttonClass({ variant, size, block, className });
    const content = <>{icon}{children}</>;
    if (external || /^(tel:|sms:|mailto:|https?:)/.test(href)) {
      const web = /^https?:/.test(href);
      return (
        <a href={href} className={cls} target={web ? '_blank' : undefined} rel={web ? 'noopener noreferrer' : undefined} {...rest}>
          {content}
        </a>
      );
    }
    return <Link href={href} className={cls} {...rest}>{content}</Link>;
  }
  const off = disabled || loading;
  return (
    <button type={type} disabled={off} aria-busy={loading || undefined} className={buttonClass({ variant, size, block, disabled: off, className })} {...rest}>
      {loading ? <CircleNotchIcon size={20} className="animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}
