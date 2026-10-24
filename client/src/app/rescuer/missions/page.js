'use client';

import { useEffect, useState } from 'react';
import { ContactActions, RequestDetail } from '@/components/Details';
import { Button } from '@/components/pk/Button';
import { ConfirmDialog } from '@/components/pk/ConfirmDialog';
import { EmptyState } from '@/components/pk/EmptyState';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Segmented } from '@/components/pk/Segmented';
import { Spinner } from '@/components/pk/Spinner';
import { ArrowCounterClockwiseIcon, CheckCircleIcon, ClipboardTextIcon, XIcon } from '@/components/pk/icons';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';

const ACTIONS = {
  assigned: { next: 'in_progress', label: 'เริ่มเข้าช่วยเหลือ', variant: 'primary' },
  in_progress: { next: 'rescued', label: 'ช่วยเหลือสำเร็จ', variant: 'success' },
};

export default function MissionsPage() {
  const { data, error, loading, refresh } = usePolling('/requests/mine');
  const [tab, setTab] = useState('active');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { request, next }
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  const list = (data || []).filter((r) =>
    tab === 'active' ? ['assigned', 'in_progress'].includes(r.status) : ['rescued', 'cancelled'].includes(r.status)
  );
  const activeCount = (data || []).filter((r) => ['assigned', 'in_progress'].includes(r.status)).length;

  async function changeStatus(r, next) {
    setBusyId(r.id);
    setActionError(null);
    try {
      await api(`/requests/${r.id}/status`, { method: 'PATCH', body: { status: next } });
      await refresh();
      if (next === 'rescued') setMessage(`บันทึกแล้ว: เคส ${r.case_no} ช่วยเหลือสำเร็จ`);
      if (next === 'pending') setMessage(`คืนเคส ${r.case_no} เข้าคิวแล้ว`);
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-5">
      <header>
        <h1 className="text-4xl font-bold">ภารกิจของฉัน</h1>
        <p className="text-base text-t2">อัปเดตสถานะทุกครั้งเพื่อให้ศูนย์บัญชาการและผู้แจ้งทราบ</p>
      </header>

      <Segmented
        label="ประเภทภารกิจ"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: `กำลังดำเนินการ (${activeCount})` },
          { value: 'done', label: 'เสร็จสิ้น' },
        ]}
      />

      <ErrorBanner error={actionError || error} onRetry={error ? refresh : undefined} />
      {message && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-ok-line bg-ok-bg p-3 text-base text-ok">
          <p className="flex-1">{message}</p>
          <button type="button" onClick={() => setMessage(null)} aria-label="ปิดข้อความ" className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-full hover:bg-s2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acc">
            <XIcon size={18} aria-hidden />
          </button>
        </div>
      )}
      {loading && <Spinner />}
      {!loading && list.length === 0 && (
        <EmptyState icon={ClipboardTextIcon} title={tab === 'active' ? 'ยังไม่มีภารกิจ' : 'ยังไม่มีเคสที่เสร็จสิ้น'}>
          {tab === 'active' && 'ไปที่แผนที่เคสเพื่อรับเคสใกล้ตัว หรือรอศูนย์บัญชาการมอบหมาย'}
        </EmptyState>
      )}

      <ul className="flex flex-col gap-3">
        {list.map((r) => {
          const action = ACTIONS[r.status];
          return (
            <li key={r.id} className="rounded-xl border border-line bg-white p-4">
              <RequestDetail request={r} showPrivate>
                <ContactActions lat={r.lat} lng={r.lng} phone={r.phone} phoneLabel="โทรหาผู้แจ้ง" />
                {action && (
                  <div className="flex flex-col gap-3">
                    <Button
                      variant={action.variant}
                      className="w-full"
                      loading={busyId === r.id}
                      icon={action.next === 'rescued' ? <CheckCircleIcon size={20} weight="fill" aria-hidden /> : null}
                      onClick={() =>
                        action.next === 'rescued' ? setConfirm({ request: r, next: 'rescued' }) : changeStatus(r, action.next)
                      }
                    >
                      {action.label}
                    </Button>
                    <Button
                      variant="dangerOutline"
                      size="sm"
                      block={false}
                      className="min-h-11 self-start"
                      disabled={busyId === r.id}
                      icon={<ArrowCounterClockwiseIcon size={20} weight="bold" aria-hidden />}
                      onClick={() => setConfirm({ request: r, next: 'pending' })}
                    >
                      คืนเคส
                    </Button>
                  </div>
                )}
              </RequestDetail>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.next === 'rescued' ? 'ยืนยันช่วยเหลือสำเร็จ' : 'ยืนยันคืนเคส'}
        confirmVariant={confirm?.next === 'rescued' ? 'success' : 'danger'}
        loading={busyId === confirm?.request.id}
        onConfirm={() => changeStatus(confirm.request, confirm.next)}
        onCancel={() => setConfirm(null)}
      >
        {confirm?.next === 'rescued' ? (
          <p>
            ยืนยันว่าได้ช่วยเหลือผู้ประสบภัยในเคส <b className="tabular-nums">{confirm.request.case_no}</b>{' '}
            ({confirm.request.people_count} คน) ครบแล้ว?
          </p>
        ) : (
          <p>
            คืนเคส <b className="tabular-nums">{confirm?.request.case_no}</b> กลับเข้าคิว
            เพื่อให้ทีมอื่นรับแทน ใช้เมื่อไม่สามารถเข้าพื้นที่ได้
          </p>
        )}
      </ConfirmDialog>
    </div>
  );
}
