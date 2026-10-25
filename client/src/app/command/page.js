'use client';

import { PageHeader } from '@/components/StaffShell';
import {
  BarList,
  DailyChart,
  KpiGrid,
  Panel,
  RecentTable,
  ResponseTimes,
  TeamsTable,
  statusRows,
  urgencyRows,
} from '@/components/Dashboard';
import { Button } from '@/components/pk/Button';
import { ErrorBanner } from '@/components/pk/ErrorBanner';
import { Spinner } from '@/components/pk/Spinner';
import { PathIcon } from '@/components/pk/icons';
import { usePolling } from '@/hooks/usePolling';
import { formatTime } from '@/lib/format';

export default function CommandDashboard() {
  const { data: s, error, loading, updatedAt, refresh } = usePolling('/dashboard/summary');

  return (
    <>
      <PageHeader
        title="Dashboard ศูนย์บัญชาการ"
        desc={`สรุปสถานการณ์ อ.หาดใหญ่ · อัปเดต ${formatTime(updatedAt)}`}
        actions={
          <Button href="/command/assign" size="sm" block={false} icon={<PathIcon size={18} weight="bold" aria-hidden />}>
            มอบหมายเคส ({s?.pending ?? '—'} รอ)
          </Button>
        }
      />
      <ErrorBanner error={error} onRetry={refresh} />
      {loading && <Spinner />}
      {s && (
        <div className="flex flex-col gap-4">
          <KpiGrid s={s} />
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="เคสรายวัน" desc="7 วันล่าสุด" className="xl:col-span-2">
              <DailyChart daily={s.daily} />
            </Panel>
            <Panel title="เคสค้างตามความเร่งด่วน" desc="รอช่วย + กำลังช่วย">
              <BarList rows={urgencyRows(s.by_urgency)} />
            </Panel>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <Panel title="เคสทั้งหมดตามสถานะ">
              <BarList rows={statusRows(s.by_status)} />
            </Panel>
            <Panel title="ผลงานหน่วยกู้ภัย" className="xl:col-span-2">
              <TeamsTable teams={s.teams} />
            </Panel>
          </div>
          <ResponseTimes s={s} />
          <Panel title="เคสที่อัปเดตล่าสุด">
            <RecentTable recent={s.recent} />
          </Panel>
        </div>
      )}
    </>
  );
}
