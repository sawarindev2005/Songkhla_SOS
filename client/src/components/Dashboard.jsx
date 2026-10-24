'use client';

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { STATUS, URGENCY, formatMinutes, formatNumber, timeAgo } from '@/lib/format';
import { CaseStatusBadge, URGENCY_BG, UrgencyBadge } from './pk/domain';
import { CheckCircleIcon, HourglassMediumIcon, HouseLineIcon, NavigationArrowIcon, TimerIcon, UsersIcon } from './pk/icons';
import { cn } from './pk/cn';

// สีชุดข้อมูล (ผ่าน validate_palette.js: CVD ΔE 27.4)
const SERIES = { created: '#1d4ed8', rescued: '#15803d' };

// สีตามความหมายเดียวกับป้ายสถานะ: รอ เหลืองอำพัน | ทีมกำลังไป น้ำเงิน | เสร็จ เขียว | สถานที่ น้ำเงิน
const TONE = {
  amber: 'bg-amb-bg text-amb-tx',
  accent: 'bg-acc-bg text-acc',
  ok: 'bg-ok-bg text-ok',
  gray: 'bg-s2 text-t2',
};

function StatCard({ label, value, icon: Icon, tone = 'gray', sub }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-medium text-t2">{label}</p>
        {Icon && (
          <span className={cn('grid size-9 place-items-center rounded-lg', TONE[tone])}>
            <Icon size={20} weight="bold" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-7xl font-bold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-base text-t2">{sub}</p>}
    </div>
  );
}

export function KpiGrid({ s }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="รอความช่วยเหลือ"
        value={formatNumber(s.pending)}
        icon={HourglassMediumIcon}
        tone="amber"
        sub={`${formatNumber(s.people_waiting)} คน · กลุ่มเปราะบาง ${formatNumber(s.vulnerable_waiting)} เคส`}
      />
      <StatCard
        label="กำลังช่วยเหลือ"
        value={formatNumber(s.in_progress)}
        icon={NavigationArrowIcon}
        tone="accent"
        sub={`${formatNumber(s.active_teams)} ทีมออกปฏิบัติงาน`}
      />
      <StatCard
        label="ช่วยเหลือแล้ว"
        value={formatNumber(s.rescued)}
        icon={CheckCircleIcon}
        tone="ok"
        sub={`รวม ${formatNumber(s.people_rescued)} คน`}
      />
      <StatCard
        label="ที่พักพิงว่าง"
        value={formatNumber(s.available_beds)}
        icon={HouseLineIcon}
        tone="accent"
        sub={`เปิด ${s.open_shelters} แห่ง · จุดแจก ${s.active_distributions} จุด`}
      />
    </div>
  );
}

export function ResponseTimes({ s }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <StatCard label="เวลาเฉลี่ยจนมีทีมรับเคส" value={formatMinutes(s.avg_assign_minutes)} icon={TimerIcon} />
      <StatCard label="เวลาเฉลี่ยจนช่วยเหลือสำเร็จ" value={formatMinutes(s.avg_resolve_minutes)} icon={TimerIcon} />
    </div>
  );
}

export function Panel({ title, desc, children, className = '' }) {
  return (
    <section className={cn('rounded-xl border border-line bg-white p-4 sm:p-5', className)}>
      <h2 className="font-bold">{title}</h2>
      {desc && <p className="text-base text-t2">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const dayLabel = (d) =>
  new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-base shadow-float">
      <p className="mb-1 font-semibold">{dayLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <b className="tabular-nums">{p.value}</b>
        </p>
      ))}
    </div>
  );
}

