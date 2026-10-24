import Link from 'next/link';
import { LifebuoyIcon } from './icons';
import { isActive } from './TabBar';
import { cn } from './cn';

// แถบบนของหน้าคนทั่วไป: ชื่อระบบ | ตั้งแต่ md มีเมนูหลักอยู่ในแถบนี้แทนแถบเมนูล่าง
export function PublicTopBar({ items = [], sos, path = '' }) {
  const SosIcon = sos?.icon;
  return (
    <header className="relative z-[700] flex h-14 shrink-0 items-center gap-6 border-b border-line bg-white px-4 md:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2 text-ink no-underline">
        <LifebuoyIcon size={24} weight="fill" className="shrink-0 text-red" aria-hidden />
        <span className="truncate text-lg font-bold">ช่วยน้ำท่วมหาดใหญ่</span>
      </Link>
      <nav aria-label="เมนูหลัก" className="ml-auto hidden items-center gap-1 md:flex">
        {items.map((item) => {
          const Icon = item.icon;
          const on = isActive(item, path);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex min-h-10 items-center gap-2 rounded-lg px-3 text-md no-underline hover:bg-s2',
                on ? 'font-semibold text-acc' : 'font-medium text-t2',
              )}
            >
              <Icon size={20} weight={on ? 'fill' : 'regular'} aria-hidden />
              {item.label}
            </Link>
          );
        })}
        {sos && SosIcon && (
          <Link
            href={sos.href}
            aria-current={isActive(sos, path) ? 'page' : undefined}
            className="ml-2 flex min-h-10 items-center gap-2 rounded-full bg-red px-4 text-md font-semibold text-white no-underline shadow-sos"
          >
            <SosIcon size={20} weight="fill" aria-hidden />
            {sos.label}
          </Link>
        )}
      </nav>
    </header>
  );
}
