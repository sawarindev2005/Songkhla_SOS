import { cn } from './cn';

const SIZE = { 36: 'size-9', 40: 'size-10', 44: 'size-11', 52: 'size-13' };
const TONE = {
  plain: 'text-ink',
  surface: 'bg-s2 text-t2',
  float: 'bg-white text-ink shadow-float',
  outline: 'border border-line2 bg-white text-ink',
};

export function IconButton({ label, size = 44, tone = 'plain', href, className, children, type = 'button', ...rest }) {
  const cls = cn(
    'grid shrink-0 place-items-center no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc disabled:text-t4',
    tone === 'outline' ? 'rounded-lg' : 'rounded-full',
    SIZE[size], TONE[tone], className,
  );
  if (href) {
    const web = /^https?:/.test(href);
    return (
      <a href={href} aria-label={label} className={cls} target={web ? '_blank' : undefined} rel={web ? 'noopener noreferrer' : undefined}>
        {children}
      </a>
    );
  }
  return <button type={type} aria-label={label} className={cls} {...rest}>{children}</button>;
}
