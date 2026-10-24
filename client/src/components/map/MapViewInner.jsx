'use client';

import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { HATYAI_CENTER } from '@/lib/format';
import { AreaBubble, CasePin, MePin, PickPin, PlacePin, TeamPin } from '@/components/pk/pins';
import { CircleNotchIcon, CrosshairIcon } from '@/components/pk/icons';

// ภาพแผนที่พลาดติดกันหลายแผ่นโดยไม่มีแผ่นไหนโหลดได้ = เน็ตใช้ไม่ได้ (พลาดแผ่นเดียวถือว่าปกติ)
const TILE_FAIL_LIMIT = 4;

// cache divIcon ไว้ เพราะ marker ถูกสร้างใหม่ทุกครั้งที่ polling
const iconCache = new Map();

// เรนเดอร์ชิ้นจาก components/pk/pins เป็น html ของ divIcon
function nodeIcon(key, node, size) {
  if (!iconCache.has(key)) {
    iconCache.set(
      key,
      L.divIcon({
        className: 'pk-pin',
        html: renderToStaticMarkup(node),
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    );
  }
  return iconCache.get(key);
}

const PINS = {
  request: (r, selected) =>
    nodeIcon(`q-${r.urgency}-${r.status}-${selected}`, <CasePin urgency={r.urgency} status={r.status} big={selected} />, selected ? 36 : 30),
  place: (kind, active, selected) =>
    nodeIcon(`${kind}-${active}-${selected}`, <PlacePin kind={kind} active={active} big={selected} />, selected ? 36 : 30),
  rescuer: (selected) => nodeIcon(`team-${selected}`, <TeamPin big={selected} />, selected ? 40 : 30),
  me: () => nodeIcon('me', <MePin />, 18),
  // picker.kind: 'team' = กู้ภัยปักตำแหน่งตัวเอง | 'shelter' / 'distribution' = ปักสถานที่ | ไม่ส่ง = จุดขอความช่วยเหลือ
  pick: (picker) => {
    if (picker.kind === 'team') return nodeIcon('pick-team', <TeamPin big />, 40);
    if (picker.kind) return nodeIcon(`pick-${picker.kind}`, <PlacePin kind={picker.kind} big />, 36);
    return nodeIcon('pick', <PickPin />, 40);
  },
  cluster: (cluster) => {
    const count = cluster.getChildCount();
    const urgent = cluster.getAllChildMarkers().some((m) => m.options.urgent);
    return nodeIcon(`c-${count}-${urgent}`, <AreaBubble count={count} urgent={urgent} />, 36);
  },
};

// focus.coverBottom / coverTop (ไม่บังคับ) = ฟังก์ชันคืนความสูง px ที่ถูกบังด้านล่าง (เช่น bottom sheet) / ด้านบน
// coverElements คืน element ที่ต้องวัดใหม่หลังขนาดเปลี่ยน เช่น แผ่นข้อมูลที่กำลังขยาย
// วางจุดไว้กลางพื้นที่ที่ยังมองเห็น แทนกลางแผนที่ทั้งแผ่น
const FOCUS_TOP = 48; // ไม่ส่ง coverTop มา → เว้นแถบชิปด้านบนแถวเดียว
const FOCUS_SETTLE_MS = 200;

function FlyTo({ focus }) {
  const map = useMap();
  const focusRef = useRef(focus);
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;

  useEffect(() => {
    focusRef.current = focus;
  });

  useEffect(() => {
    if (lat == null || lng == null) return;
    const z = zoom || Math.max(map.getZoom(), 15);
    let lastGeometry = null;
    let timer = null;

    const align = () => {
      const { x: width, y: height } = map.getSize();
      if (!width || !height) return;
      const { coverBottom, coverTop } = focusRef.current || {};
      const covered = Boolean(coverBottom || coverTop);
      const top = covered ? Math.max(0, Number(coverTop ? coverTop() : FOCUS_TOP) || 0) : 0;
      const bottom = Math.max(0, Number(coverBottom?.()) || 0);
      const geometry = [width, height, top, bottom].join(':');
      if (geometry === lastGeometry) return;
      lastGeometry = geometry;

      let target = L.latLng(lat, lng);
      // ใช้พื้นที่บังจริง; ถ้าจอเตี้ยจนไม่มีช่องเหลือ ให้เลือกตำแหน่งที่ใกล้ช่องนั้นที่สุดในแผนที่
      const visibleMiddle = Math.max(0, Math.min(height, (height + top - bottom) / 2));
      const shift = height / 2 - visibleMiddle;
      if (shift !== 0) target = map.unproject(map.project(target, z).add([0, shift]), z);
      map.flyTo(target, z, { duration: 0.6 });
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(align, FOCUS_SETTLE_MS);
    };

    align();
    const observer = new ResizeObserver(schedule);
    const elements = [map.getContainer(), ...(focusRef.current?.coverElements?.() || [])];
    for (const element of new Set(elements.filter(Boolean))) observer.observe(element);
    map.on('resize', schedule);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      map.off('resize', schedule);
    };
  }, [lat, lng, zoom, map]);
  return null;
}

// ให้ Leaflet คำนวณขนาดใหม่เมื่อ container เปลี่ยนขนาด (เช่น bottom sheet ขยาย)
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}

