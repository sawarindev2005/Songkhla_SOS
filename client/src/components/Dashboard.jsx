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
import { CircleCheck, House, LifeBuoy, Siren, Timer, Users } from 'lucide-react';
import { STATUS, URGENCY, formatMinutes, formatNumber, timeAgo } from '@/lib/format';
import { StatCard, StatusBadge, UrgencyBadge } from './ui';

// สีชุดข้อมูล (ผ่าน validate_palette.js: CVD ΔE 27.4)
const SERIES = { created: '#2563eb', rescued: '#15803d' };

export function KpiGrid({ s }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label="รอความช่วยเหลือ"
        value={formatNumber(s.pending)}
        icon={Siren}
        tone="brand"
        sub={`${formatNumber(s.people_waiting)} คน · กลุ่มเปราะบาง ${formatNumber(s.vulnerable_waiting)} เคส`}
      />
      <StatCard
        label="กำลังช่วยเหลือ"
        value={formatNumber(s.in_progress)}
        icon={LifeBuoy}
        tone="safety"
        sub={`${formatNumber(s.active_teams)} ทีมออกปฏิบัติงาน`}
      />
      <StatCard
        label="ช่วยเหลือแล้ว"
        value={formatNumber(s.rescued)}
        icon={CircleCheck}
        tone="shelter"
        sub={`รวม ${formatNumber(s.people_rescued)} คน`}
      />
      <StatCard
        label="ที่พักพิงว่าง"
        value={formatNumber(s.available_beds)}
        icon={House}
        tone="supply"
        sub={`เปิด ${s.open_shelters} แห่ง · จุดแจก ${s.active_distributions} จุด`}
      />
    </div>
  );
}

export function ResponseTimes({ s }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="เวลาเฉลี่ยจนมีทีมรับเคส" value={formatMinutes(s.avg_assign_minutes)} icon={Timer} />
      <StatCard label="เวลาเฉลี่ยจนช่วยเหลือสำเร็จ" value={formatMinutes(s.avg_resolve_minutes)} icon={Timer} />
    </div>
  );
}

export function Panel({ title, desc, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface p-4 sm:p-5 ${className}`}>
      <h2 className="font-bold">{title}</h2>
      {desc && <p className="text-sm text-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

const dayLabel = (d) =>
  new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short' }).format(new Date(`${d}T00:00:00`));

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-sm shadow-lg">
      <p className="mb-1 font-semibold">{dayLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
          {p.name}: <b className="tabular">{p.value}</b>
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
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted hover:text-ink">ดูข้อมูลเป็นตาราง</summary>
        <table className="tabular mt-2 w-full text-left">
          <thead className="text-muted">
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

// แท่งแนวนอนแบบ HTML: ชุดข้อมูลเดียว สีเดียว ป้ายชื่อ+ค่าเป็นข้อความ
export function BarList({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.key} title={`${r.label}: ${r.value}`}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span>{r.badge || r.label}</span>
            <span className="tabular font-semibold">{formatNumber(r.value)}</span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-safety transition-[width] duration-300"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function statusRows(byStatus) {
  return Object.keys(STATUS).map((key) => ({
    key,
    label: STATUS[key].label,
    value: byStatus[key] || 0,
    badge: <StatusBadge status={key} />,
  }));
}

export function urgencyRows(byUrgency) {
  return Object.keys(URGENCY).map((key) => ({
    key,
    label: URGENCY[key].label,
    value: byUrgency[key] || 0,
    badge: <UrgencyBadge urgency={key} />,
  }));
}

export function TeamsTable({ teams }) {
  if (!teams.length) return <p className="py-4 text-center text-sm text-muted">ยังไม่มีหน่วยกู้ภัย</p>;
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="text-muted">
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
                <p className="text-xs text-muted">{t.full_name}</p>
              </td>
              <td className="tabular px-2 py-2.5 text-right">{t.active}</td>
              <td className="tabular px-4 py-2.5 text-right font-semibold sm:px-0">{t.rescued}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RecentTable({ recent }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-muted">
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
              <td className="tabular px-4 py-2.5 font-semibold sm:px-0">{r.case_no}</td>
              <td className="px-2 py-2.5">
                {r.requester_name}
                <span className="text-muted">
                  {' '}
                  · <Users className="inline size-3.5" aria-label="จำนวนคน" /> {r.people_count}
                </span>
              </td>
              <td className="px-2 py-2.5"><UrgencyBadge urgency={r.urgency} /></td>
              <td className="px-2 py-2.5"><StatusBadge status={r.status} /></td>
              <td className="px-2 py-2.5 text-muted">{r.rescuer_team || '-'}</td>
              <td className="px-4 py-2.5 text-right text-muted sm:px-0">{timeAgo(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
