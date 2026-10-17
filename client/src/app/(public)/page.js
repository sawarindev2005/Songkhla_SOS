'use client';

import { useRef, useState } from 'react';
import { MapView } from '@/components/map';
import { usePolling } from '@/hooks/usePolling';
import { useVisibleMyCases } from '@/hooks/useVisibleMyCases';
import { distanceKm, formatNumber, formatTime } from '@/lib/format';
import { buildAnnouncements } from '@/lib/announcements';
import { Chip, ChipRow } from '@/components/pk/Chip';
import { HotlineFab } from '@/components/pk/HotlineFab';
import { IconButton } from '@/components/pk/IconButton';
import { MapSheet } from '@/components/pk/MapSheet';
import { MyCaseCard } from '@/components/pk/MyCaseCard';
import { NewsTicker } from '@/components/pk/NewsTicker';
import { DistributionPublicDetail, RequestPublicDetail, ShelterPublicDetail } from '@/components/pk/PublicDetail';
import { StatRow } from '@/components/pk/StatRow';
import { CaseCard } from '@/components/pk/CaseCard';
import { EmptyState } from '@/components/pk/EmptyState';
import { useToast } from '@/components/pk/Toast';
import {
  CaretLeftIcon, CircleNotchIcon, CrosshairIcon, HouseLineIcon,
  LifebuoyIcon, PackageIcon, WarningIcon,
} from '@/components/pk/icons';

const TYPE_LIST = {
  request: 'requests',
  shelter: 'shelters',
  distribution: 'distributions',
  rescuer: 'rescuers',
};

const LAYERS = [
  { key: 'distributions', label: 'แจกจ่าย', icon: <PackageIcon size={16} weight="fill" className="text-acc" aria-hidden /> },
  { key: 'rescuers', label: 'กู้ภัย', icon: <LifebuoyIcon size={16} weight="fill" className="text-ink" aria-hidden /> },
  { key: 'shelters', label: 'ที่พัก', icon: <HouseLineIcon size={16} weight="fill" className="text-acc" aria-hidden /> },
];

const fmt = (v) => (v == null ? '–' : formatNumber(v));
// จำนวนเคสของคนอื่นที่แสดงในแผ่นก่อนกด "ดูคำขอทั้งหมด"
const CASES_PREVIEW = 3;
// ลำดับสถานะ: รอช่วยสำคัญสุด → กำลังช่วย → ทีมรับเคสแล้ว (เคสจาก API เรียงแจ้งล่าสุดก่อนอยู่แล้ว)
const STATUS_ORDER = ['pending', 'in_progress', 'assigned'];
const statusRank = (r) => (STATUS_ORDER.indexOf(r.status) + 1 || STATUS_ORDER.length + 1);
const sortByStatus = (cases) => [...cases].sort((a, b) => statusRank(a) - statusRank(b));

