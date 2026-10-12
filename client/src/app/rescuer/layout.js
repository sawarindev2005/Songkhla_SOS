'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardList, LogOut, Map } from 'lucide-react';
import { Spinner, cx } from '@/components/ui';
import { useAuth, useRequireRole } from '@/lib/auth';

const ROLES = ['rescuer'];

const ITEMS = [
  { href: '/rescuer', label: 'แผนที่เคส', icon: Map },
  { href: '/rescuer/missions', label: 'ภารกิจของฉัน', icon: ClipboardList },
];

export default function RescuerLayout({ children }) {
  const { allowed } = useRequireRole(ROLES);
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!allowed) return <Spinner className="min-h-dvh" label="กำลังตรวจสอบสิทธิ์…" />;

  return (
    <>
      <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">{children}</main>
      <nav aria-label="เมนูกู้ภัย" className="pb-safe fixed inset-x-0 bottom-0 z-[1000] border-t border-line bg-surface">
        <ul className="mx-auto grid h-16 max-w-xl grid-cols-3">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex h-full flex-col items-center justify-center gap-0.5 text-xs font-medium',
                    active ? 'text-safety-dark' : 'text-muted hover:text-ink'
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted hover:text-ink"
            >
              <LogOut className="size-6" aria-hidden />
              ออกจากระบบ
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
