import Link from 'next/link';
import { LifebuoyIcon } from './icons';
import { isActive } from './TabBar';
import { cn } from './cn';

// เมนูหลักบนจอกว้าง: แถบไอคอนแนวตั้งชิดซ้าย แบบ Google Maps แทนแถบเมนูล่างของมือถือ
// รายการชุดเดียวกับ TabBar  ขอช่วยเหลือ (center) เป็นปุ่มแดงเด่นอยู่บนสุดของรายการ
function RailLink({ item, on, sos = false }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={on ? 'page' : undefined}
      className={cn(
        'flex w-full flex-col items-center gap-1 px-1 py-2 text-center text-xs no-underline',
        sos ? 'font-semibold text-red' : on ? 'font-semibold text-acc' : 'font-medium text-t2 hover:text-ink',
      )}
    >
      <span
        className={cn(
          'grid place-items-center rounded-full',
          sos ? 'size-12 bg-red text-white shadow-sos' : cn('h-8 w-14', on ? 'bg-acc-bg' : 'hover:bg-s2'),
        )}
      >
        <Icon size={sos ? 26 : 22} weight={sos || on ? 'fill' : 'regular'} aria-hidden />
      </span>
      {item.label}
    </Link>
  );
}

export function SideRail({ items, center, path, label = 'เมนูหลัก', className }) {
  return (
    <nav aria-label={label} className={cn('w-22 shrink-0 flex-col items-center gap-2 border-r border-line bg-white py-3', className)}>
      <Link href="/" aria-label="ช่วยน้ำท่วมหาดใหญ่ หน้าแรก" className="mb-2 grid size-11 place-items-center">
        <LifebuoyIcon size={30} weight="fill" className="text-red" aria-hidden />
      </Link>
      {center && <RailLink item={center} on={isActive(center, path)} sos />}
      {items.map((i) => (
        <RailLink key={i.href} item={i} on={isActive(i, path)} />
      ))}
    </nav>
  );
}
