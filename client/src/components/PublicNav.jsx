'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSearch, House, Map, Package, Siren } from 'lucide-react';
import { cx } from './ui';

const ITEMS = [
  { href: '/', label: 'ภาพรวม', icon: Map },
  { href: '/distributions', label: 'แจกจ่าย', icon: Package },
  { href: '/request', label: 'ขอความช่วยเหลือ', icon: Siren, primary: true },
  { href: '/track', label: 'เคสของฉัน', icon: FileSearch },
  { href: '/shelters', label: 'ที่พักพิง', icon: House },
];

// Bottom navigation สำหรับประชาชน (mobile) — บนจอใหญ่ยังแสดงด้านล่างแต่จำกัดความกว้าง
export default function PublicNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="เมนูหลัก"
      className="pb-safe fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface/95 backdrop-blur"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, primary }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          if (primary) {
            return (
              <li key={href} className="flex justify-center">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className="-mt-6 flex flex-col items-center gap-0.5"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-brand text-white shadow-lg ring-4 ring-surface transition-transform duration-150 active:scale-95">
                    <Icon className="size-7" aria-hidden />
                  </span>
                  <span className="text-[11px] font-bold leading-tight text-brand-dark">{label}</span>
                </Link>
              </li>
            );
          }
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'relative flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors',
                  active ? 'text-safety-dark' : 'text-muted hover:text-ink'
                )}
              >
                {active && <span className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-safety" aria-hidden />}
                <Icon className="size-6" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
