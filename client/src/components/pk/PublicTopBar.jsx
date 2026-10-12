import Link from 'next/link';
import { LifebuoyIcon } from './icons';

// แถบบนของหน้าคนทั่วไป: ชื่อระบบ
export function PublicTopBar() {
  return (
    <header className="relative z-[700] flex h-14 shrink-0 items-center border-b border-line bg-white px-4">
      <Link href="/" className="flex min-w-0 items-center gap-2 text-ink no-underline">
        <LifebuoyIcon size={24} weight="fill" className="shrink-0 text-red" aria-hidden />
        <span className="truncate text-lg font-bold">ช่วยน้ำท่วมหาดใหญ่</span>
      </Link>
    </header>
  );
}
