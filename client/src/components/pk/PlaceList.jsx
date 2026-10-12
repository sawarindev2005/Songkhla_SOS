'use client';

import { useMemo, useState } from 'react';
import { MapView } from '@/components/map';
import { usePolling } from '@/hooks/usePolling';
import { distanceKm, formatDistance, formatNumber } from '@/lib/format';
import { CaretLeftIcon, CircleNotchIcon, CrosshairIcon, HouseLineIcon, MagnifyingGlassIcon, PackageIcon, WarningIcon } from './icons';
import { PlaceRow } from './CaseCard';
import { Chip, ChipRow } from './Chip';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { MapSheet } from './MapSheet';
import { DistributionPublicDetail, ShelterPublicDetail } from './PublicDetail';
import { SearchField } from './TextField';
import { useToast } from './Toast';
import { PlaceStatusBadge } from './domain';

const CONFIG = {
  shelter: {
    path: '/shelters',
    title: 'ที่พักพิง',
    desc: 'ศูนย์พักพิงชั่วคราวที่เปิดรับผู้ประสบภัย',
    openStatus: 'open',
    openLabel: 'เปิดรับ',
    icon: HouseLineIcon,
    Detail: ShelterPublicDetail,
    mapProp: 'shelters',
    searchHint: 'ค้นหาชื่อหรือที่อยู่',
    meta: (p) => `ว่าง ${formatNumber(Math.max(p.capacity - p.current_occupancy, 0))} จาก ${formatNumber(p.capacity)} ที่`,
  },
  distribution: {
    path: '/distributions',
    title: 'จุดแจกจ่าย',
    desc: 'จุดรับอาหาร น้ำดื่ม ยา และถุงยังชีพ',
    openStatus: 'active',
    openLabel: 'เปิดแจก',
    icon: PackageIcon,
    Detail: DistributionPublicDetail,
    mapProp: 'distributions',
    searchHint: 'ค้นหาชื่อ ที่อยู่ หรือของที่แจก',
    meta: (p) => p.supply_types || p.address || '',
  },
};

/** หน้ารายการสถานที่ของคนทั่วไป: แผนที่เต็มจอ + แผ่นข้อมูลด้านล่าง */
export function PlaceList({ type }) {
  const cfg = CONFIG[type];
  const toast = useToast();
  const { data, error, loading, refresh } = usePolling(cfg.path);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const places = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data || [])
      .filter((p) => !onlyOpen || p.status === cfg.openStatus)
      .filter((p) => !q || [p.name, p.address, p.supply_types].some((v) => v?.toLowerCase().includes(q)))
      .map((p) => ({ ...p, distance: distanceKm(me, p) }));
    if (me) list.sort((a, b) => a.distance - b.distance);
    return list;
  }, [data, onlyOpen, query, me, cfg.openStatus]);

  const selected = selectedId != null ? (data || []).find((p) => p.id === selectedId) : null;
  const Icon = cfg.icon;
  const Detail = cfg.Detail;

  function choose(p) {
    setSelectedId(p.id);
    setFocus({ lat: p.lat, lng: p.lng });
    setCollapsed(false);
  }

  function locateMe() {
    if (!navigator.geolocation) {
      toast('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMe(p);
        setFocus({ ...p, zoom: 15 });
      },
      () => {
        setLocating(false);
        toast('ระบุตำแหน่งไม่ได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง', 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <>
      <div className="absolute inset-0 isolate">
        <MapView
          pinStyle="public"
          {...{ [cfg.mapProp]: places }}
          selected={selectedId != null ? { type, id: selectedId } : null}
          onSelect={(_, p) => choose(p)}
          focus={focus}
          me={me}
          locate={false}
        />
      </div>

      <MapSheet
        label={cfg.title}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        toolbar={
          <>
            <span />
            <IconButton label="ไปยังตำแหน่งของฉัน" tone="float" onClick={locateMe} disabled={locating}>
              {locating ? <CircleNotchIcon size={22} className="animate-spin" aria-hidden /> : <CrosshairIcon size={22} aria-hidden />}
            </IconButton>
          </>
        }
        summary={
          <p className="flex items-baseline justify-between gap-3 pb-1">
            <span className="text-lg font-bold">{cfg.title}</span>
            <span className="text-md text-t2 tabular-nums">{places.length} แห่ง</span>
          </p>
        }
      >
        {selected ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="-ml-1 flex min-h-11 w-fit items-center gap-1 px-1 text-md font-semibold text-acc"
            >
              <CaretLeftIcon size={18} weight="bold" aria-hidden />
              รายการทั้งหมด
            </button>
            <Detail place={selected} distance={distanceKm(me, selected)} />
          </>
        ) : (
          <>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-5xl font-semibold short:text-3xl">{cfg.title}</h1>
              <p className="font-body text-sm text-t3">
                {me ? 'เรียงจากใกล้ที่สุด' : `${cfg.desc} · กดปุ่มตำแหน่งเพื่อเรียงตามระยะทาง`}
              </p>
            </div>

            <SearchField
              label={`ค้นหา${cfg.title}`}
              value={query}
              onChange={setQuery}
              placeholder={cfg.searchHint}
              icon={<MagnifyingGlassIcon size={18} className="text-t3" aria-hidden />}
            />

            <ChipRow label="ตัวกรอง">
              <Chip selected={onlyOpen} onClick={() => setOnlyOpen(true)}>
                เฉพาะที่{cfg.openLabel}
              </Chip>
              <Chip selected={!onlyOpen} onClick={() => setOnlyOpen(false)}>
                ทั้งหมด
              </Chip>
            </ChipRow>

            {error && (
              <p role="alert" className="flex items-start gap-2 text-md text-red-tx">
                <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                <span className="flex-1">{error.message}</span>
                <button type="button" onClick={refresh} className="font-semibold text-acc underline">
                  ลองใหม่
                </button>
              </p>
            )}

            {loading ? (
              <p role="status" className="flex items-center justify-center gap-2 py-6 text-t3">
                <CircleNotchIcon size={18} className="animate-spin" aria-hidden />
                กำลังโหลด…
              </p>
            ) : places.length === 0 ? (
              <EmptyState>{query ? 'ไม่พบที่ตรงกับคำค้น' : 'ยังไม่มีข้อมูล'}</EmptyState>
            ) : (
              <div className="border-y border-line">
                {places.map((p) => (
                  <PlaceRow
                    key={p.id}
                    icon={
                      <Icon
                        size={20}
                        weight="fill"
                        className={p.status === cfg.openStatus ? 'shrink-0 text-acc' : 'shrink-0 text-t4'}
                        aria-hidden
                      />
                    }
                    title={p.name}
                    meta={
                      <>
                        <PlaceStatusBadge kind={type} status={p.status} />
                        {cfg.meta(p) && <span className="ml-2">{cfg.meta(p)}</span>}
                      </>
                    }
                    aside={p.distance != null ? formatDistance(p.distance) : null}
                    onSelect={() => choose(p)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </MapSheet>
    </>
  );
}
