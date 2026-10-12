'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  FileSearch,
  House,
  LifeBuoy,
  List,
  LogIn,
  Package,
  Phone,
  Siren,
  TriangleAlert,
} from 'lucide-react';
import { MapView } from '@/components/map';
import MapChips from '@/components/MapChips';
import { DistributionDetail, RequestDetail, ShelterDetail } from '@/components/Details';
import { Button, ErrorBanner, cx } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { ROLE_HOME, useAuth } from '@/lib/auth';
import {
  HOTLINES,
  STATUS,
  URGENCY,
  distanceKm,
  formatDistance,
  formatNumber,
  formatTime,
  getMyCases,
  timeAgo,
} from '@/lib/format';

const TYPE_LIST = {
  request: 'requests',
  shelter: 'shelters',
  distribution: 'distributions',
  rescuer: 'rescuers',
};

export default function HomePage() {
  const requests = usePolling('/requests/public');
  const shelters = usePolling('/shelters');
  const distributions = usePolling('/distributions');
  const rescuers = usePolling('/users/rescuers/public');
  const stats = usePolling('/dashboard/public');

  const [show, setShow] = useState({});
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const [me, setMe] = useState(null);
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
  const selectedItem = selected
    ? data[TYPE_LIST[selected.type]].find((x) => x.id === selected.id)
    : null;

  const listItems = (() => {
    const items = [];
    const push = (type, list, getPos) =>
      show[TYPE_LIST[type]] !== false &&
      list.forEach((item) => items.push({ type, item, distance: distanceKm(me, getPos(item)) }));
    push('request', data.requests, (r) => r);
    push('shelter', data.shelters, (s) => s);
    push('distribution', data.distributions, (d) => d);
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

  const s = stats.data;
  const criticalCount = data.requests.filter((r) => r.urgency === 'critical' && r.status === 'pending').length;
  const loadError = requests.error || stats.error;

  return (
    <div className="screen-h relative flex flex-col md:block">
      {/* ---------- แผนที่ ---------- */}
      <div className="relative min-h-0 flex-1 md:absolute md:inset-0">
        <h1 className="sr-only">แผนที่สถานการณ์น้ำท่วม อำเภอหาดใหญ่</h1>
        <MapView
          requests={data.requests}
          shelters={data.shelters}
          distributions={data.distributions}
          rescuers={data.rescuers}
          show={show}
          selected={selected}
          onSelect={handleSelect}
          focus={focus}
          me={me}
          onLocate={setMe}
          locateClassName="bottom-8 md:bottom-4"
        />
        <div className="absolute inset-x-0 top-3 z-[600] flex items-center md:left-[25.5rem]">
          <MapChips
            counts={counts}
            show={show}
            onToggle={(key) => setShow((prev) => ({ ...prev, [key]: prev[key] === false }))}
            className="min-w-0 flex-1"
          />
          <StaffButton />
        </div>
        <button
          type="button"
          onClick={() => {
            setView('list');
            setSelected(null);
            setCollapsed(false);
          }}
          className="absolute bottom-8 left-3 z-[600] flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-surface px-4 text-sm font-semibold shadow-[var(--shadow-float)] hover:bg-slate-50 md:hidden"
        >
          <List className="size-4" aria-hidden />
          ดูแบบรายการ
        </button>
      </div>

      {/* ---------- Bottom sheet (mobile) / แผงด้านซ้าย (desktop) ---------- */}
      <section
        aria-label="ข้อมูลสถานการณ์"
        className={cx(
          'relative z-[700] -mt-4 flex shrink-0 flex-col overflow-hidden rounded-t-3xl bg-surface shadow-[var(--shadow-sheet)]',
          'md:absolute md:bottom-4 md:left-4 md:top-4 md:mt-0 md:w-96 md:rounded-3xl md:shadow-xl',
          collapsed ? 'max-h-14' : 'max-h-[52dvh] md:max-h-none'
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'ขยายแผงข้อมูล' : 'ย่อแผงข้อมูล'}
          className="flex h-6 w-full shrink-0 cursor-pointer items-center justify-center md:hidden"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" aria-hidden />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 md:pt-4">
          {selectedItem ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="-ml-2 flex min-h-10 w-fit cursor-pointer items-center gap-1 rounded-lg px-2 text-sm font-semibold text-safety-dark hover:bg-safety-soft"
              >
                <ChevronLeft className="size-4" aria-hidden />
                กลับ
              </button>
              {selected.type === 'request' && (
                <RequestDetail request={selectedItem} distance={distanceKm(me, selectedItem)} />
              )}
              {selected.type === 'shelter' && (
                <ShelterDetail place={selectedItem} distance={distanceKm(me, selectedItem)} />
              )}
              {selected.type === 'distribution' && (
                <DistributionDetail place={selectedItem} distance={distanceKm(me, selectedItem)} />
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="มุมมอง">
                {[
                  ['summary', 'สรุปสถานการณ์'],
                  ['list', 'รายการบนแผนที่'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={view === key}
                    onClick={() => setView(key)}
                    className={cx(
                      'min-h-9 flex-1 cursor-pointer rounded-lg text-sm font-semibold transition-colors',
                      view === key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {view === 'summary' ? (
                <div className="flex flex-col gap-4">
                  {myCaseNo && <MyCaseBar caseNo={myCaseNo} data={myCase.data} />}

                  <div>
                    <h2 className="text-lg font-bold">สถานการณ์ตอนนี้ อ.หาดใหญ่</h2>
                    <p className="flex items-center gap-1.5 text-sm text-muted">
                      <span className="size-2 rounded-full bg-shelter" aria-hidden />
                      อัปเดต {formatTime(stats.updatedAt)} · รีเฟรชอัตโนมัติทุก 15 วินาที
                    </p>
                  </div>

                  <ErrorBanner error={loadError} onRetry={() => { requests.refresh(); stats.refresh(); }} />

                  <dl className="grid grid-cols-3 divide-x divide-line">
                    <Stat value={s?.pending} label="รอความช่วยเหลือ" className="text-brand" />
                    <Stat value={s?.active_teams} label="ทีมกำลังออกช่วย" />
                    <Stat value={s?.available_beds} label="ที่พักว่าง" />
                  </dl>

                  {criticalCount > 0 && (
                    <div className="flex gap-3 rounded-2xl border border-warn-line bg-warn-soft p-3.5">
                      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
                      <div className="text-sm">
                        <p className="font-bold text-ink">
                          มีเคสวิกฤต {criticalCount} เคสกำลังรอความช่วยเหลือ
                        </p>
                        <p className="text-muted">
                          หากอยู่ในพื้นที่น้ำสูง ให้ขึ้นที่สูงและเตรียมเอกสารสำคัญ ปิดสวิตช์ไฟก่อนน้ำถึง
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-muted">สายด่วนฉุกเฉิน</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {HOTLINES.map((h) => (
                        <a
                          key={h.number}
                          href={`tel:${h.number}`}
                          className="flex flex-col items-center rounded-xl border border-line py-2 hover:bg-slate-50"
                        >
                          <span className="tabular flex items-center gap-1 text-lg font-bold text-brand-dark">
                            <Phone className="size-4" aria-hidden />
                            {h.number}
                          </span>
                          <span className="text-xs text-muted">{h.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Legend icon={Siren} className="bg-brand" label="จุดขอความช่วยเหลือ" />
                    <Legend icon={House} className="bg-shelter" label="ที่พักพิง" />
                    <Legend icon={Package} className="bg-supply" label="จุดแจกจ่าย" />
                    <Legend icon={LifeBuoy} className="bg-ink" label="หน่วยกู้ภัย" />
                  </div>

                  <Link
                    href="/login"
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted hover:bg-slate-50 hover:text-ink"
                  >
                    <LogIn className="size-4" aria-hidden />
                    สำหรับเจ้าหน้าที่ / อาสากู้ภัย เข้าสู่ระบบ
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-line">
                  {listItems.length === 0 && (
                    <li className="py-8 text-center text-sm text-muted">ไม่มีข้อมูลในชั้นที่เลือก</li>
                  )}
                  {listItems.map(({ type, item, distance }) => (
                    <li key={`${type}-${item.id}`}>
                      <ListRow type={type} item={item} distance={distance} onClick={() => selectFromList(type, item)} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

// ปุ่มเข้าสู่ระบบเจ้าหน้าที่ — ถ้า login อยู่แล้วพาไปหน้าตาม role
function StaffButton() {
  const { user } = useAuth();
  const href = user ? ROLE_HOME[user.role] : '/login';
  return (
    <Link
      href={href}
      className="mr-3 flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white shadow-[var(--shadow-float)] hover:bg-slate-800"
    >
      {user ? <LifeBuoy className="size-4" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
      <span className="hidden sm:inline">{user ? 'หน้าเจ้าหน้าที่' : 'เข้าสู่ระบบเจ้าหน้าที่'}</span>
      <span className="sm:hidden">{user ? 'เจ้าหน้าที่' : 'เข้าสู่ระบบ'}</span>
    </Link>
  );
}

function Stat({ value, label, className }) {
  return (
    <div className="px-2 first:pl-0">
      <dd className={cx('tabular text-2xl font-bold sm:text-3xl', className)}>
        {value == null ? '–' : formatNumber(value)}
      </dd>
      <dt className="text-xs text-muted sm:text-sm">{label}</dt>
    </div>
  );
}

function Legend({ icon: Icon, className, label }) {
  return (
    <span className="flex items-center gap-2 text-muted">
      <span className={cx('grid size-6 place-items-center rounded-full text-white', className)}>
        <Icon className="size-3.5" aria-hidden />
      </span>
      {label}
    </span>
  );
}

function MyCaseBar({ caseNo, data }) {
  const status = data ? STATUS[data.status]?.label : 'กำลังโหลดสถานะ…';
  return (
    <Link
      href={`/track?case=${caseNo}`}
      className="flex items-center gap-3 rounded-2xl border border-safety/40 bg-safety-soft p-3 hover:bg-blue-100"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-safety text-white">
        <FileSearch className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="tabular block font-bold text-ink">เคสของฉัน {caseNo}</span>
        <span className="block truncate text-sm text-safety-dark">
          {status}
          {data?.rescuer_team && ` · ${data.rescuer_team}`}
        </span>
      </span>
      <ChevronRight className="size-5 text-safety-dark" aria-hidden />
    </Link>
  );
}

const ROW_STYLE = {
  request: { icon: Siren, className: 'bg-brand' },
  shelter: { icon: House, className: 'bg-shelter' },
  distribution: { icon: Package, className: 'bg-supply' },
};

function ListRow({ type, item, distance, onClick }) {
  const { icon: Icon, className } = ROW_STYLE[type];
  let title;
  let sub;
  if (type === 'request') {
    title = `เคส ${item.case_no} · ${URGENCY[item.urgency]?.label}`;
    sub = `${item.people_count} คน · ${STATUS[item.status]?.label} · ${timeAgo(item.created_at)}`;
  } else if (type === 'shelter') {
    title = item.name;
    sub = `ที่พักพิง · ว่าง ${formatNumber(Math.max(item.capacity - item.current_occupancy, 0))} ที่`;
  } else {
    title = item.name;
    sub = `จุดแจกจ่าย · ${item.supply_types || ''}`;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 py-3 text-left hover:bg-slate-50"
    >
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-full text-white', className)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted">{sub}</span>
      </span>
      {distance != null && <span className="tabular shrink-0 text-sm text-muted">{formatDistance(distance)}</span>}
    </button>
  );
}
