import PublicNav from '@/components/PublicNav';

export default function PublicLayout({ children }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[2000] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        ข้ามไปยังเนื้อหาหลัก
      </a>
      <main id="main" className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <PublicNav />
    </>
  );
}
