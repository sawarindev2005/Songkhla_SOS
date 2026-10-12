'use client';

import { useMemo, useState } from 'react';
import { House, Package } from 'lucide-react';
import { MapView } from './map';
import { DistributionDetail, ShelterDetail } from './Details';
import { EmptyState, ErrorBanner, Spinner, cx } from './ui';
import { usePolling } from '@/hooks/usePolling';
import { distanceKm } from '@/lib/format';

const CONFIG = {
  shelter: {
    path: '/shelters',
    title: 'ที่พักพิง',
    desc: 'ศูนย์พักพิงชั่วคราวที่เปิดรับผู้ประสบภัย',
    openStatus: 'open',
    openLabel: 'เฉพาะที่เปิดรับ',
    icon: House,
    Detail: ShelterDetail,
    mapProp: 'shelters',
  },
  distribution: {
    path: '/distributions',
    title: 'จุดแจกจ่ายอาหารและสิ่งของ',
    desc: 'จุดรับอาหาร น้ำดื่ม ยา และถุงยังชีพ',
    openStatus: 'active',
    openLabel: 'เฉพาะที่เปิดแจก',
    icon: Package,
    Detail: DistributionDetail,
    mapProp: 'distributions',
  },
};

export default function PlaceBrowser({ type }) {
  const cfg = CONFIG[type];
  const { data, error, loading, refresh } = usePolling(cfg.path);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [me, setMe] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);

  const places = useMemo(() => {
    const list = (data || [])
      .filter((p) => !onlyOpen || p.status === cfg.openStatus)
      .map((p) => ({ ...p, distance: distanceKm(me, p) }));
    if (me) list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [data, onlyOpen, me, cfg.openStatus]);

  function choose(p) {
    setSelectedId(p.id);
    setFocus({ lat: p.lat, lng: p.lng });
    document.getElementById(`place-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const Detail = cfg.Detail;

  return (
    <div className="mx-auto max-w-6xl md:grid md:grid-cols-[1fr_26rem] md:gap-6 md:px-6 md:py-6">
      <div className="sticky top-0 z-10 h-56 md:top-6 md:h-[calc(100dvh-7rem)] md:overflow-hidden md:rounded-2xl md:border md:border-line">
        <MapView
          {...{ [cfg.mapProp]: places }}
          selected={selectedId ? { type, id: selectedId } : null}
          onSelect={(_, p) => choose(p)}
          focus={focus}
          me={me}
          onLocate={setMe}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 py-5 md:px-0 md:py-0">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{cfg.title}</h1>
            <p className="text-sm text-muted">{cfg.desc}</p>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-5 accent-safety"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
            />
            {cfg.openLabel}
          </label>
          <p className="text-sm text-muted">
            {me ? 'เรียงจากใกล้ที่สุด' : 'กดปุ่มตำแหน่งบนแผนที่เพื่อเรียงตามระยะทาง'}
          </p>
        </div>

        <ErrorBanner error={error} onRetry={refresh} />
        {loading && <Spinner />}
        {!loading && places.length === 0 && <EmptyState icon={cfg.icon} title="ยังไม่มีข้อมูล" />}

        <ul className="flex flex-col gap-3">
          {places.map((p) => (
            <li
              key={p.id}
              id={`place-${p.id}`}
              className={cx(
                'scroll-mt-60 rounded-2xl border bg-surface p-4 transition-shadow',
                selectedId === p.id ? 'border-safety shadow-md ring-2 ring-safety/20' : 'border-line'
              )}
            >
              <button
                type="button"
                onClick={() => choose(p)}
                className="sr-only focus:not-sr-only focus:mb-2 focus:block focus:text-sm focus:font-semibold focus:text-safety"
              >
                แสดง {p.name} บนแผนที่
              </button>
              <div onClick={() => choose(p)} className="cursor-pointer">
                <Detail place={p} distance={p.distance} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
