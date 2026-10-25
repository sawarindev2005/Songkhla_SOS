'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CircleNotchIcon, ClipboardTextIcon, MapTrifoldIcon, SignOutIcon } from '@/components/pk/icons';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { ToastProvider } from '@/components/pk/Toast';
import { Spinner } from '@/components/pk/Spinner';
import { cn } from '@/components/pk/cn';
import { useLogout, useRequireRole } from '@/lib/auth';

const ROLES = ['rescuer'];

const ITEMS = [
  { href: '/rescuer', label: 'แผนที่เคส', icon: MapTrifoldIcon },
  { href: '/rescuer/missions', label: 'ภารกิจของฉัน', icon: ClipboardTextIcon },
];

const TAB = 'relative flex h-full w-full flex-col items-center justify-center gap-1 text-xs';

export default function RescuerLayout({ children }) {
  const { allowed } = useRequireRole(ROLES);
  const { signOut, pending: loggingOut, error: logoutError } = useLogout();
  const pathname = usePathname();

  if (!allowed) return <Spinner className="min-h-dvh" label="กำลังตรวจสอบสิทธิ์…" />;

  return (
    <ToastProvider>
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav aria-label="เมนูกู้ภัย" className="pb-safe fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-white">
        {logoutError && <div className="mx-auto max-w-xl px-3 pt-3"><ErrorBanner error={logoutError} /></div>}
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-3">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(TAB, active ? 'font-semibold text-acc' : 'font-medium text-t3 hover:text-ink')}
                >
                  {active && <span aria-hidden className="absolute top-0 h-0.75 w-7 rounded-full bg-acc" />}
                  <Icon size={24} weight={active ? 'fill' : 'regular'} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={signOut}
              disabled={loggingOut}
              aria-busy={loggingOut || undefined}
              className={cn(TAB, 'cursor-pointer font-medium text-t3 hover:text-ink disabled:cursor-wait disabled:opacity-60')}
            >
              {loggingOut ? <CircleNotchIcon size={24} className="animate-spin" aria-hidden /> : <SignOutIcon size={24} aria-hidden />}
              {loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}
            </button>
          </li>
        </ul>
      </nav>
    </ToastProvider>
  );
}
