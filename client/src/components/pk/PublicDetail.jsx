import { directionsUrl, formatDistance, formatNumber, timeAgo, vulnerableLabels } from '@/lib/format';
import { ClockCounterClockwiseIcon, ClockIcon, MapPinIcon, NavigationArrowIcon, PackageIcon, PhoneIcon, UsersIcon } from './icons';
import { Badge } from './Badge';
import { Button } from './Button';
import { StatRow } from './StatRow';
import { CaseStatusBadge, isNearFull, openHours, PlaceStatusBadge, shelterFree, UrgencyBadge, waitMinutes } from './domain';

function Row({ icon: Icon, children }) {
  return (
    <p className="flex items-start gap-2 font-body text-md text-ink">
      <Icon size={16} className="mt-0.5 shrink-0 text-t3" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  );
}

function Header({ title, children }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-5xl font-semibold text-balance short:text-3xl">{title}</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{children}</div>
    </div>
  );
}

function Actions({ lat, lng, phone }) {
  return (
    <div className="flex gap-2">
      {phone && (
        <Button href={`tel:${phone}`} variant="outline" size="sm" icon={<PhoneIcon size={18} aria-hidden />}>
          โทร
        </Button>
      )}
      <Button href={directionsUrl(lat, lng)} variant="primary" size="sm" icon={<NavigationArrowIcon size={18} weight="fill" aria-hidden />}>
        นำทาง
      </Button>
    </div>
  );
}

const Distance = ({ km }) => (km != null ? <span className="text-sm text-t3 tabular-nums">ห่าง {formatDistance(km)}</span> : null);

export function RequestPublicDetail({ request: r, distance }) {
  const vulnerable = vulnerableLabels(r);
  return (
    <div className="flex flex-col gap-3">
      <Header title={r.case_no ? <>เคส <span className="tabular-nums">{r.case_no}</span></> : 'คำขอความช่วยเหลือ'}>
        <UrgencyBadge urgency={r.urgency} />
        <CaseStatusBadge status={r.status} />
        <Distance km={distance} />
      </Header>
      <div className="flex flex-col gap-1.5">
        <Row icon={UsersIcon}>
          {r.people_count} คน
          {vulnerable.length > 0 && <span className="font-medium text-red-tx"> · มี{vulnerable.join(', ')}</span>}
        </Row>
        {r.address_note && <Row icon={MapPinIcon}>{r.address_note}</Row>}
        <Row icon={ClockIcon}>แจ้งเมื่อ {timeAgo(r.created_at)}</Row>
      </div>
      {r.description && <p className="border-l-2 border-line2 pl-3 font-body text-md text-t2 [overflow-wrap:anywhere]">{r.description}</p>}
    </div>
  );
}

// ข้อมูลเก่ากว่านี้ (นาที) → เตือนว่าอาจไม่เป็นปัจจุบัน
const STALE_MINUTES = 120;

/** แถว "อัปเดตข้อมูลเมื่อ…" ถ้าเก่าเกินไปขึ้นเตือนสีเหลือง (มีเบอร์ → แนะนำให้โทรถามก่อนไป) */
function UpdatedRow({ at, phone }) {
  if (!at) return null;
  const stale = waitMinutes(at) >= STALE_MINUTES;
  return (
    <Row icon={ClockCounterClockwiseIcon}>
      อัปเดตข้อมูล {timeAgo(at)}
      {stale && (
        <span className="font-semibold text-amb-tx"> · ข้อมูลอาจไม่เป็นปัจจุบัน{phone && ' ควรโทรถามก่อนไป'}</span>
      )}
    </Row>
  );
}

export function ShelterPublicDetail({ place: s, distance }) {
  const free = shelterFree(s);
  const nearFull = isNearFull(s);
  return (
    <div className="flex flex-col gap-3">
      <Header title={s.name}>
        <PlaceStatusBadge kind="shelter" status={s.status} />
        <Distance km={distance} />
      </Header>
      <StatRow
        items={[
          {
            value: formatNumber(free),
            label: nearFull ? 'ที่ว่าง · ใกล้เต็ม' : 'ที่ว่าง',
            tone: free === 0 ? 'red' : nearFull ? 'org' : 'ok',
          },
          { value: formatNumber(s.current_occupancy), label: 'พักอยู่' },
          { value: formatNumber(s.capacity), label: 'รับได้ทั้งหมด' },
        ]}
      />
      {s.address && <Row icon={MapPinIcon}>{s.address}</Row>}
      {s.facilities && <Row icon={PackageIcon}>{s.facilities}</Row>}
      <UpdatedRow at={s.updated_at} phone={s.contact_phone} />
      <Actions lat={s.lat} lng={s.lng} phone={s.contact_phone} />
    </div>
  );
}

export function DistributionPublicDetail({ place: d, distance }) {
  const hours = openHours(d);
  return (
    <div className="flex flex-col gap-3">
      <Header title={d.name}>
        <PlaceStatusBadge kind="distribution" status={d.status} />
        <Distance km={distance} />
      </Header>
      {d.supply_types && (
        <div className="flex flex-wrap gap-1.5">
          {d.supply_types.split(',').map((t) => (
            <Badge key={t} boxed>{t.trim()}</Badge>
          ))}
        </div>
      )}
      {hours && <Row icon={ClockIcon}>เปิดแจก {hours}</Row>}
      {d.address && <Row icon={MapPinIcon}>{d.address}</Row>}
      <UpdatedRow at={d.updated_at} phone={d.contact_phone} />
      <Actions lat={d.lat} lng={d.lng} phone={d.contact_phone} />
    </div>
  );
}
