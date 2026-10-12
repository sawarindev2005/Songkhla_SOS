'use client';

import { useMemo, useState } from 'react';
import { CircleCheck, CircleX, LifeBuoy, MousePointerClick, Undo2 } from 'lucide-react';
import { PageHeader } from '@/components/StaffShell';
import { MapView } from '@/components/map';
import { RequestDetail } from '@/components/Details';
import { Button, ErrorBanner, Modal, Spinner, UrgencyBadge, cx } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { STATUS, distanceKm, formatDistance, timeAgo, vulnerableLabels } from '@/lib/format';

const FILTERS = [
  { key: 'pending', label: 'รอมอบหมาย' },
  { key: 'assigned', label: 'มอบหมายแล้ว' },
  { key: 'in_progress', label: 'กำลังช่วย' },
];

const rescuerPos = (r) => (r.current_lat != null ? { lat: r.current_lat, lng: r.current_lng } : null);

export default function AssignPage() {
  const requests = usePolling('/requests?status=active');
  const rescuers = usePolling('/users/rescuers');
  const [filter, setFilter] = useState('pending');
  const [selectedId, setSelectedId] = useState(null);
  const [focus, setFocus] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { status, label }

  const all = requests.data || [];
  const list = all.filter((r) => r.status === filter);
  const selected = all.find((r) => r.id === selectedId);

  // หน่วยกู้ภัยเรียงตามระยะห่างจากเคสที่เลือก
  const rankedRescuers = useMemo(() => {
    const rows = (rescuers.data || []).map((r) => ({ ...r, distance: distanceKm(rescuerPos(r), selected) }));
    return rows.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [rescuers.data, selected]);

  function choose(r) {
    setSelectedId(r.id);
    setFocus({ lat: r.lat, lng: r.lng });
    setError(null);
  }

  async function run(key, fn) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await Promise.all([requests.refresh(), rescuers.refresh()]);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  const assign = (rescuer) =>
    run(`assign-${rescuer.id}`, () =>
      api(`/requests/${selected.id}/assign`, { method: 'PATCH', body: { rescuer_id: rescuer.id } })
    );

  const setStatus = (status) =>
    run(`status-${status}`, () => api(`/requests/${selected.id}/status`, { method: 'PATCH', body: { status } }));

  return (
    <>
      <PageHeader title="มอบหมายเคส" desc="เลือกเคสจากรายการหรือแผนที่ แล้วเลือกหน่วยกู้ภัยที่ใกล้ที่สุด" />

      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        {/* รายการเคส */}
        <section aria-label="รายการเคส" className="flex flex-col rounded-2xl border border-line bg-surface lg:h-[calc(100dvh-9rem)]">
          <div className="flex gap-1 border-b border-line p-2" role="tablist">
            {FILTERS.map((f) => {
              const count = all.filter((r) => r.status === f.key).length;
              return (
                <button
                  key={f.key}
                  role="tab"
                  aria-selected={filter === f.key}
                  onClick={() => setFilter(f.key)}
                  className={cx(
                    'min-h-10 flex-1 cursor-pointer rounded-lg px-2 text-sm font-semibold',
                    filter === f.key ? 'bg-ink text-white' : 'text-muted hover:bg-slate-100'
                  )}
                >
                  {f.label} <span className="tabular">({count})</span>
                </button>
              );
            })}
          </div>
          {requests.loading && <Spinner />}
          <ul className="max-h-[40dvh] min-h-0 flex-1 divide-y divide-line overflow-y-auto lg:max-h-none">
            {!requests.loading && list.length === 0 && (
              <li className="p-6 text-center text-sm text-muted">ไม่มีเคสในสถานะนี้</li>
            )}
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  aria-pressed={selectedId === r.id}
                  className={cx(
                    'flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left',
                    selectedId === r.id ? 'bg-safety-soft' : 'hover:bg-slate-50'
                  )}
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="tabular font-bold">{r.case_no}</span>
                    <UrgencyBadge urgency={r.urgency} />
                    <span className="ml-auto text-xs text-muted">{timeAgo(r.created_at)}</span>
                  </span>
                  <span className="truncate text-sm text-muted">
                    {r.people_count} คน
                    {vulnerableLabels(r).length > 0 && ` · ${vulnerableLabels(r).join(', ')}`}
                    {r.address_note && ` · ${r.address_note}`}
                  </span>
                  {r.rescuer_team && <span className="text-sm text-safety-dark">ทีม: {r.rescuer_team}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="h-[45dvh] overflow-hidden rounded-2xl border border-line lg:h-[50dvh]">
            <MapView
              requests={all}
              rescuers={rescuers.data || []}
              show={{ shelters: false, distributions: false }}
              selected={selectedId ? { type: 'request', id: selectedId } : null}
              onSelect={(type, item) => type === 'request' && choose(item)}
              focus={focus}
              zoomControl
              locate={false}
            />
          </div>

          <ErrorBanner error={error || requests.error || rescuers.error} />

          {!selected ? (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-6 text-muted">
              <MousePointerClick className="size-6" aria-hidden />
              เลือกเคสจากรายการหรือจุดบนแผนที่เพื่อมอบหมายทีม
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4">
                <RequestDetail request={selected} showPrivate />
                <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                  {selected.status === 'in_progress' && (
                    <Button variant="success" size="sm" onClick={() => setConfirm({ status: 'rescued', label: 'ปิดเคสเป็นช่วยเหลือแล้ว' })}>
                      <CircleCheck className="size-4" aria-hidden />
                      ช่วยเหลือแล้ว
                    </Button>
                  )}
                  {selected.status !== 'pending' && (
                    <Button variant="outline" size="sm" onClick={() => setConfirm({ status: 'pending', label: 'คืนเคสกลับเข้าคิว' })}>
                      <Undo2 className="size-4" aria-hidden />
                      คืนเข้าคิว
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => setConfirm({ status: 'cancelled', label: 'ยกเลิกเคส' })}>
                    <CircleX className="size-4" aria-hidden />
                    ยกเลิกเคส
                  </Button>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-4">
                <h2 className="font-bold">
                  {selected.status === 'pending' ? 'เลือกหน่วยกู้ภัย' : 'เปลี่ยนหน่วยกู้ภัย'}
                </h2>
                <p className="mb-3 text-sm text-muted">เรียงตามระยะห่างจากจุดเกิดเหตุ</p>
                {selected.status === 'in_progress' && (
                  <p className="mb-3 rounded-xl bg-warn-soft p-3 text-sm">
                    ทีมกำลังเข้าช่วยเหลือ — คืนเคสเข้าคิวก่อนหากต้องการเปลี่ยนทีม
                  </p>
                )}
                <ul className="flex max-h-[24rem] flex-col divide-y divide-line overflow-y-auto">
                  {rankedRescuers.length === 0 && (
                    <li className="py-4 text-center text-sm text-muted">ยังไม่มีหน่วยกู้ภัยในระบบ</li>
                  )}
                  {rankedRescuers.map((r) => {
                    const current = selected.assigned_to === r.id;
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
                          <LifeBuoy className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.team_name || r.full_name}</p>
                          <p className="truncate text-xs text-muted">
                            {r.full_name} · งานค้าง {r.active_missions} ·{' '}
                            {r.distance != null ? `ห่าง ${formatDistance(r.distance)}` : 'ไม่ทราบตำแหน่ง'}
                          </p>
                        </div>
                        {current ? (
                          <span className="text-sm font-semibold text-safety-dark">ทีมปัจจุบัน</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="dark"
                            disabled={selected.status === 'in_progress' || Boolean(busy)}
                            loading={busy === `assign-${r.id}`}
                            onClick={() => assign(r)}
                          >
                            มอบหมาย
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(confirm)}
        title={confirm?.label || ''}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              ไม่ใช่
            </Button>
            <Button
              variant={confirm?.status === 'cancelled' ? 'primary' : 'dark'}
              loading={busy === `status-${confirm?.status}`}
              onClick={() => setStatus(confirm.status)}
            >
              ยืนยัน
            </Button>
          </>
        }
      >
        <p>
          เปลี่ยนสถานะเคส <b className="tabular">{selected?.case_no}</b> เป็น “{STATUS[confirm?.status]?.label}”
          {confirm?.status === 'cancelled' && ' — เคสจะหายจากแผนที่ ใช้เมื่อแจ้งซ้ำหรือผู้แจ้งปลอดภัยแล้ว'}
        </p>
      </Modal>
    </>
  );
}
