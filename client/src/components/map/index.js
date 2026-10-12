'use client';

import dynamic from 'next/dynamic';

// Leaflet ใช้ window → โหลดเฉพาะฝั่ง browser
export const MapView = dynamic(() => import('./MapViewInner'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-slate-100 text-sm text-muted">
      กำลังโหลดแผนที่…
    </div>
  ),
});
