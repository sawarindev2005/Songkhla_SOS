import Link from 'next/link';
import { cn } from './cn';

export function isActive(item, path) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/');
}

function Tab({ item, on }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={on ? 'page' : undefined}
      className={cn('relative flex flex-1 flex-col items-center gap-1 pt-2.25 text-xs no-underline', on ? 'font-semibold text-acc' : 'font-medium text-t3')}>
      {on && <span aria-hidden className="absolute top-0 h-0.75 w-7 rounded-full bg-acc" />}
      <Icon size={24} weight={on ? 'fill' : 'regular'} aria-hidden />
      {item.label}
      {item.badge ? <span className="absolute top-1.5 left-[calc(50%+6px)] grid size-4 place-items-center rounded-full bg-red text-2xs font-bold text-white tabular-nums">{item.badge}</span> : null}
    </Link>
  );
}

export function TabBar({ items, path, center, label = 'เมนูหลัก' }) {
  const half = Math.ceil(items.length / 2);
  const C = center?.icon;
  return (
    <nav aria-label={label} className="relative z-[700] flex h-[calc(62px+env(safe-area-inset-bottom))] shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      {items.slice(0, half).map(i => <Tab key={i.href} item={i} on={isActive(i, path)} />)}
      {center && C && (
        <Link href={center.href} aria-current={isActive(center, path) ? 'page' : undefined}
          className="flex flex-1 flex-col items-center gap-1 text-xs font-semibold text-red no-underline">
          <span aria-hidden className="-mt-5.5 grid size-13.5 place-items-center rounded-full border-4 border-white bg-red text-white shadow-sos">
            <C size={26} weight="fill" />
          </span>
          {center.label}
        </Link>
      )}
      {items.slice(half).map(i => <Tab key={i.href} item={i} on={isActive(i, path)} />)}
    </nav>
  );
}
