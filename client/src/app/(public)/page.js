'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapView } from '@/components/map';
import { usePolling } from '@/hooks/usePolling';
import { STATUS, distanceKm, formatDistance, formatNumber, formatTime, getMyCases } from '@/lib/format';
import { AlertBanner } from '@/components/pk/AlertBanner';
import { Button } from '@/components/pk/Button';
import { CaseCard, PlaceRow } from '@/components/pk/CaseCard';
import { Chip, ChipRow } from '@/components/pk/Chip';
import { EmptyState } from '@/components/pk/EmptyState';
import { HotlineRow } from '@/components/pk/FallbackBlock';
import { IconButton } from '@/components/pk/IconButton';
import { MapSheet } from '@/components/pk/MapSheet';
import { DistributionPublicDetail, RequestPublicDetail, ShelterPublicDetail } from '@/components/pk/PublicDetail';
import { Segmented } from '@/components/pk/Segmented';
import { StatRow } from '@/components/pk/StatRow';
import { useToast } from '@/components/pk/Toast';
import {
  CaretLeftIcon, CaretRightIcon, CircleNotchIcon, CrosshairIcon, FileMagnifyingGlassIcon, HouseLineIcon,
  LifebuoyIcon, ListBulletsIcon, PackageIcon, SirenIcon, WarningIcon,
} from '@/components/pk/icons';

const TYPE_LIST = {
  request: 'requests',
  shelter: 'shelters',
  distribution: 'distributions',
  rescuer: 'rescuers',
};

const LAYERS = [
  { key: 'requests', label: 'ขอช่วย', icon: <SirenIcon size={16} weight="fill" className="text-red" aria-hidden /> },
  { key: 'distributions', label: 'แจกจ่าย', icon: <PackageIcon size={16} weight="fill" className="text-acc" aria-hidden /> },
  { key: 'rescuers', label: 'กู้ภัย', icon: <LifebuoyIcon size={16} weight="fill" className="text-ink" aria-hidden /> },
  { key: 'shelters', label: 'ที่พัก', icon: <HouseLineIcon size={16} weight="fill" className="text-acc" aria-hidden /> },
];

const fmt = (v) => (v == null ? '–' : formatNumber(v));