// เลือกเคสตัวอย่างให้สถานะคละกัน: หยิบเวียนทีละสถานะ (รอช่วย → กำลังช่วย → รับเคสแล้ว) จนครบ max
// แต่ละสถานะได้เคสที่แจ้งล่าสุดก่อน แล้วเรียงที่เลือกได้ตามเวลาแจ้งล่าสุด
function previewCases(cases, max) {
  const groups = STATUS_ORDER.map((st) => cases.filter((r) => r.status === st));
  const picked = [];
  for (let round = 0; picked.length < max && groups.some((g) => g.length > round); round++) {
    for (const g of groups) if (g[round] && picked.length < max) picked.push(g[round]);
  }
  return picked.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export default function HomePage() {
  const toast = useToast();
  const shelters = usePolling('/shelters');
  const distributions = usePolling('/distributions');
  const rescuers = usePolling('/users/rescuers/public');
  const stats = usePolling('/dashboard/public');
  // เคสที่ยังไม่จบของทุกคน (API สาธารณะ ไม่มีเบอร์โทร) แสดงเป็นรายการในแผ่นตอนลากขึ้น
  const publicRequests = usePolling('/requests/public');

  const [show, setShow] = useState({});
  const [showAllCases, setShowAllCases] = useState(false);
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const [me, setMe] = useState(null);
  const [locating, setLocating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { cases: myCases, isSample } = useVisibleMyCases(stats.updatedAt?.getTime() ?? 0);
  // เคสที่ยังไม่จบทั้งหมด (รวมเคสของฉัน)
  const allPublic = publicRequests.data || [];
  // เคสของคนอื่น (ตัดเคสของฉันออก ซึ่งอยู่ที่การ์ดด้านบนแล้ว)
  const myIds = new Set(myCases.map((c) => c.id));
  const otherCases = allPublic.filter((r) => !myIds.has(r.id));
  // ชุดที่ใช้นับตัวเลข: เคสในระบบ + เคสตัวอย่าง (ถ้ามี) ให้ตอนสาธิตตัวเลขสอดคล้องกับการ์ด "เคสที่ฉันแจ้ง"
  // เคสตัวอย่างไม่มีในฐานข้อมูล — ลบ sampleMyCases ออกเมื่อใช้งานจริง ส่วนนี้จะนับแค่เคสในระบบเอง
  const countedCases = isSample ? [...allPublic, ...myCases] : allPublic;
  const mineInPublic = countedCases.length - otherCases.length;
  // ดูทั้งหมด = รอช่วยขึ้นก่อน แล้วค่อยที่ทีมกำลังช่วย | ในแผ่น = สูงสุด 3 เคส สถานะคละกันตามที่มีจริง
  const shownCases = showAllCases ? sortByStatus(otherCases) : previewCases(otherCases, CASES_PREVIEW);
  // หมุดบนแผนที่: เคสของฉันเสมอ + เคสของคนอื่นเฉพาะที่กำลังเปิดดูอยู่ (แผนที่ไม่รกด้วยหมุดทุกเคส)
  const selectedOther = selected?.type === 'request' ? otherCases.find((r) => r.id === selected.id) : null;

  const data = {
    requests: selectedOther ? [...myCases, selectedOther] : myCases,
    shelters: shelters.data || [],
    distributions: distributions.data || [],
    rescuers: rescuers.data || [],
  };

  const counts = {
    distributions: data.distributions.filter((d) => d.status === 'active').length,
    rescuers: data.rescuers.length,
    shelters: data.shelters.filter((s) => s.status === 'open').length,
  };

  // ดึงรายการล่าสุดของจุดที่เลือก เพื่อให้รายละเอียดอัปเดตตาม polling
  const selectedItem = selected ? data[TYPE_LIST[selected.type]].find((x) => x.id === selected.id) : null;

  // ความสูงของแผ่นข้อมูลที่บังแผนที่ ใช้วางจุดที่เลือกไว้กลางพื้นที่ที่ยังมองเห็น
  const sheetRef = useRef(null);
  const coverBottom = () => sheetRef.current?.offsetHeight ?? 0;
  // ความสูงที่แถบข่าวสาร + แถวชิปบังด้านบน
  const topRef = useRef(null);
  const coverTop = () => topRef.current?.offsetHeight ?? 0;

  // แตะหมุด → เปิดรายละเอียด และเลื่อนแผนที่ให้หมุดไม่ถูกแผ่นหรือแถบด้านบนบัง
  function handleSelect(type, item) {
    if (type === 'rescuer') return;
    setSelected({ type, id: item.id });
    setCollapsed(false);
    setFocus({ lat: item.lat, lng: item.lng, coverBottom, coverTop });
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
        setFocus({ ...p, zoom: 16, coverBottom, coverTop });
      },
      () => {
        setLocating(false);
        toast('ระบุตำแหน่งไม่ได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง', 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const s = stats.data;
  // ตัวเลขเคสนับจากรายการเคสชุดเดียวกับที่แสดงด้านล่าง ตัวเลขกับรายการจึงตรงกันเสมอ
  // รอความช่วยเหลือ = pending  มีทีมรับเคสแล้ว = มอบหมายทีมแล้ว + กำลังช่วยเหลือ
  // รายการยังโหลดไม่ได้ → ใช้ตัวเลขจากสถิติ (เกณฑ์เดียวกัน)
  const waitingCount = publicRequests.data ? countedCases.filter((r) => r.status === 'pending').length : s?.pending;
  const helpingCount = publicRequests.data ? countedCases.length - waitingCount : s?.in_progress;
  const loadError = stats.error;

  const announcements = buildAnnouncements({
    shelters: data.shelters,
    distributions: data.distributions,
    now: distributions.updatedAt?.getTime() ?? 0, // ใช้หาจุดแจกที่ใกล้ปิด
  });

  // ปุ่มลอยบนขอบแผ่น ขยับขึ้นลงตามแผ่น และยังเห็นตอนย่อแผ่น
  // ซ้าย = การ์ดเคสของฉัน  ขวา = ปุ่มโทรฉุกเฉิน (มีป้ายใต้ปุ่ม) ซ้อนบนปุ่ม ◎ — คอลัมน์ขวาอยู่กึ่งกลางแนวตั้งกับการ์ด
  const latestCase = myCases[0];
  const toolbar = (
    <>
      {latestCase ? (
        <MyCaseCard
          data={latestCase}
          more={myCases.length - 1}
          href={isSample ? null : `/track?case=${latestCase.case_no}`}
          onSelect={() => handleSelect('request', latestCase)}
        />
      ) : (
        <span />
      )}
      {/* บน = ◎ (ขาว → ฟ้าเมื่อแสดงตำแหน่งของฉันแล้ว)  ล่าง = ปุ่มโทรฉุกเฉิน */}
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
  );

  const situationTitle = (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-5xl font-semibold short:text-3xl">สถานการณ์ตอนนี้ อ.หาดใหญ่</h2>
      <p className="font-body text-sm text-t3">อัปเดต {formatTime(stats.updatedAt)} · รีเฟรชทุก 15 วินาที</p>
    </div>
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
          mine={myCases.map((c) => c.id)}
          show={show}
          selected={selected}
          onSelect={handleSelect}
          onMapClick={() => setCollapsed(true)}
          focus={focus}
          me={me}
          locate={false}
        />
      </div>

      {/* บนสุดของแผนที่: แถบข่าวสารจากศูนย์ (เลื่อนเอง ไม่ต้องกดดู) แล้วตามด้วยปุ่มชั้นข้อมูล */}
      <div ref={topRef} className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col pt-3">
        <NewsTicker
          items={announcements}
          updatedAt={shelters.updatedAt}
          loading={shelters.loading || distributions.loading}
          className="px-3"
        />
        <ChipRow label="ชั้นข้อมูลบนแผนที่" className="pointer-events-auto px-3 py-2.5">
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
      </div>

      <MapSheet
        ref={sheetRef}
        label="ข้อมูลสถานการณ์"
        // เปิดมาเตี้ย เห็นแค่หัวข้อ + ตัวเลข (แผนที่เห็นมาก) ลากขึ้น/เลื่อน → เห็นรายการเคสล่าสุดของคนอื่น
        // เปิดรายละเอียดจุด → ครึ่งจอเดิม ลากขึ้นดูปุ่มโทร/นำทางได้
        peek={!selectedItem}
        hideToolbarWhenFull
        // ลากแผ่นลงจากเต็มสูง หรือย่อแผ่น → รายการคำขอกลับเป็น 3 เคส
        onFullChange={(f) => !f && setShowAllCases(false)}
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        toolbar={toolbar}
        summary={
          <p className="flex items-baseline justify-between gap-3 pb-1">
            <span className="text-lg font-bold">สถานการณ์ตอนนี้ อ.หาดใหญ่</span>
            <span className="text-md font-semibold text-red tabular-nums">รอช่วย {fmt(waitingCount)}</span>
          </p>
        }
        header={
          selectedItem ? (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="-ml-1 flex min-h-11 w-fit items-center gap-1 px-1 text-md font-semibold text-acc"
            >
              <CaretLeftIcon size={18} weight="bold" aria-hidden />
              กลับ
            </button>
          ) : (
            situationTitle
          )
        }
      >
        {selectedItem ? (
          <>
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
            {loadError && (
              <p role="alert" className="flex items-start gap-2 text-md text-red-tx">
                <WarningIcon size={18} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
                <span className="flex-1">{loadError.message}</span>
                <button
                  type="button"
                  onClick={stats.refresh}
                  className="font-semibold text-acc underline"
                >
                  ลองใหม่
                </button>
              </p>
            )}

            <StatRow
              variant="hero"
              items={[
                { value: fmt(waitingCount), label: 'รอความช่วยเหลือ', tone: 'red' },
                { value: fmt(helpingCount), label: 'มีทีมรับเคสแล้ว' },
                { value: fmt(s?.available_beds), label: 'ที่พักยังว่าง' },
              ]}
            />

            {/* เคสของคนอื่นที่ยังไม่จบ แสดงสูงสุด 3 เคสสถานะคละกัน แตะเคส → รายละเอียด + หมุดบนแผนที่
                ไม่ใส่ตัวเลขสรุปซ้ำ เพราะอยู่ในช่องตัวเลขด้านบนแล้ว */}
            <section aria-labelledby="cases-title" className="flex flex-col gap-1 border-t border-line pt-3.5">
              <h3 id="cases-title" className="text-lg font-bold">คำขอความช่วยเหลือตอนนี้</h3>
              <p className="font-body text-xs text-t3">
                {mineInPublic > 0 && `รวมเคสของคุณ ${mineInPublic} เคส (อยู่ที่การ์ดด้านบน) · `}
                ไม่แสดงชื่อและเบอร์โทรของผู้แจ้ง
              </p>
              {publicRequests.loading ? (
                <p role="status" className="flex items-center justify-center gap-2 py-4 text-t3">
                  <CircleNotchIcon size={18} className="animate-spin" aria-hidden />
                  กำลังโหลด…
                </p>
              ) : !publicRequests.data ? (
                <p className="py-3 font-body text-sm text-t3">โหลดรายการเคสไม่ได้ ระบบจะลองใหม่อัตโนมัติ</p>
              ) : otherCases.length === 0 ? (
                <EmptyState>ตอนนี้ไม่มีคำขอที่รอความช่วยเหลือ</EmptyState>
              ) : (
                <div className="border-y border-line">
                  {shownCases.map((r) => (
                    <CaseCard key={r.id} request={r} detailed distance={distanceKm(me, r)} onSelect={() => handleSelect('request', r)} />
                  ))}
                </div>
              )}
              {/* กดแล้วแสดงครบและปุ่มหายไป ไม่มีปุ่มย่อกลับ — ลากแผ่นลง/ย่อแผ่น/ออกจากหน้า แล้วกลับเป็น 3 เคสเอง */}
              {!showAllCases && otherCases.length > CASES_PREVIEW && (
                <button
                  type="button"
                  onClick={() => setShowAllCases(true)}
                  className="min-h-11 text-md font-semibold text-acc focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc"
                >
                  ดูคำขอทั้งหมด ({otherCases.length})
                </button>
              )}
            </section>
          </>
        )}
      </MapSheet>
    </>
  );
}