// แตะแผนที่ (เริ่มกด ลาก หรือซูม) → เรียก onPress ทันที ไม่รอให้ปล่อยนิ้ว
// ยกเว้นกดบนหมุด / ป้าย / ปุ่มควบคุม ซึ่งมีงานของตัวเอง (เช่น หมุด → เปิดรายละเอียด)
const PRESS_IGNORE = '.leaflet-marker-icon, .leaflet-tooltip, .leaflet-popup, .leaflet-control';

function MapPress({ onPress }) {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    const handle = (e) => {
      if (!e.target.closest(PRESS_IGNORE)) onPress();
    };
    el.addEventListener('pointerdown', handle);
    return () => el.removeEventListener('pointerdown', handle);
  }, [map, onPress]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LocateControl({ onLocate, className }) {
  const map = useMap();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ref.current) {
      L.DomEvent.disableClickPropagation(ref.current);
      L.DomEvent.disableScrollPropagation(ref.current);
    }
  }, []);

  function locate() {
    if (!navigator.geolocation) {
      setError('อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง');
      return;
    }
    setBusy(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.flyTo([point.lat, point.lng], 16, { duration: 0.6 });
        onLocate?.(point);
      },
      () => {
        setBusy(false);
        setError('ไม่สามารถระบุตำแหน่งได้ กรุณาเปิด GPS และอนุญาตการเข้าถึงตำแหน่ง');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div ref={ref} className={`absolute right-3 z-[500] flex flex-col items-end gap-2 ${className || 'bottom-3'}`}>
      {error && (
        <p role="alert" className="max-w-60 rounded-lg bg-ink/90 px-3 py-2 text-xs text-white">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={locate}
        aria-label="ไปยังตำแหน่งของฉัน"
        className="grid size-11 place-items-center rounded-full bg-white text-ink shadow-float focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc"
      >
        {busy ? (
          <CircleNotchIcon size={22} className="animate-spin" aria-hidden />
        ) : (
          <CrosshairIcon size={22} aria-hidden />
        )}
      </button>
    </div>
  );
}

export default function MapViewInner({
  requests = [],
  shelters = [],
  distributions = [],
  rescuers = [],
  mine = [], // id เคสที่ผู้ใช้แจ้งเอง → แยกออกจากกลุ่ม หมุดใหญ่ + ป้าย "เคสของฉัน"
  show = {},
  me,
  selected,
  onSelect,
  onMapClick, // แตะแผนที่ทุกแบบ (กด ลาก ซูม) ไม่รวมหมุด/ป้าย/ปุ่ม เรียกทันทีตอนเริ่มกด
  picker,
  focus,
  locate = true,
  onLocate,
  locateClassName,
  zoomControl = false,
  center = HATYAI_CENTER,
  zoom = 14,
  className = 'h-full w-full',
}) {
  const [tileFails, setTileFails] = useState(0);
  const visible = { requests: true, shelters: true, distributions: true, rescuers: true, ...show };
  const isSel = (type, id) => selected?.type === type && selected?.id === id;
  const select = (type, item) => ({ click: () => onSelect?.(type, item) });

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} className={className} attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        eventHandlers={{
          tileerror: () => setTileFails((n) => n + 1),
          tileload: () => setTileFails(0),
        }}
      />
      {tileFails >= TILE_FAIL_LIMIT && (
        <p
          role="status"
          className="pointer-events-none absolute inset-x-3 top-1/3 z-[450] mx-auto max-w-xs rounded-lg bg-ink/90 px-3.5 py-2.5 text-center text-base text-white"
        >
          ภาพแผนที่โหลดไม่ขึ้น อาจเพราะสัญญาณอ่อน หมุดและรายการยังใช้งานได้
        </p>
      )}
      {zoomControl && <ZoomControl position="topright" />}
      <AutoResize />
      <FlyTo focus={focus} />
      {onMapClick && <MapPress onPress={onMapClick} />}

      {visible.shelters &&
        shelters.map((s) => (
          <Marker
            key={`s-${s.id}`}
            position={[s.lat, s.lng]}
            icon={PINS.place('shelter', s.status === 'open', isSel('shelter', s.id))}
            eventHandlers={select('shelter', s)}
            title={`ที่พักพิง: ${s.name}`}
          >
            <Tooltip direction="top" offset={[0, -16]}>{s.name}</Tooltip>
          </Marker>
        ))}

      {visible.distributions &&
        distributions.map((d) => (
          <Marker
            key={`d-${d.id}`}
            position={[d.lat, d.lng]}
            icon={PINS.place('distribution', d.status === 'active', isSel('distribution', d.id))}
            eventHandlers={select('distribution', d)}
            title={`จุดแจกจ่าย: ${d.name}`}
          >
            <Tooltip direction="top" offset={[0, -16]}>{d.name}</Tooltip>
          </Marker>
        ))}

      {visible.rescuers &&
        rescuers
          .filter((r) => r.current_lat != null)
          .map((r) => (
            <Marker
              key={`r-${r.id}`}
              position={[r.current_lat, r.current_lng]}
              icon={PINS.rescuer(isSel('rescuer', r.id))}
              eventHandlers={select('rescuer', r)}
              title={`หน่วยกู้ภัย: ${r.team_name || r.full_name || ''}`}
            >
              <Tooltip direction="top" offset={[0, -16]}>{r.team_name || r.full_name}</Tooltip>
            </Marker>
          ))}

      {visible.requests && (
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={50}
          showCoverageOnHover={false}
          iconCreateFunction={PINS.cluster}
        >
          {requests.filter((r) => !mine.includes(r.id)).map((r) => (
            <Marker
              key={`q-${r.id}`}
              position={[r.lat, r.lng]}
              icon={PINS.request(r, isSel('request', r.id))}
              urgent={r.urgency === 'critical' && r.status === 'pending'}
              eventHandlers={select('request', r)}
              title={`เคส ${r.case_no}`}
            />
          ))}
        </MarkerClusterGroup>
      )}

      {/* เคสของฉัน แสดงเสมอแม้ปิดชั้น "ขอช่วย" */}
      {requests.filter((r) => mine.includes(r.id)).map((r) => (
        <Marker
          key={`mine-${r.id}`}
          position={[r.lat, r.lng]}
          icon={PINS.request(r, true)}
          eventHandlers={select('request', r)}
          zIndexOffset={900}
          title={`เคสของฉัน ${r.case_no}`}
        >
          <Tooltip direction="top" offset={[0, -18]} permanent>
            เคสของฉัน
          </Tooltip>
        </Marker>
      ))}

      {me?.lat != null && (
        <Marker
          position={[me.lat, me.lng]}
          icon={me.draggable ? PINS.pick({ kind: 'team' }) : PINS.me()}
          draggable={Boolean(me.draggable)}
          eventHandlers={me.draggable ? { dragend: (e) => me.onDrag?.(e.target.getLatLng()) } : undefined}
          zIndexOffset={1000}
          title="ตำแหน่งของฉัน"
        >
          {me.label && (
            <Tooltip direction="top" offset={[0, -18]} permanent={me.draggable}>
              {me.label}
            </Tooltip>
          )}
        </Marker>
      )}

      {picker && (
        <>
          <ClickPicker onPick={picker.onChange} />
          {picker.value && (
            <Marker
              position={[picker.value.lat, picker.value.lng]}
              icon={PINS.pick(picker)}
              draggable
              eventHandlers={{ dragend: (e) => picker.onChange(e.target.getLatLng()) }}
              zIndexOffset={1000}
              title="ตำแหน่งที่เลือก"
            />
          )}
        </>
      )}

      {locate && <LocateControl onLocate={onLocate} className={locateClassName} />}
    </MapContainer>
  );
}