export default function HomePage() {
  const toast = useToast();
  const requests = usePolling('/requests/public');
  const shelters = usePolling('/shelters');
  const distributions = usePolling('/distributions');
  const rescuers = usePolling('/users/rescuers/public');
  const stats = usePolling('/dashboard/public');

  const [show, setShow] = useState({});
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [view, setView] = useState('summary'); // summary | list
  const [collapsed, setCollapsed] = useState(false);
  const [myCaseNo, setMyCaseNo] = useState(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage อ่านได้หลัง mount เท่านั้น (หน้าถูก prerender)
    setMyCaseNo(getMyCases()[0] || null);
  }, []);
  const myCase = usePolling(myCaseNo ? `/requests/track/${myCaseNo}` : null);

  const data = {
    requests: requests.data || [],
    shelters: shelters.data || [],
    distributions: distributions.data || [],
    rescuers: rescuers.data || [],
  };

  const counts = {
    requests: data.requests.length,
    distributions: data.distributions.filter((d) => d.status === 'active').length,
    rescuers: data.rescuers.length,
    shelters: data.shelters.filter((s) => s.status === 'open').length,
  };

  // ดึงรายการล่าสุดของจุดที่เลือก เพื่อให้รายละเอียดอัปเดตตาม polling
  const selectedItem = selected ? data[TYPE_LIST[selected.type]].find((x) => x.id === selected.id) : null;

  const listItems = (() => {
    const items = [];
    const push = (type, list) =>
      show[TYPE_LIST[type]] !== false &&
      list.forEach((item) => items.push({ type, item, distance: distanceKm(me, item) }));
    push('request', data.requests);
    push('shelter', data.shelters);
    push('distribution', data.distributions);
    if (me) items.sort((a, b) => a.distance - b.distance);
    return items;
  })();

  function handleSelect(type, item) {
    if (type === 'rescuer') return;
    setSelected({ type, id: item.id });
    setCollapsed(false);
  }

  function selectFromList(type, item) {
    handleSelect(type, item);
    setFocus({ lat: item.lat, lng: item.lng });
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
        setFocus({ ...p, zoom: 16 });
      },
      () => {
        setLocating(false);
        toast('ระบุตำแหน่งไม่ได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง', 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const s = stats.data;
  const criticalCount = data.requests.filter((r) => r.urgency === 'critical' && r.status === 'pending').length;
  const loadError = requests.error || stats.error;

  const toolbar = (
    <>
      <Button
        variant="float"
        size="sm"
        block={false}
        icon={<ListBulletsIcon size={18} aria-hidden />}
        onClick={() => {
          setView('list');
          setSelected(null);
          setCollapsed(false);
        }}
      >
        ดูแบบรายการ
      </Button>
      <IconButton label="ไปยังตำแหน่งของฉัน" tone="float" onClick={locateMe} disabled={locating}>
        {locating ? <CircleNotchIcon size={22} className="animate-spin" aria-hidden /> : <CrosshairIcon size={22} aria-hidden />}
      </IconButton>
    </>
  );

  return (
    <>
      <h1 className="sr-only">แผนที่สถานการณ์น้ำท่วม อำเภอหาดใหญ่</h1>
      <div className="absolute inset-0 isolate">
        <MapView
          pinStyle="public"
          requests={data.requests}
          shelters={data.shelters}
          distributions={data.distributions}
          rescuers={data.rescuers}
          show={show}
          selected={selected}
          onSelect={handleSelect}
          focus={focus}
          me={me}
          locate={false}
        />
      </div>

      <ChipRow label="ชั้นข้อมูลบนแผนที่" className="absolute inset-x-0 top-0 z-[500] px-3 py-3">
        {LAYERS.map((l) => (
          <Chip
            key={l.key}
            variant="map"
            layer
            muted={show[l.key] === false}
            icon={l.icon}
            count={counts[l.key]}
            onClick={() => setShow((prev) => ({ ...prev, [l.key]: prev[l.key] === false }))}
          >
            {l.label}
          </Chip>
        ))}
      </ChipRow>

      <MapSheet
        label="ข้อมูลสถานการณ์"
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        toolbar={toolbar}
        summary={
          <p className="flex items-baseline justify-between gap-3 pb-1">
            <span className="text-lg font-bold">สถานการณ์ตอนนี้ อ.หาดใหญ่</span>
            <span className="text-md font-semibold text-red tabular-nums">รอช่วย {fmt(s?.pending)}</span>
          </p>
        }
      >
        {selectedItem ? (
          <>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="-ml-1 flex min-h-11 w-fit items-center gap-1 px-1 text-md font-semibold text-acc"
            >
              <CaretLeftIcon size={18} weight="bold" aria-hidden />
              กลับ
            </button>
            {selected.type === 'request' && (
              <RequestPublicDetail request={selectedItem} distance={distanceKm(me, selectedItem)} />
            )}
            {selected.type === 'shelter' && (
              <ShelterPublicDetail place={selectedItem} distance={distanceKm(me, selectedItem)} />
            )}
            {selected.type === 'distribution' && (
              <DistributionPublicDetail place={selectedItem} distance={distanceKm(me, selectedItem)} />
            )}
          </>
        ) : (
          <>
            {myCaseNo && <MyCaseRow caseNo={myCaseNo} data={myCase.data} />}

            <div className="flex flex-col gap-0.5">
              <h2 className="text-5xl font-semibold short:text-3xl">สถานการณ์ตอนนี้ อ.หาดใหญ่</h2>
              <p className="font-body text-sm text-t3">อัปเดต {formatTime(stats.updatedAt)} · รีเฟรชทุก 15 วินาที</p>
            </div>

            {loadError && (
              <p role="alert" className="flex items-start gap-2 text-md text-red-tx">
                <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                <span className="flex-1">{loadError.message}</span>
                <button
                  type="button"
                  onClick={() => {
                    requests.refresh();
                    stats.refresh();
                  }}
                  className="font-semibold text-acc underline"
                >
                  ลองใหม่
                </button>
              </p>
            )}

            <StatRow
              variant="hero"
              items={[
                { value: fmt(s?.pending), label: 'รอความช่วยเหลือ', tone: 'red' },
                { value: fmt(s?.active_teams), label: 'ทีมกำลังออกช่วย' },
                { value: fmt(s?.available_beds), label: 'ที่พักยังว่าง' },
              ]}
            />

            {criticalCount > 0 && (
              <AlertBanner
                level={2}
                label={`เคสวิกฤต ${criticalCount} เคสกำลังรอ`}
                text="หากอยู่ในพื้นที่น้ำสูง ให้ขึ้นที่สูง เตรียมเอกสารสำคัญ และปิดสวิตช์ไฟก่อนน้ำถึง"
              />
            )}

            <Segmented
              label="มุมมอง"
              value={view}
              onChange={setView}
              options={[
                { value: 'summary', label: 'สายด่วน' },
                { value: 'list', label: 'รายการบนแผนที่' },
              ]}
            />

            {view === 'summary' ? (
              <HotlineRow />
            ) : listItems.length === 0 ? (
              <EmptyState>ไม่มีข้อมูลในชั้นที่เลือก</EmptyState>
            ) : (
              <div className="border-y border-line">
                {listItems.map(({ type, item, distance }) =>
                  type === 'request' ? (
                    <CaseCard
                      key={`request-${item.id}`}
                      request={item}
                      distance={distance}
                      onSelect={() => selectFromList(type, item)}
                    />
                  ) : (
                    <PlaceRow
                      key={`${type}-${item.id}`}
                      icon={
                        type === 'shelter' ? (
                          <HouseLineIcon size={20} weight="fill" className="shrink-0 text-acc" aria-hidden />
                        ) : (
                          <PackageIcon size={20} weight="fill" className="shrink-0 text-acc" aria-hidden />
                        )
                      }
                      title={item.name}
                      meta={
                        type === 'shelter'
                          ? `ที่พักพิง · ว่าง ${formatNumber(Math.max(item.capacity - item.current_occupancy, 0))} ที่`
                          : `จุดแจกจ่าย${item.supply_types ? ` · ${item.supply_types}` : ''}`
                      }
                      aside={distance != null ? formatDistance(distance) : null}
                      onSelect={() => selectFromList(type, item)}
                    />
                  )
                )}
              </div>
            )}
          </>
        )}
      </MapSheet>
    </>
  );
}

function MyCaseRow({ caseNo, data }) {
  const status = data ? STATUS[data.status]?.label : 'กำลังโหลดสถานะ…';
  return (
    <Link
      href={`/track?case=${caseNo}`}
      className="flex items-center gap-3 border-y border-line py-2.5 text-ink no-underline hover:bg-s1"
    >
      <FileMagnifyingGlassIcon size={22} className="shrink-0 text-acc" aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-md font-bold">
          เคสของฉัน <span className="tabular-nums">{caseNo}</span>
        </span>
        <span className="truncate font-body text-sm text-t2">
          {status}
          {data?.rescuer_team && ` · ${data.rescuer_team}`}
        </span>
      </span>
      <CaretRightIcon size={18} className="shrink-0 text-t3" aria-hidden />
    </Link>
  );
}
