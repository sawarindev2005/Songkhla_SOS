'use client';

import { directionsUrl, formatDistance, timeAgo, vulnerableLabels } from '@/lib/format';
import { Button } from './pk/Button';
import { CaseStatusBadge, UrgencyBadge } from './pk/domain';
import { ClockIcon, MapPinIcon, NavigationArrowIcon, PhoneIcon, UsersIcon } from './pk/icons';

function Row({ icon: Icon, children, centered = false }) {
  return (
    <p className={`flex ${centered ? 'items-center' : 'items-start'} gap-2 text-base text-ink`}>
      <Icon size={18} className={centered ? 'shrink-0 text-t2' : 'mt-px shrink-0 text-t2'} aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
    </p>
  );
}

export function ContactActions({ lat, lng, phone, phoneLabel = 'โทร' }) {
  return (
    <div className="flex gap-2">
      {phone && (
        <Button
          href={`tel:${phone}`}
          variant="outline"
          size="sm"
          className="flex-1"
          icon={<PhoneIcon size={18} weight="fill" aria-hidden />}
        >
          {phoneLabel}
        </Button>
      )}
      <Button
        href={directionsUrl(lat, lng)}
        variant="outline"
        size="sm"
        className="flex-1"
        icon={<NavigationArrowIcon size={18} weight="fill" aria-hidden />}
      >
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-bold tabular-nums">เคส {r.case_no}</span>
        <UrgencyBadge urgency={r.urgency} />
        <CaseStatusBadge status={r.status} />
      </div>

      <div className="grid gap-1.5">
        {showPrivate && (
          <Row icon={PhoneIcon} centered>
            {r.requester_name} ·{' '}
            <a href={`tel:${r.phone}`} className="inline-flex min-h-11 items-center font-semibold text-acc tabular-nums underline">
              {r.phone}
            </a>
          </Row>
        )}
        <Row icon={UsersIcon}>
          {r.people_count} คน
          {vulnerable.length > 0 && <span className="text-red-tx"> · มี{vulnerable.join(', ')}</span>}
        </Row>
        {r.address_note && <Row icon={MapPinIcon}>{r.address_note}</Row>}
        <Row icon={ClockIcon}>
          แจ้งเมื่อ {timeAgo(r.created_at)}
          {distance != null && ` · ห่าง ${formatDistance(distance)}`}
        </Row>
        {r.rescuer_team && showPrivate && (
          <Row icon={UsersIcon}>
            ทีมรับผิดชอบ: {r.rescuer_team} {r.rescuer_name && `(${r.rescuer_name})`}
          </Row>
        )}
      </div>

      {r.description && (
        <p className="rounded-lg bg-s2 p-3 font-body text-base text-ink [overflow-wrap:anywhere]">{r.description}</p>
      )}
      {children}
    </div>
  );
}
