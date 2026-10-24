'use client';
import { usePathname } from 'next/navigation';
import { NetBar } from './NetBar';
import { PublicTopBar } from './PublicTopBar';
import { TabBar } from './TabBar';
import { ToastProvider } from './Toast';
import { useOnline } from './useOnline';
import { ROLE_HOME, useAuth } from '@/lib/auth';
import { PUBLIC_LOGIN, PUBLIC_SOS, PUBLIC_TABS, staffTab } from './nav-items';
import { cn } from './cn';

// โครงหน้าคนทั่วไป: มือถือ = กว้างไม่เกินจอมือถือ แถบบน + เนื้อหา + แถบเมนูล่าง | ตั้งแต่ md (แท็บเล็ต/คอม) = เต็มจอ เมนูย้ายขึ้นแถบบน
export function PublicShell({ children, className }) {
  const path = usePathname();
  const online = useOnline();
  const { user } = useAuth();
  const staffHome = user ? ROLE_HOME[user.role] : null;
  const tabs = [...PUBLIC_TABS, staffHome ? staffTab(staffHome) : PUBLIC_LOGIN];
  return (
    <div data-ui="public" className={cn('min-h-dvh bg-page font-ui text-ink', className)}>
      <ToastProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1000] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2"
        >
          ข้ามไปยังเนื้อหาหลัก
        </a>
        <div className="mx-auto flex h-dvh max-w-120 flex-col bg-white sm:border-x sm:border-line md:max-w-none md:border-x-0">
          <PublicTopBar items={tabs} sos={PUBLIC_SOS} path={path} />
          <NetBar online={online} />
          <main id="main" className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {children}
          </main>
          <div className="md:hidden">
            <TabBar items={tabs} center={PUBLIC_SOS} path={path} />
          </div>
        </div>
      </ToastProvider>
    </div>
  );
}
