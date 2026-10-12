'use client';

import { Clock, House, MapPin, Navigation, Package, Phone, Users } from 'lucide-react';
import {
  DIST_STATUS,
  SHELTER_STATUS,
  directionsUrl,
  formatDistance,
  formatNumber,
  timeAgo,
  vulnerableLabels,
} from '@/lib/format';
import { Badge, Button, StatusBadge, UrgencyBadge, cx } from './ui';

function Row({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  );
}

export function ContactActions({ lat, lng, phone, phoneLabel = 'โทร' }) {
  return (
    <div className="flex gap-2">
      {phone && (
        <Button as="a" href={`tel:${phone}`} variant="outline" className="flex-1">
          <Phone className="size-4" aria-hidden />
          {phoneLabel}
        </Button>
      )}
      <Button
        as="a"
        href={directionsUrl(lat, lng)}
        target="_blank"
        rel="noopener noreferrer"
        variant="outline"
        className="flex-1"
      >
        <Navigation className="size-4" aria-hidden />
        นำทาง
      </Button>
    </div>
  );
}

// รายละเอียดเคส: showPrivate = แสดงชื่อ/เบอร์ (เฉพาะเจ้าหน้าที่)
export function RequestDetail({ request: r, distance, showPrivate = false, children }) {
  const vulnerable = vulnerableLabels(r);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-lg font-bold">เคส {r.case_no}</span>
        <UrgencyBadge urgency={r.urgency} />
        <StatusBadge status={r.status} />
      </div>

      <div className="grid gap-1.5">
        {showPrivate && (
          <Row icon={Phone}>
            {r.requester_name} ·{' '}
            <a href={`tel:${r.phone}`} className="tabular font-semibold text-safety underline">
              {r.phone}
            </a>
          </Row>
        )}
        <Row icon={Users}>
          {r.people_count} คน
          {vulnerable.length > 0 && <span className="text-brand-dark"> · มี{vulnerable.join(', ')}</span>}
        </Row>
        {r.address_note && <Row icon={MapPin}>{r.address_note}</Row>}
        <Row icon={Clock}>
          แจ้งเมื่อ {timeAgo(r.created_at)}
          {distance != null && ` · ห่าง ${formatDistance(distance)}`}
        </Row>
        {r.rescuer_team && showPrivate && (
          <Row icon={Users}>
            ทีมรับผิดชอบ: {r.rescuer_team} {r.rescuer_name && `(${r.rescuer_name})`}
          </Row>
        )}
      </div>

      {r.description && (
        <p className="rounded-xl bg-canvas p-3 text-sm text-ink [overflow-wrap:anywhere]">{r.description}</p>
      )}
      {children}
    </div>
  );
}

export function ShelterDetail({ place: s, distance }) {
  const free = Math.max(s.capacity - s.current_occupancy, 0);
  const pct = s.capacity ? Math.min(100, Math.round((s.current_occupancy / s.capacity) * 100)) : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-shelter-soft text-shelter">
          <House className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{s.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} map={SHELTER_STATUS} />
            {distance != null && <span className="text-sm text-muted">ห่าง {formatDistance(distance)}</span>}
          </div>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-sm">
          <span className="text-muted">ผู้พักอาศัย</span>
          <span className="tabular font-semibold">
            {formatNumber(s.current_occupancy)} / {formatNumber(s.capacity)} ·{' '}
            <span className={free > 0 ? 'text-shelter' : 'text-brand-dark'}>ว่าง {formatNumber(free)}</span>
          </span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="ความจุที่ใช้ไป"
        >
          <div
            className={cx('h-full rounded-full', pct >= 90 ? 'bg-brand' : pct >= 70 ? 'bg-amber-500' : 'bg-shelter')}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {s.address && <Row icon={MapPin}>{s.address}</Row>}
      {s.facilities && <Row icon={Package}>{s.facilities}</Row>}
      <ContactActions lat={s.lat} lng={s.lng} phone={s.contact_phone} />
    </div>
  );
}

const hhmm = (t) => (t ? String(t).slice(0, 5) : null);

export function DistributionDetail({ place: d, distance }) {
  const hours = hhmm(d.open_time) && hhmm(d.close_time) ? `${hhmm(d.open_time)}–${hhmm(d.close_time)} น.` : null;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-supply-soft text-supply">
          <Package className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold leading-snug">{d.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} map={DIST_STATUS} />
            {distance != null && <span className="text-sm text-muted">ห่าง {formatDistance(distance)}</span>}
          </div>
        </div>
      </div>
      {d.supply_types && (
        <div className="flex flex-wrap gap-1.5">
          {d.supply_types.split(',').map((t) => (
            <Badge key={t} tone="supply">
              {t.trim()}
            </Badge>
          ))}
        </div>
      )}
      {hours && <Row icon={Clock}>เปิดแจก {hours}</Row>}
      {d.address && <Row icon={MapPin}>{d.address}</Row>}
      <ContactActions lat={d.lat} lng={d.lng} phone={d.contact_phone} />
    </div>
  );
}
