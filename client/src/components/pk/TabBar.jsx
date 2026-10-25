'use client';
import { useState } from 'react';
import Link from 'next/link';
import { cn } from './cn';

const LABEL_SIZE = 'text-[clamp(10px,calc(3.75vw-1px),13px)]';

export function isActive(item, path) {
  return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/');
}

function Tab({ item, on }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} aria-current={on ? 'page' : undefined} aria-label={item.mobileLabel ? item.label : undefined}
      className={cn('relative grid min-w-0 flex-1 grid-rows-[36px_1fr] justify-items-center text-center no-underline', LABEL_SIZE, on ? 'font-semibold text-acc' : 'font-medium text-t3')}>
      {on && <span aria-hidden className="absolute top-0 h-0.75 w-7 rounded-full bg-acc" />}
      <Icon size={24} weight={on ? 'fill' : 'regular'} aria-hidden className="mt-2.25" />
      <span className="whitespace-nowrap">{item.mobileLabel || item.label}</span>
      {item.badge ? <span className="absolute top-1.5 left-[calc(50%+6px)] grid size-4 place-items-center rounded-full bg-red text-2xs font-bold text-white tabular-nums">{item.badge}</span> : null}
    </Link>
  );
}

export function TabBar({ items, path, center, label = 'เมนูหลัก' }) {
  const [sosPress, setSosPress] = useState(0);
  const half = Math.ceil(items.length / 2);
  const C = center?.icon;
  const centerOn = center ? isActive(center, path) : false;
  return (
    <nav aria-label={label} className="relative z-[700] h-[calc(62px+env(safe-area-inset-bottom))] shrink-0 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <div className={cn('mx-auto h-full w-full px-1', center && C
        ? 'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_clamp(88px,calc(30vw+4px),112px)_minmax(0,1fr)_minmax(0,1fr)]'
        : 'flex')}>
        {items.slice(0, half).map(i => <Tab key={i.href} item={i} on={isActive(i, path)} />)}
        {center && C && (
          <Link href={center.href} aria-current={centerOn ? 'page' : undefined}
            onClick={() => setSosPress(n => n + 1)}
            className={cn('relative grid min-w-0 grid-rows-[36px_1fr] justify-items-center text-center font-semibold text-red no-underline', LABEL_SIZE)}>
            <span data-form-occluder aria-hidden className="relative -top-8 grid size-16 shrink-0 place-items-center rounded-full border-4 border-white bg-red text-white shadow-sos">
              <C key={sosPress} size={30} weight="fill" className={sosPress ? 'origin-top motion-safe:animate-sos-shake' : undefined} />
            </span>
            <span className="whitespace-nowrap">{center.label}</span>
          </Link>
        )}
        {items.slice(half).map(i => <Tab key={i.href} item={i} on={isActive(i, path)} />)}
      </div>
    </nav>
  );
}
