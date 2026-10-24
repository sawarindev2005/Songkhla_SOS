'use client';

import { useMemo, useRef, useState } from 'react';
import { MapView } from '@/components/map';
import { usePolling } from '@/hooks/usePolling';
import { useVisibleMyCases } from '@/hooks/useVisibleMyCases';
import { buildAnnouncements } from '@/lib/announcements';
import { distanceKm, formatDistance, formatNumber } from '@/lib/format';
import { CaretLeftIcon, CircleNotchIcon, CrosshairIcon, HouseLineIcon, MagnifyingGlassIcon, PackageIcon, WarningIcon } from './icons';
import { PlaceRow } from './CaseCard';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';
import { MapSheet, mapArea, isWide } from './MapSheet';
import { MyCaseCard } from './MyCaseCard';
import { NewsTicker } from './NewsTicker';
import { HotlineFab } from './HotlineFab';
import { DistributionPublicDetail, ShelterPublicDetail } from './PublicDetail';
import { SearchField } from './TextField';
import { useToast } from './Toast';
import { isNearFull, openHours, PlaceStatusBadge, shelterFree } from './domain';

const CONFIG = {
  shelter: {
    path: '/shelters',
    title: 'ที่พักพิง',
    openStatus: 'open',
    openLabel: 'เปิดรับ',
    icon: HouseLineIcon,
    Detail: ShelterPublicDetail,
    mapProp: 'shelters',
    searchHint: 'ค้นหาชื่อหรือที่อยู่',
    meta: (p) => {
      const text = `ว่าง ${formatNumber(shelterFree(p))} จาก ${formatNumber(p.capacity)} ที่`;
      return isNearFull(p) ? <><span className="font-semibold text-org-tx">ใกล้เต็ม</span> · {text}</> : text;
    },
  },
  distribution: {
    path: '/distributions',
    title: 'จุดแจกจ่าย',
    openStatus: 'active',
    openLabel: 'เปิดแจก',
    icon: PackageIcon,
    Detail: DistributionPublicDetail,
    mapProp: 'distributions',
    searchHint: 'ค้นหาชื่อ ที่อยู่ หรือของที่แจก',
    // เวลาเปิดขึ้นก่อน ป้าย "เปิดแจก" ตั้งโดยเจ้าหน้าที่ ไม่ได้ดูจากเวลา คนจะได้เห็นเองว่าตอนนี้ยังเปิดอยู่ไหม
    meta: (p) => [openHours(p), p.supply_types || p.address].filter(Boolean).join(' · '),
  },
};

