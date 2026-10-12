'use client';

import { useEffect, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { House, LifeBuoy, LocateFixed, LoaderCircle, MapPin, Package, Siren } from 'lucide-react';
import { HATYAI_CENTER } from '@/lib/format';

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

function FlyTo({ focus }) {
  const map = useMap();
  const lat = focus?.lat;
  const lng = focus?.lng;
  const zoom = focus?.zoom;
  useEffect(() => {
    if (lat != null && lng != null) map.flyTo([lat, lng], zoom || Math.max(map.getZoom(), 15), { duration: 0.6 });
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
        className="grid size-12 cursor-pointer place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow-float)] hover:bg-slate-50"
      >
        {busy ? (
          <LoaderCircle className="size-5 animate-spin" aria-hidden />
        ) : (
          <LocateFixed className="size-5" aria-hidden />
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
  show = {},
  me,
  selected,
  onSelect,
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

      {visible.shelters &&
        shelters.map((s) => (
          <Marker
            key={`s-${s.id}`}
            position={[s.lat, s.lng]}
            icon={pinIcon(s.status === 'open' ? TYPE_STYLE.shelter.color : '#64748b', House, {
              selected: isSel('shelter', s.id),
            })}
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
            icon={pinIcon(d.status === 'active' ? TYPE_STYLE.distribution.color : '#64748b', Package, {
              selected: isSel('distribution', d.id),
            })}
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
              icon={pinIcon(TYPE_STYLE.rescuer.color, LifeBuoy, { size: 32, selected: isSel('rescuer', r.id) })}
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
          iconCreateFunction={clusterIcon}
        >
          {requests.map((r) => (
            <Marker
              key={`q-${r.id}`}
              position={[r.lat, r.lng]}
              icon={requestIcon(r, isSel('request', r.id))}
              eventHandlers={select('request', r)}
              title={`เคส ${r.case_no}`}
            />
          ))}
        </MarkerClusterGroup>
      )}

      {me?.lat != null && (
        <Marker
          position={[me.lat, me.lng]}
          icon={me.draggable ? pinIcon(TYPE_STYLE.rescuer.color, LifeBuoy, { size: 40, selected: true }) : meIcon}
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
              icon={pinIcon(picker.color || TYPE_STYLE.pick.color, picker.icon || MapPin, { size: 40 })}
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
