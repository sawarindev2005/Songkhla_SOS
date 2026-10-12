'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChartColumn,
  House,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Map,
  Menu,
  Package,
  Route,
  Users,
  X,
} from 'lucide-react';
import { Spinner, cx } from './ui';
import { ROLE_LABEL, useAuth, useRequireRole } from '@/lib/auth';

const COMMAND_ITEMS = [
  { href: '/command', label: 'Dashboard ศูนย์บัญชาการ', icon: LayoutDashboard },
  { href: '/command/assign', label: 'มอบหมายเคส', icon: Route },
  { href: '/command/shelters', label: 'จัดการที่พักพิง', icon: House },
  { href: '/command/distributions', label: 'จัดการจุดแจกจ่าย', icon: Package },
];

const ADMIN_ITEMS = [
  { href: '/admin', label: 'ภาพรวมทั้งระบบ', icon: ChartColumn },
  { href: '/admin/users', label: 'จัดการบัญชีผู้ใช้', icon: Users },
];

function NavList({ items, pathname, onNavigate }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default function StaffShell({ roles, children }) {
  const { user, allowed } = useRequireRole(roles);
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!allowed) return <Spinner className="min-h-dvh" label="กำลังตรวจสอบสิทธิ์…" />;

  const close = () => setOpen(false);
  const sidebar = (
    <div className="flex h-full flex-col gap-6 bg-ink p-4 text-white">
      <div className="flex items-center gap-3 px-1">
        <span className="grid size-10 place-items-center rounded-xl bg-brand">
          <LifeBuoy className="size-5" aria-hidden />
        </span>
        <div className="leading-tight">
          <p className="font-bold">น้ำท่วมหาดใหญ่</p>
          <p className="text-xs text-slate-400">ระบบสั่งการช่วยเหลือ</p>
        </div>
      </div>

      <nav aria-label="เมนูเจ้าหน้าที่" className="flex flex-1 flex-col gap-5 overflow-y-auto">
        {user.role === 'admin' && (
          <div>
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">ผู้ดูแลระบบ</p>
            <NavList items={ADMIN_ITEMS} pathname={pathname} onNavigate={close} />
          </div>
        )}
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">ศูนย์บัญชาการ</p>
          <NavList items={COMMAND_ITEMS} pathname={pathname} onNavigate={close} />
        </div>
        <div>
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">หน้าสาธารณะ</p>
          <NavList items={[{ href: '/', label: 'แผนที่ประชาชน', icon: Map }]} pathname={pathname} onNavigate={close} />
        </div>
      </nav>

      <div className="rounded-xl bg-white/5 p-3">
        <p className="truncate text-sm font-semibold">{user.full_name}</p>
        <p className="truncate text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
        <button
          type="button"
          onClick={() => {
            logout();
            router.replace('/login');
          }}
          className="mt-2 flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-4" aria-hidden />
          ออกจากระบบ
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-64 lg:block">{sidebar}</aside>

      {/* mobile/tablet top bar */}
      <header className="sticky top-0 z-[900] flex h-14 items-center gap-3 border-b border-line bg-surface px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
          aria-expanded={open}
          className="grid size-11 cursor-pointer place-items-center rounded-xl hover:bg-slate-100"
        >
          <Menu className="size-6" aria-hidden />
        </button>
        <p className="font-bold">น้ำท่วมหาดใหญ่ · {ROLE_LABEL[user.role]}</p>
      </header>

      {open && (
        <div className="fixed inset-0 z-[1200] lg:hidden" role="dialog" aria-modal="true" aria-label="เมนู">
          <button type="button" aria-label="ปิดเมนู" className="absolute inset-0 bg-slate-900/50" onClick={close} />
          <div className="relative h-full w-72 max-w-[85vw]">
            {sidebar}
            <button
              type="button"
              onClick={close}
              aria-label="ปิดเมนู"
              className="absolute right-2 top-3 grid size-10 cursor-pointer place-items-center rounded-full text-slate-300 hover:bg-white/10"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">{children}</main>
    </div>
  );
}

export function PageHeader({ title, desc, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {desc && <p className="text-sm text-muted">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