/** หน้ารายการสถานที่ของคนทั่วไป: แผนที่เต็มจอ + แผ่นข้อมูลด้านล่าง */
export function PlaceList({ type }) {
  const cfg = CONFIG[type];
  const toast = useToast();
  const { data, error, loading, refresh, updatedAt } = usePolling(cfg.path);
  // การ์ดลอย "เคสที่ฉันแจ้ง" แบบเดียวกับหน้าภาพรวม ให้เห็นสถานะเคสตัวเองได้ทุกหน้า
  const { cases: myCases, isSample } = useVisibleMyCases(updatedAt?.getTime() ?? 0);
  const latestCase = myCases[0];

  // แถบข่าวสารชุดเดียวกับหน้าภาพรวม: ดึงเพิ่มเฉพาะข้อมูลอีกหมวดที่หน้านี้ยังไม่มี
  const other = usePolling(type === 'shelter' ? '/distributions' : '/shelters');
  const announcements = buildAnnouncements({
    shelters: (type === 'shelter' ? data : other.data) || [],
    distributions: (type === 'distribution' ? data : other.data) || [],
    now: updatedAt?.getTime() ?? 0, // ใช้หาจุดแจกที่ใกล้ปิด
  });
  const [query, setQuery] = useState('');
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const places = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (data || [])
      .filter((p) => !q || [p.name, p.address, p.supply_types].some((v) => v?.toLowerCase().includes(q)))
      .map((p) => ({ ...p, distance: distanceKm(me, p) }));
    // ที่เปิดอยู่ขึ้นก่อน ที่ปิดแล้วไปท้าย ในกลุ่มเดียวกันเรียงจากใกล้ที่สุด (ถ้ารู้ตำแหน่ง)
    const isOpen = (p) => (p.status === cfg.openStatus ? 0 : 1);
    list.sort((a, b) => isOpen(a) - isOpen(b) || (me ? a.distance - b.distance : 0));
    return list;
  }, [data, query, me, cfg.openStatus]);

  const selected = selectedId != null ? (data || []).find((p) => p.id === selectedId) : null;
  const Icon = cfg.icon;
  const Detail = cfg.Detail;

  // ความสูงของแผ่นข้อมูลที่บังแผนที่ ใช้วางจุดที่เลือกไว้กลางพื้นที่ที่ยังมองเห็น
  const sheetRef = useRef(null);
  const coverBottom = () => (isWide() ? 0 : sheetRef.current?.offsetHeight ?? 0);
  // ความสูงที่แถบข่าวสารบังด้านบน
  const topRef = useRef(null);
  const coverTop = () => topRef.current?.offsetHeight ?? 0;

  function choose(p) {
    setSelectedId(p.id);
    setFocus({ lat: p.lat, lng: p.lng, coverBottom, coverTop });
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
        setFocus({ ...p, zoom: 15, coverBottom, coverTop });
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
      <div className={`absolute inset-0 isolate ${mapArea(collapsed)}`}>
        <MapView
          pinStyle="public"
          {...{ [cfg.mapProp]: places }}
          selected={selectedId != null ? { type, id: selectedId } : null}
          onSelect={(_, p) => choose(p)}
          onMapClick={() => !isWide() && setCollapsed(true)}
          focus={focus}
          me={me}
          locate={false}
        />
      </div>

      {/* บนสุดของแผนที่: แถบข่าวสารจากศูนย์ แบบเดียวกับหน้าภาพรวม */}
      <div ref={topRef} className={`pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col pt-3 md:items-end md:px-4 md:pt-4 ${mapArea(collapsed)}`}>
        <NewsTicker items={announcements} updatedAt={updatedAt} loading={loading || other.loading} className="px-3 md:w-full md:max-w-lg md:px-0" />
      </div>

      <MapSheet
        ref={sheetRef}
        label={cfg.title}
        // รายการเปิดมาเตี้ยเท่าหน้าภาพรวม ให้เห็นแผนที่มาก ลากขึ้น/เลื่อนรายการเพื่อดูต่อจนเต็มสูง
        // เปิดรายละเอียดสถานที่ → กลับเป็นครึ่งจอเดิม ให้เห็นเวลาเปิด ปุ่มโทร ปุ่มนำทางครบ
        peek={!selected}
        // ดูรายละเอียดจุดแบบเต็มสูง → ซ่อนปุ่มลอยไม่ให้บังหมุด | รายการเต็มสูงยังเห็นปุ่ม ◎ ไว้เรียงจากใกล้สุด
        hideToolbarWhenFull={!!selected}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        toolbar={
          <>
            {latestCase ? (
              // เคสตัวอย่างไม่มีหน้าติดตาม → พาไปหน้าภาพรวมที่ปักหมุดเคสไว้
              <MyCaseCard data={latestCase} more={myCases.length - 1} href={isSample ? '/' : `/track?case=${latestCase.case_no}`} />
            ) : (
              <span />
            )}
            {/* แบบเดียวกับหน้าภาพรวม: บน = ◎ (ขาว → ฟ้าเมื่อแสดงตำแหน่งของฉันแล้ว)  ล่าง = ปุ่มโทรฉุกเฉิน
                อยู่กึ่งกลางแนวตั้งกับการ์ด */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <IconButton
                label="ไปยังตำแหน่งของฉัน"
                tone={me ? 'accent' : 'float'}
                aria-pressed={!!me}
                size={40}
                onClick={locateMe}
                disabled={locating}
              >
                {locating ? <CircleNotchIcon size={20} className="animate-spin" aria-hidden /> : <CrosshairIcon size={20} aria-hidden />}
              </IconButton>
              <HotlineFab />
            </div>
          </>
        }
        summary={
          <p className="flex items-baseline justify-between gap-3 pb-1">
            <span className="text-lg font-bold">{cfg.title}</span>
            <span className="text-md text-t2 tabular-nums">{places.length} แห่ง</span>
          </p>
        }
        header={
          selected ? (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="-ml-1 flex min-h-11 w-fit items-center gap-1 px-1 text-md font-semibold text-acc"
            >
              <CaretLeftIcon size={18} weight="bold" aria-hidden />
              รายการทั้งหมด
            </button>
          ) : (
            <div className="flex flex-col gap-0.5">
              <h1 className="text-5xl font-semibold short:text-3xl">{cfg.title}</h1>
              <p className="flex items-center gap-1 truncate font-body text-sm text-t3">
                {me ? 'เรียงจากใกล้ที่สุด' : (
                  <>กดปุ่ม <CrosshairIcon size={14} className="shrink-0" aria-label="ตำแหน่งของฉัน" role="img" /> เพื่อเรียงจากใกล้ที่สุด</>
                )}
              </p>
            </div>
          )
        }
      >
        {selected ? (
          <Detail place={selected} distance={distanceKm(me, selected)} />
        ) : (
          <>
            <SearchField
              label={`ค้นหา${cfg.title}`}
              value={query}
              onChange={setQuery}
              placeholder={cfg.searchHint}
              icon={<MagnifyingGlassIcon size={18} className="text-t3" aria-hidden />}
            />

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
                      <span className="flex min-w-0 items-center gap-2">
                        <PlaceStatusBadge kind={type} status={p.status} />
                        {cfg.meta(p) && <span className="min-w-0 truncate">{cfg.meta(p)}</span>}
                      </span>
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
