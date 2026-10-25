'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChartBarIcon,
  CircleNotchIcon,
  HouseLineIcon,
  LifebuoyIcon,
  ListIcon,
  MapTrifoldIcon,
  MegaphoneIcon,
  PackageIcon,
  PathIcon,
  SignOutIcon,
  SquaresFourIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from './pk/icons';
import { Spinner } from './pk/Spinner';
import { ErrorBanner } from './pk/ErrorBanner';
import { ToastProvider } from './pk/Toast';
import { cn } from './pk/cn';
import { usePolling } from '@/hooks/usePolling';
import { ROLE_LABEL, useLogout, useRequireRole } from '@/lib/auth';

const COMMAND_ITEMS = [
  { href: '/command', label: 'Dashboard ศูนย์บัญชาการ', icon: SquaresFourIcon },
  { href: '/command/assign', label: 'มอบหมายเคส', icon: PathIcon },
  { href: '/command/applications', label: 'อนุมัติอาสากู้ภัย', icon: UserPlusIcon },
  { href: '/command/shelters', label: 'จัดการที่พักพิง', icon: HouseLineIcon },
  { href: '/command/distributions', label: 'จัดการจุดแจกจ่าย', icon: PackageIcon },
];

const ADMIN_ITEMS = [
  { href: '/admin', label: 'ภาพรวมทั้งระบบ', icon: ChartBarIcon },
  { href: '/admin/users', label: 'จัดการบัญชีผู้ใช้', icon: UsersIcon },
  { href: '/admin/announcements', label: 'จัดการประกาศ', icon: MegaphoneIcon },
];

// badges = { [href]: จำนวน } แสดงตัวเลขท้ายเมนู เช่น ใบสมัครที่รออนุมัติ
function NavList({ items, pathname, onNavigate, badges = {} }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const count = badges[href];
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-base transition-colors',
                active ? 'bg-acc-bg font-semibold text-acc' : 'font-medium text-t2 hover:bg-s2 hover:text-ink'
              )}
            >
              <Icon size={20} weight={active ? 'fill' : 'regular'} className="shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{label}</span>
              {count > 0 && (
                <span className="rounded-full bg-red px-2 py-0.5 text-xs font-bold text-white tabular-nums">
                  {count}
                  <span className="sr-only"> รายการรอดำเนินการ</span>
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NavGroup({ title, children }) {
  return (
    <div>
      <p className="mb-2 px-3 text-xs font-semibold text-t3">{title}</p>
      {children}
    </div>
  );
}

export default function StaffShell({ roles, children }) {
  const { user, allowed } = useRequireRole(roles);
  const { signOut, pending: loggingOut, error: logoutError } = useLogout();
  const { data: pending } = usePolling('/applications/pending-count', { interval: 60000, enabled: allowed });
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    if (open && allowed) {
      if (!dialog.open) dialog.showModal();
      dialog.querySelector('nav a, button')?.focus({ preventScroll: true });
    } else if (dialog.open) {
      dialog.close();
      menuButtonRef.current?.focus({ preventScroll: true });
    }
  }, [open, allowed]);

  // เมนูมือถือซ่อนด้วย lg:hidden แต่ dialog แบบ modal ยังบล็อกหน้า → ปิดเมื่อหน้าต่างกว้างขึ้น
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => mq.matches && setOpen(false);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!allowed) return <Spinner className="min-h-dvh" label="กำลังตรวจสอบสิทธิ์…" />;

  const close = () => setOpen(false);
  const sidebar = (
    <div className="flex h-full flex-col gap-6 border-r border-line bg-white p-4 text-ink">
      <div className="flex items-center gap-2 px-1">
        <LifebuoyIcon size={28} weight="fill" className="shrink-0 text-red" aria-hidden />
        <div>
          <p className="text-2xl font-bold">ช่วยน้ำท่วมหาดใหญ่</p>
          <p className="text-xs text-t3">ระบบสั่งการช่วยเหลือ</p>
        </div>
      </div>

      <nav aria-label="เมนูเจ้าหน้าที่" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {user.role === 'admin' && (
          <NavGroup title="ผู้ดูแลระบบ">
            <NavList items={ADMIN_ITEMS} pathname={pathname} onNavigate={close} />
          </NavGroup>
        )}
        <NavGroup title="ศูนย์บัญชาการ">
          <NavList
            items={COMMAND_ITEMS}
            pathname={pathname}
            onNavigate={close}
            badges={{ '/command/applications': pending?.count }}
          />
        </NavGroup>
        <NavGroup title="หน้าสาธารณะ">
          <NavList items={[{ href: '/', label: 'แผนที่ประชาชน', icon: MapTrifoldIcon }]} pathname={pathname} onNavigate={close} />
        </NavGroup>
      </nav>

      <div className="rounded-lg bg-s2 p-3">
        <p className="truncate text-base font-semibold">{user.full_name}</p>
        <p className="truncate text-xs text-t3">{ROLE_LABEL[user.role]}</p>
        {logoutError && <div className="mt-3"><ErrorBanner error={logoutError} /></div>}
        <button
          type="button"
          onClick={signOut}
          disabled={loggingOut}
          aria-busy={loggingOut || undefined}
          className="mt-2 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-base font-medium text-t2 hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {loggingOut ? <CircleNotchIcon size={18} className="animate-spin" aria-hidden /> : <SignOutIcon size={18} aria-hidden />}
          {loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
        </button>
      </div>
    </div>
  );

  return (
    <ToastProvider>
    <div className="min-h-dvh lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-72 lg:block">{sidebar}</aside>

      {/* mobile/tablet top bar */}
      <header className="sticky top-0 z-[900] flex h-14 items-center gap-2 border-b border-line bg-white px-2 lg:hidden">
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          aria-expanded={open}
          className="grid size-11 cursor-pointer place-items-center rounded-full hover:bg-s2"
        >
          <ListIcon size={24} aria-hidden />
        </button>
        <LifebuoyIcon size={24} weight="fill" className="shrink-0 text-red" aria-hidden />
        <p className="truncate text-2xl font-bold">{ROLE_LABEL[user.role]}</p>
      </header>

      <dialog
        ref={menuRef}
        aria-label="เมนู"
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/50 lg:hidden"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          const items = Array.from(e.currentTarget.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]'));
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus({ preventScroll: true });
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus({ preventScroll: true });
          }
        }}
      >
        {open && (
          <div className="relative h-full w-72 max-w-[85vw]">
            {sidebar}
            <button
              type="button"
              onClick={close}
              aria-label="ปิดเมนู"
              className="absolute right-2 top-3 grid size-10 cursor-pointer place-items-center rounded-full text-t2 hover:bg-s2"
            >
              <XIcon size={20} aria-hidden />
            </button>
          </div>
        )}
      </dialog>

      <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">{children}</main>
    </div>
    </ToastProvider>
  );
}

export function PageHeader({ title, desc, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-6xl font-bold">{title}</h1>
        {desc && <p className="text-base text-t2">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
