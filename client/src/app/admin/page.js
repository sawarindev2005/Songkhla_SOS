'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/StaffShell';
import { MapView } from '@/components/map';
import { BarList, DailyChart, KpiGrid, Panel, ResponseTimes, statusRows } from '@/components/Dashboard';
import { Button } from '@/components/pk/Button';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Spinner } from '@/components/pk/Spinner';
import { ShieldCheckIcon, UserPlusIcon } from '@/components/pk/icons';
import { usePolling } from '@/hooks/usePolling';
import { ROLE_LABEL } from '@/lib/auth';
import { formatTime } from '@/lib/format';

export default function AdminOverview() {
  const summary = usePolling('/dashboard/summary');
  const requests = usePolling('/requests?status=active');
  const shelters = usePolling('/shelters');
  const distributions = usePolling('/distributions');
  const rescuers = usePolling('/users/rescuers');
  const s = summary.data;
  const mapFailed = [
    [requests, 'เคสค้าง'],
    [shelters, 'ที่พักพิง'],
    [distributions, 'จุดแจกจ่าย'],
    [rescuers, 'ทีมกู้ภัย'],
  ].filter(([l]) => l.error);

  return (
    <>
      <PageHeader
        title="ภาพรวมทั้งระบบ"
        desc={`ข้อมูลทุกส่วนของระบบ · อัปเดต ${formatTime(summary.updatedAt)}`}
        actions={
          <Button href="/admin/users" size="sm" block={false} icon={<UserPlusIcon size={18} weight="bold" aria-hidden />}>
            สร้างบัญชีกู้ภัย
          </Button>
        }
      />
      <ErrorBanner error={summary.error} onRetry={summary.refresh} />
      {mapFailed.length > 0 && (
        <div className="mb-4">
          <ErrorBanner
            error={new Error(`โหลด${mapFailed.map(([, name]) => name).join(', ')}ไม่สำเร็จ แผนที่รวมอาจไม่ครบ`)}
            onRetry={() => Promise.all(mapFailed.map(([l]) => l.refresh()))}
          />
        </div>
      )}
      {summary.loading && <Spinner />}
      {s && (
        <div className="flex flex-col gap-4">
          <KpiGrid s={s} />

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="แผนที่รวม" desc="เคสค้าง · ทีมกู้ภัย · ที่พักพิง · จุดแจกจ่าย" className="xl:col-span-2">
              <div className="h-[420px] overflow-hidden rounded-lg">
                <MapView
                  requests={requests.data || []}
                  shelters={shelters.data || []}
                  distributions={distributions.data || []}
                  rescuers={rescuers.data || []}
                  zoomControl
                  locate={false}
                />
              </div>
            </Panel>
            <div className="flex flex-col gap-4">
              <Panel title="บัญชีผู้ใช้งาน">
                <ul className="flex flex-col divide-y divide-line">
                  {['admin', 'command', 'rescuer'].map((role) => {
                    const u = s.users.find((x) => x.role === role) || { count: 0, active: 0 };
                    return (
                      <li key={role} className="flex items-center justify-between gap-2 py-2.5">
                        <span className="flex items-center gap-2">
                          <ShieldCheckIcon size={18} className="text-t2" aria-hidden />
                          {ROLE_LABEL[role]}
                        </span>
                        <span className="text-base tabular-nums">
                          <b>{u.count}</b> <span className="text-t2">(ใช้งาน {u.active})</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Link href="/admin/users" className="mt-2 inline-block text-base font-semibold text-acc underline">
                  จัดการบัญชีทั้งหมด
                </Link>
              </Panel>
              <Panel title="เคสทั้งหมดตามสถานะ">
                <BarList rows={statusRows(s.by_status)} />
              </Panel>
            </div>
          </div>

          <Panel title="เคสรายวัน" desc="7 วันล่าสุด">
            <DailyChart daily={s.daily} />
          </Panel>
          <ResponseTimes s={s} />
        </div>
      )}
    </>
  );
}
