'use client';

import { useState } from 'react';
import { CircleCheck, ClipboardList, Undo2 } from 'lucide-react';
import { ContactActions, RequestDetail } from '@/components/Details';
import { Button, EmptyState, ErrorBanner, Modal, Spinner, cx } from '@/components/ui';
import { usePolling } from '@/hooks/usePolling';
import { api } from '@/lib/api';

const ACTIONS = {
  assigned: { next: 'in_progress', label: 'เริ่มเข้าช่วยเหลือ', variant: 'safety' },
  in_progress: { next: 'rescued', label: 'ช่วยเหลือสำเร็จ', variant: 'success' },
};

export default function MissionsPage() {
  const { data, error, loading, refresh } = usePolling('/requests/mine');
  const [tab, setTab] = useState('active');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { request, next }

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
        <h1 className="text-xl font-bold">ภารกิจของฉัน</h1>
        <p className="text-sm text-muted">อัปเดตสถานะทุกครั้งเพื่อให้ศูนย์บัญชาการและผู้แจ้งทราบ</p>
      </header>

      <div className="flex rounded-xl bg-slate-100 p-1" role="tablist" aria-label="ประเภทภารกิจ">
        {[
          ['active', `กำลังดำเนินการ (${activeCount})`],
          ['done', 'เสร็จสิ้น'],
        ].map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cx(
              'min-h-10 flex-1 cursor-pointer rounded-lg text-sm font-semibold',
              tab === key ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorBanner error={actionError || error} onRetry={error ? refresh : undefined} />
      {loading && <Spinner />}
      {!loading && list.length === 0 && (
        <EmptyState icon={ClipboardList} title={tab === 'active' ? 'ยังไม่มีภารกิจ' : 'ยังไม่มีเคสที่เสร็จสิ้น'}>
          {tab === 'active' && 'ไปที่แผนที่เคสเพื่อรับเคสใกล้ตัว หรือรอศูนย์บัญชาการมอบหมาย'}
        </EmptyState>
      )}

      <ul className="flex flex-col gap-3">
        {list.map((r) => {
          const action = ACTIONS[r.status];
          return (
            <li key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <RequestDetail request={r} showPrivate>
                <ContactActions lat={r.lat} lng={r.lng} phone={r.phone} phoneLabel="โทรหาผู้แจ้ง" />
                {action && (
                  <div className="flex gap-2">
                    <Button
                      variant={action.variant}
                      size="lg"
                      className="flex-1"
                      loading={busyId === r.id}
                      onClick={() =>
                        action.next === 'rescued' ? setConfirm({ request: r, next: 'rescued' }) : changeStatus(r, action.next)
                      }
                    >
                      {action.next === 'rescued' && <CircleCheck className="size-5" aria-hidden />}
                      {action.label}
                    </Button>
                    <Button
                      variant="danger"
                      size="lg"
                      aria-label="คืนเคสกลับเข้าคิว"
                      disabled={busyId === r.id}
                      onClick={() => setConfirm({ request: r, next: 'pending' })}
                    >
                      <Undo2 className="size-5" aria-hidden />
                      <span className="hidden sm:inline">คืนเคส</span>
                    </Button>
                  </div>
                )}
              </RequestDetail>
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(confirm)}
        title={confirm?.next === 'rescued' ? 'ยืนยันช่วยเหลือสำเร็จ' : 'ยืนยันคืนเคส'}
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              ยกเลิก
            </Button>
            <Button
              variant={confirm?.next === 'rescued' ? 'success' : 'primary'}
              loading={busyId === confirm?.request.id}
              onClick={() => changeStatus(confirm.request, confirm.next)}
            >
              ยืนยัน
            </Button>
          </>
        }
      >
        {confirm?.next === 'rescued' ? (
          <p>
            ยืนยันว่าได้ช่วยเหลือผู้ประสบภัยในเคส <b className="tabular">{confirm.request.case_no}</b>{' '}
            ({confirm.request.people_count} คน) ครบแล้ว?
          </p>
        ) : (
          <p>
            คืนเคส <b className="tabular">{confirm?.request.case_no}</b> กลับเข้าคิว
            เพื่อให้ทีมอื่นรับแทน ใช้เมื่อไม่สามารถเข้าพื้นที่ได้
          </p>
        )}
      </Modal>
    </div>
  );
}
