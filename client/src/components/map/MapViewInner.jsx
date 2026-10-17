'use client';

import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { House, LifeBuoy, LocateFixed, LoaderCircle, MapPin, Package, Siren } from 'lucide-react';
import { HATYAI_CENTER } from '@/lib/format';
import { AreaBubble, CasePin, MePin, PickPin, PlacePin, TeamPin } from '@/components/pk/pins';
import { CircleNotchIcon, CrosshairIcon } from '@/components/pk/icons';

const URGENCY_COLOR = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#64748b',
};

const TYPE_STYLE = {
  shelter: { color: '#15803d', Icon: House },
  distribution: { color: '#c2410c', Icon: Package },
  rescuer: { color: '#0f172a', Icon: LifeBuoy },
  pick: { color: '#dc2626', Icon: MapPin },
};

const iconCache = new Map();

// สร้าง divIcon จากไอคอน lucide (cache ไว้ เพราะ marker ถูกสร้างใหม่ทุกครั้งที่ polling)
function pinIcon(color, Icon, { size = 34, selected = false } = {}) {
  const key = `${color}-${Icon.displayName || Icon.name}-${size}-${selected}`;
  if (!iconCache.has(key)) {
    const svg = renderToStaticMarkup(<Icon size={Math.round(size * 0.5)} strokeWidth={2.4} aria-hidden />);
    iconCache.set(
      key,
      L.divIcon({
        className: `map-pin${selected ? ' is-selected' : ''}`,
        html: `<div style="width:${size}px;height:${size}px;background:${color}">${svg}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      })
    );
  }
  return iconCache.get(key);
}

function requestIcon(r, selected) {
  // เคสที่มีทีมรับแล้วเป็นสีน้ำเงิน, ที่รออยู่ใช้สีตามความเร่งด่วน
  const color = r.status === 'pending' ? URGENCY_COLOR[r.urgency] || URGENCY_COLOR.medium : '#2563eb';
  return pinIcon(color, Siren, { size: r.urgency === 'critical' ? 38 : 34, selected });
}

const meIcon = L.divIcon({ className: 'map-pin', html: '<div class="me-dot"></div>', iconSize: [18, 18] });

function clusterIcon(cluster) {
  return L.divIcon({
    className: 'map-cluster',
    html: `<div>${cluster.getChildCount()}</div>`,
    iconSize: [44, 44],
  });
}

const CLASSIC_PINS = {
  request: requestIcon,
  place: (kind, active, selected) =>
    pinIcon(active ? TYPE_STYLE[kind].color : '#64748b', TYPE_STYLE[kind].Icon, { selected }),
  rescuer: (selected) => pinIcon(TYPE_STYLE.rescuer.color, LifeBuoy, { size: 32, selected }),
  me: () => meIcon,
  pick: (picker) => pinIcon(picker.color || TYPE_STYLE.pick.color, picker.icon || MapPin, { size: 40 }),
  cluster: clusterIcon,
};

// หมุดแบบหน้าคนทั่วไป: เรนเดอร์ชิ้นจาก components/pk/pins เป็น html ของ divIcon
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

const PUBLIC_PINS = {
  request: (r, selected) =>
    nodeIcon(`pk-q-${r.urgency}-${r.status}-${selected}`, <CasePin urgency={r.urgency} status={r.status} big={selected} />, selected ? 36 : 30),
  place: (kind, active, selected) =>
    nodeIcon(`pk-${kind}-${active}-${selected}`, <PlacePin kind={kind} active={active} big={selected} />, selected ? 36 : 30),
  rescuer: () => nodeIcon('pk-team', <TeamPin />, 30),
  me: () => nodeIcon('pk-me', <MePin />, 18),
  pick: () => nodeIcon('pk-pick', <PickPin />, 40),
  cluster: (cluster) => {
    const count = cluster.getChildCount();
    const urgent = cluster.getAllChildMarkers().some((m) => m.options.urgent);
    return nodeIcon(`pk-c-${count}-${urgent}`, <AreaBubble count={count} urgent={urgent} />, 36);
  },
};

// focus.coverBottom / coverTop (ไม่บังคับ) = ฟังก์ชันคืนความสูง px ที่ถูกบังด้านล่าง (เช่น bottom sheet) / ด้านบน
// (เช่น แถบข่าว + แถวชิป) → วางจุดไว้กลางพื้นที่ที่ยังมองเห็น แทนกลางแผนที่ทั้งแผ่น
const FOCUS_TOP = 48; // ไม่ส่ง coverTop มา → เว้นแถบชิปด้านบนแถวเดียว
const FOCUS_MIN_VISIBLE = 80;

function FlyTo({ focus }) {
  const map = useMap();
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;
  const coverBottom = focus?.coverBottom;
  const coverTop = focus?.coverTop;
  useEffect(() => {
    if (lat == null || lng == null) return;
    const z = zoom || Math.max(map.getZoom(), 15);
    let target = L.latLng(lat, lng);
    if (coverBottom || coverTop) {
      const h = map.getSize().y;
      const top = coverTop ? coverTop() : FOCUS_TOP;
      const bottom = Math.min(coverBottom ? coverBottom() : 0, h - top - FOCUS_MIN_VISIBLE);
      const shift = (bottom - top) / 2;
      if (shift !== 0) target = map.unproject(map.project(target, z).add([0, shift]), z);
    }
    map.flyTo(target, z, { duration: 0.6 });
  }, [lat, lng, zoom, coverBottom, coverTop, map]);
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

function LocateControl({ onLocate, className, publicStyle = false }) {
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
      {publicStyle ? (
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
      ) : (
        <button
          type="button"
          onClick={locate}
          aria-label="ไปยังตำแหน่งของฉัน"
          className="grid size-12 cursor-pointer place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-float)] hover:bg-slate-50"
        >
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden />
          ) : (
            <LocateFixed className="size-5" aria-hidden />
          )}
        </button>
      )}
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
  pinStyle = 'classic', // 'public' = หมุดแบบหน้าคนทั่วไป (components/pk/pins)
}) {
  const pins = pinStyle === 'public' ? PUBLIC_PINS : CLASSIC_PINS;
  const visible = { requests: true, shelters: true, distributions: true, rescuers: true, ...show };
  const isSel = (type, id) => selected?.type === type && selected?.id === id;
  const select = (type, item) => ({ click: () => onSelect?.(type, item) });

  return (
    <MapContainer center={center} zoom={zoom} zoomControl={false} className={className} attributionControl>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      {zoomControl && <ZoomControl position="topright" />}
      <AutoResize />
      <FlyTo focus={focus} />
      {onMapClick && <MapPress onPress={onMapClick} />}

      {visible.shelters &&
        shelters.map((s) => (
          <Marker
            key={`s-${s.id}`}
            position={[s.lat, s.lng]}
            icon={pins.place('shelter', s.status === 'open', isSel('shelter', s.id))}
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
            icon={pins.place('distribution', d.status === 'active', isSel('distribution', d.id))}
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
              icon={pins.rescuer(isSel('rescuer', r.id))}
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
          iconCreateFunction={pins.cluster}
        >
          {requests.filter((r) => !mine.includes(r.id)).map((r) => (
            <Marker
              key={`q-${r.id}`}
              position={[r.lat, r.lng]}
              icon={pins.request(r, isSel('request', r.id))}
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
          icon={pins.request(r, true)}
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
          icon={me.draggable ? pinIcon(TYPE_STYLE.rescuer.color, LifeBuoy, { size: 40, selected: true }) : pins.me()}
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
              icon={pins.pick(picker)}
              draggable
              eventHandlers={{ dragend: (e) => picker.onChange(e.target.getLatLng()) }}
              zIndexOffset={1000}
              title="ตำแหน่งที่เลือก"
            />
          )}
        </>
      )}

      {locate && <LocateControl onLocate={onLocate} className={locateClassName} publicStyle={pinStyle === 'public'} />}
    </MapContainer>
  );
}
