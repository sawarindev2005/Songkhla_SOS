'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/StaffShell';
import { Badge } from '@/components/pk/Badge';
import { Button } from '@/components/pk/Button';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Field, inputClass } from '@/components/pk/Field';
import { Modal } from '@/components/pk/Modal';
import { Segmented } from '@/components/pk/Segmented';
import { Spinner } from '@/components/pk/Spinner';
import { CheckCircleIcon, ClockIcon, PhoneIcon, XCircleIcon } from '@/components/pk/icons';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';
import { equipmentLabel, formatDateTime, timeAgo } from '@/lib/format';

const FILTERS = [
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'approved', label: 'อนุมัติแล้ว' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

const STATUS_BADGE = {
  pending: { tone: 'amber', icon: ClockIcon, label: 'รออนุมัติ' },
  approved: { tone: 'ok', icon: CheckCircleIcon, label: 'อนุมัติแล้ว' },
  rejected: { tone: 'gray', icon: XCircleIcon, label: 'ไม่อนุมัติ' },
};

export default function ApplicationsPage() {
  const [status, setStatus] = useState('pending');
  const { data, error, loading, refresh } = usePolling(`/applications?status=${status}`, { interval: 30000 });
  const [approving, setApproving] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function run(path, body, close) {
    setSaving(true);
    setActionError(null);
    try {
      await api(path, { method: 'PATCH', body });
      close();
      refresh();
    } catch (err) {
      setActionError(err);
      // ถูกพิจารณาไปแล้วโดยคนอื่น: โหลดรายการใหม่ให้เห็นสถานะล่าสุด
      if (err.status === 409) refresh();
    } finally {
      setSaving(false);
    }
  }

  function approve() {
    run(`/applications/${approving.id}/approve`, undefined, () => setApproving(null));
  }

  function reject(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setReasonError('กรุณาระบุเหตุผล ผู้สมัครจะเห็นข้อความนี้ตอนเข้าสู่ระบบ');
      return;
    }
    run(`/applications/${rejecting.id}/reject`, { reason: reason.trim() }, () => setRejecting(null));
  }

  function openReject(app) {
    setReason('');
    setReasonError(null);
    setActionError(null);
    setRejecting(app);
  }

  return (
    <>
      <PageHeader
        title="อนุมัติอาสากู้ภัย"
        desc="ตรวจสอบใบสมัคร โทรยืนยันตัวตนตามเบอร์ที่ให้ไว้ แล้วอนุมัติเพื่อสร้างบัญชีกู้ภัย"
      />

      <div className="mb-4 max-w-md [&_button]:whitespace-nowrap">
        <Segmented label="กรองตามสถานะใบสมัคร" value={status} onChange={setStatus} options={FILTERS} />
      </div>

      <ErrorBanner error={error} onRetry={refresh} />
      {loading && <Spinner />}

      {data && data.length === 0 && (
        <p className="rounded-xl border border-line bg-white px-4 py-8 text-center text-t2">
          {status === 'pending' ? 'ไม่มีใบสมัครที่รออนุมัติ' : 'ยังไม่มีใบสมัครในสถานะนี้'}
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="grid gap-3 xl:grid-cols-2">
          {data.map((a) => {
            const badge = STATUS_BADGE[a.status];
            return (
              <li key={a.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-white p-4 text-base break-words">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold">{a.full_name}</p>
                    <p className="text-t2">@{a.username}</p>
                  </div>
                  <Badge tone={badge.tone} icon={<badge.icon size={15} weight="bold" aria-hidden />}>
                    {badge.label}
                  </Badge>
                </div>

                <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <dt className="text-t2">ทีม / หน่วยงาน</dt>
                  <dd className="font-medium">{a.team_name}</dd>
                  <dt className="text-t2">จำนวนสมาชิก</dt>
                  <dd className="tabular-nums">{a.team_size} คน</dd>
                  <dt className="text-t2">อุปกรณ์</dt>
                  <dd>{equipmentLabel(a.equipment) || '-'}</dd>
                  <dt className="text-t2">พื้นที่</dt>
                  <dd>{a.service_area || '-'}</dd>
                  <dt className="text-t2">เบอร์โทร</dt>
                  <dd>
                    <a href={`tel:${a.phone}`} className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-acc tabular-nums underline">
                      <PhoneIcon size={16} weight="fill" aria-hidden />
                      {a.phone}
                    </a>
                  </dd>
                  <dt className="text-t2">สมัครเมื่อ</dt>
                  <dd title={formatDateTime(a.created_at)}>{timeAgo(a.created_at)}</dd>
                  {a.status !== 'pending' && (
                    <>
                      <dt className="text-t2">พิจารณาโดย</dt>
                      <dd>
                        {a.reviewer_name || '-'} · <span className="tabular-nums">{formatDateTime(a.reviewed_at)}</span>
                      </dd>
                    </>
                  )}
                  {a.status === 'rejected' && (
                    <>
                      <dt className="text-t2">เหตุผล</dt>
                      <dd>{a.reject_reason}</dd>
                    </>
                  )}
                </dl>

                {a.status === 'pending' && (
                  <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                    <Button
                      size="sm"
                      variant="dangerOutline"
                      block={false}
                      onClick={() => openReject(a)}
                      aria-label={`ไม่อนุมัติ ${a.full_name}`}
                      icon={<XCircleIcon size={18} aria-hidden />}
                    >
                      ไม่อนุมัติ
                    </Button>
                    <Button
                      size="sm"
                      variant="success"
                      block={false}
                      onClick={() => {
                        setActionError(null);
                        setApproving(a);
                      }}
                      aria-label={`อนุมัติ ${a.full_name}`}
                      icon={<CheckCircleIcon size={18} aria-hidden />}
                    >
                      อนุมัติ
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(approving)}
        title="อนุมัติใบสมัคร"
        confirmLabel="อนุมัติ สร้างบัญชีกู้ภัย"
        confirmVariant="success"
        confirmIcon={<CheckCircleIcon size={20} aria-hidden />}
        loading={saving}
        onConfirm={approve}
        onCancel={() => setApproving(null)}
      >
        <p>
          สร้างบัญชีกู้ภัยให้ <b>{approving?.full_name}</b> (@{approving?.username}) ทีม {approving?.team_name}?
          ผู้สมัครจะเข้าสู่ระบบด้วยรหัสผ่านที่ตั้งไว้ตอนสมัครได้ทันที
        </p>
        <div className="mt-3">
          <ErrorBanner error={actionError} />
        </div>
      </ConfirmDialog>

      <Modal
        open={Boolean(rejecting)}
        title="ไม่อนุมัติใบสมัคร"
        onClose={() => setRejecting(null)}
        footer={
          <>
            <Button variant="outline" size="sm" block={false} onClick={() => setRejecting(null)}>
              ยกเลิก
            </Button>
            <Button type="submit" form="reject-form" variant="danger" size="sm" block={false} loading={saving}>
              ยืนยันไม่อนุมัติ
            </Button>
          </>
        }
      >
        {rejecting && (
          <form id="reject-form" onSubmit={reject} noValidate className="flex flex-col gap-4">
            <p className="text-base text-t2">
              ใบสมัครของ <b className="text-ink">{rejecting.full_name}</b> (@{rejecting.username})
            </p>
            <Field label="เหตุผล" required error={reasonError} hint="ผู้สมัครจะเห็นข้อความนี้เมื่อพยายามเข้าสู่ระบบ">
              {(p) => (
                <input
                  {...p}
                  className={inputClass}
                  value={reason}
                  maxLength={255}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setReasonError(null);
                  }}
                  placeholder="เช่น ติดต่อเบอร์ที่ให้ไว้ไม่ได้ กรุณาสมัครใหม่"
                />
              )}
            </Field>
            <ErrorBanner error={actionError} />
          </form>
        )}
      </Modal>
    </>
  );
}