export function DailyChart({ daily }) {
  const last = daily[daily.length - 1];
  return (
    <>
      <div className="h-64" role="img" aria-label="กราฟเคสที่แจ้งเข้าและช่วยเหลือสำเร็จรายวัน 7 วันล่าสุด">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={daily} margin={{ top: 8, right: 56, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="day" tickFormatter={dayLabel} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeDasharray: 4 }} />
            <Legend verticalAlign="top" align="left" height={32} iconType="circle" wrapperStyle={{ fontSize: 13, color: '#0f172a' }} />
            {['created', 'rescued'].map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                name={key === 'created' ? 'แจ้งเข้า' : 'ช่วยเหลือสำเร็จ'}
                stroke={SERIES[key]}
                strokeWidth={2}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                label={({ x, y, index }) =>
                  index === daily.length - 1 ? (
                    <text key={key} x={x + 10} y={y + 4} fontSize={12} fill="#0f172a">
                      {last[key]} {key === 'created' ? 'แจ้ง' : 'สำเร็จ'}
                    </text>
                  ) : null
                }
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-base">
        <summary className="cursor-pointer text-t2 hover:text-ink">ดูข้อมูลเป็นตาราง</summary>
        <table className="tabular-nums mt-2 w-full text-left">
          <thead className="text-t2">
            <tr>
              <th className="py-1 font-medium">วันที่</th>
              <th className="py-1 text-right font-medium">แจ้งเข้า</th>
              <th className="py-1 text-right font-medium">ช่วยเหลือสำเร็จ</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.day} className="border-t border-line">
                <td className="py-1">{dayLabel(d.day)}</td>
                <td className="py-1 text-right">{d.created}</td>
                <td className="py-1 text-right">{d.rescued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </>
  );
}

// แท่งแนวนอนแบบ HTML: สีแท่งตามความหมายของแถว (r.bar) ป้ายชื่อ+ค่าเป็นข้อความ
export function BarList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.value}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-base">
            <span>{r.badge || r.label}</span>
            <span className="font-semibold tabular-nums">{formatNumber(r.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-s2">
            <div
              className={cn('h-full rounded-full transition-[width] duration-300', r.bar || 'bg-acc')}
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const STATUS_BAR = { pending: 'bg-amb', assigned: 'bg-acc', in_progress: 'bg-acc', rescued: 'bg-ok', cancelled: 'bg-t4' };

export function statusRows(byStatus) {
  return Object.keys(STATUS).map((key) => ({
    key,
    label: STATUS[key].label,
    value: byStatus[key] || 0,
    bar: STATUS_BAR[key],
    badge: <CaseStatusBadge status={key} />,
  }));
}

export function urgencyRows(byUrgency) {
  return Object.keys(URGENCY).map((key) => ({
    key,
    label: URGENCY[key].label,
    value: byUrgency[key] || 0,
    bar: URGENCY_BG[key],
    badge: <UrgencyBadge urgency={key} />,
  }));
}

export function TeamsTable({ teams }) {
  if (!teams.length) return <p className="py-4 text-center text-base text-t2">ยังไม่มีหน่วยกู้ภัย</p>;
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {teams.map((t) => (
          <li key={t.id} className="min-w-0 rounded-lg border border-line p-3 text-base break-words">
            <p className="font-semibold">{t.team_name || '-'}</p>
            <p className="text-xs text-t2">{t.full_name}</p>
            <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
              <dt className="text-t2">กำลังทำ</dt>
              <dd>{t.active}</dd>
              <dt className="text-t2">ช่วยสำเร็จ</dt>
              <dd className="font-semibold">{t.rescued}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <div className="-mx-4 hidden overflow-x-auto sm:mx-0 md:block">
        <table className="w-full min-w-[420px] text-left text-base">
          <thead className="text-t2">
            <tr>
              <th className="px-4 py-2 font-medium sm:px-0">ทีม</th>
              <th className="px-2 py-2 text-right font-medium">กำลังทำ</th>
              <th className="px-4 py-2 text-right font-medium sm:px-0">ช่วยสำเร็จ</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-2.5 sm:px-0">
                  <p className="font-semibold">{t.team_name || '-'}</p>
                  <p className="text-xs text-t2">{t.full_name}</p>
                </td>
                <td className="tabular-nums px-2 py-2.5 text-right">{t.active}</td>
                <td className="tabular-nums px-4 py-2.5 text-right font-semibold sm:px-0">{t.rescued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function RecentTable({ recent }) {
  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {recent.map((r) => (
          <li key={r.id} className="min-w-0 rounded-lg border border-line p-3 text-base break-words">
            <p className="font-semibold tabular-nums">{r.case_no}</p>
            <p className="mt-1">
              {r.requester_name}
              <span className="text-t2">
                {' '}· <UsersIcon size={14} className="inline align-[-2px]" aria-label="จำนวนคน" /> {r.people_count}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <UrgencyBadge urgency={r.urgency} />
              <CaseStatusBadge status={r.status} />
            </div>
            <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
              <dt className="text-t2">ทีม</dt>
              <dd>{r.rescuer_team || '-'}</dd>
              <dt className="text-t2">แจ้งเมื่อ</dt>
              <dd>{timeAgo(r.created_at)}</dd>
            </dl>
          </li>
        ))}
      </ul>
      <div className="-mx-4 hidden overflow-x-auto sm:mx-0 md:block">
        <table className="w-full min-w-[640px] text-left text-base">
          <thead className="text-t2">
            <tr>
              <th className="px-4 py-2 font-medium sm:px-0">เคส</th>
              <th className="px-2 py-2 font-medium">ผู้แจ้ง</th>
              <th className="px-2 py-2 font-medium">ความเร่งด่วน</th>
              <th className="px-2 py-2 font-medium">สถานะ</th>
              <th className="px-2 py-2 font-medium">ทีม</th>
              <th className="px-4 py-2 text-right font-medium sm:px-0">แจ้งเมื่อ</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="tabular-nums px-4 py-2.5 font-semibold sm:px-0">{r.case_no}</td>
                <td className="px-2 py-2.5">
                  {r.requester_name}
                  <span className="text-t2">
                    {' '}
                    · <UsersIcon size={14} className="inline align-[-2px]" aria-label="จำนวนคน" /> {r.people_count}
                  </span>
                </td>
                <td className="px-2 py-2.5"><UrgencyBadge urgency={r.urgency} /></td>
                <td className="px-2 py-2.5"><CaseStatusBadge status={r.status} /></td>
                <td className="px-2 py-2.5 text-t2">{r.rescuer_team || '-'}</td>
                <td className="px-4 py-2.5 text-right text-t2 sm:px-0">{timeAgo(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
