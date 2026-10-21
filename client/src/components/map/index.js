'use client';

import dynamic from 'next/dynamic';

// Leaflet ใช้ window → โหลดเฉพาะฝั่ง browser
export const MapView = dynamic(() => import('./MapViewInner'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-map text-base text-t3">
      กำลังโหลดแผนที่…
    </div>
  ),
});
