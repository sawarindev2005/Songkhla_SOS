'use client';

import Link from 'next/link';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/StaffShell';
import { MapView } from '@/components/map';
import { BarList, DailyChart, KpiGrid, Panel, ResponseTimes, statusRows } from '@/components/Dashboard';
import { Button, ErrorBanner, Spinner } from '@/components/ui';
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

  return (
    <>
      <PageHeader
        title="ภาพรวมทั้งระบบ"
        desc={`ข้อมูลทุกส่วนของระบบ · อัปเดต ${formatTime(summary.updatedAt)}`}
        actions={
          <Button as={Link} href="/admin/users" variant="dark">
            <UserPlus className="size-4" aria-hidden />
            สร้างบัญชีกู้ภัย
          </Button>
        }
      />
      <ErrorBanner error={summary.error} onRetry={summary.refresh} />
      {summary.loading && <Spinner />}
      {s && (
        <div className="flex flex-col gap-4">
          <KpiGrid s={s} />

          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="แผนที่รวม" desc="เคสค้าง · ทีมกู้ภัย · ที่พักพิง · จุดแจกจ่าย" className="xl:col-span-2">
              <div className="h-[420px] overflow-hidden rounded-xl">
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
                          <ShieldCheck className="size-4 text-muted" aria-hidden />
                          {ROLE_LABEL[role]}
                        </span>
                        <span className="tabular text-sm">
                          <b>{u.count}</b> <span className="text-muted">(ใช้งาน {u.active})</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Link href="/admin/users" className="mt-2 inline-block text-sm font-semibold text-safety-dark underline">
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
