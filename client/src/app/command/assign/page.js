'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/StaffShell';
import { MapView } from '@/components/map';
import { RequestDetail } from '@/components/Details';
import { Button } from '@/components/pk/Button';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Segmented } from '@/components/pk/Segmented';
import { Spinner } from '@/components/pk/Spinner';
import { useToast } from '@/components/pk/Toast';
import { UrgencyBadge } from '@/components/pk/domain';
import {
  ArrowCounterClockwiseIcon, CheckCircleIcon, CursorClickIcon, LifebuoyIcon, XCircleIcon,
} from '@/components/pk/icons';
import { cn } from '@/components/pk/cn';
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
  const toast = useToast();
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

  async function run(key, fn, successMessage) {
    setBusy(key);
    setError(null);
    try {
      await fn();
      toast(successMessage, 4500);
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
      api(`/requests/${selected.id}/assign`, { method: 'PATCH', body: { rescuer_id: rescuer.id } }),
      `มอบหมายเคส ${selected.case_no} ให้ ${rescuer.team_name || rescuer.full_name} สำเร็จ`
    );

  const setStatus = (status) =>
    run(
      `status-${status}`,
      () => api(`/requests/${selected.id}/status`, { method: 'PATCH', body: { status } }),
      `บันทึกสถานะเคส ${selected.case_no} เป็น “${STATUS[status].label}” แล้ว`
    );

  function retryData() {
    return Promise.all([requests, rescuers].filter((source) => source.error).map((source) => source.refresh()));
  }

  return (
    <>
      <PageHeader title="มอบหมายเคส" desc="เลือกเคสจากรายการหรือแผนที่ แล้วเลือกหน่วยกู้ภัยที่ใกล้ที่สุด" />
      {(error || requests.error || rescuers.error) && (
        <div className="mb-4 flex flex-col gap-3">
          <ErrorBanner error={error} />
          <ErrorBanner error={requests.error || rescuers.error} onRetry={retryData} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[26rem_1fr]">
        {/* รายการเคส */}
        <section aria-label="รายการเคส" className="flex flex-col rounded-xl border border-line bg-white lg:h-[calc(100dvh-9rem)]">
          <div className="border-b border-line p-2">
            <Segmented
              label="สถานะเคส"
              value={filter}
              onChange={setFilter}
              options={FILTERS.map((f) => ({
                value: f.key,
                label: `${f.label} (${requests.data ? all.filter((r) => r.status === f.key).length : '—'})`,
              }))}
            />
          </div>
          {requests.loading && <Spinner />}
          <ul className="max-h-[40dvh] min-h-0 flex-1 divide-y divide-line overflow-y-auto lg:max-h-none">
            {!requests.loading && !requests.error && list.length === 0 && (
              <li className="p-6 text-center text-base text-t2">ไม่มีเคสในสถานะนี้</li>
            )}
            {list.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  aria-pressed={selectedId === r.id}
                  className={cn(
                    'flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left',
                    selectedId === r.id ? 'bg-acc-bg' : 'hover:bg-s1'
                  )}
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold tabular-nums">{r.case_no}</span>
                    <UrgencyBadge urgency={r.urgency} />
                    <span className="ml-auto text-xs text-t2">{timeAgo(r.created_at)}</span>
                  </span>
                  <span className="truncate text-base text-t2">
                    {r.people_count} คน
                    {vulnerableLabels(r).length > 0 && ` · ${vulnerableLabels(r).join(', ')}`}
                  </span>
                  {r.address_note && <span className="line-clamp-2 text-base text-t2 [overflow-wrap:anywhere]">{r.address_note}</span>}
                  {r.rescuer_team && <span className="text-base text-acc">ทีม: {r.rescuer_team}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex min-w-0 flex-col gap-4 lg:h-[calc(100dvh-9rem)] lg:min-h-0">
          <div className="h-[45dvh] shrink-0 overflow-hidden rounded-xl border border-line lg:h-[32dvh]">
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

          {!selected ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-line2 p-6 text-t2">
              <CursorClickIcon size={24} aria-hidden />
              เลือกเคสจากรายการหรือจุดบนแผนที่เพื่อมอบหมายทีม
            </div>
          ) : (
            <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2">
              <section className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-white p-4 lg:min-h-0">
                <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                  <RequestDetail request={selected} showPrivate />
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 border-t border-line pt-3">
                  {selected.status === 'in_progress' && (
                    <Button
                      variant="success"
                      size="sm"
                      block={false}
                      icon={<CheckCircleIcon size={18} weight="fill" aria-hidden />}
                      onClick={() => setConfirm({ status: 'rescued', label: 'ปิดเคสเป็นช่วยเหลือแล้ว' })}
                    >
                      ช่วยเหลือแล้ว
                    </Button>
                  )}
                  {selected.status !== 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      block={false}
                      icon={<ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden />}
                      onClick={() => setConfirm({ status: 'pending', label: 'คืนเคสกลับเข้าคิว' })}
                    >
                      คืนเข้าคิว
                    </Button>
                  )}
                  <Button
                    variant="dangerOutline"
                    size="sm"
                    block={false}
                    icon={<XCircleIcon size={18} weight="bold" aria-hidden />}
                    onClick={() => setConfirm({ status: 'cancelled', label: 'ยกเลิกเคส' })}
                  >
                    ยกเลิกเคส
                  </Button>
                </div>
              </section>

              <section className="min-w-0 rounded-xl border border-line bg-white p-4 lg:flex lg:min-h-0 lg:flex-col">
                <h2 className="font-bold">
                  {selected.status === 'pending' ? 'เลือกหน่วยกู้ภัย' : 'เปลี่ยนหน่วยกู้ภัย'}
                </h2>
                <p className="mb-3 text-base text-t2">เรียงตามระยะห่างจากจุดเกิดเหตุ</p>
                {selected.status === 'in_progress' && (
                  <p className="mb-3 rounded-lg border border-amb-line bg-amb-bg p-3 text-base text-amb-tx">
                    ทีมกำลังเข้าช่วยเหลือ — คืนเคสเข้าคิวก่อนหากต้องการเปลี่ยนทีม
                  </p>
                )}
                <ul className="flex max-h-[24rem] flex-col divide-y divide-line overflow-y-auto lg:min-h-0 lg:max-h-none lg:flex-1">
                  {!rescuers.loading && !rescuers.error && rankedRescuers.length === 0 && (
                    <li className="py-4 text-center text-base text-t2">ยังไม่มีหน่วยกู้ภัยในระบบ</li>
                  )}
                  {rankedRescuers.map((r) => {
                    const current = selected.assigned_to === r.id;
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-white">
                          <LifebuoyIcon size={18} weight="fill" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{r.team_name || r.full_name}</p>
                          <p className="truncate text-xs text-t2">
                            {r.full_name} · งานค้าง {r.active_missions} ·{' '}
                            {r.distance != null ? `ห่าง ${formatDistance(r.distance)}` : 'ไม่ทราบตำแหน่ง'}
                          </p>
                        </div>
                        {current ? (
                          <span className="text-base font-semibold text-acc">ทีมปัจจุบัน</span>
                        ) : (
                          <Button
                            size="sm"
                            block={false}
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

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.label || ''}
        cancelLabel="ไม่ใช่"
        confirmVariant={confirm?.status === 'cancelled' ? 'danger' : confirm?.status === 'rescued' ? 'success' : 'primary'}
        loading={busy === `status-${confirm?.status}`}
        onConfirm={() => setStatus(confirm.status)}
        onCancel={() => setConfirm(null)}
      >
        <p>
          เปลี่ยนสถานะเคส <b className="tabular-nums">{selected?.case_no}</b> เป็น “{STATUS[confirm?.status]?.label}”
          {confirm?.status === 'cancelled' && ' — เคสจะหายจากแผนที่ ใช้เมื่อแจ้งซ้ำหรือผู้แจ้งปลอดภัยแล้ว'}
        </p>
      </ConfirmDialog>
    </>
  );
}
